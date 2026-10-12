import {
  RECRUITMENT_PLATFORM_STATUSES,
  RECRUITMENT_PLATFORM_STATUS_LABELS,
  WORKER_ROLE_LABELS,
  type RecruitmentPlatformStatus,
  type WorkerRole,
} from '@bridge-hive/domain';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { setRecruitmentPlatformStatusAction } from '@/app/actions/recruitment-admin';
import { Button } from '@/components/ui/button';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { asUntypedDb } from '@/lib/recruitment-db';
import { createClient } from '@/lib/supabase/server';

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/admin/recruitment"
          className="text-sm font-medium text-bh-text-secondary hover:text-bh-text"
        >
          ← Recruitment
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-bh-text">
          {candidate.full_name as string}
        </h1>
        <p className="text-sm text-bh-text-secondary">
          {WORKER_ROLE_LABELS[candidate.role as WorkerRole]} ·{' '}
          {candidate.email_normalized as string}
        </p>
      </div>

      <section className="rounded-2xl border border-bh-border bg-bh-surface p-5">
        <h2 className="font-semibold text-bh-text">Platform review</h2>
        <form action={setRecruitmentPlatformStatusAction} className="mt-3 space-y-3">
          <input type="hidden" name="candidateId" value={candidateId} />
          <label className="block text-sm font-medium">
            Global status
            <select
              name="status"
              defaultValue={candidate.platform_status as string}
              className="mt-1 h-10 w-full rounded-xl border border-bh-border px-3 text-sm"
            >
              {RECRUITMENT_PLATFORM_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {RECRUITMENT_PLATFORM_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Review note
            <textarea
              name="reviewNote"
              rows={3}
              defaultValue={(review?.review_note as string) ?? ''}
              className="mt-1 w-full rounded-xl border border-bh-border px-3 py-2 text-sm"
            />
          </label>
          <Button type="submit" className="rounded-full">
            Save review status
          </Button>
        </form>
        <p className="mt-2 text-xs text-bh-text-muted">
          Current:{' '}
          {RECRUITMENT_PLATFORM_STATUS_LABELS[
            candidate.platform_status as RecruitmentPlatformStatus
          ]}
          . Setting Available exposes the profile to enabled organizations only.
        </p>
      </section>

      <section className="rounded-2xl border border-bh-border bg-bh-surface p-5 text-sm">
        <h2 className="font-semibold text-bh-text">Application</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-bh-text-muted">Phone</dt>
            <dd>{candidate.phone as string}</dd>
          </div>
          <div>
            <dt className="text-bh-text-muted">Location</dt>
            <dd>{candidate.current_location as string}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-bh-text-muted">Experience</dt>
            <dd>{candidate.years_experience as string}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-bh-text-muted">Registration state</dt>
            <dd>{candidate.registration_state as string}</dd>
          </div>
          {prefs ? (
            <>
              <div>
                <dt className="text-bh-text-muted">Employment type</dt>
                <dd>{String(prefs.employment_type)}</dd>
              </div>
              <div>
                <dt className="text-bh-text-muted">Availability</dt>
                <dd>{String(prefs.availability)}</dd>
              </div>
            </>
          ) : null}
          {consent ? (
            <div className="sm:col-span-2">
              <dt className="text-bh-text-muted">Consent</dt>
              <dd>
                {String(consent.privacy_notice_version)} ·{' '}
                {new Date(consent.consented_at as string).toLocaleString()}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-2xl border border-bh-border bg-bh-surface p-5">
        <h2 className="font-semibold text-bh-text">Documents</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(docs ?? []).map((doc) => (
            <li
              key={doc.id as string}
              className="flex justify-between gap-3 rounded-xl border border-bh-border px-3 py-2"
            >
              <span>{String(doc.document_type).replaceAll('_', ' ')}</span>
              <span className="text-bh-text-muted">
                {Math.round(Number(doc.byte_size) / 1024)} KB
                {doc.expires_at ? ` · exp ${doc.expires_at}` : ''}
              </span>
            </li>
          ))}
          {(docs ?? []).length === 0 ? (
            <li className="text-bh-text-secondary">No documents.</li>
          ) : null}
        </ul>
        <p className="mt-3 text-xs text-bh-text-muted">
          Open documents via signed URLs in a follow-up admin control; paths are never
          shown in the UI.
        </p>
      </section>
    </div>
  );
}
