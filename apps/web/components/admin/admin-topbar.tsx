'use client';

import { Bell, Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { AdminSidebar, type AdminQueueCounts } from '@/components/admin/admin-sidebar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PlatformCapabilities } from '@/lib/admin/capabilities';
import { cn } from '@/lib/utils';

export function AdminTopbar({
  capabilities,
  displayName,
  email,
  queueCounts,
}: {
  capabilities: PlatformCapabilities;
  displayName: string;
  email?: string | null;
  queueCounts: AdminQueueCounts;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const initials = (displayName || 'A')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (capabilities.canManageOrganizations) {
      router.push(`/admin/organizations?q=${encodeURIComponent(q)}`);
      return;
    }
    if (capabilities.canViewWorkers) {
      router.push(`/admin/workers?q=${encodeURIComponent(q)}`);
    }
  }

  const notifyHref = capabilities.canManageOrganizations
    ? '/admin/organizations?status=under_review&sort=oldest'
    : '/admin/applications';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-bh-border bg-bh-surface/95 px-4 backdrop-blur sm:h-[68px] sm:px-6 lg:px-8">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 border-bh-border min-[1180px]:hidden"
        aria-label="Open navigation menu"
        onClick={() => setMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <form
        onSubmit={onSearch}
        className="relative hidden min-w-0 flex-1 sm:block"
        role="search"
      >
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bh-text-muted"
          aria-hidden
        />
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            capabilities.canManageOrganizations
              ? 'Search organizations…'
              : 'Search workers…'
          }
          className="h-11 w-full max-w-xl rounded-full border border-bh-border bg-bh-subtle/70 pl-10 pr-4 text-sm text-bh-text placeholder:text-bh-text-muted focus:border-bh-teal focus:bg-bh-surface focus:outline-none focus:ring-2 focus:ring-bh-teal/30"
        />
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="relative rounded-full border-bh-border"
        >
          <Link
            href={notifyHref}
            aria-label={
              queueCounts.organizations > 0
                ? `${queueCounts.organizations} organizations awaiting review`
                : 'Notifications'
            }
          >
            <Bell className="h-4 w-4" aria-hidden />
            {queueCounts.organizations > 0 ||
            (queueCounts.unreadOrgNotices ?? 0) > 0 ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-bh-danger ring-2 ring-bh-surface" />
            ) : null}
          </Link>
        </Button>

        <div className="hidden items-center gap-2.5 sm:flex">
          <span
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full bg-bh-teal-soft text-sm font-bold text-bh-teal-strong',
            )}
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-bh-text">{displayName}</p>
            <p className="truncate text-[11px] capitalize text-bh-text-muted">
              {capabilities.role.replaceAll('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          showClose
          className="left-0 top-0 h-full max-h-full w-[min(100%,280px)] translate-x-0 translate-y-0 rounded-none border-0 p-0 sm:max-w-[280px]"
        >
          <DialogTitle className="sr-only">Platform admin navigation</DialogTitle>
          <AdminSidebar
            capabilities={capabilities}
            displayName={displayName}
            email={email}
            queueCounts={queueCounts}
            className="h-full w-full"
            onNavigate={() => setMenuOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </header>
  );
}
