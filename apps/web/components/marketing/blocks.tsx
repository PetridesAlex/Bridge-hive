export function FeatureRow({
  items,
}: {
  items: Array<{ title: string; body: string }>;
}) {
  return (
    <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.title} className="border-t border-bh-border pt-5">
          <h3 className="text-lg font-semibold tracking-tight text-bh-sidebar">
            {item.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-bh-text-secondary">
            {item.body}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function AudienceSplit() {
  return (
    <div className="mt-12 grid gap-6 lg:grid-cols-2">
      <article className="rounded-2xl border border-bh-border bg-bh-surface p-8 sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-teal-strong">
          Organizations
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-bh-sidebar">
          Publish shifts with role clarity
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-bh-text-secondary">
          Configure locations and wards, create openings for registered nurses or
          ward assistants, and review completed timesheets. Platform approval is
          required before your organization can publish shifts.
        </p>
        <a
          href="/organizations"
          className="mt-6 inline-flex text-sm font-medium text-bh-teal-strong hover:text-bh-sidebar"
        >
          How organizations use Bridge Hive →
        </a>
      </article>
      <article className="rounded-2xl border border-bh-border bg-bh-sidebar p-8 text-bh-sidebar-text sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-honey">
          Professionals
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          Verify once, then work eligible shifts
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-bh-sidebar-muted">
          Create an account in the worker app, upload role-specific documents, and
          submit bank details for wage payouts. A platform admin reviews your package
          before shifts become available — email confirmation alone is not activation.
        </p>
        <a
          href="/professionals"
          className="mt-6 inline-flex text-sm font-medium text-bh-honey hover:text-white"
        >
          How professionals use Bridge Hive →
        </a>
      </article>
    </div>
  );
}

export function ProcessSteps({
  title,
  steps,
}: {
  title: string;
  steps: Array<{ label: string; body: string }>;
}) {
  return (
    <div>
      <h3 className="text-xl font-semibold tracking-tight text-bh-sidebar">{title}</h3>
      <ol className="mt-6 space-y-6">
        {steps.map((step, index) => (
          <li key={step.label} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bh-teal-soft text-sm font-semibold text-bh-teal-strong">
              {index + 1}
            </span>
            <div>
              <p className="font-medium text-bh-text">{step.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-bh-text-secondary">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TrustPanel() {
  return (
    <div className="rounded-2xl border border-bh-border bg-bh-subtle/60 px-6 py-10 sm:px-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-teal-strong">
        Trust & verification
      </p>
      <h3 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-bh-sidebar sm:text-3xl">
        Platform checks — not a blanket clinical guarantee
      </h3>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-bh-text-secondary">
        Bridge Hive runs structured account review for organizations and workers:
        credentials and bank details for wage payouts are examined by a platform
        administrator before marketplace access. The platform does not replace
        employer clinical judgment, professional registration boards, or local
        employment law — and activation is never automatic after signup alone.
      </p>
    </div>
  );
}

export function InquiryCta() {
  return (
    <div className="rounded-2xl bg-bh-sidebar px-6 py-12 text-center sm:px-12">
      <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Ready to structure your staffing workflow?
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-bh-sidebar-muted">
        Organizations sign in when invited. Professionals use the worker app
        continuation page after email confirmation. New hospital partnerships start
        with a partnership inquiry — not organization sign-in as a substitute.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          href="/sign-in"
          className="inline-flex rounded-md bg-white px-5 py-2.5 text-sm font-medium text-bh-sidebar transition-colors hover:bg-bh-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Organization sign in
        </a>
        <a
          href="/contact#partnerships"
          className="inline-flex rounded-md border border-white/25 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Partnership inquiry
        </a>
        <a
          href="/auth/worker/login"
          className="inline-flex rounded-md px-5 py-2.5 text-sm font-medium text-bh-honey transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-honey"
        >
          Worker app continuation
        </a>
      </div>
    </div>
  );
}

export function FaqAccordion({
  items,
}: {
  items: Array<{ q: string; a: React.ReactNode }>;
}) {
  return (
    <div className="mt-10 divide-y divide-bh-border border-y border-bh-border">
      {items.map((item) => (
        <details key={item.q} className="group py-5">
          <summary className="cursor-pointer list-none text-base font-medium text-bh-sidebar marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-start justify-between gap-4">
              {item.q}
              <span className="text-bh-text-muted group-open:hidden">+</span>
              <span className="hidden text-bh-text-muted group-open:inline">−</span>
            </span>
          </summary>
          <div className="mt-3 max-w-2xl text-sm leading-relaxed text-bh-text-secondary">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  );
}
