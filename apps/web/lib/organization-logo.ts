/**
 * Organization logo helpers for web — process, upload, signed URL.
 * Client-safe utilities; RPC persistence goes through server actions.
 */

import { isOwnedOrganizationLogoPath } from '@bridge-hive/domain';

import { createClient } from '@/lib/supabase/client';

export const ORG_LOGO_BUCKET = 'organization-logos';
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_PROCESSED_BYTES = 2 * 1024 * 1024;
const SIGNED_URL_TTL_SEC = 60 * 15;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

type SignedCacheEntry = { url: string; expiresAt: number; orgId: string };
const signedUrlCache = new Map<string, SignedCacheEntry>();

export function clearOrganizationLogoUrlCache(organizationId?: string) {
  if (!organizationId) {
    signedUrlCache.clear();
    return;
  }
  for (const [key, entry] of signedUrlCache) {
    if (entry.orgId === organizationId) signedUrlCache.delete(key);
  }
}

function randomObjectId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function validateLogoSource(params: {
  mimeType?: string | null;
  sizeBytes?: number | null;
}): { ok: true } | { ok: false; error: string } {
  const mime = (params.mimeType ?? '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return { ok: false, error: 'Please choose a JPEG, PNG, or WebP image.' };
  }
  if (params.sizeBytes != null && params.sizeBytes > MAX_SOURCE_BYTES) {
    return { ok: false, error: 'Image is too large. Choose a file under 10 MB.' };
  }
  return { ok: true };
}

/** Crop to square center and resize to 512 JPEG via canvas. */
export async function processLogoFile(file: File): Promise<
  { ok: true; blob: Blob; previewUrl: string } | { ok: false; error: string }
> {
  const validation = validateLogoSource({
    mimeType: file.type,
    sizeBytes: file.size,
  });
  if (!validation.ok) return validation;

  try {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = Math.max(0, Math.floor((bitmap.width - side) / 2));
    const sy = Math.max(0, Math.floor((bitmap.height - side) / 2));

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return { ok: false, error: 'Could not process the image.' };
    }
    // Neutral background for JPEG (no transparency).
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, 512, 512);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85),
    );
    if (!blob) return { ok: false, error: 'Could not compress the image.' };
    if (blob.size > MAX_PROCESSED_BYTES) {
      return { ok: false, error: 'Processed logo exceeds the 2 MB limit.' };
    }
    return { ok: true, blob, previewUrl: URL.createObjectURL(blob) };
  } catch {
    return { ok: false, error: 'Could not process the selected image.' };
  }
}

export async function uploadOrganizationLogo(params: {
  organizationId: string;
  blob: Blob;
  previousPath?: string | null;
}): Promise<{ path?: string; error?: string }> {
  const supabase = createClient();
  const newPath = `${params.organizationId}/${randomObjectId()}.jpg`;
  if (!isOwnedOrganizationLogoPath(params.organizationId, newPath)) {
    return { error: 'Invalid logo path.' };
  }

  const { error: uploadError } = await supabase.storage
    .from(ORG_LOGO_BUCKET)
    .upload(newPath, params.blob, {
      contentType: 'image/jpeg',
      upsert: false,
      cacheControl: '3600',
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  return { path: newPath };
}

export async function removeStorageObject(path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(ORG_LOGO_BUCKET).remove([path]).catch(() => undefined);
}

export async function getOrganizationLogoSignedUrl(
  path: string | null | undefined,
  organizationId: string,
): Promise<string | null> {
  if (!path || !isOwnedOrganizationLogoPath(organizationId, path)) return null;

  const cached = signedUrlCache.get(path);
  const now = Date.now();
  if (cached && cached.orgId === organizationId && cached.expiresAt > now + 30_000) {
    return cached.url;
  }

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(ORG_LOGO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) return null;

  signedUrlCache.set(path, {
    url: data.signedUrl,
    expiresAt: now + SIGNED_URL_TTL_SEC * 1000,
    orgId: organizationId,
  });
  return data.signedUrl;
}
