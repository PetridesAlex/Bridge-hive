import {
  canWorkerEditCredentialFile,
  credentialExpiryIsValid,
  credentialExtensionForMime,
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

import {
  classifyCredentialUploadError,
  prepareCredentialFile,
  type CredentialUploadFailureCode,
  type PreparedCredentialFile,
} from '@/lib/credential-file';
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

export type CredentialPickResult =
  | {
      ok: true;
      uri: string;
      mimeType: string;
      sizeBytes: number;
      fileName: string;
      prepared: PreparedCredentialFile;
    }
  | {
      ok: false;
      error: string;
      cancelled?: boolean;
      code?: CredentialUploadFailureCode;
    };

export type CredentialUploadStage =
  | 'idle'
  | 'selecting'
  | 'validating'
  | 'preparing'
  | 'uploading'
  | 'saving'
  | 'done'
  | 'failed';

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

/**
 * Pending checklist rows with a saved payload that should go in a batch submit.
 * Includes optional credentials such as CV when the worker uploaded them.
 */
export function credentialsReadyForBatchSubmit<T extends {
  credential: ChecklistRow['credential'];
  itemStatus: ChecklistRow['itemStatus'];
}>(rows: T[]): T[] {
  return rows.filter(
    (row) =>
      row.credential?.status === 'pending' && row.itemStatus === 'draft',
  );
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

const DOCUMENT_PICKER_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

async function finalizePick(params: {
  uri: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  fileName?: string | null;
}): Promise<CredentialPickResult> {
  const prepared = await prepareCredentialFile(params);
  if (!prepared.ok) {
    return {
      ok: false,
      error: prepared.error,
      code: prepared.code,
    };
  }
  const ext = credentialExtensionForMime(prepared.file.mimeType);
  const base = prepared.file.displayName.replace(/\.[^.]+$/, '');
  return {
    ok: true,
    uri: prepared.file.uri,
    mimeType: prepared.file.mimeType,
    sizeBytes: prepared.file.sizeBytes,
    fileName: `${base || 'document'}.${ext}`,
    prepared: prepared.file,
  };
}

export async function pickCredentialFile(): Promise<CredentialPickResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [...DOCUMENT_PICKER_TYPES],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { ok: false, error: 'Selection cancelled', cancelled: true, code: 'cancelled' };
    }

    const asset = result.assets[0];
    return finalizePick({
      uri: asset.uri,
      mimeType: asset.mimeType,
      sizeBytes: asset.size,
      fileName: asset.name,
    });
  } catch (err) {
    const classified = classifyCredentialUploadError(err);
    return { ok: false, error: classified.message, code: classified.code };
  }
}

export async function pickCredentialImage(): Promise<CredentialPickResult> {
  try {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return {
          ok: false,
          error: 'Photo library permission is required.',
          code: 'permission',
        };
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { ok: false, error: 'Selection cancelled', cancelled: true, code: 'cancelled' };
    }

    const asset = result.assets[0];
    return finalizePick({
      uri: asset.uri,
      mimeType: asset.mimeType,
      sizeBytes: asset.fileSize,
      fileName: asset.fileName ?? `photo.${credentialExtensionForMime(asset.mimeType ?? 'image/jpeg')}`,
    });
  } catch (err) {
    const classified = classifyCredentialUploadError(err);
    return { ok: false, error: classified.message, code: classified.code };
  }
}

export async function pickCredentialCamera(): Promise<CredentialPickResult> {
  if (Platform.OS === 'web') {
    return {
      ok: false,
      error: 'Camera capture is not available on web. Choose a photo or upload a file.',
      code: 'unsupported_type',
    };
  }

  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return {
        ok: false,
        error: 'Camera permission is required.',
        code: 'permission',
      };
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { ok: false, error: 'Selection cancelled', cancelled: true, code: 'cancelled' };
    }

    const asset = result.assets[0];
    return finalizePick({
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      sizeBytes: asset.fileSize,
      fileName: asset.fileName ?? 'camera.jpg',
    });
  } catch (err) {
    const classified = classifyCredentialUploadError(err);
    return { ok: false, error: classified.message, code: classified.code };
  }
}

