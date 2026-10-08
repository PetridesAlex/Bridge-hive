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

  const roleLabel = capabilities.role.replaceAll('_', ' ');

  return (
    <header className="sticky top-0 z-30 border-b border-[#071d30]/20 bg-bh-surface/95 shadow-[0_12px_32px_rgba(7,29,48,0.08)] backdrop-blur">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-bh-honey to-transparent"
      />
      <div className="relative flex h-16 items-center gap-3 px-4 sm:h-[68px] sm:px-6 lg:px-8">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 border-[#071d30]/15 bg-white text-bh-sidebar shadow-sm min-[1180px]:hidden"
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
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bh-sidebar/55"
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
          className="h-11 w-full max-w-xl rounded-full border border-[#071d30]/15 bg-white pl-10 pr-4 text-sm font-medium text-bh-text shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(7,29,48,0.06)] placeholder:font-normal placeholder:text-bh-text-muted focus:border-bh-sidebar focus:outline-none focus:ring-2 focus:ring-bh-honey/50"
        />
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="relative rounded-full border-[#071d30]/15 bg-white text-bh-sidebar shadow-sm"
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
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-bh-honey ring-2 ring-white" />
            ) : null}
          </Link>
        </Button>

        <div className="hidden max-w-[17rem] items-center gap-2.5 rounded-2xl bg-bh-sidebar py-1.5 pl-1.5 pr-3.5 shadow-[0_10px_24px_rgba(7,29,48,0.32)] ring-1 ring-white/10 sm:flex">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bh-honey text-sm font-bold tracking-wide text-bh-sidebar">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-bh-honey">
              {roleLabel}
            </p>
            <p className="truncate text-[13px] font-semibold leading-tight text-white">
              {displayName}
            </p>
          </div>
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
