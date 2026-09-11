import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getPlatformAdminContext } from '@/lib/admin/auth';

import { AdminSignInForm } from './admin-sign-in-form';

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const existing = await getPlatformAdminContext();
  if (existing) {
    redirect('/admin');
  }

  const params = await searchParams;
  const next = params.next?.startsWith('/admin') ? params.next : '/admin';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-600">
          Bridge Hive
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">
          Platform admin sign in
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Access is limited to granted platform administrators. Admin accounts
          are provisioned by DevOps — there is no public registration.
        </p>
      </div>

      <AdminSignInForm next={next} />

      <p className="text-center text-sm text-slate-500">
        <Link href="/sign-in" className="underline-offset-2 hover:underline">
          Organization sign in
        </Link>
      </p>
    </main>
  );
}
