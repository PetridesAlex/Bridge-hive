import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Authentication error</h1>
      <p className="text-slate-600">
        We could not complete sign-in. Please try again.
      </p>
      <Link
        href="/sign-in"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Back to sign in
      </Link>
    </main>
  );
}
