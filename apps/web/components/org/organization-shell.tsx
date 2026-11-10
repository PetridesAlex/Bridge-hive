import { OrganizationSidebar } from '@/components/org/organization-sidebar';
import { OrganizationTopbar } from '@/components/org/organization-topbar';
import type { SwitcherOrg } from '@/components/org/organization-switcher';
import type { OrgNavCapabilities } from '@bridge-hive/domain';
import { orgDisplayFont } from '@/lib/org-display-font';

/** Animated navy–light-blue workspace canvas behind org pages. */
function OrganizationWorkspaceBackground() {
  return (
    <div aria-hidden className="bh-org-canvas pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="bh-org-canvas-mesh absolute inset-0" />
      <span className="bh-org-canvas-orb bh-org-canvas-orb-a" />
      <span className="bh-org-canvas-orb bh-org-canvas-orb-b" />
      <span className="bh-org-canvas-orb bh-org-canvas-orb-c" />
      <div className="bh-org-canvas-grid absolute inset-0" />
    </div>
  );
}

export function OrganizationShell({
  slug,
  orgName,
  orgLogoUrl,
  current,
  memberships,
  capabilities,
  userLabel,
  userEmail,
  children,
}: {
  slug: string;
  orgName: string;
  orgLogoUrl?: string | null;
  current: SwitcherOrg;
  memberships: SwitcherOrg[];
  capabilities: OrgNavCapabilities;
  userLabel: string;
  userEmail?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className={`${orgDisplayFont.variable} bh-org relative flex min-h-dvh bg-[#c9dcea]`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-bh-surface focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <div className="relative z-10 hidden w-[280px] shrink-0 self-stretch border-r border-[#14324a]/90 min-[1180px]:block">
        <div className="sticky top-0 flex h-dvh flex-col bg-[#071d30] shadow-[12px_0_40px_rgba(7,29,48,0.18)]">
          <OrganizationSidebar
            slug={slug}
            current={current}
            memberships={memberships}
            capabilities={capabilities}
            userLabel={userLabel}
            userEmail={userEmail}
          />
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <OrganizationWorkspaceBackground />
        <OrganizationTopbar
          slug={slug}
          orgName={orgName}
          orgLogoUrl={orgLogoUrl}
          current={current}
          memberships={memberships}
          capabilities={capabilities}
          userLabel={userLabel}
          userEmail={userEmail}
        />
        <main
          id="main-content"
          className="relative z-10 mx-auto w-full max-w-[1440px] flex-1 px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pt-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
