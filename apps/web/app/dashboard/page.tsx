import Link from 'next/link';
import { redirect } from 'next/navigation';

import { signOutAction } from '@/app/actions/auth';
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
          <h1 className="text-2xl font-semibold text-slate-900">Your organizations</h1>
          <p className="mt-1 text-sm text-slate-600">
            Signed in as {profile?.full_name ?? bundle.user.email}
          </p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Sign out
          </button>
        </form>
      </div>

      {memberships.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-medium text-slate-900">No organizations yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Ask a Bridge Hive administrator to invite you to an organization.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {memberships.map((membership) => (
            <li
              key={membership.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {membership.organization.display_name}
                </p>
                <p className="text-sm text-slate-500">
                  {membership.organization.slug} · {roleLabel(membership.role)}
                </p>
              </div>
              <Link
                href={`/org/${membership.organization.slug}/dashboard`}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
