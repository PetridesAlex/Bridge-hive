'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import { MarketingBrand } from '@/components/marketing/MarketingBrand';
import { MARKETING_NAV } from '@/components/marketing/nav-config';

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
          <MarketingBrand priority markSize={44} />

          <nav className="m-nav-desktop" aria-label="Primary">
            {MARKETING_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="m-nav-actions">
            <Link href="/auth/worker/login" className="m-link-quiet">
              Worker app
            </Link>
            <Link href="/sign-in" className="m-btn m-btn--primary">
              Organization sign in
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
              {MARKETING_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/auth/worker/login" onClick={() => setOpen(false)}>
                Worker app continuation
              </Link>
              <Link
                href="/sign-in"
                className="m-btn m-btn--primary mt-2"
                onClick={() => setOpen(false)}
              >
                Organization sign in
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
