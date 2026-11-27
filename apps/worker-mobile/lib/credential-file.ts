/**
 * Shared credential file boundary: normalize, sniff, convert HEIC when possible,
 * and prepare an ArrayBuffer body for Supabase Storage upload.
 */
import {
  credentialExtensionForMime,
  isConvertibleCredentialMime,
  isUploadableCredentialMime,
  MAX_CREDENTIAL_FILE_BYTES,
  resolveCredentialUploadMime,
  sanitizeCredentialDisplayName,
  sniffCredentialMimeFromBytes,
  validateCredentialUpload,
} from '@bridge-hive/domain';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

export type CredentialUploadFailureCode =
  | 'cancelled'
  | 'permission'
  | 'unsupported_type'
  | 'too_large'
  | 'empty'
  | 'unreadable'
  | 'conversion_failed'
  | 'session'
  | 'storage'
  | 'metadata'
  | 'offline'
  | 'unknown';

export type PreparedCredentialFile = {
  uri: string;
  mimeType: string;
  sizeBytes: number;
  /** Sanitized original display name (not used in Storage paths). */
  displayName: string;
  /** True when HEIC/HEIF was converted to JPEG. */
  convertedFromHeic: boolean;
  bytes: ArrayBuffer;
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/\s/g, '');
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < alphabet.length; i += 1) lookup[alphabet.charCodeAt(i)] = i;

  let padding = 0;
  if (clean.endsWith('==')) padding = 2;
  else if (clean.endsWith('=')) padding = 1;
  const outLen = ((clean.length * 3) / 4) - padding;
  const bytes = new Uint8Array(outLen);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = lookup[clean.charCodeAt(i)] ?? 0;
    const b = lookup[clean.charCodeAt(i + 1)] ?? 0;
    const c = lookup[clean.charCodeAt(i + 2)] ?? 0;
    const d = lookup[clean.charCodeAt(i + 3)] ?? 0;
    if (p < outLen) bytes[p++] = (a << 2) | (b >> 4);
    if (p < outLen) bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < outLen) bytes[p++] = ((c & 3) << 6) | d;
  }
  return bytes.buffer;
}

/**
 * Read real binary content for Storage upload.
 * Prefer fetch ArrayBuffer; fall back to FileSystem base64 for content:// URIs.
 */
export async function readCredentialBytes(uri: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(uri);
    if (response.ok) {
      return await response.arrayBuffer();
    }
  } catch {
    // Fall through to FileSystem for native content-provider URIs.
  }

  if (Platform.OS === 'web') {
    throw new Error('Could not read the selected file.');
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error(
      'Could not read that file. If it is in iCloud or Drive, download it first, then choose JPG, PNG, or PDF.',
    );
  }
  if (typeof info.size === 'number' && info.size > MAX_CREDENTIAL_FILE_BYTES) {
    throw Object.assign(new Error('File must be 10 MB or smaller.'), {
      code: 'too_large' as const,
    });
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToArrayBuffer(base64);
}

async function convertHeicToJpeg(uri: string): Promise<{
  uri: string;
  sizeBytes: number;
}> {
  // Decode via native manipulator (real conversion — not a renamed extension).
  const probed = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 1,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const maxEdge = 4096;
  const needsResize =
    (probed.width ?? 0) > maxEdge || (probed.height ?? 0) > maxEdge;
  const actions =
    needsResize && (probed.width ?? 0) >= (probed.height ?? 0)
      ? [{ resize: { width: maxEdge } }]
      : needsResize
        ? [{ resize: { height: maxEdge } }]
        : [];

  const result =
    actions.length > 0
      ? await ImageManipulator.manipulateAsync(probed.uri, actions, {
          compress: 0.92,
          format: ImageManipulator.SaveFormat.JPEG,
        })
      : probed;

  const bytes = await readCredentialBytes(result.uri);
  return { uri: result.uri, sizeBytes: bytes.byteLength };
}

export function classifyCredentialUploadError(
  error: unknown,
): { code: CredentialUploadFailureCode; message: string } {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const lower = message.toLowerCase();
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code)
      : '';

  if (code === 'too_large' || lower.includes('10 mb') || lower.includes('too large')) {
    return { code: 'too_large', message: 'File must be 10 MB or smaller.' };
  }
  if (lower.includes('permission')) {
    return {
      code: 'permission',
      message: 'Photo or file permission is required to continue.',
    };
  }
  if (
    lower.includes('network') ||
    lower.includes('offline') ||
    lower.includes('timed out') ||
    lower.includes('timeout')
  ) {
    return {
      code: 'offline',
      message: 'Network problem. Check your connection and try again.',
    };
  }
  if (lower.includes('signed in') || lower.includes('jwt') || lower.includes('session')) {
    return { code: 'session', message: 'Your session expired. Sign in again.' };
  }
  if (lower.includes('convert') || lower.includes('heic') || lower.includes('heif')) {
    return {
      code: 'conversion_failed',
      message:
        'Could not convert that HEIC photo. Choose a JPG, PNG, or PDF instead.',
    };
  }
  if (lower.includes('empty') || lower.includes('unreadable') || lower.includes('could not read')) {
    return {
      code: 'unreadable',
      message:
        message ||
        'Could not read that file. Choose a JPG, PNG, PDF, or WebP, or download it from iCloud/Drive first.',
    };
  }
  if (lower.includes('unsupported') || lower.includes('file type')) {
    return {
      code: 'unsupported_type',
      message:
        message ||
        'Unsupported file type. Use PDF, JPEG, PNG, or WebP.',
    };
  }
  return {
    code: 'unknown',
    message: message || 'Upload failed. Please try again.',
  };
}

