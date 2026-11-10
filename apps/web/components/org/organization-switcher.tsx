'use client';

import { ArrowUpRight, Building2, ChevronDown, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { OrgNavLink } from '@/components/org/org-nav-link';

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
      pill: 'bg-bh-teal/15 text-bh-teal',
      dot: 'bg-bh-teal',
    };
  }
  if (status === 'pending' || status === 'invited') {
    return {
      pill: 'bg-bh-honey/15 text-bh-honey',
      dot: 'bg-bh-honey',
    };
  }
  return {
    pill: 'bg-white/8 text-bh-sidebar-text/90',
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
    <div className="relative min-w-0">
      <button
        type="button"
        className={cn(
          'group flex w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-lg px-2 py-2 text-left',
          'bg-white/[0.04] transition-colors duration-200',
          'hover:bg-white/[0.07]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal',
          open && 'bg-white/[0.08]',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <OrgMark
          displayName={current.displayName}
          logoUrl={current.logoUrl}
          size="display"
          className="shrink-0 bg-[#0e3348] font-[family-name:var(--font-org-display)] font-semibold text-[#f3d27a] ring-1 ring-white/10"
        />

        <span className="min-w-0 flex-1">
          <span
            className="line-clamp-2 text-[13px] font-semibold leading-snug tracking-tight text-white"
            title={current.displayName}
          >
            {current.displayName}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                tone.pill,
              )}
            >
              <span
                aria-hidden
                className={cn('h-1 w-1 shrink-0 rounded-full', tone.dot)}
              />
              <span className="truncate">{statusLabel}</span>
            </span>
            <span className="inline-flex max-w-full items-center truncate rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-bh-sidebar-text/90">
              {roleLabel(current.role)}
            </span>
          </span>
        </span>

        <span
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-md text-bh-sidebar-muted transition-colors duration-200',
            'group-hover:bg-white/[0.06] group-hover:text-bh-sidebar-text',
            open && 'rotate-180 bg-white/[0.06] text-bh-sidebar-text',
          )}
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Organizations"
          className="absolute left-0 right-0 z-40 mt-1.5 overflow-hidden rounded-xl border border-[#d7e4ec] bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fb_100%)] shadow-[0_22px_48px_rgba(7,29,48,0.22)]"
        >
          <div className="h-1 bg-[linear-gradient(90deg,#071d30_0%,#16a6b6_52%,#e0aa18_100%)]" />
          {multi ? (
            <>
              {others.map((org) => (
                <OrgNavLink
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
                </OrgNavLink>
              ))}
              <OrgNavLink
                href={`/org/${current.slug}/settings`}
                className="flex items-center gap-2 bg-[#071d30]/[0.03] px-3.5 py-3 text-xs font-semibold text-bh-teal-strong transition-colors hover:bg-bh-teal-soft/70"
                onClick={() => setOpen(false)}
              >
                <Settings2 className="h-3.5 w-3.5" aria-hidden />
                Manage {current.displayName} settings
              </OrgNavLink>
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

              <OrgNavLink
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
              </OrgNavLink>
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
