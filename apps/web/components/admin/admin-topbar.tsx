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
  const [searchFocused, setSearchFocused] = useState(false);
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
  const searchActive = searchFocused || query.trim().length > 0;
  const notifyCount =
    queueCounts.organizations + (queueCounts.unreadOrgNotices ?? 0);
  const hasAlerts = notifyCount > 0;

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
        className={`relative hidden min-w-0 flex-1 transition-[max-width] duration-300 sm:block ${
          searchActive ? 'max-w-2xl' : 'max-w-xl'
        }`}
        role="search"
      >
        <div
          className={`group relative rounded-full p-[1.5px] transition duration-300 ${
            searchActive
              ? 'bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey shadow-[0_10px_28px_rgba(11,42,67,0.18)]'
              : 'bg-gradient-to-r from-[#071d30]/15 via-[#071d30]/10 to-[#071d30]/15'
          }`}
        >
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 transition duration-700 ${
              searchActive ? 'animate-[pulse_2.4s_ease-in-out_infinite] opacity-40' : ''
            }`}
          />
          <div className="relative flex items-center rounded-full bg-white">
            <Search
              className={`pointer-events-none absolute left-3.5 h-4 w-4 transition duration-300 ${
                searchActive
                  ? 'scale-110 text-bh-teal-strong'
                  : 'text-bh-sidebar/55'
              }`}
              aria-hidden
            />
            <input
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={
                capabilities.canManageOrganizations
                  ? 'Search organizations…'
                  : 'Search workers…'
              }
              className="h-11 w-full rounded-full border-0 bg-transparent pl-10 pr-24 text-sm font-medium text-bh-text placeholder:font-normal placeholder:text-bh-text-muted focus:outline-none"
            />
            {query.trim() ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-[4.25rem] rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-text-muted transition hover:bg-bh-subtle hover:text-bh-sidebar"
              >
                Clear
              </button>
            ) : null}
            <button
              type="submit"
              className={`absolute right-1.5 inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold transition duration-300 ${
                searchActive
                  ? 'bg-gradient-to-r from-bh-sidebar to-bh-teal text-white shadow-[0_6px_14px_rgba(11,42,67,0.25)] hover:brightness-110'
                  : 'bg-bh-subtle text-bh-sidebar hover:bg-bh-teal-soft'
              }`}
            >
              Go
            </button>
          </div>
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Link
          href={notifyHref}
          aria-label={
            hasAlerts
              ? `${notifyCount} item${notifyCount === 1 ? '' : 's'} need attention`
              : 'Notifications'
          }
          className={`group relative inline-flex h-11 w-11 items-center justify-center rounded-full p-[1.5px] transition duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-honey ${
            hasAlerts
              ? 'bg-gradient-to-br from-bh-honey via-bh-teal to-bh-sidebar shadow-[0_10px_24px_rgba(224,170,24,0.35)]'
              : 'bg-gradient-to-br from-[#071d30]/18 via-[#071d30]/10 to-[#071d30]/18 shadow-[0_6px_16px_rgba(7,29,48,0.1)]'
          }`}
        >
          {hasAlerts ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-bh-honey/35 opacity-40"
            />
          ) : null}
          <span
            className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-full transition duration-300 ${
              hasAlerts
                ? 'bg-gradient-to-br from-[#0b2a43] via-[#0e4a5c] to-[#0b2a43] text-bh-honey'
                : 'bg-white text-bh-sidebar group-hover:bg-bh-subtle'
            }`}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-full"
            />
            <Bell
              className={`relative h-[18px] w-[18px] transition duration-300 group-hover:rotate-12 group-hover:scale-110 ${
                hasAlerts ? 'text-bh-honey' : ''
              }`}
              aria-hidden
            />
          </span>
          {hasAlerts ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-bh-honey to-[#c9920f] px-1 text-[10px] font-bold tabular-nums text-bh-sidebar shadow-[0_4px_10px_rgba(224,170,24,0.45)] ring-2 ring-bh-surface">
              {notifyCount > 9 ? '9+' : notifyCount}
            </span>
          ) : null}
        </Link>

        <div className="group relative hidden max-w-[18.5rem] overflow-hidden rounded-full bg-[#0b2a43] py-1.5 pl-1.5 pr-4 shadow-[0_10px_28px_rgba(7,29,48,0.18)] transition duration-300 hover:bg-[#0e3552] hover:shadow-[0_14px_32px_rgba(7,29,48,0.24)] sm:block">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-bh-teal/15 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-bh-honey/45 to-transparent opacity-70"
          />
          <div className="relative flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bh-honey text-[13px] font-bold tracking-wide text-bh-sidebar shadow-[0_6px_14px_rgba(224,170,24,0.28)]">
              {initials}
              <span
                aria-hidden
                className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-bh-success shadow-[0_0_0_2px_#0b2a43]"
              />
            </span>
            <div className="min-w-0 pr-0.5">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
                {roleLabel}
              </p>
              <p className="truncate text-[13px] font-semibold leading-tight tracking-tight text-white">
                {email ?? displayName}
              </p>
            </div>
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
