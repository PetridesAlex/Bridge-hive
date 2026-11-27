'use client';

import {
  adminShiftPhaseLabel,
  formatMoneyMinor,
  WORKER_ROLES,
  WORKER_ROLE_LABELS,
  type AdminShiftPhase,
} from '@bridge-hive/domain';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  MapPin,
  RefreshCw,
  Search,
  UserRound,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';

import { getAdminShiftAssignedWorkersAction } from '@/app/actions/admin-shifts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  AdminShiftAssignmentDetail,
  AdminShiftMonitorRow,
} from '@/lib/admin/active-shifts';
import { formatDateTime, shiftStatusLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

const FIELD =
  'h-11 w-full rounded-xl border border-bh-border/90 bg-bh-subtle/50 px-3.5 text-sm font-medium text-bh-text outline-none transition focus:border-bh-teal focus:bg-white focus:ring-2 focus:ring-bh-teal/20';

function phaseBadgeClass(phase: AdminShiftPhase) {
  if (phase === 'upcoming') {
    return 'border-[#087f8c]/50 bg-[#087f8c] text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset]';
  }
  if (phase === 'in_progress') {
    return 'border-[#a56800]/55 bg-[#c9920f] text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]';
  }
  return 'border-[#5f6f79]/35 bg-[#5f6f79] text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]';
}

function statusBadgeClass(status: string) {
  if (status === 'published') {
    return 'border-[#0b7f8c]/45 bg-[#16a6b6] text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset]';
  }
  if (status === 'filled') {
    return 'border-emerald-800/40 bg-emerald-700 text-white shadow-[0_1px_0_rgba(255,255,255,0.16)_inset]';
  }
  if (status === 'in_progress') {
    return 'border-[#a56800]/55 bg-[#c9920f] text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]';
  }
  if (status === 'awaiting_approval') {
    return 'border-[#1d4ed8]/40 bg-[#2563eb] text-white shadow-[0_1px_0_rgba(255,255,255,0.16)_inset]';
  }
  if (status === 'cancelled' || status === 'disputed') {
    return 'border-[#8a1c14]/45 bg-[#b42318] text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]';
  }
  if (status === 'completed') {
    return 'border-[#071d30]/40 bg-[#0b2a43] text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]';
  }
  if (status === 'draft') {
    return 'border-[#5f6f79]/30 bg-[#7d8a92] text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]';
  }
  return 'border-[#5f6f79]/35 bg-[#5f6f79] text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]';
}

function assignmentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    accepted: 'Accepted',
    checked_in: 'Checked in',
    checked_out: 'Checked out',
    submitted: 'Timesheet submitted',
    approved: 'Timesheet approved',
  };
  return map[status] ?? status.replaceAll('_', ' ');
}

function assignmentStatusClass(status: string): string {
  if (status === 'accepted') {
    return 'border-[#087f8c]/45 bg-[#087f8c] text-white shadow-[0_1px_0_rgba(255,255,255,0.16)_inset]';
  }
  if (status === 'checked_in') {
    return 'border-[#a56800]/55 bg-[#c9920f] text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]';
  }
  if (status === 'checked_out') {
    return 'border-[#1d4ed8]/40 bg-[#2563eb] text-white shadow-[0_1px_0_rgba(255,255,255,0.16)_inset]';
  }
  if (status === 'submitted') {
    return 'border-[#a56800]/50 bg-[#d97706] text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset]';
  }
  if (status === 'approved') {
    return 'border-emerald-800/40 bg-emerald-700 text-white shadow-[0_1px_0_rgba(255,255,255,0.16)_inset]';
  }
  return 'border-[#5f6f79]/35 bg-[#5f6f79] text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]';
}

function workerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '·';
}

function formatShiftWindow(
  startsAt: string,
  endsAt: string,
  timeZone: string,
): { date: string; time: string; overnight: boolean } {
  const startDate = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(startsAt));
  const startTime = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(startsAt));
  const endTime = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(endsAt));
  const endDate = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(endsAt));
  const startDay = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(startsAt));
  const overnight = endDate !== startDay;
  return {
    date: startDate,
    time: overnight
      ? `${startTime} → ${endTime} (+1 · ${endDate})`
      : `${startTime} – ${endTime}`,
    overnight,
  };
}

