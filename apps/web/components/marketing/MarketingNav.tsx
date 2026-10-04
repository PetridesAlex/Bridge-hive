'use client';

import {
  ArrowRight,
  Building2,
  Info,
  Mail,
  Smartphone,
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
          <MarketingBrand priority markSize={40} tone="light" />

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
                      size={16}
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
            <Link href="/auth/worker/login" className="m-nav-btn m-nav-btn--worker">
              <Smartphone size={16} strokeWidth={1.85} aria-hidden="true" />
              Worker app
            </Link>
            <Link href="/sign-in" className="m-nav-btn m-nav-btn--org">
              Organization sign in
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
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
                onClick={() => setOpen(false)}
              >
                <Smartphone size={16} strokeWidth={1.85} aria-hidden="true" />
                Worker app continuation
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
