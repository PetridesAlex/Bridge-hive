'use client';

import {
  ArrowRight,
  Building2,
  Info,
  Mail,
  UserRound,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import { MarketingBrand } from '@/components/marketing/MarketingBrand';
import { MarketingLanguageSwitch } from '@/components/marketing/MarketingLanguageSwitch';
import { MARKETING_NAV } from '@/components/marketing/nav-config';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';
import { localizePath, type MarketingLocale } from '@/lib/marketing-i18n';

const NAV_ICONS = {
  organizations: Building2,
  professionals: UserRound,
  howItWorks: Zap,
  about: Info,
  contact: Mail,
} as const;

/** Premium talent-credential mark for Recruitment — badge + brand honey. */
function RecruitmentNavIcon({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`m-nav-recruitment-icon ${className ?? ''}`.trim()}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect
          className="m-nav-recruitment-plate"
          x="3.75"
          y="2.75"
          width="16.5"
          height="18.5"
          rx="4"
          fill="currentColor"
          fillOpacity="0.07"
          stroke="currentColor"
          strokeWidth="1.55"
        />
        <circle
          className="m-nav-recruitment-person"
          cx="12"
          cy="9.2"
          r="2.55"
          fill="currentColor"
        />
        <path
          className="m-nav-recruitment-person"
          d="M7.2 17.05c.75-2.55 2.4-3.85 4.8-3.85s4.05 1.3 4.8 3.85"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          className="m-nav-recruitment-hex"
          d="M15.35 4.95 17.45 3.75l2.1 1.2v2.45l-2.1 1.2-2.1-1.2V4.95Z"
          fill="#E4B334"
        />
      </svg>
    </span>
  );
}

/** Premium iPhone-style mark for the Worker app CTA. */
function WorkerAppIcon({ size = 22 }: { size?: number }) {
  const reactId = useId().replace(/:/g, '');
  const body = `m-iphone-body-${reactId}`;
  const screen = `m-iphone-screen-${reactId}`;
  const gloss = `m-iphone-gloss-${reactId}`;
  const clip = `m-iphone-clip-${reactId}`;

  return (
    <span className="m-nav-worker-icon" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Side buttons */}
        <rect x="5.15" y="7.2" width="0.85" height="2.1" rx="0.35" fill="currentColor" opacity="0.35" />
        <rect x="5.15" y="10.1" width="0.85" height="3.2" rx="0.35" fill="currentColor" opacity="0.35" />
        <rect x="18" y="8.6" width="0.85" height="3.6" rx="0.35" fill="currentColor" opacity="0.35" />

        {/* Chassis */}
        <rect
          className="m-nav-worker-body"
          x="6.1"
          y="2.2"
          width="11.8"
          height="19.6"
          rx="3.6"
          fill={`url(#${body})`}
          stroke="currentColor"
          strokeWidth="1.2"
        />

        {/* Screen */}
        <rect
          className="m-nav-worker-screen"
          x="7.35"
          y="3.55"
          width="9.3"
          height="16.9"
          rx="2.55"
          fill={`url(#${screen})`}
        />

        {/* Dynamic Island */}
        <rect
          className="m-nav-worker-island"
          x="9.55"
          y="4.35"
          width="4.9"
          height="1.45"
          rx="0.72"
          fill="#0B2032"
          opacity="0.82"
        />

        {/* Honey hex status on lock-ish screen */}
        <path
          className="m-nav-worker-hex"
          d="M11.2 9.05 12.55 8.25l1.35.8v1.65l-1.35.8-1.35-.8V9.05Z"
          fill="#E4B334"
        />

        {/* Home indicator */}
        <rect
          x="9.7"
          y="18.55"
          width="4.6"
          height="0.85"
          rx="0.42"
          fill="#fff"
          opacity="0.55"
        />

        {/* Sweeping gloss */}
        <g clipPath={`url(#${clip})`}>
          <rect
            className="m-nav-worker-gloss"
            x="7.35"
            y="3.55"
            width="9.3"
            height="16.9"
            fill={`url(#${gloss})`}
          />
        </g>

        <defs>
          <linearGradient id={body} x1="12" y1="2.2" x2="12" y2="21.8" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F7FBFD" />
            <stop offset="1" stopColor="#D7E3EC" />
          </linearGradient>
          <linearGradient id={screen} x1="12" y1="3.55" x2="12" y2="20.45" gradientUnits="userSpaceOnUse">
            <stop stopColor="#16384F" />
            <stop offset="0.55" stopColor="#0D3B43" />
            <stop offset="1" stopColor="#0B2032" />
          </linearGradient>
          <linearGradient id={gloss} x1="7" y1="4" x2="18" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" stopOpacity="0" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={clip}>
            <rect x="7.35" y="3.55" width="9.3" height="16.9" rx="2.55" />
          </clipPath>
        </defs>
      </svg>
    </span>
  );
}

type MarketingNavProps = {
  locale: MarketingLocale;
  dictionary: MarketingDictionary;
};

