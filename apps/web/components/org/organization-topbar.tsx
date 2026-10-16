'use client';

import { useState } from 'react';

import { OrgBreadcrumbBar } from '@/components/org/org-breadcrumb-bar';
import { OrganizationSidebar } from '@/components/org/organization-sidebar';
import type { SwitcherOrg } from '@/components/org/organization-switcher';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import type { OrgNavCapabilities } from '@bridge-hive/domain';
import { cn } from '@/lib/utils';

export function OrganizationTopbar({
  slug,
  orgName,
  orgLogoUrl,
  current,
  memberships,
  capabilities,
  userLabel,
  userEmail,
}: {
  slug: string;
  orgName: string;
  orgLogoUrl?: string | null;
  current: SwitcherOrg;
  memberships: SwitcherOrg[];
  capabilities: OrgNavCapabilities;
  userLabel: string;
  userEmail?: string | null;
}) {
  void orgLogoUrl;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative sticky top-0 z-30 flex h-[76px] items-center gap-3 overflow-hidden border-b border-[#d4e2eb] px-4 sm:h-[80px] sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-white/78 backdrop-blur-2xl"
      />
      <div
        aria-hidden
        className="bh-org-topbar-mesh pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="bh-gradient-sheen pointer-events-none absolute inset-0 opacity-50 bg-[linear-gradient(115deg,transparent_10%,rgba(255,255,255,0.55)_46%,transparent_78%)]"
      />
      <div
        aria-hidden
        className="bh-org-topbar-line pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
      />

      <button
        type="button"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        aria-controls="org-mobile-nav"
        onClick={() => setMenuOpen((open) => !open)}
        className={cn(
          'group relative z-10 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl min-[1180px]:hidden',
          'border border-[#071d30]/12 bg-[linear-gradient(145deg,#071d30_0%,#0e4a5c_55%,#16a6b6_120%)]',
          'text-white shadow-[0_10px_24px_rgba(7,29,48,0.22),inset_0_1px_0_rgba(255,255,255,0.14)]',
          'transition-all duration-300 ease-out',
          'hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(7,29,48,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]',
          'active:translate-y-0 active:scale-[0.97]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef5fb]',
          'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
          menuOpen &&
            'border-bh-honey/40 shadow-[0_12px_28px_rgba(201,146,15,0.28),inset_0_1px_0_rgba(255,255,255,0.16)]',
        )}
      >
        <span
          aria-hidden
          className="bh-gradient-sheen pointer-events-none absolute inset-0 opacity-40 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.22)_48%,transparent_72%)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-3 -top-3 h-10 w-10 rounded-full bg-bh-honey/25 blur-xl transition-opacity duration-300 group-hover:opacity-90"
        />
        <span className="relative flex h-3.5 w-4 flex-col justify-between" aria-hidden>
          <span
            className={cn(
              'block h-[1.5px] origin-center rounded-full bg-white shadow-[0_0_0_0.5px_rgba(255,255,255,0.15)] transition-all duration-300 ease-out',
              'group-hover:bg-bh-honey',
              menuOpen ? 'translate-y-[6px] rotate-45' : 'w-full',
            )}
          />
          <span
            className={cn(
              'block h-[1.5px] origin-center rounded-full bg-white/90 shadow-[0_0_0_0.5px_rgba(255,255,255,0.12)] transition-all duration-300 ease-out',
              'group-hover:bg-bh-honey/90',
              menuOpen ? 'w-0 scale-x-0 opacity-0' : 'w-[70%]',
            )}
          />
          <span
            className={cn(
              'block h-[1.5px] origin-center rounded-full bg-white shadow-[0_0_0_0.5px_rgba(255,255,255,0.15)] transition-all duration-300 ease-out',
              'group-hover:bg-bh-honey',
              menuOpen ? 'w-full -translate-y-[6px] -rotate-45' : 'w-[85%]',
            )}
          />
        </span>
      </button>

      <div className="relative z-10 min-w-0 flex-1">
        <OrgBreadcrumbBar slug={slug} orgName={orgName} />
      </div>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          showClose
          id="org-mobile-nav"
          className="left-0 top-0 h-full max-h-full w-[min(100%,280px)] translate-x-0 translate-y-0 rounded-none border-0 bg-[#071d30] p-0 sm:max-w-[280px]"
        >
          <DialogTitle className="sr-only">Organization navigation</DialogTitle>
          <OrganizationSidebar
            slug={slug}
            current={current}
            memberships={memberships}
            capabilities={capabilities}
            userLabel={userLabel}
            userEmail={userEmail}
            className="h-full w-full"
            onNavigate={() => setMenuOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </header>
  );
}
