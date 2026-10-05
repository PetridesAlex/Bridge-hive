'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { signOutAction } from '@/app/actions/auth';
import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { Button } from '@/components/ui/button';
import { roleLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: 'dashboard', label: 'Dashboard', requiresOperational: false },
  { href: 'locations', label: 'Locations', requiresOperational: true },
  { href: 'shifts', label: 'Shifts', requiresOperational: true },
  { href: 'settings', label: 'Settings', requiresOperational: false },
] as const;

export function OrgNav({
  slug,
  orgName,
  role,
  canOperate,
}: {
  slug: string;
  orgName: string;
  role: string;
  canOperate: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <BridgeHiveMark size={32} className="mt-0.5 h-8 w-8 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                Bridge Hive
              </p>
              <h1 className="text-lg font-semibold text-slate-900">{orgName}</h1>
              <p className="text-xs text-slate-500">{roleLabel(role)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Switch org</Link>
            </Button>
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1">
          {NAV_ITEMS.filter(
            (item) => !item.requiresOperational || canOperate,
          ).map((item) => {
            const href = `/org/${slug}/${item.href}`;
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium',
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
