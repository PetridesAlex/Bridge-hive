'use server';

import {
  RECRUITMENT_PRIVACY_NOTICE_VERSION,
  RECRUITMENT_SUCCESS_MESSAGE,
  isRecruitmentWorkerRole,
  recruitmentDocumentRequirementsForRole,
  validateRecruitmentConsentStep,
  validateRecruitmentPersonalStep,
  validateRecruitmentPreferencesStep,
  validateRecruitmentProfessionalStep,
  validateRecruitmentUpload,
  type CredentialType,
  type RecruitmentEmploymentType,
  type WorkerRole,
} from '@bridge-hive/domain';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

const MAX_RECRUITMENT_UPLOADS = 12;

export type RecruitmentSubmitState = {
  error?: string;
  success?: boolean;
  message?: string;
  candidateId?: string;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase service configuration.');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
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
    if (files.length > MAX_RECRUITMENT_UPLOADS) {
      return { error: 'Too many documents uploaded.' };
    }

    const allowedDocTypes = new Set(
      recruitmentDocumentRequirementsForRole(draft.role).map(
        (d) => d.credentialType,
      ),
    );
    for (const docType of docTypes) {
      if (
        !docType ||
        docType.includes('/') ||
        docType.includes('\\') ||
        docType.includes('..') ||
        !allowedDocTypes.has(docType as CredentialType)
      ) {
        return { error: 'Invalid document type for the selected role.' };
      }
    }

    for (const file of files) {
      const check = validateRecruitmentUpload({
        type: file.type,
        size: file.size,
      });
      if (!check.ok) return { error: check.error };
    }

    const hdrs = await headers();
    const admin = adminClient();
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
      return { error: 'Unable to submit your application. Please try again.' };
    }

    const candidateId =
      typeof data === 'string'
        ? data
        : data && typeof data === 'object' && 'candidate_id' in data
          ? String((data as { candidate_id: string }).candidate_id)
          : null;

    if (!candidateId) {
      return { error: 'Submission did not return a candidate reference.' };
    }

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]!;
      const docType = docTypes[i]!;
      const ext =
        file.type === 'application/pdf'
          ? 'pdf'
          : file.type === 'image/png'
            ? 'png'
            : 'jpg';
      const objectPath = `${candidateId}/${docType}/${crypto.randomUUID()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await admin.storage
        .from('recruitment-documents')
        .upload(objectPath, buffer, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) {
        return {
          error:
            'Your profile was created but a document upload failed. Our team can help you finish.',
          candidateId,
        };
      }
      const expiresAt = formData.get(`expiresAt:${docType}`);
      await admin.from('recruitment_documents').insert({
        candidate_id: candidateId,
        document_type: docType,
        storage_path: objectPath,
        mime_type: file.type,
        byte_size: file.size,
        original_filename: file.name.slice(0, 200),
        expires_at:
          typeof expiresAt === 'string' && expiresAt.trim()
            ? expiresAt.trim()
            : null,
      });
    }

    return {
      success: true,
      message: RECRUITMENT_SUCCESS_MESSAGE,
      candidateId,
    };
  } catch {
    return { error: 'Unable to submit your application. Please try again.' };
  }
}
