import {
  RECRUITMENT_MAX_TOTAL_UPLOAD_BYTES,
  RECRUITMENT_MAX_UPLOAD_FILES,
  emptyRecruitmentApplicationDraft,
  isSafeRecruitmentDocumentType,
  recruitmentApplicationDocumentRequirements,
  recruitmentDocumentRequirementsForRole,
  resolveRecruitmentDocumentExpiresAt,
  validateRecruitmentConsentStep,
  validateRecruitmentDocumentBatch,
  validateRecruitmentProfessionalStep,
  validateRecruitmentUpload,
} from '@bridge-hive/domain';
import fs from 'node:fs/promises';
import path from 'node:path';

const webRoot = process.cwd();
const repoRoot = path.resolve(webRoot, '../..');

const rpcMock = jest.fn();
const uploadMock = jest.fn();
const insertMock = jest.fn();
const removeMock = jest.fn();
const deleteEqMock = jest.fn();
const notifyMock = jest.fn();

jest.mock('server-only', () => ({}));

jest.mock('next/headers', () => ({
  headers: async () =>
    new Headers({
      'user-agent': 'jest',
      'x-real-ip': '203.0.113.10',
    }),
}));

jest.mock('@/lib/email/recruitment-notify', () => ({
  sendRecruitmentSubmissionNotify: (...args: unknown[]) => notifyMock(...args),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createServiceRoleClient: () => ({
    rpc: rpcMock,
    storage: {
      from: () => ({
        upload: uploadMock,
        remove: removeMock,
      }),
    },
    from: (table: string) => {
      if (table === 'recruitment_documents') {
        return { insert: insertMock };
      }
      if (table === 'recruitment_candidates') {
        return {
          delete: () => ({
            eq: deleteEqMock,
          }),
        };
      }
      return {};
    },
  }),
}));

function validDraftFields(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    fullName: 'Alex Example',
    email: 'alex.example@test.local',
    phone: '+35799000099',
    currentLocation: 'Nicosia',
    countryOfResidence: 'Cyprus',
    preferredCyprusLocation: '',
    role: 'registered_nurse',
    yearsExperience: '5 years',
    registrationState: 'Registered',
    employmentType: 'full_time',
    preferredEnvironments: 'Hospital',
    areasOfInterest: 'ICU',
    availability: 'Immediate',
    consentAccepted: 'true',
    ...overrides,
  };
  for (const [key, value] of Object.entries(base)) {
    fd.set(key, value);
  }
  return fd;
}

function pdfFile(name: string, size = 1024): File {
  const buf = Buffer.alloc(size, 1);
  return new File([buf], name, { type: 'application/pdf' });
}

