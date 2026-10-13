'use server';

import {
  RECRUITMENT_PRIVACY_NOTICE_VERSION,
  RECRUITMENT_SUCCESS_MESSAGE,
  buildRecruitmentStoragePath,
  isRecruitmentWorkerRole,
  sanitizeRecruitmentOriginalFilename,
  validateRecruitmentConsentStep,
  validateRecruitmentDocumentBatch,
  validateRecruitmentPersonalStep,
  validateRecruitmentPreferencesStep,
  validateRecruitmentProfessionalStep,
  type RecruitmentEmploymentType,
  type WorkerRole,
} from '@bridge-hive/domain';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';

import { sendRecruitmentSubmissionNotify } from '@/lib/email/recruitment-notify';
import { asUntypedDb, type UntypedDb } from '@/lib/recruitment-db';
import { createServiceRoleClient } from '@/lib/supabase/admin';

const GENERIC_SUBMIT_ERROR =
  'Unable to submit your application. Please try again.';

export type RecruitmentSubmitState = {
  error?: string;
  success?: boolean;
  message?: string;
  candidateId?: string;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function hashClientIpHint(raw: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(',')[0]?.trim() ?? '';
  if (!first || first.length > 128) return null;
  return createHash('sha256').update(first).digest('hex');
}

async function cleanupFailedSubmission(
  admin: UntypedDb,
  candidateId: string,
  uploadedPaths: string[],
): Promise<void> {
  try {
    if (uploadedPaths.length > 0) {
      await admin.storage.from('recruitment-documents').remove(uploadedPaths);
    }
  } catch {
    // Best-effort storage cleanup after a partial failure.
  }
  try {
    await admin.from('recruitment_candidates').delete().eq('id', candidateId);
  } catch {
    // Best-effort DB cleanup; cascade removes child rows when delete succeeds.
  }
}

export async function submitRecruitmentApplicationAction(
  _prev: RecruitmentSubmitState,
  formData: FormData,
): Promise<RecruitmentSubmitState> {
  try {
    const draft = {
      path: 'professional' as const,
      fullName: readString(formData, 'fullName'),
      email: readString(formData, 'email').toLowerCase(),
      phone: readString(formData, 'phone'),
      currentLocation: readString(formData, 'currentLocation'),
      countryOfResidence: readString(formData, 'countryOfResidence'),
      preferredCyprusLocation: readString(formData, 'preferredCyprusLocation'),
      role: readString(formData, 'role') as WorkerRole | '',
      yearsExperience: readString(formData, 'yearsExperience'),
      registrationState: readString(formData, 'registrationState'),
      employmentType: readString(
        formData,
        'employmentType',
      ) as RecruitmentEmploymentType | '',
      preferredEnvironments: readString(formData, 'preferredEnvironments'),
      areasOfInterest: readString(formData, 'areasOfInterest'),
      availability: readString(formData, 'availability'),
      consentAccepted: formData.get('consentAccepted') === 'true',
    };

    const stepError =
      validateRecruitmentPersonalStep(draft) ??
      validateRecruitmentProfessionalStep(draft) ??
      validateRecruitmentPreferencesStep(draft) ??
      validateRecruitmentConsentStep(draft);
    if (stepError) return { error: stepError };
    if (!isRecruitmentWorkerRole(draft.role) || !draft.employmentType) {
      return { error: 'Application is incomplete.' };
    }

    const files = formData
      .getAll('documents')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const docTypes = formData
      .getAll('documentTypes')
      .map((v) => (typeof v === 'string' ? v : ''));

    if (files.length !== docTypes.length) {
      return { error: 'Document metadata does not match uploads.' };
    }

    const batch = validateRecruitmentDocumentBatch({
      role: draft.role,
      documents: files.map((file, index) => ({
        documentType: docTypes[index] ?? '',
        mimeType: file.type,
        sizeBytes: file.size,
        expiresAtYmd: (() => {
          const raw = formData.get(`expiresAt:${docTypes[index] ?? ''}`);
          return typeof raw === 'string' ? raw : null;
        })(),
      })),
    });
    if (!batch.ok) return { error: batch.error };

    const hdrs = await headers();
    const clientIpHash = hashClientIpHint(
      hdrs.get('x-real-ip') ?? hdrs.get('x-forwarded-for'),
    );
    const admin = asUntypedDb(createServiceRoleClient());
    const { data, error } = await admin.rpc('submit_recruitment_application', {
      p_payload: {
        path: draft.path,
        full_name: draft.fullName,
        email: draft.email,
        phone: draft.phone,
        current_location: draft.currentLocation,
        country_of_residence: draft.countryOfResidence,
        preferred_cyprus_location: draft.preferredCyprusLocation || null,
        role: draft.role,
        years_experience: draft.yearsExperience,
        registration_state: draft.registrationState,
        employment_type: draft.employmentType,
        preferred_environments: draft.preferredEnvironments || null,
        areas_of_interest: draft.areasOfInterest || null,
        availability: draft.availability,
        privacy_notice_version: RECRUITMENT_PRIVACY_NOTICE_VERSION,
        user_agent: hdrs.get('user-agent')?.slice(0, 500) ?? null,
        client_ip_hash: clientIpHash,
      },
    });

    if (error) {
      if (
        error.message.includes('Could not find the function') ||
        error.message.includes('schema cache') ||
        error.code === 'PGRST202'
      ) {
        return {
          error:
            'Recruitment submissions are not enabled on this environment yet. Please try again after the Preview database is migrated.',
        };
      }
      return { error: GENERIC_SUBMIT_ERROR };
    }

    const candidateId =
      typeof data === 'string'
        ? data
        : data && typeof data === 'object' && 'candidate_id' in data
          ? String((data as { candidate_id: string }).candidate_id)
          : null;

    if (!candidateId) {
      return { error: GENERIC_SUBMIT_ERROR };
    }

    const uploadedPaths: string[] = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]!;
      const meta = batch.documents[i]!;
      const objectPath = buildRecruitmentStoragePath({
        candidateId,
        documentType: meta.documentType,
        extension: meta.extension,
      });
      if (!objectPath) {
        await cleanupFailedSubmission(admin, candidateId, uploadedPaths);
        return { error: GENERIC_SUBMIT_ERROR };
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await admin.storage
        .from('recruitment-documents')
        .upload(objectPath, buffer, {
          contentType: meta.mimeType,
          upsert: false,
        });
      if (uploadError) {
        await cleanupFailedSubmission(admin, candidateId, uploadedPaths);
        return { error: GENERIC_SUBMIT_ERROR };
      }
      uploadedPaths.push(objectPath);

      const { error: insertError } = await admin
        .from('recruitment_documents')
        .insert({
          candidate_id: candidateId,
          document_type: meta.documentType,
          storage_path: objectPath,
          mime_type: meta.mimeType,
          byte_size: meta.sizeBytes,
          original_filename: sanitizeRecruitmentOriginalFilename(file.name),
          expires_at: meta.expiresAt,
        });
      if (insertError) {
        await cleanupFailedSubmission(admin, candidateId, uploadedPaths);
        return { error: GENERIC_SUBMIT_ERROR };
      }
    }

    // Best-effort ops notify after a successful commit. Never roll back or
    // change the candidate success response if email delivery fails.
    try {
      await sendRecruitmentSubmissionNotify({
        candidateId,
        role: draft.role,
        submittedAt: new Date(),
      });
    } catch {
      console.warn(
        '[recruitment-notify] best-effort email threw; submission kept successful',
      );
    }

    return {
      success: true,
      message: RECRUITMENT_SUCCESS_MESSAGE,
      candidateId,
    };
  } catch {
    return { error: GENERIC_SUBMIT_ERROR };
  }
}
