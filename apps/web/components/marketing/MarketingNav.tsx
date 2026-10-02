'use client';

import Link from 'next/link';
import { useState } from 'react';

import { MARKETING_NAV } from '@/components/marketing/nav-config';

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-bh-border/80 bg-bh-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Link
          href="/"
          className="text-[13px] font-semibold uppercase tracking-[0.14em] text-bh-sidebar"
        >
          Bridge Hive
        </Link>

        <nav
          className="hidden items-center gap-7 md:flex"
          aria-label="Primary"
        >
          {MARKETING_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-bh-text-secondary transition-colors hover:text-bh-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/auth/worker/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-bh-text-secondary transition-colors hover:text-bh-text"
          >
            Worker app
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md bg-bh-sidebar px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-bh-sidebar-hover"
          >
            Organization sign in
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-bh-border bg-bh-surface px-3 py-2 text-sm font-medium text-bh-text md:hidden"
          aria-expanded={open}
          aria-controls="marketing-mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open ? (
        <div
          id="marketing-mobile-nav"
          className="border-t border-bh-border bg-bh-surface px-5 py-4 md:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {MARKETING_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2 py-2.5 text-base font-medium text-bh-text"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/auth/worker/login"
              className="rounded-md px-2 py-2.5 text-base font-medium text-bh-text-secondary"
              onClick={() => setOpen(false)}
            >
              Worker app continuation
            </Link>
            <Link
              href="/sign-in"
              className="mt-2 rounded-md bg-bh-sidebar px-3 py-2.5 text-center text-base font-medium text-white"
              onClick={() => setOpen(false)}
            >
              Organization sign in
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
