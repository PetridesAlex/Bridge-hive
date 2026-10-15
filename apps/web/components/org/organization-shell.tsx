import { OrganizationSidebar } from '@/components/org/organization-sidebar';
import { OrganizationTopbar } from '@/components/org/organization-topbar';
import type { SwitcherOrg } from '@/components/org/organization-switcher';
import type { OrgNavCapabilities } from '@bridge-hive/domain';

/** Same continuous hive-flow plane used by marketing audience / capabilities bands. */
function OrganizationFlowBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#eef5fb] bg-cover bg-center bg-no-repeat lg:bg-fixed"
      style={{ backgroundImage: "url('/marketing/flow-bg.jpg')" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              180deg,
              rgba(248, 251, 253, 0.38) 0%,
              rgba(255, 255, 255, 0.22) 20%,
              rgba(248, 251, 253, 0.26) 50%,
              rgba(255, 255, 255, 0.24) 78%,
              rgba(247, 250, 252, 0.46) 100%
            ),
            radial-gradient(ellipse 72% 50% at 50% 42%, rgba(255, 255, 255, 0.34), transparent 74%)
          `,
        }}
      />
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
    <div className="relative flex min-h-dvh bg-[#eef5fb]">
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
        <OrganizationFlowBackground />
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
          className="relative z-10 mx-auto w-full max-w-[1440px] flex-1 px-4 pb-6 pt-6 sm:px-6 lg:px-8 lg:pt-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
