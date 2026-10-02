/**
 * Location facility image helpers — process, upload, signed URL.
 */

import { isOwnedLocationImagePath } from '@bridge-hive/domain';

import { createClient } from '@/lib/supabase/client';

export const LOCATION_IMAGE_BUCKET = 'location-images';
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_PROCESSED_BYTES = 2 * 1024 * 1024;
const SIGNED_URL_TTL_SEC = 60 * 15;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

type SignedCacheEntry = { url: string; expiresAt: number; key: string };
const signedUrlCache = new Map<string, SignedCacheEntry>();

export function clearLocationImageUrlCache() {
  signedUrlCache.clear();
}

function randomObjectId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function validateLocationImageSource(params: {
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

/** Crop/cover to 640×400 JPEG for card thumbnails. */
export async function processLocationImageFile(file: File): Promise<
  { ok: true; blob: Blob; previewUrl: string } | { ok: false; error: string }
> {
  const validation = validateLocationImageSource({
    mimeType: file.type,
    sizeBytes: file.size,
  });
  if (!validation.ok) return validation;

  try {
    const bitmap = await createImageBitmap(file);
    const targetW = 640;
    const targetH = 400;
    const scale = Math.max(targetW / bitmap.width, targetH / bitmap.height);
    const sw = targetW / scale;
    const sh = targetH / scale;
    const sx = Math.max(0, (bitmap.width - sw) / 2);
    const sy = Math.max(0, (bitmap.height - sh) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return { ok: false, error: 'Could not process the image.' };
    }
    ctx.fillStyle = '#edf3f5';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetW, targetH);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85),
    );
    if (!blob) return { ok: false, error: 'Could not compress the image.' };
    if (blob.size > MAX_PROCESSED_BYTES) {
      return { ok: false, error: 'Processed image exceeds the 2 MB limit.' };
    }
    return { ok: true, blob, previewUrl: URL.createObjectURL(blob) };
  } catch {
    return { ok: false, error: 'Could not process the selected image.' };
  }
}

export async function uploadLocationImage(params: {
  organizationId: string;
  locationId: string;
  blob: Blob;
}): Promise<{ path?: string; error?: string }> {
  const supabase = createClient();
  const newPath = `${params.organizationId}/${params.locationId}/${randomObjectId()}.jpg`;
  if (
    !isOwnedLocationImagePath(
      params.organizationId,
      params.locationId,
      newPath,
    )
  ) {
    return { error: 'Invalid image path.' };
  }

  const { error: uploadError } = await supabase.storage
    .from(LOCATION_IMAGE_BUCKET)
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

export async function removeLocationImageObject(path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage
    .from(LOCATION_IMAGE_BUCKET)
    .remove([path])
    .catch(() => undefined);
}

export async function getLocationImageSignedUrl(
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const cached = signedUrlCache.get(path);
  const now = Date.now();
  if (cached && cached.expiresAt > now + 30_000) {
    return cached.url;
  }

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(LOCATION_IMAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) return null;
  signedUrlCache.set(path, {
    url: data.signedUrl,
    expiresAt: now + SIGNED_URL_TTL_SEC * 1000,
    key: path,
  });
  return data.signedUrl;
}
