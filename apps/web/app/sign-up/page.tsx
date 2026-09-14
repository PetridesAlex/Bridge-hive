import Link from 'next/link';

import { SignUpForm } from '@/components/sign-up-form';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create your account to accept an organization invitation.
        </p>
      </div>
      <SignUpForm next={params.next} />
      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          href={params.next ? `/sign-in?next=${encodeURIComponent(params.next)}` : '/sign-in'}
          className="font-medium text-slate-900 underline"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
