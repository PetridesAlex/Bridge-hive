'use client';

import {
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
  const groups = (['overview', 'operations', 'finance', 'organization'] as const).filter(
    (g) => items.some((i) => i.group === g),
  );

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 w-[280px] flex-col bg-bh-sidebar text-bh-sidebar-text',
        className,
      )}
    >
      <div className="relative overflow-hidden border-b border-white/10 px-5 py-6">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-bh-honey/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 left-8 h-24 w-24 rounded-full bg-bh-teal/15 blur-2xl"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <BridgeHiveMark
            size={44}
            className="h-11 w-11 shrink-0 rounded-2xl shadow-[0_8px_18px_rgba(7,29,48,0.35)] ring-1 ring-white/10"
          />
          <div className="min-w-0">
            <p className="text-[13px] font-bold leading-none tracking-tight">
              <span className="text-white">Bridge</span>{' '}
              <span className="text-bh-honey">Hive</span>
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="h-px w-4 bg-bh-honey/70" aria-hidden />
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-sidebar-muted">
                Organization workspace
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3.5 py-4">
        <OrganizationSwitcher current={current} memberships={memberships} />
        <SidebarLiveClock />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-5" aria-label="Organization">
        {groups.map((group) => (
          <div key={group} className="mb-5">
            <p className="mb-2.5 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-sidebar-muted">
              {ORG_NAV_GROUP_LABELS[group]}
            </p>
            <ul className="space-y-1">
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
                          'group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold tracking-tight transition-[color,background-color,box-shadow]',
                          active
                            ? 'bg-bh-accent-blue text-white shadow-[0_8px_18px_rgba(37,99,235,0.35)]'
                            : 'text-bh-sidebar-muted hover:bg-bh-sidebar-hover hover:text-bh-sidebar-text',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                            active
                              ? 'bg-white/15 text-white'
                              : 'bg-white/5 text-bh-sidebar-muted group-hover:bg-white/10 group-hover:text-bh-sidebar-text',
                          )}
                        >
                          <Icon className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto shrink-0 border-t border-white/10 p-3.5">
        <div className="mb-2.5 flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bh-honey/20 text-sm font-bold text-bh-honey">
            {(userLabel || 'U')
              .split(/\s+/)
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-bh-sidebar-text">
              {userLabel}
            </p>
            {userEmail ? (
              <p className="mt-0.5 truncate text-xs text-bh-sidebar-muted">{userEmail}</p>
            ) : null}
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
            variant="ghost"
            size="sm"
            className="h-11 w-full justify-start gap-3 rounded-xl px-3 text-[15px] font-semibold text-bh-sidebar-muted hover:bg-bh-sidebar-hover hover:text-bh-sidebar-text"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
