import {
  ArrowRight,
  Building2,
  ExternalLink,
  Linkedin,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  Users,
  Youtube,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { CookieSettingsButton } from '@/components/marketing/CookieSettingsButton';
import { MarketingBrand } from '@/components/marketing/MarketingBrand';
import { MARKETING_NAV } from '@/components/marketing/nav-config';

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.258 5.686L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    tone: 'teal' as const,
    label: 'Verified professionals',
  },
  {
    icon: Building2,
    tone: 'honey' as const,
    label: 'Organization workflows',
  },
  {
    icon: Users,
    tone: 'teal' as const,
    label: 'Clear roles and review steps',
  },
] as const;

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="m-footer">
      <div className="m-footer-media" aria-hidden="true">
        <Image
          src="/marketing/footer-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          className="m-footer-image"
        />
        <div className="m-footer-wash" />
      </div>

      <div className="m-footer-inner">
        <div className="m-footer-grid">
          <div className="m-footer-brand">
            <MarketingBrand tone="dark" markSize={56} />
            <p className="m-footer-brand-copy">
              A staffing platform that connects healthcare organizations with verified
              registered nurses and ward assistants — with clear roles, review workflows,
              and accountability on both sides.
            </p>
            <ul className="m-footer-trust">
              {TRUST_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <span
                      className={`m-footer-trust-icon m-footer-trust-icon--${item.tone}`}
                      aria-hidden="true"
                    >
                      <Icon size={17} strokeWidth={2.1} />
                    </span>
                    <span>{item.label}</span>
                  </li>
                );
              })}
            </ul>
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
                <Link href="/admin/sign-in" className="m-footer-admin">
                  <Lock size={13} strokeWidth={2.2} aria-hidden="true" />
                  Platform admin
                </Link>
              </li>
            </ul>

            <div className="m-footer-pro-block">
              <h3>For professionals</h3>
              <ul>
                <li>
                  <Link href="/auth/worker/login" className="m-footer-ext">
                    Worker app continuation
                    <ExternalLink size={15} strokeWidth={2.2} aria-hidden="true" />
                  </Link>
                </li>
                <li>
                  <Link href="/contact#support" className="m-footer-ext">
                    Platform support
                    <ExternalLink size={15} strokeWidth={2.2} aria-hidden="true" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="m-footer-contact">
            <h3>Contact</h3>
            <ul className="m-footer-emails">
              <li>
                <span className="m-footer-mail-icon m-footer-mail-icon--teal" aria-hidden="true">
                  <Mail size={16} strokeWidth={2.1} />
                </span>
                <div>
                  <p>Organization inquiries</p>
                  <a href="mailto:info@bridgehive.app?subject=Partnership%20inquiry">
                    info@bridgehive.app
                  </a>
                </div>
              </li>
              <li>
                <span className="m-footer-mail-icon m-footer-mail-icon--honey" aria-hidden="true">
                  <Mail size={16} strokeWidth={2.1} />
                </span>
                <div>
                  <p>Support</p>
                  <a href="mailto:support@bridgehive.app?subject=Bridge%20Hive%20support">
                    support@bridgehive.app
                  </a>
                </div>
              </li>
            </ul>

            <Link href="/auth/worker/login" className="m-footer-app-cta">
              <span className="m-footer-app-cta-sheen" aria-hidden="true" />
              <span className="m-footer-app-cta-icon" aria-hidden="true">
                <Smartphone size={22} strokeWidth={1.9} />
              </span>
              <span className="m-footer-app-cta-copy">
                <strong>Return to the worker app</strong>
                <em>Sign-in help for registered workers</em>
              </span>
              <ArrowRight
                className="m-footer-app-cta-arrow"
                size={18}
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>

        <div className="m-footer-note">
          <div className="m-footer-note-left">
            <p className="m-footer-copy">
              © {year} Bridge Hive. All rights reserved.
              <span className="m-footer-disclaimer">
                {' '}
                Healthcare staffing platform — not a clinical service provider.
              </span>
            </p>
            <div className="m-footer-legal">
              <CookieSettingsButton />
              <span aria-hidden="true" />
              <Link href="/contact#support">Privacy or terms questions? Contact support</Link>
            </div>
          </div>
          <div className="m-footer-social" aria-label="Social">
            <span className="m-footer-social-btn" aria-hidden="true">
              <Linkedin size={16} strokeWidth={2} />
            </span>
            <span className="m-footer-social-btn" aria-hidden="true">
              <XIcon />
            </span>
            <span className="m-footer-social-btn" aria-hidden="true">
              <Youtube size={16} strokeWidth={2} />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