/**
 * Normalize a picker selection into Storage-ready bytes.
 * HEIC/HEIF are converted to JPEG on native when the decoder works; web rejects them.
 */
export async function prepareCredentialFile(params: {
  uri: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  fileName?: string | null;
}): Promise<
  | { ok: true; file: PreparedCredentialFile }
  | { ok: false; error: string; code: CredentialUploadFailureCode }
> {
  const displayName = sanitizeCredentialDisplayName(params.fileName);
  let mime = resolveCredentialUploadMime({
    mimeType: params.mimeType,
    fileName: params.fileName,
  });
  let uri = params.uri;
  let convertedFromHeic = false;

  const early = validateCredentialUpload({
    mimeType: mime,
    sizeBytes: params.sizeBytes,
    fileName: params.fileName,
    allowConvertible: true,
    allowUnknownSize: params.sizeBytes == null || params.sizeBytes <= 0,
  });
  if (!early.ok) {
    const classified = classifyCredentialUploadError(early.error);
    return { ok: false, error: early.error, code: classified.code };
  }
  mime = early.mimeType;

  if (isConvertibleCredentialMime(mime)) {
    if (Platform.OS === 'web') {
      return {
        ok: false,
        code: 'conversion_failed',
        error:
          'HEIC photos cannot be converted in this browser. Choose a JPG, PNG, or PDF instead.',
      };
    }
    try {
      const converted = await convertHeicToJpeg(uri);
      uri = converted.uri;
      mime = 'image/jpeg';
      convertedFromHeic = true;
      if (converted.sizeBytes > MAX_CREDENTIAL_FILE_BYTES) {
        return {
          ok: false,
          code: 'too_large',
          error: 'Converted photo is over 10 MB. Choose a smaller image or a PDF.',
        };
      }
    } catch (err) {
      return {
        ok: false,
        code: 'conversion_failed',
        error:
          Platform.OS === 'android'
            ? 'Could not convert that HEIC photo on this device. Choose a JPG, PNG, or PDF instead.'
            : 'Could not convert that HEIC photo. Choose a JPG, PNG, or PDF instead.',
      };
    }
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await readCredentialBytes(uri);
  } catch (err) {
    const classified = classifyCredentialUploadError(err);
    return { ok: false, error: classified.message, code: classified.code };
  }

  if (bytes.byteLength <= 0) {
    return {
      ok: false,
      code: 'empty',
      error: 'That file is empty or unreadable. Choose another PDF, JPEG, PNG, or WebP.',
    };
  }
  if (bytes.byteLength > MAX_CREDENTIAL_FILE_BYTES) {
    return {
      ok: false,
      code: 'too_large',
      error: 'File must be 10 MB or smaller.',
    };
  }

  const sniffed = sniffCredentialMimeFromBytes(bytes);
  if (sniffed) {
    if (isConvertibleCredentialMime(sniffed) && !convertedFromHeic) {
      if (Platform.OS === 'web') {
        return {
          ok: false,
          code: 'conversion_failed',
          error:
            'HEIC photos cannot be converted in this browser. Choose a JPG, PNG, or PDF instead.',
        };
      }
      try {
        const converted = await convertHeicToJpeg(uri);
        uri = converted.uri;
        bytes = await readCredentialBytes(uri);
        mime = 'image/jpeg';
        convertedFromHeic = true;
      } catch {
        return {
          ok: false,
          code: 'conversion_failed',
          error: 'Could not convert that HEIC photo. Choose a JPG, PNG, or PDF instead.',
        };
      }
    } else if (isUploadableCredentialMime(sniffed)) {
      mime = sniffed;
    } else if (!isUploadableCredentialMime(mime)) {
      return {
        ok: false,
        code: 'unsupported_type',
        error: 'Unsupported file type. Use PDF, JPEG, PNG, or WebP.',
      };
    }
  }

  const finalCheck = validateCredentialUpload({
    mimeType: mime,
    sizeBytes: bytes.byteLength,
    fileName: `${displayName}.${credentialExtensionForMime(mime)}`,
    allowConvertible: false,
  });
  if (!finalCheck.ok) {
    const classified = classifyCredentialUploadError(finalCheck.error);
    return { ok: false, error: finalCheck.error, code: classified.code };
  }

  return {
    ok: true,
    file: {
      uri,
      mimeType: finalCheck.mimeType,
      sizeBytes: bytes.byteLength,
      displayName,
      convertedFromHeic,
      bytes,
    },
  };
}
