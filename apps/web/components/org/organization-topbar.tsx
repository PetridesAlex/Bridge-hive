'use client';

import { Menu } from 'lucide-react';
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
    <header className="relative sticky top-0 z-30 flex h-16 items-center gap-3 overflow-hidden border-b border-[#d7e4ec] px-4 sm:h-[68px] sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-white/72 backdrop-blur-xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,rgba(7,29,48,0.04)_0%,rgba(14,116,144,0.06)_40%,rgba(255,255,255,0.5)_70%,rgba(228,179,52,0.08)_100%)]"
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

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          showClose
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
