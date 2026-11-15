'use client';

import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Settings,
  Wallet,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

import { OrgNavLink } from '@/components/org/org-nav-link';

import { signOutAction } from '@/app/actions/auth';
import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import {
  OrganizationSwitcher,
  type SwitcherOrg,
} from '@/components/org/organization-switcher';
import { SidebarLiveClock } from '@/components/org/sidebar-live-clock';
import { Button } from '@/components/ui/button';
import { clearOrganizationLogoUrlCache } from '@/lib/organization-logo';
import { cn } from '@/lib/utils';
import {
  ORG_NAV_GROUP_LABELS,
  orgNavItemsForCapabilities,
  type OrgNavCapabilities,
  type OrgNavItem,
} from '@bridge-hive/domain';

const ICONS: Record<OrgNavItem['id'], typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  messages: MessageSquare,
  shifts: CalendarDays,
  timesheets: ClipboardList,
  locations: MapPin,
  payments: Wallet,
  recruitment: Briefcase,
  settings: Settings,
};

function initialsFor(label: string): string {
  return (label || 'U')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function OrganizationSidebar({
  slug,
  current,
  memberships,
  capabilities,
  userLabel,
  userEmail,
  className,
  onNavigate,
}: {
  slug: string;
  current: SwitcherOrg;
  memberships: SwitcherOrg[];
  capabilities: OrgNavCapabilities;
  userLabel: string;
  userEmail?: string | null;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = orgNavItemsForCapabilities(slug, capabilities);
  const groups = (
    ['overview', 'operations', 'finance', 'recruitment', 'organization'] as const
  ).filter((g) => items.some((i) => i.group === g));

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 w-[280px] flex-col bg-[linear-gradient(180deg,#0a2538_0%,#071d30_42%,#061827_100%)] text-bh-sidebar-text',
        className,
      )}
    >
      {/* Matches OrganizationTopbar height + shared bottom edge */}
      <div className="relative flex h-[76px] shrink-0 items-center overflow-hidden px-4 sm:h-[80px] sm:px-5">
        <div className="relative flex min-w-0 items-center gap-3">
          <BridgeHiveMark
            size={44}
            priority
            className="h-11 w-11 shrink-0 rounded-xl"
          />
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold leading-none tracking-[-0.02em]">
              <span className="text-white">Bridge</span>{' '}
              <span className="text-bh-honey">Hive</span>
            </p>
            <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.12em] text-bh-sidebar-muted">
              Organization workspace
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-2 px-3 pb-3">
        <div className="space-y-2 rounded-xl bg-white/[0.03] p-2">
          <OrganizationSwitcher current={current} memberships={memberships} />
          <SidebarLiveClock />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Organization">
        {groups.map((group) => (
          <div key={group} className="mb-4 last:mb-0">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-sidebar-muted">
              {ORG_NAV_GROUP_LABELS[group]}
            </p>
            <ul className="space-y-0.5 rounded-lg bg-white/[0.03] p-1">
              {items
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = ICONS[item.id];
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.id}>
                      <OrgNavLink
                        href={item.href}
                        eager={item.id === 'dashboard'}
                        aria-current={active ? 'page' : undefined}
                        onClick={onNavigate}
                        className={cn(
                          'group flex h-10 items-center gap-2.5 overflow-hidden rounded-md px-2 text-[13px] font-medium tracking-tight',
                          'transition-colors duration-150',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal/70 focus-visible:ring-offset-0',
                          'motion-reduce:transition-none',
                          active
                            ? 'bg-bh-teal/20 text-white'
                            : 'text-bh-sidebar-muted hover:bg-white/[0.05] hover:text-bh-sidebar-text',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150',
                            active
                              ? 'bg-bh-teal/25 text-white'
                              : 'text-bh-sidebar-muted group-hover:text-bh-teal',
                          )}
                        >
                          <Icon className="h-[16px] w-[16px]" aria-hidden />
                        </span>

                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </OrgNavLink>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="relative mt-auto shrink-0 overflow-hidden p-3">
        <span
          aria-hidden
          className="bh-org-topbar-line pointer-events-none absolute inset-x-3 top-0 h-[2px]"
        />
        <span
          aria-hidden
          className="bh-orb-drift pointer-events-none absolute -left-8 -top-10 h-24 w-24 rounded-full bg-bh-teal/25 blur-2xl"
        />
        <span
          aria-hidden
          className="bh-orb-drift pointer-events-none absolute -bottom-12 right-0 h-20 w-20 rounded-full bg-[#e4b334]/20 blur-2xl"
          style={{ animationDelay: '-6s' }}
        />

        <div className="relative space-y-2">
          <div className="group/account relative overflow-hidden rounded-2xl bg-[linear-gradient(145deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.04)_100%)] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.25)] ring-1 ring-white/12 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <span
              aria-hidden
              className="bh-gradient-sheen pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_18%,rgba(255,255,255,0.16)_50%,transparent_78%)] opacity-0 transition-opacity duration-300 group-hover/account:opacity-100 motion-reduce:opacity-0"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,#e4b334,transparent)]"
            />
            <div className="relative flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7dffb3] ring-1 ring-emerald-300/25">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7dffb3] opacity-70 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#7dffb3]" />
                </span>
                Signed in
              </span>
              <span
                className="max-w-[55%] truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45"
                title={current.role.replace(/_/g, ' ')}
              >
                {current.role.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="relative mt-2.5 flex min-w-0 items-center gap-3">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#f3d27a_0%,#e4b334_55%,#c8951b_100%)] text-[13px] font-extrabold tracking-[0.04em] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_20px_rgba(228,179,52,0.35)] ring-2 ring-[#e4b334]/30 ring-offset-2 ring-offset-[#0a2538]">
                {initialsFor(userLabel)}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[14px] font-bold leading-tight tracking-[-0.01em] text-white"
                  title={userLabel}
                >
                  {userLabel}
                </p>
                {userEmail ? (
                  <p
                    className="mt-0.5 truncate text-[11.5px] font-medium text-white/60"
                    title={userEmail}
                  >
                    {userEmail}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <form
            action={async () => {
              clearOrganizationLogoUrlCache();
              await signOutAction();
            }}
          >
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="group/out h-10 w-full justify-start gap-2.5 rounded-xl bg-white/[0.05] px-2.5 text-[13px] font-semibold text-white/85 ring-1 ring-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.1] hover:text-white hover:ring-[#e4b334]/40 focus-visible:ring-2 focus-visible:ring-bh-teal/70 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition-transform duration-200 group-hover/out:-translate-x-0.5 motion-reduce:transform-none">
                <LogOut className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
              </span>
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
