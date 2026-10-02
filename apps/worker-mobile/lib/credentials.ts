import {
  canWorkerEditCredentialFile,
  credentialRequirementsForRole,
  credentialTypeLabel,
  mapCredentialStatusToChecklistStatus,
  validateCredentialUpload,
  type CredentialRequirement,
  type DocumentChecklistItemStatus,
} from '@bridge-hive/domain';
import type { WorkerRole } from '@bridge-hive/domain';
import type { Tables } from '@bridge-hive/supabase-types';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export type Credential = Tables<'credentials'>;

export type ChecklistRow = CredentialRequirement & {
  credential: Credential | null;
  itemStatus: DocumentChecklistItemStatus;
  displayName: string;
  fileName: string | null;
};

function hasStoredFile(credential: Credential | null): boolean {
  if (!credential) return false;
  if (credential.storage_path) return true;
  const paths = (credential as { storage_paths?: unknown }).storage_paths;
  return Array.isArray(paths) && paths.length > 0;
}

function pickPreferredCredential(
  rows: Credential[],
  credentialType: string,
): Credential | null {
  const matches = rows.filter((c) => c.credential_type === credentialType);
  if (matches.length === 0) return null;
  const rank = (status: string) => {
    switch (status) {
      case 'verified':
        return 5;
      case 'under_review':
        return 4;
      case 'pending':
        return 3;
      case 'rejected':
        return 2;
      default:
        return 1;
    }
  };
  return [...matches].sort((a, b) => rank(b.status) - rank(a.status))[0] ?? null;
}

export function buildCredentialChecklist(params: {
  role: WorkerRole | null | undefined;
  credentials: Credential[];
  locale?: 'en' | 'el';
}): ChecklistRow[] {
  return credentialRequirementsForRole(params.role).map((req) => {
    const credential = pickPreferredCredential(
      params.credentials,
      req.credentialType,
    );
    const filePresent = hasStoredFile(credential);
    return {
      ...req,
      credential,
      itemStatus: mapCredentialStatusToChecklistStatus(
        credential?.status,
        filePresent,
      ),
      displayName: credentialTypeLabel(req.credentialType, params.locale ?? 'en'),
      fileName: filePresent
        ? (credential?.storage_path ?? '').split('/').pop() || 'Uploaded file'
        : null,
    };
  });
}

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

export async function pickCredentialFile(): Promise<
  | {
      ok: true;
      uri: string;
      mimeType: string;
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
  const mimeType = asset.mimeType ?? 'application/octet-stream';
  const sizeBytes = asset.size ?? 0;
  const validation = validateCredentialUpload({ mimeType, sizeBytes });
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  return {
    ok: true,
    uri: asset.uri,
    mimeType,
    sizeBytes,
    fileName: asset.name || `document.${extensionForMime(mimeType)}`,
  };
}

export async function pickCredentialImage(): Promise<
  | {
      ok: true;
      uri: string;
      mimeType: string;
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
  const mimeType = asset.mimeType ?? 'image/jpeg';
  const sizeBytes = asset.fileSize ?? 0;
  const validation = validateCredentialUpload({
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
    fileName: asset.fileName || `image.${extensionForMime(mimeType)}`,
  };
}

/**
 * Upload a credential document for the authenticated worker.
 * Authorization uses auth.uid() at Storage/RLS — never trust a client worker ID.
 */
export async function uploadCredentialDocument(params: {
  credentialType: string;
  uri: string;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
  existingCredential?: Credential | null;
}): Promise<{ data: Credential | null; error?: string }> {
  const validation = validateCredentialUpload({
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
  });
  if (!validation.ok) {
    return { data: null, error: validation.error };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { data: null, error: 'You must be signed in.' };
  }

  const existing = params.existingCredential;
  if (existing && !canWorkerEditCredentialFile(existing.status)) {
    return {
      data: null,
      error: 'Submitted documents cannot be replaced until rejected.',
    };
  }

  // Rejected credentials keep history; create a fresh pending row.
  let credential = existing && existing.status === 'pending' ? existing : null;

  if (!credential) {
    const { data: created, error: createError } = await supabase
      .from('credentials')
      .insert({
        worker_id: user.id,
        credential_type: params.credentialType,
        status: 'pending',
      })
      .select('*')
      .single();

    if (createError || !created) {
      return {
        data: null,
        error: createError?.message ?? 'Could not create credential record.',
      };
    }
    credential = created;
  }

  const objectName = `${user.id}/${params.credentialType}/${randomObjectId()}.${extensionForMime(params.mimeType)}`;

  let bytes: ArrayBuffer;
  try {
    bytes = await readFileAsArrayBuffer(params.uri);
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Could not read file.',
    };
  }

  if (bytes.byteLength > 10 * 1024 * 1024) {
    return { data: null, error: 'File must be 10 MB or smaller.' };
  }

  const { error: uploadError } = await supabase.storage
    .from('credentials')
    .upload(objectName, bytes, {
      contentType: params.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { data: null, error: uploadError.message };
  }

  const previousPath = credential.storage_path;

  const { data: updated, error: updateError } = await supabase
    .from('credentials')
    .update({
      storage_path: objectName,
      storage_paths: [objectName],
    } as never)
    .eq('id', credential.id)
    .eq('worker_id', user.id)
    .select('*')
    .single();

  if (updateError || !updated) {
    // Best-effort cleanup of the newly uploaded object.
    await supabase.storage.from('credentials').remove([objectName]);
    return {
      data: null,
      error: updateError?.message ?? 'Could not save upload metadata.',
    };
  }

  if (previousPath && previousPath !== objectName) {
    await supabase.storage.from('credentials').remove([previousPath]);
  }

  return { data: updated };
}

export async function deletePendingCredentialFile(params: {
  credential: Credential;
}): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  if (params.credential.worker_id !== user.id) {
    return { error: 'Not authorized.' };
  }
  if (params.credential.status !== 'pending') {
    return { error: 'Only unsubmitted documents can be deleted.' };
  }

  const path = params.credential.storage_path;
  const { error: deleteError } = await supabase
    .from('credentials')
    .delete()
    .eq('id', params.credential.id)
    .eq('worker_id', user.id)
    .eq('status', 'pending');

  if (deleteError) return { error: deleteError.message };

  if (path) {
    await supabase.storage.from('credentials').remove([path]);
  }

  return {};
}

export async function submitCredentialForReview(credentialId: string) {
  const { data, error } = await supabase.rpc('submit_credential_for_review', {
    p_credential_id: credentialId,
  });
  return {
    data: (data as Credential | null) ?? null,
    error: error?.message,
  };
}
