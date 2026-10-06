'use client';

import { Menu, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { OrgBreadcrumbBar } from '@/components/org/org-breadcrumb-bar';
import { OrganizationSidebar } from '@/components/org/organization-sidebar';
import type { SwitcherOrg } from '@/components/org/organization-switcher';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import type { OrgNavCapabilities } from '@bridge-hive/domain';

export function OrganizationTopbar({
  slug,
  orgName,
  orgLogoUrl,
  canCreateShift,
  current,
  memberships,
  capabilities,
  userLabel,
  userEmail,
}: {
  slug: string;
  orgName: string;
  orgLogoUrl?: string | null;
  canCreateShift: boolean;
  current: SwitcherOrg;
  memberships: SwitcherOrg[];
  capabilities: OrgNavCapabilities;
  userLabel: string;
  userEmail?: string | null;
}) {
  void orgLogoUrl;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative sticky top-0 z-30 flex h-16 items-center gap-3 overflow-hidden border-b border-bh-border/70 px-4 sm:h-[68px] sm:px-6 lg:px-8">
      {/* Dynamic wash — matches dashboard navy / teal / honey */}
      <div
        aria-hidden
        className="bh-gradient-sheen pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,rgba(7,29,48,0.06)_0%,rgba(14,116,144,0.10)_28%,rgba(255,255,255,0.92)_52%,rgba(245,197,24,0.14)_78%,rgba(7,29,48,0.05)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-bh-surface/55 backdrop-blur-md"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 top-1/2 h-24 w-40 -translate-y-1/2 rounded-full bg-bh-teal/15 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 top-0 h-20 w-36 rounded-full bg-bh-honey/20 blur-2xl"
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="relative z-10 shrink-0 border-bh-border/80 bg-bh-surface/70 min-[1180px]:hidden"
        aria-label="Open navigation menu"
        onClick={() => setMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative z-10 min-w-0 flex-1">
        <OrgBreadcrumbBar slug={slug} orgName={orgName} />
      </div>

      {canCreateShift ? (
        <Button asChild variant="default" className="relative z-10 rounded-xl font-semibold shadow-[0_8px_18px_rgba(7,29,48,0.22)]">
          <Link href={`/org/${slug}/shifts/new`}>
            <Plus className="h-4 w-4" aria-hidden />
            Create shift
          </Link>
        </Button>
      ) : null}

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          showClose
          className="left-0 top-0 h-full max-h-full w-[min(100%,280px)] translate-x-0 translate-y-0 rounded-none border-0 p-0 sm:max-w-[280px]"
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
