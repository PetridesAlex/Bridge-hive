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
    <div className="relative flex min-h-dvh bg-[#e8eef2]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_0%_0%,rgba(7,29,48,0.07),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_0%,rgba(14,116,144,0.08),transparent_50%),linear-gradient(180deg,#e8eef2_0%,#f4f7f9_42%,#eef3f6_100%)]"
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-bh-surface focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <div className="relative z-10 hidden w-[280px] shrink-0 self-stretch bg-bh-sidebar min-[1180px]:block">
        <div className="sticky top-0 flex h-dvh flex-col">
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
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-6 pt-6 sm:px-6 lg:px-8 lg:pt-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
