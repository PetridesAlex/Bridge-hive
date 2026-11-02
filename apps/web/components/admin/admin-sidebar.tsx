'use client';

import {
  Briefcase,
  Building2,
  ClipboardCheck,
  FileSearch,
  Headphones,
  LayoutDashboard,
  LogOut,
  Receipt,
  ScrollText,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { signOutAction } from '@/app/actions/auth';
import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { Button } from '@/components/ui/button';
import type { PlatformCapabilities } from '@/lib/admin/capabilities';
import { cn } from '@/lib/utils';

export type AdminQueueCounts = {
  credentials: number;
  applications: number;
  organizations: number;
  unreadOrgNotices?: number;
};

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  icon: typeof LayoutDashboard;
  badgeKey?: keyof AdminQueueCounts;
  visible: (caps: PlatformCapabilities) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    exact: true,
    icon: LayoutDashboard,
    visible: () => true,
  },
  {
    href: '/admin/organizations',
    label: 'Organizations',
    icon: Building2,
    badgeKey: 'organizations',
    visible: (c) => c.canManageOrganizations,
  },
  {
    href: '/admin/applications',
    label: 'Applications',
    icon: ClipboardCheck,
    badgeKey: 'applications',
    visible: (c) => c.canViewWorkers,
  },
  {
    href: '/admin/recruitment',
    label: 'Recruitment',
    icon: Briefcase,
    visible: (c) => c.canReviewRecruitment,
  },
  {
    href: '/admin/workers',
    label: 'Workers',
    icon: Users,
    visible: (c) => c.canViewWorkers,
  },
  {
    href: '/admin/credentials',
    label: 'Credentials',
    icon: FileSearch,
    badgeKey: 'credentials',
    visible: (c) => c.canViewCredentialMetadata,
  },
  {
    href: '/admin/payouts',
    label: 'Payout reviews',
    icon: Wallet,
    visible: (c) => c.canApprovePayoutAccounts || c.canViewPayoutProof,
  },
  {
    href: '/admin/audit',
    label: 'Audit',
    icon: ScrollText,
    visible: (c) => c.canViewAudit,
  },
  {
    href: '/admin/finance',
    label: 'Finance',
    icon: Receipt,
    visible: (c) => c.canViewFinance || c.canViewFinancePlaceholder,
  },
];

function roleLabel(role: string): string {
  return role.replaceAll('_', ' ');
}

export function AdminSidebar({
  capabilities,
  displayName,
  email,
  queueCounts,
  className,
  onNavigate,
}: {
  capabilities: PlatformCapabilities;
  displayName: string;
  email?: string | null;
  queueCounts: AdminQueueCounts;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.visible(capabilities));
  const initials = (displayName || 'A')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn(
        'flex h-full w-[280px] flex-col bg-bh-sidebar text-bh-sidebar-text',
        className,
      )}
    >
      <div className="relative overflow-hidden border-b border-white/10 px-5 py-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-bh-teal/25 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-14 left-4 h-28 w-28 rounded-full bg-bh-honey/20 blur-2xl"
        />
        <div className="relative flex items-center gap-4">
          <div className="relative shrink-0 rounded-[1.15rem] bg-gradient-to-br from-bh-honey via-bh-teal to-bh-sidebar p-[2px] shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
            <div className="rounded-[1.05rem] bg-[#071d30] p-1 ring-1 ring-white/10">
              <BridgeHiveMark
                size={72}
                className="h-[72px] w-[72px] rounded-[0.9rem]"
              />
            </div>
            <span
              aria-hidden
              className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-bh-success ring-[3px] ring-bh-sidebar"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bh-honey">
              Bridge Hive
            </p>
            <p className="mt-1 truncate font-display text-lg font-semibold leading-tight tracking-tight text-white">
              Platform Admin
            </p>
            <p className="mt-1 truncate text-[11px] font-medium text-bh-sidebar-text/65">
              Console
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3.5 py-5" aria-label="Platform admin">
        <div className="mb-3 flex items-center gap-2.5 px-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey">
            Console
          </p>
          <span
            aria-hidden
            className="h-px flex-1 bg-gradient-to-r from-bh-honey/50 via-white/10 to-transparent"
          />
        </div>
        <ul className="space-y-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const badge =
              item.badgeKey && queueCounts[item.badgeKey]
                ? Number(queueCounts[item.badgeKey])
                : 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                  className={cn(
                    'group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-[15px] font-semibold tracking-tight transition-all duration-300',
                    active
                      ? 'bg-gradient-to-r from-bh-teal via-[#0e4a63] to-bh-sidebar text-white shadow-[0_10px_24px_rgba(11,42,67,0.35)] ring-1 ring-white/10'
                      : 'text-bh-sidebar-muted hover:translate-x-0.5 hover:bg-white/[0.07] hover:text-white hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]',
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-2 left-0 w-1 rounded-full bg-bh-honey shadow-[0_0_12px_rgba(224,170,24,0.7)]"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-3 left-0 w-0.5 rounded-full bg-bh-honey/0 transition-all duration-300 group-hover:bg-bh-honey/70"
                    />
                  )}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition duration-700 group-hover:translate-x-full group-hover:opacity-100"
                  />
                  <span
                    className={cn(
                      'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-300',
                      active
                        ? 'bg-white/15 text-bh-honey shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]'
                        : 'bg-white/5 text-bh-sidebar-muted group-hover:scale-105 group-hover:bg-bh-honey/15 group-hover:text-bh-honey',
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <span className="relative min-w-0 flex-1 truncate">{item.label}</span>
                  {badge > 0 ? (
                    <span
                      className={cn(
                        'relative rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums shadow-sm',
                        active
                          ? 'bg-bh-honey text-bh-sidebar'
                          : 'bg-bh-honey text-bh-sidebar ring-1 ring-bh-honey/40',
                      )}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-white/10 p-3.5">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-bh-teal/20 blur-2xl"
          />
          <div className="relative flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-bh-teal/40 to-bh-honey/25 text-bh-honey ring-1 ring-white/15">
              <Headphones className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Need help?</p>
              <p className="mt-1 text-xs leading-5 text-bh-sidebar-muted">
                Platform ops support for verification and organization review.
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#071d30]/55 p-[1px] shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
          <div className="relative flex items-center gap-3 rounded-[15px] bg-gradient-to-br from-white/[0.07] to-transparent px-3 py-2.5">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-bh-honey to-[#c9920f] text-sm font-bold tracking-wide text-bh-sidebar shadow-[0_6px_14px_rgba(224,170,24,0.35)] ring-1 ring-white/20">
              {initials}
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-bh-success ring-2 ring-[#071d30]"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-white">
                {displayName}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-bh-honey">
                {roleLabel(capabilities.role)}
              </p>
              {email ? (
                <p className="mt-0.5 truncate text-xs text-bh-sidebar-muted">
                  {email}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="group h-11 w-full justify-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[15px] font-semibold text-bh-sidebar-muted transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-bh-sidebar-muted transition group-hover:bg-bh-honey/20 group-hover:text-bh-honey">
              <LogOut className="h-[16px] w-[16px]" aria-hidden />
            </span>
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