export function MarketingNav({ locale, dictionary }: MarketingNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [workerNotice, setWorkerNotice] = useState(false);
  const panelId = useId();
  const workerNoticeId = useId();
  const workerNoticeTitleId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const workerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const workerCloseRef = useRef<HTMLButtonElement>(null);

  const nav = dictionary.nav;

  const openWorkerNotice = (trigger: HTMLButtonElement) => {
    workerTriggerRef.current = trigger;
    setOpen(false);
    setWorkerNotice(true);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (headerRef.current && target && !headerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open || workerNotice ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, workerNotice]);

  useEffect(() => {
    if (!workerNotice) return;

    workerCloseRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setWorkerNotice(false);
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (workerTriggerRef.current?.isConnected) {
        workerTriggerRef.current.focus();
      }
    };
  }, [workerNotice]);

  const brandAria = dictionary.brand.homeAria;

  return (
    <>
      <header
        ref={headerRef}
        className={`m-header ${scrolled || open ? 'is-scrolled' : ''}`}
      >
        <div className="m-header-inner">
          <MarketingBrand
            locale={locale}
            priority
            markSize={50}
            tone="light"
            ariaLabel={brandAria}
          />

          <nav className="m-nav-desktop" aria-label={nav.primaryAria}>
            {MARKETING_NAV.map((item) => {
              const Icon =
                item.key in NAV_ICONS
                  ? NAV_ICONS[item.key as keyof typeof NAV_ICONS]
                  : null;
              const localizedHref = localizePath(item.href, locale);
              const current = pathname === localizedHref;
              return (
                <Link
                  key={item.key}
                  href={localizedHref}
                  className="m-nav-link"
                  aria-current={current ? 'page' : undefined}
                >
                  {item.key === 'recruitment' ? (
                    <RecruitmentNavIcon
                      className="m-nav-link-icon"
                      size={18}
                    />
                  ) : Icon ? (
                    <Icon
                      className="m-nav-link-icon"
                      size={17}
                      strokeWidth={1.85}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span>{nav[item.key]}</span>
                </Link>
              );
            })}
          </nav>

          <div className="m-nav-actions">
            <MarketingLanguageSwitch
              locale={locale}
              langEnLabel={nav.langEn}
              langElLabel={nav.langEl}
              switchAriaLabel={nav.langSwitchAria}
            />
            <button
              type="button"
              className="m-nav-btn m-nav-btn--worker"
              aria-label={nav.workerAppAria}
              title={nav.workerAppAria}
              aria-haspopup="dialog"
              aria-expanded={workerNotice}
              aria-controls={workerNoticeId}
              onClick={(event) => openWorkerNotice(event.currentTarget)}
            >
              <WorkerAppIcon size={22} />
              <span className="m-nav-worker-copy">
                <span className="m-nav-worker-label">{nav.workerAppLabel}</span>
                <span className="m-nav-worker-platforms">
                  {nav.workerAppPlatforms}
                </span>
              </span>
            </button>
            <Link href="/sign-in" className="m-nav-btn m-nav-btn--org">
              {nav.orgSignIn}
              <ArrowRight size={17} strokeWidth={2.1} aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            className="m-menu-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? nav.menuClose : nav.menuOpen}
          </button>
        </div>

        {open ? (
          <div id={panelId} className="m-mobile-panel">
            <nav aria-label={nav.mobileAria}>
              {MARKETING_NAV.map((item) => {
                const Icon =
                  item.key in NAV_ICONS
                    ? NAV_ICONS[item.key as keyof typeof NAV_ICONS]
                    : null;
                const localizedHref = localizePath(item.href, locale);
                return (
                  <Link
                    key={item.key}
                    href={localizedHref}
                    className="m-mobile-link"
                    aria-current={pathname === localizedHref ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {item.key === 'recruitment' ? (
                      <RecruitmentNavIcon size={18} />
                    ) : Icon ? (
                      <Icon size={18} strokeWidth={1.85} aria-hidden="true" />
                    ) : null}
                    {nav[item.key]}
                  </Link>
                );
              })}
              <MarketingLanguageSwitch
                locale={locale}
                variant="mobile"
                langEnLabel={nav.langEn}
                langElLabel={nav.langEl}
                switchAriaLabel={nav.langSwitchAria}
              />
              <button
                type="button"
                className="m-nav-btn m-nav-btn--worker"
                aria-label={nav.workerAppAria}
                aria-haspopup="dialog"
                aria-expanded={workerNotice}
                aria-controls={workerNoticeId}
                onClick={(event) => openWorkerNotice(event.currentTarget)}
              >
                <WorkerAppIcon size={22} />
                <span className="m-nav-worker-copy">
                  <span className="m-nav-worker-label">{nav.workerAppLabel}</span>
                  <span className="m-nav-worker-platforms">
                    {nav.workerAppPlatforms}
                  </span>
                </span>
              </button>
              <Link
                href="/sign-in"
                className="m-nav-btn m-nav-btn--org"
                onClick={() => setOpen(false)}
              >
                {nav.orgSignIn}
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            </nav>
          </div>
        ) : null}
      </header>
      {open ? (
        <button
          type="button"
          className="m-mobile-backdrop"
          aria-label={nav.closeMenuAria}
          onClick={() => setOpen(false)}
        />
      ) : null}
      {workerNotice ? (
        <div className="m-worker-notice">
          <button
            type="button"
            className="m-worker-notice-backdrop"
            aria-label={nav.workerDialogCloseAria}
            onClick={() => setWorkerNotice(false)}
          />
          <div
            id={workerNoticeId}
            className="m-worker-notice-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={workerNoticeTitleId}
          >
            <WorkerAppIcon size={36} />
            <p className="m-worker-notice-kicker">{nav.workerDialogKicker}</p>
            <h2 id={workerNoticeTitleId} className="m-worker-notice-title">
              {nav.workerDialogTitle}
            </h2>
            <p className="m-worker-notice-copy">{nav.workerDialogBody}</p>
            <button
              ref={workerCloseRef}
              type="button"
              className="m-worker-notice-close"
              onClick={() => setWorkerNotice(false)}
            >
              {nav.workerDialogGotIt}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
