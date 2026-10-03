import Link from 'next/link';

import { MarketingBrand } from '@/components/marketing/MarketingBrand';
import { MARKETING_NAV } from '@/components/marketing/nav-config';

export function MarketingFooter() {
  return (
    <footer className="m-footer">
      <div className="m-footer-grid">
        <div>
          <MarketingBrand tone="dark" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[rgba(220,232,238,0.68)]">
            A staffing platform that connects healthcare organizations with verified
            registered nurses and ward assistants — with clear roles, review workflows,
            and accountability on both sides.
          </p>
        </div>

        <div>
          <h3>Explore</h3>
          <ul>
            {MARKETING_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Access</h3>
          <ul>
            <li>
              <Link href="/sign-in">Organization sign in</Link>
            </li>
            <li>
              <Link href="/organisation">Organization portal</Link>
            </li>
            <li>
              <Link href="/auth/worker/login">Worker app continuation</Link>
            </li>
            <li>
              <Link href="/contact#partnerships">Partnership inquiry</Link>
            </li>
            <li>
              <Link href="/contact#support">Support</Link>
            </li>
            <li>
              <Link
                href="/admin/sign-in"
                className="!text-xs !text-[rgba(220,232,238,0.45)]"
              >
                Platform admin
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3>Contact</h3>
          <ul>
            <li>
              <a href="mailto:info@bridgehive.app?subject=Partnership%20inquiry">
                info@bridgehive.app
              </a>
              <span className="mt-0.5 block text-xs text-[rgba(220,232,238,0.45)]">
                Partnerships
              </span>
            </li>
            <li className="mt-2">
              <a href="mailto:support@bridgehive.app?subject=Bridge%20Hive%20support">
                support@bridgehive.app
              </a>
              <span className="mt-0.5 block text-xs text-[rgba(220,232,238,0.45)]">
                Support
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div className="m-footer-note">
        <p>
          © {new Date().getFullYear()} Bridge Hive. Healthcare staffing platform —
          not a clinical service provider.
        </p>
      </div>
    </footer>
  );
}