describe('recruitment domain helpers', () => {
  it('keeps consent unchecked and validates role enum', () => {
    const draft = emptyRecruitmentApplicationDraft();
    expect(draft.consentAccepted).toBe(false);
    expect(validateRecruitmentConsentStep(draft)).toMatch(/accept/i);
    draft.role = 'physiotherapist';
    draft.yearsExperience = '5 years';
    draft.registrationState = 'Registered';
    expect(validateRecruitmentProfessionalStep(draft)).toBeNull();
  });

  it('keeps the public document checklist and omits tax and social insurance', () => {
    const docs = recruitmentApplicationDocumentRequirements();
    expect(docs.map((d) => d.credentialType)).toEqual([
      'identity_document_front',
      'identity_document_back',
      'cv',
      'nursing_degree',
      'nursing_licence',
      'employment_certificate',
      'physiotherapy_degree',
      'physiotherapist_registration_certificate',
      'physiotherapy_practising_licence',
    ]);
    expect(docs.filter((d) => d.isRequired).map((d) => d.credentialType)).toEqual([
      'identity_document_front',
      'identity_document_back',
    ]);
    expect(
      docs.some((d) => d.credentialType === 'tax_identification_proof'),
    ).toBe(false);
    expect(
      docs.some((d) => d.credentialType === 'social_insurance_proof'),
    ).toBe(false);
  });

  it('reuses physio document checklist with practising licence expiry', () => {
    const docs = recruitmentDocumentRequirementsForRole('physiotherapist');
    expect(docs.filter((d) => d.isRequired)).toHaveLength(5);
    expect(
      docs.some((d) => d.credentialType === 'tax_identification_proof'),
    ).toBe(false);
    expect(
      docs.some((d) => d.credentialType === 'social_insurance_proof'),
    ).toBe(false);
    expect(
      docs.find((d) => d.credentialType === 'physiotherapy_practising_licence')
        ?.requiresExpiry,
    ).toBe(true);
  });

  it('rejects invalid uploads and unsafe document types', () => {
    expect(
      validateRecruitmentUpload({ type: 'application/pdf', size: 100 }).ok,
    ).toBe(true);
    expect(validateRecruitmentUpload({ type: 'text/html', size: 100 }).ok).toBe(
      false,
    );
    expect(isSafeRecruitmentDocumentType('cv')).toBe(true);
    expect(isSafeRecruitmentDocumentType('../etc/passwd')).toBe(false);
    expect(isSafeRecruitmentDocumentType('a/../../b')).toBe(false);
    expect(isSafeRecruitmentDocumentType('')).toBe(false);
    expect(isSafeRecruitmentDocumentType('unknown_type')).toBe(false);
  });

  it('rejects forged document batches before any write', () => {
    expect(
      validateRecruitmentDocumentBatch({
        role: 'registered_nurse',
        documents: [
          {
            documentType: 'not_a_real_type',
            mimeType: 'application/pdf',
            sizeBytes: 100,
          },
        ],
      }).ok,
    ).toBe(false);

    expect(
      validateRecruitmentDocumentBatch({
        role: 'registered_nurse',
        documents: [
          {
            documentType: '../secret',
            mimeType: 'application/pdf',
            sizeBytes: 100,
          },
        ],
      }).ok,
    ).toBe(false);

    const tooMany = Array.from({ length: RECRUITMENT_MAX_UPLOAD_FILES + 1 }, () => ({
      documentType: 'cv',
      mimeType: 'application/pdf',
      sizeBytes: 100,
    }));
    expect(
      validateRecruitmentDocumentBatch({
        role: 'registered_nurse',
        documents: tooMany,
      }).ok,
    ).toBe(false);

    expect(
      validateRecruitmentDocumentBatch({
        role: 'registered_nurse',
        documents: [
          {
            documentType: 'cv',
            mimeType: 'application/pdf',
            sizeBytes: RECRUITMENT_MAX_TOTAL_UPLOAD_BYTES + 1,
          },
        ],
      }).ok,
    ).toBe(false);
  });

  it('validates expiry only for practising licence', () => {
    const future = '2099-12-31';
    expect(
      resolveRecruitmentDocumentExpiresAt({
        documentType: 'physiotherapy_practising_licence',
        expiresAtYmd: future,
      }),
    ).toEqual({ expiresAt: future });
    expect(
      resolveRecruitmentDocumentExpiresAt({
        documentType: 'physiotherapy_practising_licence',
        expiresAtYmd: 'not-a-date',
      }),
    ).toMatchObject({ error: expect.any(String) });
    expect(
      resolveRecruitmentDocumentExpiresAt({
        documentType: 'cv',
        expiresAtYmd: future,
      }),
    ).toEqual({ expiresAt: null });
    expect(
      resolveRecruitmentDocumentExpiresAt({
        documentType: 'cv',
        expiresAtYmd: 'bad-date',
      }),
    ).toMatchObject({ error: expect.any(String) });
    expect(
      resolveRecruitmentDocumentExpiresAt({
        documentType: 'cv',
        expiresAtYmd: null,
      }),
    ).toEqual({ expiresAt: null });
  });
});

async function readWeb(...parts: string[]) {
  return fs.readFile(path.join(webRoot, ...parts), 'utf8');
}

