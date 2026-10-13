import {
  RECRUITMENT_EMPLOYMENT_TYPE_LABELS,
  RECRUITMENT_ORG_PIPELINE_LABELS,
  RECRUITMENT_ORG_PIPELINE_STATUSES,
  WORKER_ROLE_LABELS,
  maskEmail,
  type RecruitmentEmploymentType,
  type RecruitmentOrgPipelineStatus,
  type WorkerRole,
} from '@bridge-hive/domain';
import { ArrowLeft, FileText, Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  addRecruitmentNoteAction,
  updateRecruitmentPipelineAction,
} from '@/app/actions/recruitment-org';
import { EmptyState } from '@/components/empty-state';
import { OpenRecruitmentDocumentButton } from '@/components/org/open-recruitment-document-button';
import { Breadcrumbs } from '@/components/org/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireOrgMembership } from '@/lib/auth';
import { asUntypedDb } from '@/lib/recruitment-db';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

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
  const fullName = candidate.full_name as string;
  const pipelineStatus = ((pipeline?.status as string) ??
    'viewed') as RecruitmentOrgPipelineStatus;
  const initials = candidateInitials(fullName);
  const documentRows = docs ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Recruitment', href: `/org/${slug}/recruitment` },
            { label: fullName },
          ]}
        />

        <header className="overflow-hidden rounded-[1.35rem] border border-bh-border bg-bh-surface shadow-[0_10px_40px_rgba(7,29,48,0.06)]">
          <div className="h-1.5 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey" />
          <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div
                aria-hidden
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-lg font-semibold tracking-tight text-bh-sidebar-text shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                {initials}
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-text-muted">
                    Candidate profile
                  </p>
                  <Badge
                    variant="muted"
                    className={cn(
                      'border border-transparent',
                      pipelineBadgeClass(pipelineStatus),
                    )}
                  >
                    {RECRUITMENT_ORG_PIPELINE_LABELS[pipelineStatus]}
                  </Badge>
                </div>
                <h1 className="truncate text-[1.75rem] font-bold leading-tight tracking-tight text-bh-text sm:text-[2rem]">
                  {fullName}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-bh-text-secondary">
                  <span className="font-medium text-bh-text">
                    {WORKER_ROLE_LABELS[role]}
                  </span>
                  <span aria-hidden className="text-bh-border-strong">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-bh-text-muted" aria-hidden />
                    {String(candidate.current_location)}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href={`/org/${slug}/recruitment`}
              className="inline-flex items-center gap-2 self-start rounded-full border border-bh-border bg-bh-subtle px-4 py-2 text-sm font-medium text-bh-text transition-colors hover:bg-bh-surface hover:text-bh-teal-strong lg:self-center"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to talent list
            </Link>
          </div>
        </header>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <section className="space-y-5 lg:col-span-8">
          <Panel
            kicker="Overview"
            title="Professional profile"
            description="Role, qualification, and experience supplied in the application."
          >
            <dl className="grid gap-3 sm:grid-cols-2">
              <Fact label="Role" value={WORKER_ROLE_LABELS[role]} />
              <Fact
                label="Registration / qualification"
                value={String(candidate.registration_state)}
              />
              <Fact
                label="Experience"
                value={String(candidate.years_experience)}
              />
              <Fact
                label="Country of residence"
                value={String(candidate.country_of_residence)}
              />
            </dl>
          </Panel>

          <Panel
            kicker="Placement"
            title="Employment preferences"
            description="How this candidate prefers to work with your organization."
          >
            {prefs ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                <Fact
                  label="Employment type"
                  value={
                    RECRUITMENT_EMPLOYMENT_TYPE_LABELS[
                      prefs.employment_type as RecruitmentEmploymentType
                    ] ?? String(prefs.employment_type)
                  }
                />
                <Fact label="Availability" value={String(prefs.availability)} />
                <Fact
                  label="Preferred environments"
                  value={String(prefs.preferred_environments ?? '—')}
                />
                <Fact
                  label="Areas of interest"
                  value={String(prefs.areas_of_interest ?? '—')}
                />
              </dl>
            ) : (
              <EmptyCopy>No preferences on file.</EmptyCopy>
            )}
          </Panel>

          <Panel
            kicker="Files"
            title="Supporting documents"
            description="Private application documents. Opens require an authorized organization role."
          >
            {!ctx.capabilities.canViewRecruitmentDocuments ? (
              <EmptyCopy>
                Your role cannot view recruitment documents.
              </EmptyCopy>
            ) : documentRows.length === 0 ? (
              <EmptyCopy>No documents uploaded.</EmptyCopy>
            ) : (
              <ul className="divide-y divide-bh-border overflow-hidden rounded-2xl border border-bh-border">
                {documentRows.map((doc) => (
                  <li
                    key={doc.id as string}
                    className="flex flex-wrap items-center justify-between gap-3 bg-bh-surface px-4 py-3.5 transition-colors hover:bg-bh-subtle/70"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-teal-soft text-bh-teal-strong">
                        <FileText className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-bh-text">
                          {documentTypeLabel(String(doc.document_type))}
                        </p>
                        <p className="mt-0.5 text-xs text-bh-text-muted">
                          {[
                            mimeLabel(String(doc.mime_type ?? '')),
                            formatBytes(Number(doc.byte_size ?? 0)),
                            doc.expires_at
                              ? `Expires ${new Date(String(doc.expires_at)).toLocaleDateString()}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                    <OpenRecruitmentDocumentButton
                      slug={slug}
                      documentId={doc.id as string}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>

        <aside className="space-y-5 lg:col-span-4">
          <Panel
            kicker="Access"
            title="Contact details"
            description="Visible according to your recruitment permissions."
          >
            {showContact ? (
              <div className="space-y-3">
                <ContactRow
                  icon={<Mail className="h-4 w-4" aria-hidden />}
                  label="Email"
                  value={String(candidate.email_normalized)}
                />
                <ContactRow
                  icon={<Phone className="h-4 w-4" aria-hidden />}
                  label="Phone"
                  value={String(candidate.phone)}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-bh-border bg-bh-subtle/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
                  Masked email
                </p>
                <p className="mt-1 text-sm font-medium text-bh-text">
                  {maskEmail(String(candidate.email_normalized))}
                </p>
              </div>
            )}
            <p className="mt-4 text-xs leading-5 text-bh-text-muted">
              Contact is for authorized outreach only. Messaging is not sent
              automatically — move the pipeline to Contacted when you reach out.
            </p>
          </Panel>

          <Panel
            kicker="Workflow"
            title="Your pipeline"
            description="Track this candidate privately for your organization."
          >
            <form action={updateRecruitmentPipelineAction} className="space-y-3">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="candidateId" value={candidateId} />
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
                  Status
                </span>
                <select
                  name="status"
                  defaultValue={pipelineStatus}
                  className="h-11 w-full rounded-xl border border-bh-border bg-bh-subtle px-3 text-sm font-medium text-bh-text outline-none transition focus:border-bh-teal focus:ring-2 focus:ring-bh-teal/20"
                >
                  {RECRUITMENT_ORG_PIPELINE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {RECRUITMENT_ORG_PIPELINE_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" className="h-11 w-full rounded-full">
                Update pipeline status
              </Button>
            </form>
          </Panel>

          <Panel
            kicker="Internal"
            title="Private notes"
            description="Visible only inside your organization."
          >
            {(notes ?? []).length > 0 ? (
              <ul className="mb-4 space-y-2.5">
                {(notes ?? []).map((note) => (
                  <li
                    key={note.id as string}
                    className="rounded-2xl border border-bh-border/80 bg-bh-subtle/90 px-3.5 py-3"
                  >
                    <p className="text-sm leading-6 text-bh-text">
                      {note.body as string}
                    </p>
                    <p className="mt-2 text-[11px] font-medium tracking-wide text-bh-text-muted">
                      {new Date(note.created_at as string).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyCopy className="mb-4">No notes yet.</EmptyCopy>
            )}
            <form action={addRecruitmentNoteAction} className="space-y-2.5">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="candidateId" value={candidateId} />
              <textarea
                name="body"
                required
                rows={3}
                placeholder="Add an organization-private note…"
                className="w-full rounded-2xl border border-bh-border bg-bh-subtle px-3.5 py-3 text-sm text-bh-text outline-none transition placeholder:text-bh-text-muted focus:border-bh-teal focus:ring-2 focus:ring-bh-teal/20"
              />
              <Button
                type="submit"
                variant="outline"
                className="h-11 w-full rounded-full"
              >
                Add note
              </Button>
            </form>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Panel({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-bh-border bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.045)]">
      <div className="border-b border-bh-border/80 bg-gradient-to-b from-bh-subtle/80 to-bh-surface px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-text-muted">
          {kicker}
        </p>
        <h2 className="mt-1 text-base font-semibold tracking-tight text-bh-text">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-bh-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bh-border/80 bg-bh-subtle/70 px-3.5 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium leading-6 text-bh-text">{value}</dd>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-bh-border/80 bg-bh-subtle/70 px-3.5 py-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bh-surface text-bh-teal-strong shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
          {label}
        </p>
        <p className="mt-1 break-all text-sm font-medium text-bh-text">{value}</p>
      </div>
    </div>
  );
}

function EmptyCopy({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'rounded-2xl border border-dashed border-bh-border bg-bh-subtle/60 px-4 py-3 text-sm text-bh-text-secondary',
        className,
      )}
    >
      {children}
    </p>
  );
}

function candidateInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '·';
}

function documentTypeLabel(type: string) {
  return type.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function mimeLabel(mime: string) {
  if (!mime) return 'Document';
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG';
  if (mime.includes('png')) return 'PNG';
  return mime;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pipelineBadgeClass(status: RecruitmentOrgPipelineStatus) {
  switch (status) {
    case 'shortlisted':
    case 'interviewing':
    case 'offered':
      return 'bg-bh-info-soft text-bh-info';
    case 'contacted':
      return 'bg-bh-teal-soft text-bh-teal-strong';
    case 'hired':
      return 'bg-bh-success-soft text-bh-success';
    case 'not_suitable':
      return 'bg-bh-danger-soft text-bh-danger';
    case 'archived':
      return 'bg-bh-subtle text-bh-text-secondary';
    default:
      return 'bg-bh-honey-soft text-bh-warning';
  }
}