export function ActiveShiftsFilterForm({
  params,
  orgOptions,
}: {
  params: {
    q?: string;
    org?: string;
    from?: string;
    to?: string;
    role?: string;
    view?: string;
    sort?: string;
  };
  orgOptions: Array<{ id: string; name: string }>;
}) {
  return (
    <form
      method="get"
      className="overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]"
    >
      <div className="grid gap-3 border-b border-bh-border/70 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:p-5">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
            Search
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bh-text-muted" />
            <input
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Organization, ref, location…"
              className={cn(FIELD, 'pl-9')}
            />
          </div>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
            Organization
          </span>
          <select name="org" defaultValue={params.org ?? ''} className={FIELD}>
            <option value="">All organizations</option>
            {orgOptions.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
            View
          </span>
          <select name="view" defaultValue={params.view ?? 'active'} className={FIELD}>
            <option value="active">Active (default)</option>
            <option value="upcoming">Upcoming</option>
            <option value="in_progress">In progress</option>
            <option value="ended">Ended</option>
            <option value="cancelled">Cancelled</option>
            <option value="draft">Draft</option>
            <option value="all">All</option>
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
            Role
          </span>
          <select name="role" defaultValue={params.role ?? ''} className={FIELD}>
            <option value="">All roles</option>
            {WORKER_ROLES.map((role) => (
              <option key={role} value={role}>
                {WORKER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
            From date
          </span>
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ''}
            className={FIELD}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
            To date
          </span>
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ''}
            className={FIELD}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
            Sort
          </span>
          <select name="sort" defaultValue={params.sort ?? 'starts_asc'} className={FIELD}>
            <option value="starts_asc">Start time ↑</option>
            <option value="starts_desc">Start time ↓</option>
            <option value="updated_desc">Last updated</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
        <Button type="submit" className="rounded-full px-5">
          Apply filters
        </Button>
        <Link
          href="/admin/shifts"
          className="inline-flex h-10 items-center rounded-full border border-bh-border bg-white px-4 text-sm font-semibold text-bh-text-secondary shadow-sm transition hover:bg-bh-subtle hover:text-bh-text"
        >
          Clear filters
        </Link>
      </div>
    </form>
  );
}

export function ActiveShiftsTable({
  rows,
  exportHref,
}: {
  rows: AdminShiftMonitorRow[];
  exportHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState<AdminShiftMonitorRow | null>(null);
  const [workers, setWorkers] = useState<AdminShiftAssignmentDetail[] | null>(
    null,
  );
  const [workersError, setWorkersError] = useState<string | null>(null);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  async function openDetails(row: AdminShiftMonitorRow) {
    setDetail(row);
    setWorkers(null);
    setWorkersError(null);
    setLoadingWorkers(true);
    const result = await getAdminShiftAssignedWorkersAction(row.id);
    setLoadingWorkers(false);
    if (!result.ok) {
      setWorkersError(result.error);
      return;
    }
    setWorkers(result.workers);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-bh-text-secondary">
          Manual refresh — shift Realtime is not enabled for admin.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', pending && 'animate-spin')} />
            Refresh
          </Button>
          <a
            href={exportHref}
            className="inline-flex h-10 items-center rounded-full border border-bh-border bg-white px-4 text-sm font-semibold text-bh-text shadow-sm transition hover:border-bh-teal/40 hover:bg-bh-teal-soft/40 hover:text-bh-teal-strong"
            title="Exports matching rows up to the 5,000-row safety cap"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </a>
          <a
            href={`${exportHref}${exportHref.includes('?') ? '&' : '?'}format=csv`}
            className="inline-flex h-10 items-center rounded-full border border-bh-border bg-white px-4 text-sm font-semibold text-bh-text-secondary shadow-sm transition hover:bg-bh-subtle"
            title="CSV alternative — same filters and 5,000-row cap as Excel"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full border-collapse text-left text-[13px] leading-snug">
            <thead className="sticky top-0 z-10 bg-bh-subtle/95 backdrop-blur">
              <tr className="border-b border-bh-border text-[11px] font-bold uppercase tracking-[0.1em] text-bh-text-muted">
                <th className="sticky left-0 z-20 bg-bh-subtle/95 px-4 py-3.5">Ref</th>
                <th className="min-w-[10rem] px-4 py-3.5">Organization</th>
                <th className="min-w-[9rem] px-4 py-3.5">Location</th>
                <th className="min-w-[11rem] px-4 py-3.5">When</th>
                <th className="min-w-[8rem] px-4 py-3.5">Role</th>
                <th className="min-w-[7.5rem] px-4 py-3.5">Capacity</th>
                <th className="min-w-[7rem] px-4 py-3.5">Status</th>
                <th className="min-w-[7.5rem] px-4 py-3.5">Phase</th>
                <th className="min-w-[6.5rem] px-4 py-3.5">Gross / hr</th>
                <th className="min-w-[8rem] px-4 py-3.5">Updated</th>
                <th className="px-4 py-3.5"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-16 text-center text-bh-text-secondary"
                  >
                    <CalendarDays className="mx-auto mb-3 h-8 w-8 text-bh-text-muted" />
                    No shifts match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const window = formatShiftWindow(
                    row.startsAt,
                    row.endsAt,
                    row.timeZone,
                  );
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-bh-border/80 transition hover:bg-bh-teal-soft/20"
                    >
                      <td className="sticky left-0 z-10 bg-bh-surface px-4 py-3.5 font-mono text-[12px] font-bold tracking-[0.08em] text-bh-sidebar">
                        {row.shortRef}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/organizations/${row.organizationId}`}
                          className="block max-w-[14rem] truncate text-[13px] font-bold text-bh-text underline-offset-2 hover:text-bh-teal-strong hover:underline"
                          title={row.organizationName}
                        >
                          {row.organizationName}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <div
                          className="max-w-[12rem] truncate text-[13px] font-semibold text-bh-text"
                          title={row.locationName ?? undefined}
                        >
                          {row.locationName ?? '—'}
                        </div>
                        {row.locationCity ? (
                          <div className="mt-0.5 text-[12px] font-medium text-bh-text-secondary">
                            {row.locationCity}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="whitespace-nowrap text-[13px] font-semibold text-bh-text">
                          {window.date}
                        </div>
                        <div
                          className={cn(
                            'mt-0.5 whitespace-nowrap text-[12px] font-semibold',
                            window.overnight
                              ? 'text-bh-honey-strong'
                              : 'text-bh-text-secondary',
                          )}
                        >
                          {window.time}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[13px] font-semibold text-bh-text">
                        {row.roleLabel}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="whitespace-nowrap text-[13px] font-bold tabular-nums text-bh-text">
                          {row.occupied}/{row.requiredPositions}
                        </div>
                        <div className="mt-0.5 whitespace-nowrap text-[12px] font-medium text-bh-text-secondary">
                          {row.remaining} open
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          className={cn(
                            'whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize tracking-wide',
                            statusBadgeClass(row.status),
                          )}
                        >
                          {shiftStatusLabel(row.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          className={cn(
                            'whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide',
                            phaseBadgeClass(row.phase),
                          )}
                        >
                          {adminShiftPhaseLabel(row.phase)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="whitespace-nowrap text-[13px] font-bold tabular-nums text-bh-text">
                          {formatMoneyMinor(row.rateMinor, row.currency)}
                        </div>
                        <div className="mt-0.5 text-[11px] font-medium text-bh-text-secondary">
                          Gross hourly
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[12px] font-medium text-bh-text-secondary">
                        {formatDateTime(row.updatedAt, row.timeZone)}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => void openDetails(row)}
                          className="whitespace-nowrap rounded-full border border-bh-border bg-white px-3.5 py-1.5 text-xs font-bold text-bh-text shadow-sm transition hover:border-bh-teal/40 hover:bg-bh-teal-soft/40 hover:text-bh-teal-strong"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) {
            setDetail(null);
            setWorkers(null);
            setWorkersError(null);
          }
        }}
      >
        <DialogContent
          showClose
          className={cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(100%-1.5rem,34rem)] -translate-x-1/2 -translate-y-1/2',
            'overflow-hidden rounded-[1.35rem] border border-bh-border/80 bg-bh-surface p-0',
            'shadow-[0_28px_72px_rgba(7,29,48,0.24)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          {detail ? (
            <div className="relative flex max-h-[88vh] flex-col">
              <div
                aria-hidden
                className="h-1.5 shrink-0 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-1.5 h-40 bg-[radial-gradient(420px_160px_at_0%_0%,rgba(22,166,182,0.12),transparent_55%),radial-gradient(360px_140px_at_100%_0%,rgba(224,170,24,0.1),transparent_50%)]"
              />

              <div className="relative overflow-y-auto px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
                <div className="flex items-start gap-3.5 pr-8">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-sm font-bold tracking-wide text-white shadow-[0_10px_22px_rgba(7,29,48,0.28)]">
                    {detail.roleLabel
                      .split(/\s+/)
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
                      Shift details · read-only
                    </p>
                    <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-bh-text sm:text-[1.35rem]">
                      {detail.roleLabel}
                    </DialogTitle>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-bh-sidebar/15 bg-gradient-to-b from-white to-bh-subtle/80 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.1em] text-bh-sidebar shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                        {detail.shortRef}
                      </span>
                      <Badge
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                          statusBadgeClass(detail.status),
                        )}
                      >
                        {shiftStatusLabel(detail.status)}
                      </Badge>
                      <Badge
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                          phaseBadgeClass(detail.phase),
                        )}
                      >
                        {adminShiftPhaseLabel(detail.phase)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-[1.05rem] border border-bh-border/80 bg-gradient-to-b from-bh-surface to-bh-subtle/30 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
                      <Building2 className="h-3.5 w-3.5" aria-hidden />
                      Organization
                    </p>
                    <Link
                      href={`/admin/organizations/${detail.organizationId}`}
                      className="mt-1.5 block text-sm font-semibold text-bh-teal-strong underline-offset-2 hover:underline"
                    >
                      {detail.organizationName}
                    </Link>
                  </div>
                  <div className="rounded-[1.05rem] border border-bh-border/80 bg-gradient-to-b from-bh-surface to-bh-subtle/30 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      Location
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-bh-text">
                      {detail.locationName ?? '—'}
                    </p>
                    {detail.locationCity ? (
                      <p className="text-xs text-bh-text-muted">
                        {detail.locationCity}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-[1.05rem] border border-bh-border/80 bg-gradient-to-b from-bh-surface to-bh-subtle/30 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:col-span-2">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden />
                      Schedule · {detail.timeZone}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-bh-text">
                      {formatDateTime(detail.startsAt, detail.timeZone)}
                      <span className="mx-1.5 text-bh-text-muted">→</span>
                      {formatDateTime(detail.endsAt, detail.timeZone)}
                    </p>
                  </div>
                  <div className="rounded-[1.05rem] border border-bh-border/80 bg-gradient-to-b from-bh-surface to-bh-subtle/30 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
                      <UserRound className="h-3.5 w-3.5" aria-hidden />
                      Capacity
                    </p>
                    <p className="mt-1.5 text-sm font-semibold tabular-nums text-bh-text">
                      {detail.occupied}/{detail.requiredPositions}
                      <span className="ml-1.5 text-xs font-medium text-bh-text-muted">
                        · {detail.remaining} open
                      </span>
                    </p>
                  </div>
                  <div className="rounded-[1.05rem] border border-bh-border/80 bg-gradient-to-b from-bh-surface to-bh-subtle/30 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
                      <Wallet className="h-3.5 w-3.5" aria-hidden />
                      Gross hourly
                    </p>
                    <p className="mt-1.5 text-sm font-semibold tabular-nums text-bh-text">
                      {formatMoneyMinor(detail.rateMinor, detail.currency)}
                    </p>
                  </div>
                </div>

                {detail.title || detail.notes ? (
                  <div className="mt-3 rounded-[1.05rem] border border-bh-border/80 bg-gradient-to-b from-bh-subtle/70 to-white px-3.5 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    {detail.title ? (
                      <p className="font-semibold text-bh-text">{detail.title}</p>
                    ) : null}
                    {detail.notes ? (
                      <p
                        className={cn(
                          'whitespace-pre-wrap text-bh-text-secondary',
                          detail.title && 'mt-1',
                        )}
                      >
                        {detail.notes}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5">
                  <div className="mb-2.5 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-bh-honey-strong">
                        Staffing
                      </p>
                      <h3 className="mt-0.5 text-sm font-semibold text-bh-text">
                        Accepted assignments
                      </h3>
                    </div>
                    <p className="text-xs tabular-nums text-bh-text-muted">
                      {loadingWorkers
                        ? '…'
                        : `${workers?.length ?? 0} of ${detail.requiredPositions}`}
                    </p>
                  </div>

                  {loadingWorkers ? (
                    <div className="space-y-2">
                      <div className="h-[4.5rem] animate-pulse rounded-[1.05rem] border border-bh-border/70 bg-bh-subtle/60" />
                      <div className="h-[4.5rem] animate-pulse rounded-[1.05rem] border border-bh-border/70 bg-bh-subtle/40" />
                    </div>
                  ) : workersError ? (
                    <p className="rounded-[1.05rem] border border-bh-danger/25 bg-bh-danger-soft/60 px-3.5 py-3 text-sm text-bh-danger">
                      {workersError}
                    </p>
                  ) : workers && workers.length === 0 ? (
                    <div className="rounded-[1.05rem] border border-dashed border-bh-border bg-bh-subtle/40 px-4 py-6 text-center">
                      <UserRound className="mx-auto h-6 w-6 text-bh-text-muted" />
                      <p className="mt-2 text-sm font-medium text-bh-text-secondary">
                        No accepted assignments yet
                      </p>
                      <p className="mt-0.5 text-xs text-bh-text-muted">
                        {detail.remaining} of {detail.requiredPositions} seats
                        still open
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2.5">
                      {(workers ?? []).map((w, index) => (
                        <li
                          key={w.assignmentId}
                          className="group overflow-hidden rounded-[1.1rem] border border-bh-border/80 bg-gradient-to-b from-white to-bh-subtle/35 shadow-[0_6px_18px_rgba(7,29,48,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] transition duration-300 hover:border-bh-teal/35 hover:to-bh-teal-soft/20 motion-reduce:transition-none"
                          style={{ animationDelay: `${index * 40}ms` }}
                        >
                          <div className="flex items-start gap-3 px-3.5 py-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-sidebar text-[12px] font-bold tracking-wide text-bh-honey shadow-[0_6px_14px_rgba(7,29,48,0.2)]">
                              {workerInitials(w.fullName)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-bh-text">
                                  {w.fullName}
                                </p>
                                <Badge
                                  className={cn(
                                    'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                    assignmentStatusClass(w.status),
                                  )}
                                >
                                  {assignmentStatusLabel(w.status)}
                                </Badge>
                              </div>
                              <div className="mt-1.5 space-y-1 text-[12px] text-bh-text-secondary">
                                <p className="flex items-center gap-1.5">
                                  <CheckCircle2
                                    className="h-3.5 w-3.5 shrink-0 text-bh-teal-strong"
                                    aria-hidden
                                  />
                                  <span>
                                    Accepted
                                    {w.acceptedAt
                                      ? ` · ${formatDateTime(w.acceptedAt, detail.timeZone)}`
                                      : ' · time unavailable'}
                                  </span>
                                </p>
                                {w.checkInAt ? (
                                  <p className="flex items-center gap-1.5">
                                    <Clock3
                                      className="h-3.5 w-3.5 shrink-0 text-bh-honey-strong"
                                      aria-hidden
                                    />
                                    <span>
                                      Checked in ·{' '}
                                      {formatDateTime(
                                        w.checkInAt,
                                        detail.timeZone,
                                      )}
                                    </span>
                                  </p>
                                ) : null}
                                {w.checkOutAt ? (
                                  <p className="flex items-center gap-1.5">
                                    <Clock3
                                      className="h-3.5 w-3.5 shrink-0 text-bh-accent-blue"
                                      aria-hidden
                                    />
                                    <span>
                                      Checked out ·{' '}
                                      {formatDateTime(
                                        w.checkOutAt,
                                        detail.timeZone,
                                      )}
                                    </span>
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="mt-4 break-all font-mono text-[10px] text-bh-text-muted">
                  ID {detail.id}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