describe('recruitment route contracts', () => {
  it('exposes public /recruitment and apply under marketing', async () => {
    const landing = await readWeb('app/(marketing)/recruitment/page.tsx');
    const apply = await readWeb('app/(marketing)/recruitment/apply/page.tsx');
    const nav = await readWeb('components/marketing/nav-config.ts');
    const middleware = await readWeb('middleware.ts');

    expect(landing).toMatch(/bridgehive\.app\/recruitment/);
    expect(landing).toMatch(/Join the talent network|talent network/i);
    expect(landing).not.toMatch(/\/organization\/recruitment/);
    expect(apply).toMatch(/RecruitmentApplyForm/);
    expect(nav).toMatch(/href: '\/recruitment'/);
    expect(middleware).toMatch(/\/recruitment/);
  });

  it('keeps consent unchecked and does not collect a professional role', async () => {
    const form = await readWeb('components/marketing/recruitment-apply-form.tsx');
    expect(form).toMatch(/consentAccepted/);
    expect(form).not.toMatch(/Professional role/);
    expect(form).not.toMatch(/WORKER_ROLES/);
    expect(form).toMatch(/checked=\{draft\.consentAccepted\}/);
    expect(form).not.toMatch(/defaultChecked=\{true\}/);
    expect(form).toMatch(/Submit talent profile/);
    expect(form).toMatch(/recruitmentApplicationDocumentRequirements/);
    expect(form).not.toMatch(/No documents are required/);
  });

  it('org portal uses /org/[slug]/recruitment with organisation alias', async () => {
    const orgPage = await readWeb('app/(app)/org/[slug]/recruitment/page.tsx');
    const alias = await readWeb('app/(app)/organisation/recruitment/page.tsx');
    expect(orgPage).toMatch(/canAccessRecruitment/);
    expect(alias).toMatch(/\/org\/\$\{.*\}\/recruitment/);
  });

  it('admin recruitment is capability gated', async () => {
    const admin = await readWeb('app/(app)/admin/(console)/recruitment/page.tsx');
    const sidebar = await readWeb('components/admin/admin-sidebar.tsx');
    expect(admin).toMatch(/canReviewRecruitment/);
    expect(sidebar).toMatch(/\/admin\/recruitment/);
  });
});

describe('recruitment migration contracts', () => {
  it('hardens 029 submit surface and shared note availability predicate', async () => {
    const src = await fs.readFile(
      path.join(repoRoot, 'supabase/migrations/029_recruitment_core.sql'),
      'utf8',
    );
    expect(src).toMatch(/recruitment_candidates/);
    expect(src).toMatch(/recruitment_org_pipeline/);
    expect(src).toMatch(/recruitment_org_notes/);
    expect(src).toMatch(/recruitment_consents/);
    expect(src).toMatch(/recruitment-documents/);
    expect(src).toMatch(/submit_recruitment_application/);
    expect(src).toMatch(/org_has_recruitment_access/);
    expect(src).toMatch(/recruitment_org_may_write_candidate/);
    expect(src).toMatch(/recruitment_enabled/);
    expect(src).toMatch(/recruitment_submit_throttle/);
    expect(src).toMatch(/RECRUITMENT_SUBMIT_REJECTED/);
    expect(src).toMatch(
      /grant execute on function public\.submit_recruitment_application\(jsonb\) to service_role/,
    );
    expect(src).toMatch(
      /revoke all on function public\.submit_recruitment_application\(jsonb\) from anon, authenticated/,
    );
    expect(src).not.toMatch(
      /grant execute on function public\.submit_recruitment_application\(jsonb\) to anon/,
    );
    expect(src).not.toMatch(/for select to anon/);
    expect(src).toMatch(/unique \(organization_id, candidate_id\)/);
  });

  it('documents body size and infrastructure requirements in next config', async () => {
    const nextConfig = await readWeb('next.config.ts');
    expect(nextConfig).toMatch(/bodySizeLimit:\s*'32mb'/);
  });
});