/**
 * Upload a credential document for the authenticated worker.
 * Authorization uses auth.uid() at Storage/RLS — never trust a client worker ID.
 *
 * Replacement uploads a new unique object first; metadata switches only after
 * upload succeeds. On metadata failure the new object is removed and the prior
 * reference is retained.
 */
export async function uploadCredentialDocument(params: {
  credentialType: string;
  uri: string;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
  existingCredential?: Credential | null;
  expiresAtYmd?: string | null;
  /** Optional pre-read body from prepareCredentialFile to avoid a second read. */
  prepared?: PreparedCredentialFile | null;
  onStage?: (stage: CredentialUploadStage) => void;
}): Promise<{ data: Credential | null; error?: string; code?: CredentialUploadFailureCode }> {
  const report = (stage: CredentialUploadStage) => {
    params.onStage?.(stage);
  };

  if (isTextCredentialType(params.credentialType)) {
    return {
      data: null,
      error: 'This requirement is entered as text, not a file upload.',
      code: 'unsupported_type',
    };
  }

  report('validating');

  const expiry = resolveCredentialExpiresAt({
    credentialType: params.credentialType,
    expiresAtYmd: params.expiresAtYmd,
  });
  if ('error' in expiry) {
    return { data: null, error: expiry.error, code: 'unknown' };
  }

  let file = params.prepared ?? null;
  if (!file) {
    report('preparing');
    const prepared = await prepareCredentialFile({
      uri: params.uri,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      fileName: params.fileName,
    });
    if (!prepared.ok) {
      report('failed');
      return { data: null, error: prepared.error, code: prepared.code };
    }
    file = prepared.file;
  } else {
    const validation = validateCredentialUpload({
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      fileName: params.fileName,
    });
    if (!validation.ok) {
      report('failed');
      return { data: null, error: validation.error, code: 'unsupported_type' };
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    report('failed');
    return { data: null, error: 'You must be signed in.', code: 'session' };
  }

  const existing = params.existingCredential;
  if (existing && !canWorkerEditCredentialFile(existing.status)) {
    report('failed');
    return {
      data: null,
      error: 'Submitted documents cannot be replaced until rejected.',
      code: 'unknown',
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
      report('failed');
      return {
        data: null,
        error: createError?.message ?? 'Could not create credential record.',
        code: 'metadata',
      };
    }
    credential = created;
  }

  const ext = credentialExtensionForMime(file.mimeType);
  const objectName = `${user.id}/${params.credentialType}/${randomObjectId()}.${ext}`;

  report('uploading');
  const { error: uploadError } = await supabase.storage
    .from('credentials')
    .upload(objectName, file.bytes, {
      contentType: file.mimeType,
      upsert: false,
    });

  if (uploadError) {
    report('failed');
    const classified = classifyCredentialUploadError(uploadError.message);
    return {
      data: null,
      error: classified.message,
      code: classified.code === 'unknown' ? 'storage' : classified.code,
    };
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

  report('saving');
  const { data: updated, error: updateError } = await supabase
    .from('credentials')
    .update(metadataPatch as never)
    .eq('id', credential.id)
    .eq('worker_id', user.id)
    .select('*')
    .single();

  if (updateError || !updated) {
    // Best-effort cleanup of the newly uploaded object only — keep prior file.
    await supabase.storage.from('credentials').remove([objectName]);
    report('failed');
    return {
      data: null,
      error: updateError?.message ?? 'Could not save upload metadata.',
      code: 'metadata',
    };
  }

  if (previousPath && previousPath !== objectName) {
    await supabase.storage.from('credentials').remove([previousPath]);
  }

  report('done');
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
