'use client';

import { ChevronDown } from 'lucide-react';
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

  useEffect(() => {
    // Clear prior org logo signed-URL cache when the active org changes.
    clearOrganizationLogoUrlCache();
  }, [current.id]);

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-3.5 rounded-2xl border border-white/10 bg-bh-sidebar-raised px-3.5 py-3.5 text-left',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[background-color,box-shadow]',
          'hover:bg-bh-sidebar-hover hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
          'focus-visible:ring-2 focus-visible:ring-bh-teal',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <OrgMark
          displayName={current.displayName}
          logoUrl={current.logoUrl}
          size="display"
          className="bg-bh-teal/25 ring-white/15"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-bold leading-snug tracking-tight text-white">
            {current.displayName}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-bh-sidebar-muted">
            <span className="inline-flex items-center rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-bh-sidebar-text/90">
              {ORG_STATUS_LABELS[current.status as OrgStatus] ?? current.status}
            </span>
            <span aria-hidden className="text-bh-sidebar-muted/70">
              ·
            </span>
            <span>{roleLabel(current.role)}</span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-bh-sidebar-muted transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Organizations"
          className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-bh-border bg-bh-surface shadow-lg"
        >
          {multi ? (
            others.map((org) => (
              <Link
                key={org.slug}
                href={`/org/${org.slug}/dashboard`}
                role="option"
                className="flex items-center gap-3 border-b border-bh-border px-3.5 py-3 last:border-b-0 hover:bg-bh-subtle"
                onClick={() => setOpen(false)}
              >
                <OrgMark displayName={org.displayName} logoUrl={org.logoUrl} size="md" />
                <span className="min-w-0">
                  <p className="truncate text-[15px] font-semibold tracking-tight text-bh-text">
                    {org.displayName}
                  </p>
                  <p className="text-xs text-bh-text-muted">
                    {ORG_STATUS_LABELS[org.status as OrgStatus] ?? org.status} ·{' '}
                    {roleLabel(org.role)}
                  </p>
                </span>
              </Link>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-bh-text-secondary">
              <p className="font-medium text-bh-text">{current.displayName}</p>
              <p className="mt-1 text-xs">
                You belong to one organization. Open settings for profile details.
              </p>
              <Link
                href={`/org/${current.slug}/settings`}
                className="mt-2 inline-block text-sm font-medium text-bh-teal-strong hover:underline"
                onClick={() => setOpen(false)}
              >
                Organization settings →
              </Link>
            </div>
          )}
          {multi ? (
            <Link
              href={`/org/${current.slug}/settings`}
              className="block bg-bh-subtle/60 px-3 py-2 text-xs font-medium text-bh-teal-strong hover:underline"
              onClick={() => setOpen(false)}
            >
              Manage {current.displayName} settings
            </Link>
          ) : null}
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
