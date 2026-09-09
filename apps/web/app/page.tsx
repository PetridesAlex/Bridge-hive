import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
          Bridge Hive
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
          Healthcare staffing for organizations
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          Manage locations, wards, and shifts. Publish openings to verified
          workers and review completed timesheets.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/sign-in"
          className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Organization Dashboard
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
        >
          Request access
        </Link>
      </div>
    </main>
  );
}
