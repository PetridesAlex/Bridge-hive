import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ORG_STATUS_LABELS, type OrgStatus } from '@bridge-hive/domain';

import { signOutAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { requireAuthBundle } from '@/lib/auth';
import { roleLabel } from '@/lib/format';

export default async function DashboardPage() {
  const bundle = await requireAuthBundle();
  const { memberships, profile } = bundle;

  if (memberships.length === 1) {
    redirect(`/org/${memberships[0].organization.slug}/dashboard`);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-bh-honey">
            Bridge Hive
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-bh-text">Your organizations</h1>
          <p className="mt-1 text-sm text-bh-text-secondary">
            Signed in as {profile?.full_name ?? bundle.user.email}
          </p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      {memberships.length === 0 ? (
        <div className="rounded-xl border border-dashed border-bh-border bg-bh-surface p-10 text-center">
          <h2 className="text-lg font-medium text-bh-text">No organizations yet</h2>
          <p className="mt-2 text-sm text-bh-text-secondary">
            Ask a Bridge Hive administrator to invite you to an organization.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {memberships.map((membership) => (
            <li
              key={membership.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-bh-border bg-bh-surface p-5"
            >
              <div>
                <p className="font-medium text-bh-text">
                  {membership.organization.display_name}
                </p>
                <p className="text-sm text-bh-text-muted">
                  {ORG_STATUS_LABELS[membership.organization.status as OrgStatus] ??
                    membership.organization.status}{' '}
                  · {roleLabel(membership.role)}
                </p>
              </div>
              <Button asChild size="sm">
                <Link href={`/org/${membership.organization.slug}/dashboard`}>Open</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
