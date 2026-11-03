import {
  RECRUITMENT_PLATFORM_STATUSES,
  RECRUITMENT_PLATFORM_STATUS_LABELS,
  WORKER_ROLE_LABELS,
  type RecruitmentPlatformStatus,
  type WorkerRole,
} from '@bridge-hive/domain';
import {
  Briefcase,
  Clock3,
  FileText,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { notFound, redirect } from 'next/navigation';

import { setRecruitmentPlatformStatusAction } from '@/app/actions/recruitment-admin';
import { AdminBackLink } from '@/components/admin/admin-back-link';
import { Button } from '@/components/ui/button';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { asUntypedDb } from '@/lib/recruitment-db';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export default async function AdminRecruitmentCandidatePage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  const ctx = await requirePlatformAdmin();
  if (!ctx.capabilities.canReviewRecruitment) {
    redirect('/admin');
  }

  const supabase = asUntypedDb(await createClient());
  const { data: candidate, error } = await supabase
    .from('recruitment_candidates')
    .select('*')
    .eq('id', candidateId)
    .maybeSingle();
  if (error || !candidate) notFound();

  const [{ data: prefs }, { data: docs }, { data: consent }, { data: review }] =
    await Promise.all([
      supabase
        .from('recruitment_candidate_preferences')
        .select('*')
        .eq('candidate_id', candidateId)
        .maybeSingle(),
      supabase
        .from('recruitment_documents')
        .select('id, document_type, mime_type, byte_size, storage_path, expires_at')
        .eq('candidate_id', candidateId),
      supabase
        .from('recruitment_consents')
        .select('privacy_notice_version, consented_at')
        .eq('candidate_id', candidateId)
        .maybeSingle(),
      supabase
        .from('recruitment_platform_reviews')
        .select('review_note, reviewed_at')
        .eq('candidate_id', candidateId)
        .maybeSingle(),
    ]);

  const fullName = candidate.full_name as string;
  const roleLabel = candidate.role
    ? WORKER_ROLE_LABELS[candidate.role as WorkerRole]
    : '—';
  const platformStatus = candidate.platform_status as RecruitmentPlatformStatus;
  const documentRows = docs ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-4">
        <AdminBackLink href="/admin/recruitment" label="Recruitment" />

        <header className="overflow-hidden rounded-[1.35rem] border border-bh-border bg-bh-surface shadow-[0_10px_40px_rgba(7,29,48,0.06)]">
          <div
            aria-hidden
            className="h-1.5 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey"
          />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-start gap-4">
              <div
                aria-hidden
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-lg font-semibold tracking-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                {candidateInitials(fullName)}
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-text-muted">
                    Recruitment candidate
                  </p>
                  <PlatformStatusChip status={platformStatus} />
                </div>
                <h1 className="truncate text-[1.75rem] font-bold leading-tight tracking-tight text-bh-text sm:text-[2rem]">
                  {fullName}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-bh-text-secondary">
                  <span className="font-medium text-bh-text">{roleLabel}</span>
                  <span aria-hidden className="text-bh-border-strong">
                    ·
                  </span>
                  <span className="break-all">{candidate.email_normalized as string}</span>
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      <Panel
        kicker="Review"
        title="Platform review"
        description="Control global visibility. Available exposes this profile only to organizations with recruitment enabled."
        accent="teal"
      >
        <form action={setRecruitmentPlatformStatusAction} className="space-y-4">
          <input type="hidden" name="candidateId" value={candidateId} />
          <label className="block text-sm font-medium text-bh-text">
            Global status
            <select
              name="status"
              defaultValue={platformStatus}
              className="mt-1.5 h-11 w-full rounded-xl border border-bh-border bg-bh-subtle/50 px-3 text-sm outline-none transition focus:border-bh-teal focus:ring-2 focus:ring-bh-teal/20"
            >
              {RECRUITMENT_PLATFORM_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {RECRUITMENT_PLATFORM_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-bh-text">
            Review note
            <textarea
              name="reviewNote"
              rows={3}
              defaultValue={(review?.review_note as string) ?? ''}
              className="mt-1.5 w-full rounded-xl border border-bh-border bg-bh-subtle/50 px-3 py-2.5 text-sm outline-none transition placeholder:text-bh-text-muted focus:border-bh-teal focus:ring-2 focus:ring-bh-teal/20"
              placeholder="Internal note for platform operators…"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-bh-text-muted">
              Current:{' '}
              <span className="font-semibold text-bh-text">
                {RECRUITMENT_PLATFORM_STATUS_LABELS[platformStatus]}
              </span>
            </p>
            <Button type="submit" className="rounded-full px-5">
              Save review status
            </Button>
          </div>
        </form>
      </Panel>

      <Panel
        kicker="Profile"
        title="Application"
        description="Contact, location, experience, and consent captured at submission."
        accent="navy"
      >
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact
            icon={<Phone className="h-4 w-4" aria-hidden />}
            label="Phone"
            value={String(candidate.phone ?? '—')}
          />
          <Fact
            icon={<MapPin className="h-4 w-4" aria-hidden />}
            label="Location"
            value={String(candidate.current_location ?? '—')}
          />
          <Fact
            icon={<Briefcase className="h-4 w-4" aria-hidden />}
            label="Experience"
            value={String(candidate.years_experience ?? '—')}
            wide
          />
          <Fact
            icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
            label="Registration state"
            value={String(candidate.registration_state ?? '—')}
            wide
          />
          {prefs ? (
            <>
              <Fact
                icon={<Briefcase className="h-4 w-4" aria-hidden />}
                label="Employment type"
                value={formatEmploymentType(String(prefs.employment_type))}
              />
              <Fact
                icon={<Clock3 className="h-4 w-4" aria-hidden />}
                label="Availability"
                value={String(prefs.availability ?? '—')}
              />
            </>
          ) : null}
          {consent ? (
            <Fact
              icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
              label="Consent"
              value={`${String(consent.privacy_notice_version)} · ${new Date(
                consent.consented_at as string,
              ).toLocaleString()}`}
              wide
            />
          ) : null}
        </dl>
      </Panel>

      <Panel
        kicker="Files"
        title="Documents"
        description="Submitted package metadata only — storage paths stay hidden."
        accent="honey"
      >
        {documentRows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-bh-border bg-bh-subtle/60 px-4 py-3 text-sm text-bh-text-secondary">
            No documents.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {documentRows.map((doc) => (
              <li
                key={doc.id as string}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-bh-border/80 bg-gradient-to-r from-bh-subtle/80 to-bh-surface px-3.5 py-3 shadow-[0_1px_2px_rgba(7,29,48,0.03)] transition-colors hover:border-bh-teal/35 hover:from-bh-teal-soft/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-surface text-bh-teal-strong shadow-sm ring-1 ring-bh-border/70 group-hover:ring-bh-teal/30">
                    <FileText className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-bh-text">
                      {documentTypeLabel(String(doc.document_type))}
                    </p>
                    <p className="mt-0.5 text-xs text-bh-text-muted">
                      {mimeLabel(String(doc.mime_type ?? ''))}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs font-medium text-bh-text-secondary">
                  <p>{Math.round(Number(doc.byte_size) / 1024)} KB</p>
                  {doc.expires_at ? (
                    <p className="mt-0.5 text-bh-text-muted">
                      Exp {String(doc.expires_at)}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 rounded-xl border border-bh-border/70 bg-bh-subtle/50 px-3.5 py-2.5 text-xs leading-5 text-bh-text-muted">
          Open documents via signed URLs in a follow-up admin control; paths are
          never shown in the UI.
        </p>
      </Panel>
    </div>
  );
}

function Panel({
  kicker,
  title,
  description,
  accent = 'navy',
  children,
}: {
  kicker: string;
  title: string;
  description?: string;
  accent?: 'navy' | 'teal' | 'honey';
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-bh-border bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
      <div
        aria-hidden
        className={cn(
          'h-1',
          accent === 'teal' && 'bg-gradient-to-r from-bh-teal via-bh-teal-strong to-bh-sidebar',
          accent === 'honey' && 'bg-gradient-to-r from-bh-honey via-bh-honey-strong to-bh-sidebar',
          accent === 'navy' && 'bg-gradient-to-r from-bh-sidebar via-bh-sidebar-raised to-bh-teal',
        )}
      />
      <div className="border-b border-bh-border/80 bg-gradient-to-b from-bh-subtle/90 to-bh-surface px-5 py-4">
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

function Fact({
  icon,
  label,
  value,
  wide,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-bh-border/80 bg-bh-subtle/70 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
        wide && 'sm:col-span-2',
      )}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bh-surface text-bh-teal-strong shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
          {label}
        </dt>
        <dd className="mt-1.5 break-words text-sm font-medium leading-6 text-bh-text">
          {value}
        </dd>
      </div>
    </div>
  );
}

function PlatformStatusChip({ status }: { status: RecruitmentPlatformStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
        status === 'available' &&
          'border border-bh-success/30 bg-bh-success-soft text-bh-success shadow-[0_0_0_3px_rgba(25,135,84,0.08)]',
        status === 'under_review' && 'bg-bh-honey-soft text-bh-warning',
        status === 'received' && 'bg-bh-info-soft text-bh-info',
        status === 'archived' && 'bg-bh-subtle text-bh-text-secondary',
        status === 'withdrawn' && 'bg-bh-danger-soft text-bh-danger',
      )}
    >
      {RECRUITMENT_PLATFORM_STATUS_LABELS[status]}
    </span>
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
  if (!mime) return 'File';
  if (mime.includes('pdf')) return 'PDF';
  if (mime.startsWith('image/')) return 'Image';
  return mime;
}

function formatEmploymentType(value: string) {
  return value.replaceAll('_', ' ');
}
