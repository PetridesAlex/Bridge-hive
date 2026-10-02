import { isOwnedAvatarPath } from '@bridge-hive/domain';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const BUCKET = 'worker-avatars';
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const SIGNED_URL_TTL_SEC = 60 * 15;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

type SignedCacheEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, SignedCacheEntry>();

export function clearAvatarUrlCache() {
  signedUrlCache.clear();
}

function randomObjectId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Could not read the selected image.');
  }
  return response.arrayBuffer();
}

function validateSource(params: {
  mimeType?: string | null;
  sizeBytes?: number | null;
}): { ok: true } | { ok: false; error: string } {
  const mime = (params.mimeType ?? 'image/jpeg').toLowerCase();
  if (!ALLOWED_MIME.has(mime) && !mime.startsWith('image/')) {
    return { ok: false, error: 'Please choose a JPEG, PNG, or WebP photo.' };
  }
  if (params.sizeBytes != null && params.sizeBytes > MAX_SOURCE_BYTES) {
    return { ok: false, error: 'Photo is too large. Choose an image under 12 MB.' };
  }
  return { ok: true };
}

async function processToSquareJpeg(uri: string): Promise<{ uri: string; sizeBytes: number }> {
  // First pass: get pixel size via manipulate (no-op resize keeps EXIF stripped on save).
  const probed = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 1,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const width = probed.width || 512;
  const height = probed.height || 512;
  const side = Math.min(width, height);
  const originX = Math.max(0, Math.floor((width - side) / 2));
  const originY = Math.max(0, Math.floor((height - side) / 2));

  const cropped = await ImageManipulator.manipulateAsync(
    probed.uri,
    [
      { crop: { originX, originY, width: side, height: side } },
      { resize: { width: 512, height: 512 } },
    ],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  const bytes = await readFileAsArrayBuffer(cropped.uri);
  return { uri: cropped.uri, sizeBytes: bytes.byteLength };
}

export async function pickAvatarFromLibrary(): Promise<
  | { ok: true; uri: string }
  | { ok: false; error: string; cancelled?: boolean }
> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { ok: false, error: 'Photo library permission is required.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: Platform.OS !== 'web',
    aspect: [1, 1],
    quality: 1,
    allowsMultipleSelection: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { ok: false, error: 'Selection cancelled', cancelled: true };
  }

  const asset = result.assets[0];
  const validation = validateSource({
    mimeType: asset.mimeType,
    sizeBytes: asset.fileSize,
  });
  if (!validation.ok) return validation;

  try {
    const processed = await processToSquareJpeg(asset.uri);
    return { ok: true, uri: processed.uri };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not process the photo.',
    };
  }
}

export async function pickAvatarFromCamera(): Promise<
  | { ok: true; uri: string }
  | { ok: false; error: string; cancelled?: boolean }
> {
  if (Platform.OS === 'web') {
    return { ok: false, error: 'Camera capture is not available on web.' };
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { ok: false, error: 'Camera permission is required.' };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { ok: false, error: 'Capture cancelled', cancelled: true };
  }

  const asset = result.assets[0];
  const validation = validateSource({
    mimeType: asset.mimeType,
    sizeBytes: asset.fileSize,
  });
  if (!validation.ok) return validation;

  try {
    const processed = await processToSquareJpeg(asset.uri);
    return { ok: true, uri: processed.uri };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not process the photo.',
    };
  }
}

export async function uploadWorkerAvatar(params: {
  userId: string;
  uri: string;
  previousPath?: string | null;
}): Promise<{ path?: string; error?: string }> {
  if (!params.userId) return { error: 'Not signed in.' };

  let newPath: string | undefined;
  try {
    const bytes = await readFileAsArrayBuffer(params.uri);
    if (bytes.byteLength > 2 * 1024 * 1024) {
      return { error: 'Processed photo exceeds the 2 MB limit. Try another image.' };
    }

    newPath = `${params.userId}/${randomObjectId()}.jpg`;
    if (!isOwnedAvatarPath(params.userId, newPath)) {
      return { error: 'Invalid avatar path.' };
    }

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(newPath, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
      cacheControl: '3600',
    });
    if (uploadError) {
      return { error: uploadError.message };
    }

    const { error: rpcError } = await supabase.rpc('set_my_avatar_path', {
      p_path: newPath,
    });
    if (rpcError) {
      await supabase.storage.from(BUCKET).remove([newPath]);
      return { error: rpcError.message };
    }

    if (params.previousPath && params.previousPath !== newPath) {
      await supabase.storage.from(BUCKET).remove([params.previousPath]).catch(() => undefined);
    }

    clearAvatarUrlCache();
    return { path: newPath };
  } catch (err) {
    if (newPath) {
      await supabase.storage.from(BUCKET).remove([newPath]).catch(() => undefined);
    }
    return {
      error: err instanceof Error ? err.message : 'Upload failed.',
    };
  }
}

export async function removeWorkerAvatar(params: {
  userId: string;
  path?: string | null;
}): Promise<{ error?: string }> {
  const { error: rpcError } = await supabase.rpc('set_my_avatar_path', {
    // Generated types omit null; RPC accepts null to clear.
    p_path: null as unknown as string,
  });
  if (rpcError) {
    return { error: rpcError.message };
  }

  if (params.path && isOwnedAvatarPath(params.userId, params.path)) {
    await supabase.storage.from(BUCKET).remove([params.path]).catch(() => undefined);
  }

  clearAvatarUrlCache();
  return {};
}

export async function getAvatarSignedUrl(
  path: string | null | undefined,
  userId: string,
): Promise<string | null> {
  if (!path || !isOwnedAvatarPath(userId, path)) return null;

  const cached = signedUrlCache.get(path);
  const now = Date.now();
  if (cached && cached.expiresAt > now + 30_000) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) {
    return null;
  }

  signedUrlCache.set(path, {
    url: data.signedUrl,
    expiresAt: now + SIGNED_URL_TTL_SEC * 1000,
  });
  return data.signedUrl;
}
