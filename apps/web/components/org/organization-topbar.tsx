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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-bh-border bg-bh-surface/95 px-4 backdrop-blur sm:h-[68px] sm:px-6 lg:px-8">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 border-bh-border min-[1180px]:hidden"
        aria-label="Open navigation menu"
        onClick={() => setMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <OrgBreadcrumbBar slug={slug} orgName={orgName} />
      </div>

      {canCreateShift ? (
        <Button asChild variant="honey" className="rounded-xl font-semibold">
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
