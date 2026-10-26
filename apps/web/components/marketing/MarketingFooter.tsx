import {
  ArrowRight,
  Building2,
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { CookieSettingsButton } from '@/components/marketing/CookieSettingsButton';
import { MarketingBrand } from '@/components/marketing/MarketingBrand';
import { MARKETING_NAV } from '@/components/marketing/nav-config';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';
import { localizePath, type MarketingLocale } from '@/lib/marketing-i18n';

const SOCIAL_LINKS = [
  {
    key: 'instagram' as const,
    href: 'https://www.instagram.com/bridgehive.app/',
    icon: Instagram,
  },
  {
    key: 'linkedin' as const,
    href: 'https://www.linkedin.com/company/bridgehive-medical-recruitment/',
    icon: Linkedin,
  },
  {
    key: 'facebook' as const,
    href: 'https://www.facebook.com/profile.php?id=61595007450717',
    icon: Facebook,
  },
] as const;

type MarketingFooterProps = {
  locale: MarketingLocale;
  dictionary: MarketingDictionary;
};

export function MarketingFooter({ locale, dictionary }: MarketingFooterProps) {
  const year = new Date().getFullYear();
  const f = dictionary.footer;

  const trustItems = [
    { icon: ShieldCheck, tone: 'teal' as const, label: f.trustVerifiedProfessionals },
    { icon: Building2, tone: 'honey' as const, label: f.trustOrgWorkflows },
    { icon: Users, tone: 'teal' as const, label: f.trustClearRoles },
  ] as const;

  const socialLabels: Record<(typeof SOCIAL_LINKS)[number]['key'], string> = {
    instagram: f.instagram,
    linkedin: f.linkedin,
    facebook: f.facebook,
  };

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
            <MarketingBrand
              locale={locale}
              tone="dark"
              markSize={56}
              ariaLabel={dictionary.brand.homeAria}
            />
            <p className="m-footer-brand-copy">{f.brandCopy}</p>
            <ul className="m-footer-trust">
              {trustItems.map((item) => {
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
            <h3>{f.exploreHeading}</h3>
            <ul>
              {MARKETING_NAV.map((item) => (
                <li key={item.key}>
                  <Link href={localizePath(item.href, locale)}>
                    {dictionary.nav[item.key]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3>{f.accessHeading}</h3>
            <ul>
              <li>
                <Link href={localizePath('/sign-in', locale)}>{f.orgSignIn}</Link>
              </li>
              <li>
                <Link href={localizePath('/organisation', locale)}>
                  {f.orgPortal}
                </Link>
              </li>
              <li>
                <Link href={localizePath('/auth/worker/login', locale)}>
                  {f.workerAppContinuation}
                </Link>
              </li>
              <li>
                <Link href={localizePath('/contact#partnerships', locale)}>
                  {f.partnershipInquiry}
                </Link>
              </li>
              <li>
                <Link href={localizePath('/contact#support', locale)}>
                  {f.support}
                </Link>
              </li>
              <li>
                <Link
                  href={localizePath('/admin/sign-in', locale)}
                  className="m-footer-admin"
                >
                  <Lock size={13} strokeWidth={2.2} aria-hidden="true" />
                  {f.platformAdmin}
                </Link>
              </li>
            </ul>

            <div className="m-footer-pro-block">
              <h3>{f.forProfessionalsHeading}</h3>
              <ul>
                <li>
                  <Link
                    href={localizePath('/auth/worker/login', locale)}
                    className="m-footer-ext"
                  >
                    {f.workerAppContinuation}
                    <ExternalLink size={15} strokeWidth={2.2} aria-hidden="true" />
                  </Link>
                </li>
                <li>
                  <Link
                    href={localizePath('/contact#support', locale)}
                    className="m-footer-ext"
                  >
                    {f.platformSupport}
                    <ExternalLink size={15} strokeWidth={2.2} aria-hidden="true" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="m-footer-contact">
            <h3>{f.contactHeading}</h3>
            <ul className="m-footer-emails">
              <li>
                <span
                  className="m-footer-mail-icon m-footer-mail-icon--teal"
                  aria-hidden="true"
                >
                  <Mail size={16} strokeWidth={2.1} />
                </span>
                <div>
                  <p>{f.orgInquiriesLabel}</p>
                  <a
                    href={`mailto:${f.orgInquiriesEmail}?subject=${encodeURIComponent(
                      f.orgInquiriesSubject,
                    )}`}
                  >
                    {f.orgInquiriesEmail}
                  </a>
                </div>
              </li>
              <li>
                <span
                  className="m-footer-mail-icon m-footer-mail-icon--honey"
                  aria-hidden="true"
                >
                  <Mail size={16} strokeWidth={2.1} />
                </span>
                <div>
                  <p>{f.supportLabel}</p>
                  <a
                    href={`mailto:${f.supportEmail}?subject=${encodeURIComponent(
                      f.supportSubject,
                    )}`}
                  >
                    {f.supportEmail}
                  </a>
                </div>
              </li>
            </ul>

            <Link
              href={localizePath('/auth/worker/login', locale)}
              className="m-footer-app-cta"
            >
              <span className="m-footer-app-cta-sheen" aria-hidden="true" />
              <span className="m-footer-app-cta-icon" aria-hidden="true">
                <Smartphone size={22} strokeWidth={1.9} />
              </span>
              <span className="m-footer-app-cta-copy">
                <strong>{f.returnToWorkerApp}</strong>
                <em>{f.signInHelpForWorkers}</em>
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
              {f.copyYear.replace('{year}', String(year))}
            </p>
            <p className="m-footer-disclaimer">{f.disclaimer}</p>
          </div>
          <div className="m-footer-note-actions">
            <nav className="m-footer-legal" aria-label={f.legalAria}>
              <CookieSettingsButton label={f.cookieSettings} />
              <span aria-hidden="true" />
              <Link href={localizePath('/contact#support', locale)}>
                {f.privacyTerms}
              </Link>
            </nav>
            <nav className="m-footer-social" aria-label={f.socialAria}>
              {SOCIAL_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="m-footer-social-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={socialLabels[item.key]}
                  >
                    <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
