'use client';

import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  Settings,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  shifts: CalendarDays,
  timesheets: ClipboardList,
  locations: MapPin,
  payments: Wallet,
  recruitment: Briefcase,
  settings: Settings,
};

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
      <div className="relative flex h-[76px] shrink-0 items-center overflow-hidden border-b border-white/10 px-4 sm:h-[80px] sm:px-5">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,rgba(20,169,181,0.14)_0%,transparent_45%,rgba(228,179,52,0.12)_100%)]"
          aria-hidden
        />
        <div className="relative flex min-w-0 items-center gap-3.5">
          <BridgeHiveMark
            size={52}
            priority
            className="h-[52px] w-[52px] shrink-0 rounded-2xl shadow-[0_10px_22px_rgba(0,0,0,0.35)] ring-1 ring-white/20"
          />
          <div className="min-w-0">
            <p className="text-[17px] font-extrabold leading-none tracking-[-0.03em]">
              <span className="text-white">Bridge</span>{' '}
              <span className="text-bh-honey">Hive</span>
            </p>
            <p className="mt-1.5 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-sidebar-muted">
              Organization workspace
            </p>
          </div>
        </div>
      </div>

      <div className="px-3.5 py-4">
        <OrganizationSwitcher current={current} memberships={memberships} />
        <SidebarLiveClock />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-5" aria-label="Organization">
        {groups.map((group) => (
          <div key={group} className="mb-6">
            <div className="mb-2.5 flex items-center gap-2.5 px-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-bh-sidebar-muted">
                {ORG_NAV_GROUP_LABELS[group]}
              </p>
              <span
                aria-hidden
                className="h-px flex-1 bg-[linear-gradient(90deg,rgba(22,166,182,0.45),rgba(228,179,52,0.2),transparent)]"
              />
            </div>
            <ul className="space-y-1.5">
              {items
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = ICONS[item.id];
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={onNavigate}
                        className={cn(
                          'group relative flex min-h-12 items-center gap-3 overflow-hidden rounded-2xl px-2.5 py-2.5 text-[15px] font-semibold tracking-tight',
                          'border transition-all duration-300 ease-out',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal/70',
                          'motion-reduce:transition-none',
                          active
                            ? 'border-bh-teal/35 bg-[linear-gradient(125deg,rgba(22,166,182,0.28)_0%,rgba(10,37,56,0.95)_48%,rgba(228,179,52,0.12)_100%)] text-white shadow-[0_12px_28px_rgba(22,166,182,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]'
                            : 'border-transparent text-bh-sidebar-muted hover:translate-x-0.5 hover:border-white/10 hover:bg-white/[0.05] hover:text-bh-sidebar-text hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] motion-reduce:hover:translate-x-0',
                        )}
                      >
                        {active ? (
                          <>
                            <span
                              aria-hidden
                              className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[linear-gradient(180deg,#16a6b6_0%,#e0aa18_100%)] shadow-[0_0_12px_rgba(22,166,182,0.65)]"
                            />
                            <span
                              aria-hidden
                              className="bh-gradient-sheen pointer-events-none absolute inset-0 opacity-40 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.12)_48%,transparent_72%)]"
                            />
                          </>
                        ) : (
                          <span
                            aria-hidden
                            className="absolute inset-y-2.5 left-0 w-[2px] scale-y-0 rounded-full bg-bh-teal/70 opacity-0 transition-all duration-300 group-hover:scale-y-100 group-hover:opacity-100"
                          />
                        )}

                        <span
                          className={cn(
                            'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
                            active
                              ? 'bg-[linear-gradient(145deg,rgba(22,166,182,0.55)_0%,rgba(7,29,48,0.9)_55%,rgba(228,179,52,0.35)_130%)] text-white shadow-[0_8px_16px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-white/20'
                              : 'bg-white/[0.04] text-bh-sidebar-muted ring-1 ring-white/8 group-hover:bg-white/[0.08] group-hover:text-bh-teal group-hover:ring-bh-teal/30',
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-[18px] w-[18px] transition-transform duration-300',
                              active
                                ? 'scale-105'
                                : 'group-hover:scale-110 motion-reduce:group-hover:scale-100',
                            )}
                            aria-hidden
                          />
                        </span>

                        <span className="relative min-w-0 flex-1 truncate">
                          {item.label}
                        </span>

                        <span
                          aria-hidden
                          className={cn(
                            'relative h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-300',
                            active
                              ? 'bg-bh-honey shadow-[0_0_10px_rgba(224,170,24,0.85)]'
                              : 'bg-transparent group-hover:bg-bh-teal/70',
                          )}
                        />
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto shrink-0 border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(0,0,0,0.18)_100%)] p-3.5">
        <div className="mb-2.5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#16384f_0%,#0c3a42_45%,#e4b334_100%)] text-[13px] font-bold tracking-wide text-white shadow-[0_8px_18px_rgba(228,179,52,0.22)] ring-1 ring-white/20">
              {(userLabel || 'U')
                .split(/\s+/)
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-bh-success ring-2 ring-[#071d30]"
                aria-hidden
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold tracking-tight text-white">
                {userLabel}
              </p>
              {userEmail ? (
                <p className="mt-0.5 truncate text-[11px] text-white/55">
                  {userEmail}
                </p>
              ) : null}
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-honey ring-1 ring-white/10">
                <span className="h-1 w-1 rounded-full bg-bh-honey" aria-hidden />
                Signed in
              </p>
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
            className="group h-11 w-full justify-start gap-3 rounded-xl border border-white/15 bg-white/[0.08] px-3 text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-bh-teal/50 hover:bg-bh-teal/35 hover:text-white hover:shadow-[0_12px_24px_rgba(20,184,166,0.28)] active:translate-y-0 motion-reduce:hover:translate-y-0"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/12 text-white ring-1 ring-white/20 transition-all duration-200 group-hover:scale-105 group-hover:bg-bh-teal/40 group-hover:text-white group-hover:ring-bh-teal/45 motion-reduce:group-hover:scale-100">
              <LogOut className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
            </span>
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
