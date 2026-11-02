import { Building2, TrendingUp, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ActivityWeekBucket = {
  weekStartIso: string;
  label: string;
  orgs: number;
  apps: number;
  audits: number;
};

export function AdminActivityChart({
  buckets,
  totalOrganizations,
  totalMembers,
  orgsLast30,
  membersLast30,
  className,
}: {
  buckets: ActivityWeekBucket[];
  totalOrganizations: number;
  totalMembers: number;
  orgsLast30: number;
  membersLast30: number;
  className?: string;
}) {
  const hasData = buckets.some((b) => b.orgs + b.apps + b.audits > 0);
  const maxWeekly = Math.max(
    1,
    ...buckets.flatMap((b) => [b.orgs, b.apps]),
  );

  let runningOrgs = 0;
  let runningMembers = 0;
  const cumulative = buckets.map((b) => {
    runningOrgs += b.orgs;
    runningMembers += b.apps;
    return {
      ...b,
      cumOrgs: runningOrgs,
      cumMembers: runningMembers,
    };
  });
  const maxCum = Math.max(
    1,
    ...cumulative.flatMap((b) => [b.cumOrgs, b.cumMembers]),
  );

  const width = 640;
  const height = 200;
  const padX = 20;
  const padTop = 18;
  const padBottom = 16;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const step = innerW / Math.max(1, buckets.length - 1);
  const barGroup = Math.min(44, innerW / Math.max(1, buckets.length) - 10);
  const barW = Math.max(6, (barGroup - 6) / 2);

  function series(
    values: number[],
    max: number,
  ): { x: number; y: number }[] {
    return values.map((v, i) => {
      const x = padX + i * step;
      const y = padTop + innerH - (v / max) * innerH;
      return { x, y };
    });
  }

  function line(points: { x: number; y: number }[]) {
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  }

  function area(points: { x: number; y: number }[]) {
    if (points.length === 0) return '';
    return [
      `${padX},${padTop + innerH}`,
      ...points.map((p) => `${p.x},${p.y}`),
      `${padX + (buckets.length - 1) * step},${padTop + innerH}`,
    ].join(' ');
  }

  const cumOrgPts = series(
    cumulative.map((b) => b.cumOrgs),
    maxCum,
  );
  const cumMemberPts = series(
    cumulative.map((b) => b.cumMembers),
    maxCum,
  );

  return (
    <div className={cn('space-y-5', className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <PulseStat
          icon={Users}
          label="Members registered"
          total={totalMembers}
          recent={membersLast30}
          tone="blue"
        />
        <PulseStat
          icon={Building2}
          label="Organizations"
          total={totalOrganizations}
          recent={orgsLast30}
          tone="teal"
        />
      </div>

      {!hasData ? (
        <div className="rounded-2xl border border-dashed border-bh-border bg-bh-subtle/40 px-4 py-10 text-center">
          <p className="text-sm font-semibold text-bh-text">
            No registration activity yet
          </p>
          <p className="mt-1 text-sm text-bh-text-secondary">
            New member and organization sign-ups will chart here live.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-bh-border/80 bg-gradient-to-b from-bh-subtle/50 to-bh-surface p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
                  Weekly registrations
                </p>
                <p className="mt-0.5 text-sm font-semibold text-bh-text">
                  Members vs organizations
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1.5 text-bh-accent-blue">
                  <span className="h-2.5 w-2.5 rounded-sm bg-bh-accent-blue" />
                  Members
                </span>
                <span className="inline-flex items-center gap-1.5 text-bh-teal-strong">
                  <span className="h-2.5 w-2.5 rounded-sm bg-bh-teal" />
                  Organizations
                </span>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-48 w-full"
              role="img"
              aria-label="Weekly member and organization registrations"
            >
              <defs>
                <linearGradient id="bar-members" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="1" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.75" />
                </linearGradient>
                <linearGradient id="bar-orgs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A6B6" stopOpacity="1" />
                  <stop offset="100%" stopColor="#087F8C" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75, 1].map((t) => (
                <line
                  key={t}
                  x1={padX}
                  x2={width - padX}
                  y1={padTop + innerH * (1 - t)}
                  y2={padTop + innerH * (1 - t)}
                  stroke="#E1E7EA"
                  strokeWidth="1"
                />
              ))}
              {buckets.map((b, i) => {
                const center = padX + i * step;
                const memberH = (b.apps / maxWeekly) * innerH;
                const orgH = (b.orgs / maxWeekly) * innerH;
                return (
                  <g key={b.weekStartIso}>
                    <rect
                      x={center - barGroup / 2}
                      y={padTop + innerH - memberH}
                      width={barW}
                      height={Math.max(memberH, b.apps > 0 ? 3 : 0)}
                      rx={4}
                      fill="url(#bar-members)"
                    />
                    <rect
                      x={center - barGroup / 2 + barW + 6}
                      y={padTop + innerH - orgH}
                      width={barW}
                      height={Math.max(orgH, b.orgs > 0 ? 3 : 0)}
                      rx={4}
                      fill="url(#bar-orgs)"
                    />
                  </g>
                );
              })}
            </svg>
            <div className="mt-1 flex justify-between px-1 text-[10px] font-semibold text-bh-text-muted">
              {buckets.map((b) => (
                <span key={b.weekStartIso} className="min-w-0 truncate text-center">
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-bh-border/80 bg-gradient-to-b from-bh-subtle/40 to-bh-surface p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-bh-success-soft text-bh-success ring-1 ring-bh-success/20">
                  <TrendingUp className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
                    Live growth
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-bh-text">
                    Cumulative registrations (last 30 days)
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1.5 text-bh-accent-blue">
                  <span className="h-2 w-2 rounded-full bg-bh-accent-blue" />
                  Members
                </span>
                <span className="inline-flex items-center gap-1.5 text-bh-teal-strong">
                  <span className="h-2 w-2 rounded-full bg-bh-teal" />
                  Organizations
                </span>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-44 w-full"
              role="img"
              aria-label="Cumulative member and organization growth over the last 30 days"
            >
              <defs>
                <linearGradient id="cum-members-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="cum-orgs-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A6B6" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#16A6B6" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((t) => (
                <line
                  key={t}
                  x1={padX}
                  x2={width - padX}
                  y1={padTop + innerH * (1 - t)}
                  y2={padTop + innerH * (1 - t)}
                  stroke="#E1E7EA"
                  strokeWidth="1"
                />
              ))}
              <polygon fill="url(#cum-members-fill)" points={area(cumMemberPts)} />
              <polygon fill="url(#cum-orgs-fill)" points={area(cumOrgPts)} />
              <polyline
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.75"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={line(cumMemberPts)}
              />
              <polyline
                fill="none"
                stroke="#087F8C"
                strokeWidth="2.75"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={line(cumOrgPts)}
              />
              {cumMemberPts.map((p, i) => (
                <circle
                  key={`m-${buckets[i]!.weekStartIso}`}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill="#fff"
                  stroke="#2563EB"
                  strokeWidth="2"
                />
              ))}
              {cumOrgPts.map((p, i) => (
                <circle
                  key={`o-${buckets[i]!.weekStartIso}`}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill="#fff"
                  stroke="#087F8C"
                  strokeWidth="2"
                />
              ))}
            </svg>
            <div className="mt-1 flex justify-between px-1 text-[10px] font-semibold text-bh-text-muted">
              {buckets.map((b) => (
                <span key={b.weekStartIso} className="min-w-0 truncate text-center">
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PulseStat({
  icon: Icon,
  label,
  total,
  recent,
  tone,
}: {
  icon: typeof Users;
  label: string;
  total: number;
  recent: number;
  tone: 'blue' | 'teal';
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border px-4 py-3.5 shadow-[0_4px_16px_rgba(7,29,48,0.04)]',
        tone === 'blue' &&
          'border-bh-accent-blue/20 bg-gradient-to-br from-bh-accent-blue-soft/90 to-bh-surface',
        tone === 'teal' &&
          'border-bh-teal/25 bg-gradient-to-br from-bh-teal-soft/90 to-bh-surface',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
            {label}
          </p>
          <p className="bh-tabular mt-1 text-2xl font-bold tracking-tight text-bh-text">
            {total}
          </p>
          <p
            className={cn(
              'mt-1 text-xs font-semibold',
              tone === 'blue' ? 'text-bh-accent-blue' : 'text-bh-teal-strong',
            )}
          >
            +{recent} in last 30 days
          </p>
        </div>
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl ring-1',
            tone === 'blue' &&
              'bg-bh-accent-blue-soft text-bh-accent-blue ring-bh-accent-blue/20',
            tone === 'teal' &&
              'bg-bh-teal-soft text-bh-teal-strong ring-bh-teal/25',
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}
