'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { RoleBadge } from '@/components/admin/role-badge';
import { signOutAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  exact?: boolean;
}> = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/applications', label: 'Verification applications' },
  { href: '/admin/workers', label: 'Workers' },
  { href: '/admin/credentials', label: 'Credential queue' },
  { href: '/admin/payouts', label: 'Payout reviews' },
  { href: '/admin/audit', label: 'Audit' },
  { href: '/admin/finance', label: 'Finance' },
];

export function AdminNav({
  role,
  displayName,
  queueCounts,
}: {
  role: string;
  displayName: string;
  queueCounts?: {
    credentials: number;
    applications: number;
  };
}) {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Bridge Hive · Platform admin
            </p>
            <h1 className="text-lg font-semibold text-slate-900">{displayName}</h1>
            <div className="mt-1">
              <RoleBadge role={role} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {queueCounts ? (
              <p className="hidden text-xs text-slate-500 sm:block">
                Queue: {queueCounts.applications} applications ·{' '}
                {queueCounts.credentials} credentials
              </p>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Org dashboard</Link>
            </Button>
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label="Admin">
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium',
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                {item.label}
                {item.href === '/admin/credentials' && queueCounts?.credentials
                  ? ` (${queueCounts.credentials})`
                  : null}
                {item.href === '/admin/applications' && queueCounts?.applications
                  ? ` (${queueCounts.applications})`
                  : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
