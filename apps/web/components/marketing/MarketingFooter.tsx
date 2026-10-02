import Link from 'next/link';

import { MARKETING_NAV } from '@/components/marketing/nav-config';

export function MarketingFooter() {
  return (
    <footer className="border-t border-bh-border bg-bh-sidebar text-bh-sidebar-text">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-bh-honey">
            Bridge Hive
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-bh-sidebar-muted">
            A staffing platform that connects healthcare organizations with verified
            registered nurses and ward assistants — with clear roles, review workflows,
            and accountability on both sides.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-bh-sidebar-muted">
            Explore
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {MARKETING_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-bh-sidebar-text/90 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-bh-sidebar-muted">
            Access
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link
                href="/sign-in"
                className="text-bh-sidebar-text/90 transition-colors hover:text-white"
              >
                Organization sign in
              </Link>
            </li>
            <li>
              <Link
                href="/organisation"
                className="text-bh-sidebar-text/90 transition-colors hover:text-white"
              >
                Organization portal
              </Link>
            </li>
            <li>
              <Link
                href="/auth/worker/login"
                className="text-bh-sidebar-text/90 transition-colors hover:text-white"
              >
                Worker app continuation
              </Link>
            </li>
            <li>
              <Link
                href="/contact#partnerships"
                className="text-bh-sidebar-text/90 transition-colors hover:text-white"
              >
                Partnership inquiry
              </Link>
            </li>
            <li>
              <Link
                href="/contact#support"
                className="text-bh-sidebar-text/90 transition-colors hover:text-white"
              >
                Support
              </Link>
            </li>
            <li>
              <Link
                href="/admin/sign-in"
                className="text-xs text-bh-sidebar-muted/80 transition-colors hover:text-bh-sidebar-muted"
              >
                Platform admin
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-4 text-xs text-bh-sidebar-muted sm:px-8">
          © {new Date().getFullYear()} Bridge Hive. Healthcare staffing platform —
          not a clinical service provider.
        </p>
      </div>
    </footer>
  );
}
