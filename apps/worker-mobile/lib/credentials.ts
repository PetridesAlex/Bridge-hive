import {
  canWorkerEditCredentialFile,
  credentialExpiryIsValid,
  credentialPayloadPresent,
  credentialRequiresKnownExpiry,
  credentialRequirementsForRole,
  credentialTypeLabel,
  endOfCyprusBusinessDayIso,
  isTextCredentialType,
  mapCredentialStatusToChecklistStatus,
  validateCredentialTextValue,
  validateCredentialUpload,
  type CredentialRequirement,
  type DocumentChecklistItemStatus,
} from '@bridge-hive/domain';
import type { WorkerRole } from '@bridge-hive/domain';
import type { Tables } from '@bridge-hive/supabase-types';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export type Credential = Tables<'credentials'>;

export type ChecklistRow = CredentialRequirement & {
  credential: Credential | null;
  itemStatus: DocumentChecklistItemStatus;
  displayName: string;
  fileName: string | null;
  textValue: string | null;
  hasTextValue: boolean;
  hasFile: boolean;
  inputKind: 'file' | 'text';
};

export function hasStoredFile(credential: Credential | null): boolean {
  if (!credential) return false;
  if (credential.storage_path) return true;
  const paths = (credential as { storage_paths?: unknown }).storage_paths;
  return Array.isArray(paths) && paths.length > 0;
}

export function hasStoredTextValue(credential: Credential | null): boolean {
  if (!credential) return false;
  if (typeof credential.has_text_value === 'boolean') {
    return credential.has_text_value;
  }
  return Boolean(credential.text_value?.trim());
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
    const textPresent = hasStoredTextValue(credential);
    const payloadPresent = credentialPayloadPresent({
      hasFile: filePresent,
      hasTextValue: textPresent,
    });
    const inputKind = isTextCredentialType(req.credentialType) ? 'text' : 'file';
    return {
      ...req,
      credential,
      itemStatus: mapCredentialStatusToChecklistStatus(
        credential?.status,
        payloadPresent,
      ),
      displayName: credentialTypeLabel(req.credentialType, params.locale ?? 'en'),
      fileName: filePresent
        ? (credential?.storage_path ?? '').split('/').pop() || 'Uploaded file'
        : null,
      textValue: credential?.text_value?.trim() ? credential.text_value.trim() : null,
      hasTextValue: textPresent,
      hasFile: filePresent,
      inputKind,
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

export function resolveCredentialExpiresAt(params: {
  credentialType: string;
  expiresAtYmd?: string | null;
}): { expiresAt: string | null } | { error: string } {
  if (!credentialRequiresKnownExpiry(params.credentialType)) {
    return { expiresAt: null };
  }

  const ymd = params.expiresAtYmd?.trim() ?? '';
  if (!ymd) {
    return {
      error: 'Enter the licence expiry date (YYYY-MM-DD) before uploading.',
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return { error: 'Use date format YYYY-MM-DD for the licence expiry.' };
  }

  let expiresAt: string;
  try {
    expiresAt = endOfCyprusBusinessDayIso(ymd);
  } catch {
    return {
      error:
        'Enter a real calendar date (YYYY-MM-DD). Impossible dates such as 31 February are rejected.',
    };
  }

  if (
    !credentialExpiryIsValid({
      credentialType: params.credentialType,
      expiresAt,
    })
  ) {
    return {
      error:
        'Licence expiry must still be valid now. Same-day Cyprus dates remain valid through end of that day.',
    };
  }

  return { expiresAt };
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
  // Web uses a file input; native needs an explicit media-library grant.
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, error: 'Photo library permission is required.' };
    }
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
  expiresAtYmd?: string | null;
}): Promise<{ data: Credential | null; error?: string }> {
  if (isTextCredentialType(params.credentialType)) {
    return {
      data: null,
      error: 'This requirement is entered as text, not a file upload.',
    };
  }

  const validation = validateCredentialUpload({
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
  });
  if (!validation.ok) {
    return { data: null, error: validation.error };
  }

  const expiry = resolveCredentialExpiresAt({
    credentialType: params.credentialType,
    expiresAtYmd: params.expiresAtYmd,
  });
  if ('error' in expiry) {
    return { data: null, error: expiry.error };
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
        expires_at: expiry.expiresAt,
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

  const metadataPatch: {
    storage_path: string;
    storage_paths: string[];
    expires_at?: string | null;
  } = {
    storage_path: objectName,
    storage_paths: [objectName],
  };
  if (credentialRequiresKnownExpiry(params.credentialType)) {
    metadataPatch.expires_at = expiry.expiresAt;
  }

  const { data: updated, error: updateError } = await supabase
    .from('credentials')
    .update(metadataPatch as never)
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


/**
 * Save a text credential value for the authenticated worker via RPC.
 * Never logs the value. Authorization is server-side (auth.uid()).
 */
export async function saveCredentialTextValue(params: {
  credentialType: string;
  value: string;
}): Promise<{ data: Credential | null; error?: string }> {
  if (!isTextCredentialType(params.credentialType)) {
    return { data: null, error: 'This requirement is a file upload, not text.' };
  }

  const validated = validateCredentialTextValue(params.value);
  if (!validated.ok) {
    return { data: null, error: validated.error };
  }

  const { data, error } = await supabase.rpc('save_my_credential_text_value', {
    p_credential_type: params.credentialType,
    p_value: validated.value,
  });

  if (error) {
    const message = error.message ?? '';
    if (message.includes('CREDENTIAL_TEXT_REQUIRED')) {
      return { data: null, error: 'This field is required.' };
    }
    if (message.includes('CREDENTIAL_TEXT_TOO_LONG')) {
      return { data: null, error: 'Value is too long.' };
    }
    if (message.includes('CREDENTIAL_TEXT_INVALID_CHARS')) {
      return { data: null, error: 'Invalid characters are not allowed.' };
    }
    if (message.includes('CREDENTIAL_TEXT_PLACEHOLDER')) {
      return { data: null, error: 'Enter the actual identification value.' };
    }
    if (message.includes('CREDENTIAL_TEXT_LOCKED')) {
      return {
        data: null,
        error: 'This value cannot be edited while under review or after acceptance.',
      };
    }
    // Generic — never echo the submitted value.
    return { data: null, error: 'Could not save. Please try again.' };
  }

  return { data: (data as Credential | null) ?? null };
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
