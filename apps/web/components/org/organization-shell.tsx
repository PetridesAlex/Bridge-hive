import { OrganizationSidebar } from '@/components/org/organization-sidebar';
import { OrganizationTopbar } from '@/components/org/organization-topbar';
import type { SwitcherOrg } from '@/components/org/organization-switcher';
import type { OrgNavCapabilities } from '@bridge-hive/domain';

export function OrganizationShell({
  slug,
  orgName,
  orgLogoUrl,
  current,
  memberships,
  capabilities,
  userLabel,
  userEmail,
  canCreateShift,
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
  canCreateShift: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-bh-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-bh-surface focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <div className="sticky top-0 hidden h-screen shrink-0 min-[1180px]:block">
        <OrganizationSidebar
          slug={slug}
          current={current}
          memberships={memberships}
          capabilities={capabilities}
          userLabel={userLabel}
          userEmail={userEmail}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <OrganizationTopbar
          slug={slug}
          orgName={orgName}
          orgLogoUrl={orgLogoUrl}
          canCreateShift={canCreateShift}
          current={current}
          memberships={memberships}
          capabilities={capabilities}
          userLabel={userLabel}
          userEmail={userEmail}
        />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
