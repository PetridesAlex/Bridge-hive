import {
  RECRUITMENT_EMPLOYMENT_TYPE_LABELS,
  RECRUITMENT_ORG_PIPELINE_LABELS,
  RECRUITMENT_ORG_PIPELINE_STATUSES,
  WORKER_ROLE_LABELS,
  maskEmail,
  type RecruitmentEmploymentType,
  type WorkerRole,
} from '@bridge-hive/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  addRecruitmentNoteAction,
  updateRecruitmentPipelineAction,
} from '@/app/actions/recruitment-org';
import { EmptyState } from '@/components/empty-state';
import { OpenRecruitmentDocumentButton } from '@/components/org/open-recruitment-document-button';
import { PageHeader } from '@/components/org/page-header';
import { Button } from '@/components/ui/button';
import { requireOrgMembership } from '@/lib/auth';
import { asUntypedDb } from '@/lib/recruitment-db';
import { createClient } from '@/lib/supabase/server';

export default async function OrgRecruitmentCandidatePage({
  params,
}: {
  params: Promise<{ slug: string; candidateId: string }>;
}) {
  const { slug, candidateId } = await params;
  const ctx = await requireOrgMembership(slug);

  if (!ctx.capabilities.canAccessRecruitment) {
    return (
      <EmptyState
        title="Recruitment not available"
        description="You do not have access to recruitment for this organization."
      />
    );
  }

  const supabase = asUntypedDb(await createClient());
  const { data: candidate, error } = await supabase
    .from('recruitment_candidates')
    .select('*')
    .eq('id', candidateId)
    .maybeSingle();

  if (error || !candidate) notFound();
  if (candidate.platform_status !== 'available') notFound();

  const [{ data: prefs }, { data: docs }, { data: pipeline }, { data: notes }] =
    await Promise.all([
      supabase
        .from('recruitment_candidate_preferences')
        .select('*')
        .eq('candidate_id', candidateId)
        .maybeSingle(),
      supabase
        .from('recruitment_documents')
        .select('id, document_type, mime_type, byte_size, expires_at')
        .eq('candidate_id', candidateId),
      supabase
        .from('recruitment_org_pipeline')
        .select('status')
        .eq('organization_id', ctx.org.id)
        .eq('candidate_id', candidateId)
        .maybeSingle(),
      supabase
        .from('recruitment_org_notes')
        .select('id, body, created_at')
        .eq('organization_id', ctx.org.id)
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false }),
    ]);

  // Mark viewed when opening (audit-safe org status).
  if (!pipeline && ctx.capabilities.canManageRecruitmentPipeline) {
    await supabase.rpc('upsert_recruitment_org_pipeline', {
      p_organization_id: ctx.org.id,
      p_candidate_id: candidateId,
      p_status: 'viewed',
    });
  }

  const role = candidate.role as WorkerRole;
  const showContact = ctx.capabilities.canViewRecruitmentContacts;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href={`/org/${slug}/recruitment`}
          className="text-sm font-medium text-bh-text-secondary hover:text-bh-text"
        >
          ← Recruitment
        </Link>
        <PageHeader
          eyebrow="Candidate"
          title={candidate.full_name as string}
          subtitle={`${WORKER_ROLE_LABELS[role]} · ${candidate.current_location}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <Card title="Profile">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Item label="Role" value={WORKER_ROLE_LABELS[role]} />
              <Item
                label="Registration / qualification"
                value={String(candidate.registration_state)}
              />
              <Item label="Experience" value={String(candidate.years_experience)} />
              <Item
                label="Country"
                value={String(candidate.country_of_residence)}
              />
            </dl>
          </Card>

          <Card title="Preferences">
            {prefs ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Item
                  label="Employment type"
                  value={
                    RECRUITMENT_EMPLOYMENT_TYPE_LABELS[
                      prefs.employment_type as RecruitmentEmploymentType
                    ] ?? String(prefs.employment_type)
                  }
                />
                <Item
                  label="Availability"
                  value={String(prefs.availability)}
                />
                <Item
                  label="Environments"
                  value={String(prefs.preferred_environments ?? '—')}
                />
                <Item
                  label="Areas of interest"
                  value={String(prefs.areas_of_interest ?? '—')}
                />
              </dl>
            ) : (
              <p className="text-sm text-bh-text-secondary">No preferences on file.</p>
            )}
          </Card>

          <Card title="Documents">
            {!ctx.capabilities.canViewRecruitmentDocuments ? (
              <p className="text-sm text-bh-text-secondary">
                Your role cannot view recruitment documents.
              </p>
            ) : (docs ?? []).length === 0 ? (
              <p className="text-sm text-bh-text-secondary">No documents uploaded.</p>
            ) : (
              <ul className="space-y-2">
                {(docs ?? []).map((doc) => (
                  <li
                    key={doc.id as string}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-bh-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-bh-text">
                      {String(doc.document_type).replaceAll('_', ' ')}
                    </span>
                    <OpenRecruitmentDocumentButton
                      slug={slug}
                      documentId={doc.id as string}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <aside className="space-y-4">
          <Card title="Contact">
            {showContact ? (
              <dl className="space-y-2 text-sm">
                <Item label="Email" value={String(candidate.email_normalized)} />
                <Item label="Phone" value={String(candidate.phone)} />
              </dl>
            ) : (
              <p className="text-sm text-bh-text-secondary">
                Masked: {maskEmail(String(candidate.email_normalized))}
              </p>
            )}
            <p className="mt-3 text-xs text-bh-text-muted">
              Contact reveal is authorized for your role. Messaging is not sent
              automatically — update pipeline status to Contacted when appropriate.
            </p>
          </Card>

          <Card title="Your pipeline">
            <form action={updateRecruitmentPipelineAction} className="space-y-3">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="candidateId" value={candidateId} />
              <select
                name="status"
                defaultValue={
                  (pipeline?.status as string) ?? 'viewed'
                }
                className="h-10 w-full rounded-xl border border-bh-border bg-bh-subtle px-3 text-sm"
              >
                {RECRUITMENT_ORG_PIPELINE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {RECRUITMENT_ORG_PIPELINE_LABELS[status]}
                  </option>
                ))}
              </select>
              <Button type="submit" className="w-full rounded-full">
                Update status
              </Button>
            </form>
          </Card>

          <Card title="Private notes">
            <ul className="mb-3 space-y-2">
              {(notes ?? []).map((note) => (
                <li
                  key={note.id as string}
                  className="rounded-xl bg-bh-subtle px-3 py-2 text-sm text-bh-text"
                >
                  {note.body as string}
                  <p className="mt-1 text-[11px] text-bh-text-muted">
                    {new Date(note.created_at as string).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
            <form action={addRecruitmentNoteAction} className="space-y-2">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="candidateId" value={candidateId} />
              <textarea
                name="body"
                required
                rows={3}
                placeholder="Organization-private note"
                className="w-full rounded-xl border border-bh-border bg-bh-subtle px-3 py-2 text-sm"
              />
              <Button type="submit" variant="outline" className="w-full rounded-full">
                Add note
              </Button>
            </form>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-bh-border bg-bh-surface p-5 shadow-[0_4px_16px_rgba(7,29,48,0.04)]">
      <h2 className="text-sm font-semibold tracking-tight text-bh-text">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-bh-text">{value}</dd>
    </div>
  );
}
