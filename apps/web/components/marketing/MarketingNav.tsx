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
import { MARKETING_NAV } from '@/components/marketing/nav-config';

const NAV_ICONS = {
  '/organizations': Building2,
  '/professionals': UserRound,
  '/how-it-works': Zap,
  '/about': Info,
  '/contact': Mail,
} as const;

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

/** Apple App Store mark — black glyph on light badge. */
function AppStoreMark({ size = 16 }: { size?: number }) {
  return (
    <span className="m-store-mark m-store-mark--apple" title="App Store" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.7 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1 1-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.7 2.4 3 2.4 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.8c1.3 0 2.1-1.1 2.9-2.2.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8ZM15.2 5.5c.6-.8 1.1-1.9.9-3-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.6-1.3Z" />
      </svg>
    </span>
  );
}

/** Google Play mark — official four-color triangle. */
function GooglePlayMark({ size = 16 }: { size?: number }) {
  const reactId = useId().replace(/:/g, '');
  const blue = `gp-blue-${reactId}`;
  const green = `gp-green-${reactId}`;
  const yellow = `gp-yellow-${reactId}`;
  const red = `gp-red-${reactId}`;

  return (
    <span className="m-store-mark m-store-mark--play" title="Google Play" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path
          d="M3.6 2.3c-.4.2-.6.7-.6 1.3v16.8c0 .6.2 1.1.6 1.3l.1.1 9.4-9.4v-.2L3.7 2.3l-.1 0Z"
          fill={`url(#${green})`}
        />
        <path
          d="m14.1 12.9-2.1-2.1v-.2l2.1-2.1.1.1 2.5 1.4c.7.4.7 1.1 0 1.5l-2.5 1.4-.1 0Z"
          fill={`url(#${yellow})`}
        />
        <path
          d="M14.2 13 12 10.8 3.6 21.7c.5.5 1.2.5 2.1 0l8.5-8.7Z"
          fill={`url(#${red})`}
        />
        <path
          d="M14.2 11 5.7 2.3c-.9-.5-1.6-.4-2.1 0L12 10.8 14.2 11Z"
          fill={`url(#${blue})`}
        />
        <defs>
          <linearGradient id={blue} x1="13.2" y1="2.8" x2="3.4" y2="12.6" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00A0FF" />
            <stop offset="1" stopColor="#006EFF" />
          </linearGradient>
          <linearGradient id={green} x1="3.1" y1="2.2" x2="3.1" y2="21.8" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00F076" />
            <stop offset="1" stopColor="#00D76A" />
          </linearGradient>
          <linearGradient id={yellow} x1="15.8" y1="10.2" x2="3.9" y2="12.4" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE000" />
            <stop offset="1" stopColor="#FFBD00" />
          </linearGradient>
          <linearGradient id={red} x1="3.8" y1="12.5" x2="14.5" y2="22.2" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF3A44" />
            <stop offset="1" stopColor="#C31162" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

function WorkerStoreBadges() {
  return (
    <span className="m-nav-store-badges" aria-hidden="true">
      <AppStoreMark size={13} />
      <GooglePlayMark size={13} />
    </span>
  );
}

export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelId = useId();
  const headerRef = useRef<HTMLElement>(null);

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
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header
        ref={headerRef}
        className={`m-header ${scrolled || open ? 'is-scrolled' : ''}`}
      >
        <div className="m-header-inner">
          <MarketingBrand priority markSize={50} tone="light" />

          <nav className="m-nav-desktop" aria-label="Primary">
            {MARKETING_NAV.map((item) => {
              const Icon = NAV_ICONS[item.href];
              const current = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="m-nav-link"
                  aria-current={current ? 'page' : undefined}
                >
                  {Icon ? (
                    <Icon
                      className="m-nav-link-icon"
                      size={17}
                      strokeWidth={1.85}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="m-nav-actions">
            <Link
              href="/auth/worker/login"
              className="m-nav-btn m-nav-btn--worker"
              aria-label="Worker app — continue on App Store or Google Play"
            >
              <WorkerAppIcon size={22} />
              <span className="m-nav-worker-copy">
                <span className="m-nav-worker-label">Worker app</span>
                <span className="m-nav-worker-stores">
                  <span>App Store</span>
                  <span className="m-nav-worker-dot" aria-hidden="true" />
                  <span>Play</span>
                </span>
              </span>
              <WorkerStoreBadges />
            </Link>
            <Link href="/sign-in" className="m-nav-btn m-nav-btn--org">
              Organization sign in
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
            {open ? 'Close' : 'Menu'}
          </button>
        </div>

        {open ? (
          <div id={panelId} className="m-mobile-panel">
            <nav aria-label="Mobile">
              {MARKETING_NAV.map((item) => {
                const Icon = NAV_ICONS[item.href];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="m-mobile-link"
                    aria-current={pathname === item.href ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {Icon ? (
                      <Icon size={18} strokeWidth={1.85} aria-hidden="true" />
                    ) : null}
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/auth/worker/login"
                className="m-nav-btn m-nav-btn--worker"
                aria-label="Worker app — continue on App Store or Google Play"
                onClick={() => setOpen(false)}
              >
                <WorkerAppIcon size={22} />
                <span className="m-nav-worker-copy">
                  <span className="m-nav-worker-label">Worker app</span>
                  <span className="m-nav-worker-stores">
                    <span>App Store</span>
                    <span className="m-nav-worker-dot" aria-hidden="true" />
                    <span>Google Play</span>
                  </span>
                </span>
                <WorkerStoreBadges />
              </Link>
              <Link
                href="/sign-in"
                className="m-nav-btn m-nav-btn--org"
                onClick={() => setOpen(false)}
              >
                Organization sign in
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
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
