import Link from 'next/link';

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Organization sign up</h1>
      <p className="text-sm text-slate-600">
        Organization accounts are provisioned by Bridge Hive. Contact support to
        request access, then{' '}
        <Link href="/sign-in" className="font-medium text-slate-900 underline">
          sign in
        </Link>
        .
      </p>
    </main>
  );
}
