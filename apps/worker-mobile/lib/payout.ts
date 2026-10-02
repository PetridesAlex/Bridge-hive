import {
  validatePayoutProofUpload,
  type AllowedPayoutProofMimeType,
} from '@bridge-hive/domain';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

function extensionForMime(mime: string): string {
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  return 'jpg';
}

function randomObjectId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Could not read the selected file.');
  }
  return response.arrayBuffer();
}

export async function pickPayoutProofFile(): Promise<
  | {
      ok: true;
      uri: string;
      mimeType: AllowedPayoutProofMimeType;
      sizeBytes: number;
      fileName: string;
    }
  | { ok: false; error: string; cancelled?: boolean }
> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { ok: false, error: 'Selection cancelled', cancelled: true };
  }

  const asset = result.assets[0];
  const mimeType = (asset.mimeType ?? 'application/octet-stream') as AllowedPayoutProofMimeType;
  const sizeBytes = asset.size ?? 0;
  const validation = validatePayoutProofUpload({ mimeType, sizeBytes });
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  return {
    ok: true,
    uri: asset.uri,
    mimeType,
    sizeBytes,
    fileName: asset.name || `proof.${extensionForMime(mimeType)}`,
  };
}

export async function pickPayoutProofImage(): Promise<
  | {
      ok: true;
      uri: string;
      mimeType: AllowedPayoutProofMimeType;
      sizeBytes: number;
      fileName: string;
    }
  | { ok: false; error: string; cancelled?: boolean }
> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { ok: false, error: 'Photo library permission is required.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { ok: false, error: 'Selection cancelled', cancelled: true };
  }

  const asset = result.assets[0];
  const mimeType = (asset.mimeType ?? 'image/jpeg') as AllowedPayoutProofMimeType;
  const sizeBytes = asset.fileSize ?? 0;
  const validation = validatePayoutProofUpload({
    mimeType,
    sizeBytes: sizeBytes || 1,
  });
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  return {
    ok: true,
    uri: asset.uri,
    mimeType,
    sizeBytes: sizeBytes || 1,
    fileName: asset.fileName || `proof.${extensionForMime(mimeType)}`,
  };
}

export async function uploadPayoutProof(params: {
  userId: string;
  uri: string;
  mimeType: string;
}): Promise<{ path?: string; error?: string }> {
  try {
    const bytes = await readFileAsArrayBuffer(params.uri);
    const path = `${params.userId}/proof_${randomObjectId()}.${extensionForMime(params.mimeType)}`;
    const { error } = await supabase.storage.from('payout-proofs').upload(path, bytes, {
      contentType: params.mimeType,
      upsert: false,
    });
    if (error) {
      return { error: error.message };
    }
    return { path };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Upload failed.',
    };
  }
}
