import Link from 'next/link';

import { SignInForm } from './sign-in-form';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith('/') ? params.next : '/dashboard';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Bridge Hive
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">
          Organization sign in
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with your organization account to manage locations, wards, and
          shifts.
        </p>
      </div>

      <SignInForm next={next} />

      <p className="text-center text-sm text-slate-500">
        <Link href="/" className="underline-offset-2 hover:underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}