describe('submitRecruitmentApplicationAction forged requests', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    uploadMock.mockReset();
    insertMock.mockReset();
    removeMock.mockReset();
    deleteEqMock.mockReset();
    notifyMock.mockReset();
    notifyMock.mockResolvedValue({ sent: true });
  });

  it('rejects unknown document type before RPC or storage', async () => {
    const { submitRecruitmentApplicationAction } = await import(
      '../recruitment-application'
    );
    const fd = validDraftFields();
    fd.append('documents', pdfFile('x.pdf'));
    fd.append('documentTypes', 'not_a_real_type');

    const result = await submitRecruitmentApplicationAction({}, fd);
    expect(result.error).toMatch(/invalid document type/i);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('rejects path traversal document types before writes', async () => {
    const { submitRecruitmentApplicationAction } = await import(
      '../recruitment-application'
    );
    const fd = validDraftFields();
    fd.append('documents', pdfFile('x.pdf'));
    fd.append('documentTypes', '../etc/passwd');

    const result = await submitRecruitmentApplicationAction({}, fd);
    expect(result.error).toMatch(/invalid document type/i);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('rejects too many files before writes', async () => {
    const { submitRecruitmentApplicationAction } = await import(
      '../recruitment-application'
    );
    const fd = validDraftFields();
    const types = recruitmentDocumentRequirementsForRole('registered_nurse').map(
      (d) => d.credentialType,
    );
    for (let i = 0; i < RECRUITMENT_MAX_UPLOAD_FILES + 1; i += 1) {
      fd.append('documents', pdfFile(`f${i}.pdf`));
      fd.append('documentTypes', types[i % types.length]!);
    }

    const result = await submitRecruitmentApplicationAction({}, fd);
    expect(result.error).toMatch(/too many/i);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('rejects total size over 32 MB before writes', async () => {
    const { submitRecruitmentApplicationAction } = await import(
      '../recruitment-application'
    );
    const fd = validDraftFields();
    // Four ~9 MB files stay under the per-file cap but exceed the 32 MB total.
    const chunk = 9 * 1024 * 1024;
    const types = [
      'cv',
      'identity_document_front',
      'identity_document_back',
      'nursing_licence',
    ] as const;
    for (const docType of types) {
      fd.append('documents', pdfFile(`${docType}.pdf`, chunk));
      fd.append('documentTypes', docType);
    }

    const result = await submitRecruitmentApplicationAction({}, fd);
    expect(result.error).toMatch(/32 MB/i);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('rejects invalid expiry for practising licence before writes', async () => {
    const { submitRecruitmentApplicationAction } = await import(
      '../recruitment-application'
    );
    const fd = validDraftFields({ role: 'physiotherapist' });
    fd.append('documents', pdfFile('licence.pdf'));
    fd.append('documentTypes', 'physiotherapy_practising_licence');
    fd.set('expiresAt:physiotherapy_practising_licence', 'not-a-date');

    const result = await submitRecruitmentApplicationAction({}, fd);
    expect(result.error).toMatch(/expir/i);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('returns a generic error for duplicate/replay without uploading', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'RECRUITMENT_SUBMIT_REJECTED', code: 'P0001' },
    });
    const { submitRecruitmentApplicationAction } = await import(
      '../recruitment-application'
    );
    const fd = validDraftFields();
    fd.append('documents', pdfFile('cv.pdf'));
    fd.append('documentTypes', 'cv');

    const result = await submitRecruitmentApplicationAction({}, fd);
    expect(result.error).toBe('Unable to submit your application. Please try again.');
    expect(result.error?.toLowerCase()).not.toMatch(/exist|duplicate|already/);
    expect(result.error).not.toMatch(/alex\.example@test\.local/i);
    expect(uploadMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('sends one notify after a successful commit', async () => {
    const candidateId = '11111111-1111-4111-8111-111111111111';
    rpcMock.mockResolvedValue({ data: candidateId, error: null });
    uploadMock.mockResolvedValue({ error: null });
    insertMock.mockResolvedValue({ error: null });

    const { submitRecruitmentApplicationAction } = await import(
      '../recruitment-application'
    );
    const fd = validDraftFields();
    fd.append('documents', pdfFile('cv.pdf'));
    fd.append('documentTypes', 'cv');

    const result = await submitRecruitmentApplicationAction({}, fd);
    expect(result.success).toBe(true);
    expect(result.candidateId).toBe(candidateId);
    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId,
        role: 'registered_nurse',
        submittedAt: expect.any(Date),
      }),
    );
  });

  it('does not notify when document insert fails and rolls back', async () => {
    const candidateId = '22222222-2222-4222-8222-222222222222';
    rpcMock.mockResolvedValue({ data: candidateId, error: null });
    uploadMock.mockResolvedValue({ error: null });
    insertMock.mockResolvedValue({ error: { message: 'insert failed' } });
    deleteEqMock.mockResolvedValue({ error: null });
    removeMock.mockResolvedValue({ error: null });

    const { submitRecruitmentApplicationAction } = await import(
      '../recruitment-application'
    );
    const fd = validDraftFields();
    fd.append('documents', pdfFile('cv.pdf'));
    fd.append('documentTypes', 'cv');

    const result = await submitRecruitmentApplicationAction({}, fd);
    expect(result.error).toBe('Unable to submit your application. Please try again.');
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('keeps success when notify throws', async () => {
    const candidateId = '33333333-3333-4333-8333-333333333333';
    rpcMock.mockResolvedValue({ data: candidateId, error: null });
    uploadMock.mockResolvedValue({ error: null });
    insertMock.mockResolvedValue({ error: null });
    notifyMock.mockRejectedValue(new Error('mail unavailable'));

    const { submitRecruitmentApplicationAction } = await import(
      '../recruitment-application'
    );
    const fd = validDraftFields();
    fd.append('documents', pdfFile('cv.pdf'));
    fd.append('documentTypes', 'cv');

    const result = await submitRecruitmentApplicationAction({}, fd);
    expect(result.success).toBe(true);
    expect(notifyMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the service-role key behind the shared server-only helper', async () => {
    const src = await readWeb('app/actions/recruitment-application.ts');
    expect(src).toMatch(/createServiceRoleClient/);
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(src).toMatch(/validateRecruitmentDocumentBatch/);
    expect(src).toMatch(/cleanupFailedSubmission|remove\(/);
    expect(src).toMatch(/sendRecruitmentSubmissionNotify/);
  });
});

describe('public recruitment submission reaches admin review', () => {
  const candidateId = 'c1000001-dddd-4000-8000-0000000000d1';

  beforeEach(() => {
    rpcMock.mockReset();
    uploadMock.mockReset();
    insertMock.mockReset();
    removeMock.mockReset();
    deleteEqMock.mockReset();
    notifyMock.mockReset();
    notifyMock.mockResolvedValue({ sent: true });
    rpcMock.mockResolvedValue({ data: candidateId, error: null });
  });

  function publicApplication(): FormData {
    return validDraftFields({
      currentLocation: '',
      countryOfResidence: 'Cyprus',
      preferredCyprusLocation: 'Limassol',
      role: '',
      yearsExperience: '',
      registrationState: '',
      employmentType: 'full_time',
      preferredEnvironments: 'Hospital',
      areasOfInterest: 'Wards',
      availability: '',
      consentAccepted: 'true',
    });
  }

  it('stores a full-time application without a role and alerts the admin inbox', async () => {
    uploadMock.mockResolvedValue({ error: null });
    insertMock.mockResolvedValue({ error: null });
    const { submitRecruitmentApplicationAction } = await import(
      '../recruitment-application'
    );
    const fd = publicApplication();
    fd.append('documents', pdfFile('front.pdf'));
    fd.append('documentTypes', 'identity_document_front');
    fd.append('documents', pdfFile('back.pdf'));
    fd.append('documentTypes', 'identity_document_back');
    fd.append('documents', pdfFile('cv.pdf'));
    fd.append('documentTypes', 'cv');

    const result = await submitRecruitmentApplicationAction({}, fd);

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        candidateId,
      }),
    );
    expect(uploadMock).toHaveBeenCalledTimes(3);
    expect(insertMock).toHaveBeenCalledTimes(3);

    expect(rpcMock).toHaveBeenCalledTimes(1);
    const payload = rpcMock.mock.calls[0]![1] as {
      p_payload: Record<string, unknown>;
    };
    expect(payload.p_payload).toEqual(
      expect.objectContaining({
        full_name: 'Alex Example',
        email: 'alex.example@test.local',
        phone: '+35799000099',
        country_of_residence: 'Cyprus',
        preferred_cyprus_location: 'Limassol',
        role: null,
        employment_type: 'full_time',
        availability: '',
        years_experience: '',
        registration_state: '',
      }),
    );

    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId,
        role: null,
      }),
    );
  });

  it('requires identity documents on a public application', async () => {
    const { submitRecruitmentApplicationAction } = await import(
      '../recruitment-application'
    );
    const result = await submitRecruitmentApplicationAction(
      {},
      publicApplication(),
    );
    expect(result.success).toBeUndefined();
    expect(result.error).toMatch(/national identity card — front/i);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('rejects tax and social-insurance uploads on the public application', async () => {
    const { submitRecruitmentApplicationAction } = await import(
      '../recruitment-application'
    );
    const fd = publicApplication();
    fd.set('role', 'registered_nurse');
    fd.append('documents', pdfFile('tax.pdf'));
    fd.append('documentTypes', 'tax_identification_proof');

    const result = await submitRecruitmentApplicationAction({}, fd);
    expect(result.success).toBeUndefined();
    expect(result.error).toMatch(/invalid document type/i);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('keeps the admin queue wired to stored submissions', async () => {
    const queue = await readWeb('app/(app)/admin/(console)/recruitment/page.tsx');
    const detail = await readWeb(
      'app/(app)/admin/(console)/recruitment/[candidateId]/page.tsx',
    );
    const migration = await fs.readFile(
      path.join(repoRoot, 'supabase/migrations/033_recruitment_optional_role.sql'),
      'utf8',
    );

    expect(queue).toMatch(/from\('recruitment_candidates'\)/);
    expect(queue).toMatch(/\/admin\/recruitment\/\$\{row\.id\}/);
    expect(queue).toMatch(/canReviewRecruitment/);
    expect(detail).toMatch(/from\('recruitment_candidates'\)/);
    expect(detail).toMatch(/requirePlatformAdmin/);
    expect(migration).toMatch(/alter column role drop not null/);
  });
});
