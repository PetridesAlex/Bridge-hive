'use client';

import { ArrowUpRight, Building2, ChevronDown, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { OrgMark } from '@/components/org/org-mark';
import { Badge } from '@/components/ui/badge';
import { clearOrganizationLogoUrlCache } from '@/lib/organization-logo';
import { roleLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ORG_STATUS_LABELS, type OrgStatus } from '@bridge-hive/domain';

export type SwitcherOrg = {
  id: string;
  slug: string;
  displayName: string;
  status: string;
  role: string;
  logoUrl?: string | null;
};

function statusTone(status: string): {
  pill: string;
  dot: string;
} {
  if (status === 'active') {
    return {
      pill: 'border-bh-teal/35 bg-bh-teal/15 text-bh-teal',
      dot: 'bg-bh-teal shadow-[0_0_0_3px_rgba(22,166,182,0.18)]',
    };
  }
  if (status === 'pending' || status === 'invited') {
    return {
      pill: 'border-bh-honey/40 bg-bh-honey/15 text-bh-honey',
      dot: 'bg-bh-honey shadow-[0_0_0_3px_rgba(228,179,52,0.2)]',
    };
  }
  return {
    pill: 'border-white/15 bg-white/8 text-bh-sidebar-text/90',
    dot: 'bg-bh-sidebar-muted',
  };
}

export function OrganizationSwitcher({
  current,
  memberships,
}: {
  current: SwitcherOrg;
  memberships: SwitcherOrg[];
}) {
  const [open, setOpen] = useState(false);
  const others = memberships.filter((m) => m.slug !== current.slug);
  const multi = others.length > 0;
  const statusLabel =
    ORG_STATUS_LABELS[current.status as OrgStatus] ?? current.status;
  const tone = statusTone(current.status);

  useEffect(() => {
    // Clear prior org logo signed-URL cache when the active org changes.
    clearOrganizationLogoUrlCache();
  }, [current.id]);

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          'group relative flex w-full items-center gap-4 overflow-hidden rounded-[1.35rem] border border-white/12 px-3.5 py-3.5 text-left',
          'bg-[linear-gradient(155deg,rgba(20,50,74,0.95)_0%,rgba(10,37,56,0.98)_48%,rgba(7,29,48,1)_100%)]',
          'shadow-[0_14px_32px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.1)]',
          'transition-all duration-300 ease-out',
          'hover:-translate-y-0.5 hover:border-bh-teal/35 hover:shadow-[0_18px_36px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.14)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal',
          'active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
          open && 'border-bh-honey/35 shadow-[0_16px_34px_rgba(201,146,15,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          aria-hidden
          className="bh-gradient-sheen pointer-events-none absolute inset-0 opacity-30 bg-[linear-gradient(115deg,transparent_18%,rgba(255,255,255,0.14)_46%,transparent_72%)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -left-6 top-0 h-20 w-20 rounded-full bg-bh-teal/20 blur-2xl transition-opacity duration-300 group-hover:opacity-90"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 bottom-0 h-16 w-16 rounded-full bg-bh-honey/15 blur-2xl"
        />

        <span className="relative shrink-0">
          <span
            aria-hidden
            className="absolute -inset-1 rounded-[1.35rem] bg-[linear-gradient(135deg,rgba(22,166,182,0.55),rgba(228,179,52,0.35),rgba(22,166,182,0.2))] opacity-80 blur-[1px]"
          />
          <OrgMark
            displayName={current.displayName}
            logoUrl={current.logoUrl}
            size="hero"
            className="relative bg-[#0a2538] ring-2 ring-white/15 shadow-[0_10px_22px_rgba(0,0,0,0.35)]"
          />
        </span>

        <span className="relative min-w-0 flex-1">
          <span className="block truncate text-[18px] font-extrabold leading-snug tracking-[-0.02em] text-white">
            {current.displayName}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
                tone.pill,
              )}
            >
              <span
                aria-hidden
                className={cn('h-1.5 w-1.5 rounded-full', tone.dot)}
              />
              {statusLabel}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-bh-sidebar-text/95">
              {roleLabel(current.role)}
            </span>
          </span>
        </span>

        <span
          className={cn(
            'relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/[0.07] text-bh-sidebar-muted transition-all duration-300',
            'group-hover:border-bh-honey/40 group-hover:bg-bh-honey/15 group-hover:text-bh-honey',
            open && 'rotate-180 border-bh-honey/40 bg-bh-honey/15 text-bh-honey',
          )}
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Organizations"
          className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-[1.25rem] border border-[#d7e4ec] bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fb_100%)] shadow-[0_22px_48px_rgba(7,29,48,0.22)]"
        >
          <div className="h-1 bg-[linear-gradient(90deg,#071d30_0%,#16a6b6_52%,#e0aa18_100%)]" />
          {multi ? (
            <>
              {others.map((org) => (
                <Link
                  key={org.slug}
                  href={`/org/${org.slug}/dashboard`}
                  role="option"
                  className="group flex items-center gap-3.5 border-b border-[#e4eef4] px-3.5 py-3.5 last:border-b-0 transition-colors hover:bg-[#eef7f9]"
                  onClick={() => setOpen(false)}
                >
                  <OrgMark
                    displayName={org.displayName}
                    logoUrl={org.logoUrl}
                    size="display"
                    className="ring-bh-border shadow-sm"
                  />
                  <span className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold tracking-tight text-bh-text group-hover:text-bh-teal-strong">
                      {org.displayName}
                    </p>
                    <p className="text-xs text-bh-text-muted">
                      {ORG_STATUS_LABELS[org.status as OrgStatus] ?? org.status} ·{' '}
                      {roleLabel(org.role)}
                    </p>
                  </span>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-bh-text-muted opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>
              ))}
              <Link
                href={`/org/${current.slug}/settings`}
                className="flex items-center gap-2 bg-[#071d30]/[0.03] px-3.5 py-3 text-xs font-semibold text-bh-teal-strong transition-colors hover:bg-bh-teal-soft/70"
                onClick={() => setOpen(false)}
              >
                <Settings2 className="h-3.5 w-3.5" aria-hidden />
                Manage {current.displayName} settings
              </Link>
            </>
          ) : (
            <div className="relative p-3.5">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-bh-teal/10 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-10 left-4 h-24 w-24 rounded-full bg-bh-honey/10 blur-2xl"
              />

              <div className="relative flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(145deg,#0a2538_0%,#16a6b6_70%,#e0aa18_140%)] text-white shadow-[0_10px_20px_rgba(22,166,182,0.25)] ring-1 ring-white/40">
                  <Building2 className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
                    Current workspace
                  </p>
                  <p className="mt-1 truncate text-[16px] font-bold tracking-tight text-[#071d30]">
                    {current.displayName}
                  </p>
                  <p className="mt-1.5 text-[12px] leading-5 text-bh-text-secondary">
                    You’re signed into one organization. Open settings to manage branding,
                    members, and profile details.
                  </p>
                </div>
              </div>

              <Link
                href={`/org/${current.slug}/settings`}
                onClick={() => setOpen(false)}
                className="group relative mt-3.5 flex items-center justify-between gap-2 overflow-hidden rounded-xl border border-[#071d30]/10 bg-[linear-gradient(120deg,#071d30_0%,#0e4a5c_55%,#16a6b6_120%)] px-3.5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(7,29,48,0.22)] transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
              >
                <span className="inline-flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-bh-honey" aria-hidden />
                  Organization settings
                </span>
                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </Link>
            </div>
          )}
        </div>
      ) : null}

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default"
          aria-label="Close organization menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {!multi ? (
        <Badge variant="muted" className="sr-only">
          Single organization
        </Badge>
      ) : null}
    </div>
  );
}
