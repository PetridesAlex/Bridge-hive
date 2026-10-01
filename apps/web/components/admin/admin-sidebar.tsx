'use client';

import {
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
      <div className="border-b border-white/10 px-5 py-6">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-bh-honey text-sm font-bold text-bh-text shadow-sm"
            aria-hidden
          >
            BH
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-honey">
              Bridge Hive
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-bh-sidebar-text/90">
              Platform Admin
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3.5 py-5" aria-label="Platform admin">
        <p className="mb-2.5 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-sidebar-muted">
          Console
        </p>
        <ul className="space-y-1">
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
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {badge > 0 ? (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-bh-honey text-bh-text',
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
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bh-teal/25 text-bh-honey">
              <Headphones className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-bh-sidebar-text">Need help?</p>
              <p className="mt-0.5 text-xs leading-5 text-bh-sidebar-muted">
                Platform ops support for verification and organization review.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bh-honey/20 text-sm font-bold text-bh-honey">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-bh-sidebar-text">
              {displayName}
            </p>
            <p className="mt-0.5 truncate text-xs capitalize text-bh-sidebar-muted">
              {roleLabel(capabilities.role)}
              {email ? ` · ${email}` : ''}
            </p>
          </div>
        </div>

        <form action={signOutAction}>
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
