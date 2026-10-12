import {
  emptyRecruitmentApplicationDraft,
  recruitmentDocumentRequirementsForRole,
  validateRecruitmentConsentStep,
  validateRecruitmentProfessionalStep,
  validateRecruitmentUpload,
} from '@bridge-hive/domain';
import fs from 'node:fs/promises';
import path from 'node:path';

const webRoot = process.cwd();
const repoRoot = path.resolve(webRoot, '../..');

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

  it('reuses physio document checklist with practising licence expiry', () => {
    const docs = recruitmentDocumentRequirementsForRole('physiotherapist');
    expect(docs.filter((d) => d.isRequired)).toHaveLength(7);
    expect(
      docs.find((d) => d.credentialType === 'physiotherapy_practising_licence')
        ?.requiresExpiry,
    ).toBe(true);
  });

  it('rejects invalid uploads', () => {
    expect(
      validateRecruitmentUpload({ type: 'application/pdf', size: 100 }).ok,
    ).toBe(true);
    expect(validateRecruitmentUpload({ type: 'text/html', size: 100 }).ok).toBe(
      false,
    );
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

  it('keeps consent unchecked and uses shared worker roles', async () => {
    const form = await readWeb('components/marketing/recruitment-apply-form.tsx');
    expect(form).toMatch(/consentAccepted/);
    expect(form).toMatch(/WORKER_ROLES/);
    expect(form).toMatch(/checked=\{draft\.consentAccepted\}/);
    expect(form).not.toMatch(/defaultChecked=\{true\}/);
    expect(form).toMatch(/Submit talent profile/);
  });

  it('org portal uses /org/[slug]/recruitment with organisation alias', async () => {
    const orgPage = await readWeb('app/org/[slug]/recruitment/page.tsx');
    const alias = await readWeb('app/organisation/recruitment/page.tsx');
    expect(orgPage).toMatch(/canAccessRecruitment/);
    expect(alias).toMatch(/\/org\/\$\{.*\}\/recruitment/);
  });

  it('admin recruitment is capability gated', async () => {
    const admin = await readWeb('app/admin/(console)/recruitment/page.tsx');
    const sidebar = await readWeb('components/admin/admin-sidebar.tsx');
    expect(admin).toMatch(/canReviewRecruitment/);
    expect(sidebar).toMatch(/\/admin\/recruitment/);
  });
});

describe('recruitment migration contracts', () => {
  it('adds 029 with private bucket, submit RPC, and org isolation helpers', async () => {
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
    expect(src).toMatch(/recruitment_enabled/);
    expect(src).toMatch(/grant execute on function public\.submit_recruitment_application/);
    // Anon must not get blanket table SELECT
    expect(src).not.toMatch(/for select to anon/);
    expect(src).toMatch(/unique \(organization_id, candidate_id\)/);
  });
});
