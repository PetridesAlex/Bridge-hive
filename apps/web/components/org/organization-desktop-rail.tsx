'use client';

import { useEffect, useState } from 'react';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { OrganizationSidebar } from '@/components/org/organization-sidebar';
import type { SwitcherOrg } from '@/components/org/organization-switcher';
import { cn } from '@/lib/utils';
import type { OrgNavCapabilities } from '@bridge-hive/domain';

const STORAGE_KEY = 'bh-org-sidebar-collapsed';

export function OrganizationDesktopRail({
  slug,
  current,
  memberships,
  capabilities,
  userLabel,
  userEmail,
}: {
  slug: string;
  current: SwitcherOrg;
  memberships: SwitcherOrg[];
  capabilities: OrgNavCapabilities;
  userLabel: string;
  userEmail?: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === '1') setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const persist = (next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const toggle = () => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      setSpinning(true);
      window.setTimeout(() => setSpinning(false), 620);
    }
    persist(!collapsed);
  };

  return (
    <div
      className={cn(
        'relative z-10 hidden shrink-0 self-stretch border-r border-[#14324a]/90 min-[1180px]:block',
        'transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        collapsed ? 'w-[76px]' : 'w-[280px]',
        !hydrated && 'w-[280px]',
      )}
    >
      <div className="sticky top-0 flex h-dvh flex-col overflow-hidden bg-[#071d30] shadow-[12px_0_40px_rgba(7,29,48,0.18)]">
        {collapsed ? (
          <div className="flex h-full flex-col items-center bg-[linear-gradient(180deg,#0a2538_0%,#071d30_42%,#061827_100%)] px-2 py-4">
            <button
              type="button"
              onClick={toggle}
              aria-label="Open organization sidebar"
              aria-expanded={false}
              title="Open sidebar"
              className={cn(
                'group relative grid h-14 w-14 place-items-center rounded-2xl',
                'bg-[linear-gradient(145deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.04)_100%)]',
                'ring-1 ring-white/15 shadow-[0_12px_28px_rgba(0,0,0,0.28)]',
                'transition-all duration-300 hover:-translate-y-0.5 hover:ring-[#e4b334]/45',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal/70',
                'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(228,179,52,0.28),transparent_55%)] opacity-80"
              />
              <BridgeHiveMark
                size={40}
                priority
                className={cn(
                  'relative h-10 w-10 rounded-xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  spinning && 'bh-org-logo-spin',
                  'group-hover:scale-[1.04] motion-reduce:transform-none',
                )}
              />
            </button>

            <div
              aria-hidden
              className="mt-5 h-px w-8 bg-[linear-gradient(90deg,transparent,rgba(228,179,52,0.55),transparent)]"
            />
            <p className="mt-4 rotate-180 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35 [writing-mode:vertical-rl]">
              Bridge Hive
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                onClick={toggle}
                aria-label="Collapse organization sidebar"
                aria-expanded
                className="rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal/70"
              >
                Collapse
              </button>
            </div>
            <OrganizationSidebar
              slug={slug}
              current={current}
              memberships={memberships}
              capabilities={capabilities}
              userLabel={userLabel}
              userEmail={userEmail}
            />
          </div>
        )}
      </div>
    </div>
  );
}
