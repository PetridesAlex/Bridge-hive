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
  className,
}: {
  buckets: ActivityWeekBucket[];
  className?: string;
}) {
  const hasData = buckets.some((b) => b.orgs + b.apps + b.audits > 0);
  const max = Math.max(
    1,
    ...buckets.flatMap((b) => [b.orgs, b.apps, b.audits]),
  );

  if (!hasData) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-dashed border-bh-border bg-bh-subtle/40 px-4 py-10 text-center',
          className,
        )}
      >
        <p className="text-sm font-semibold text-bh-text">No platform activity yet</p>
        <p className="mt-1 text-sm text-bh-text-secondary">
          New organizations, applications, and audit events will chart here.
        </p>
      </div>
    );
  }

  const width = 560;
  const height = 180;
  const padX = 16;
  const padTop = 16;
  const padBottom = 12;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const step = innerW / Math.max(1, buckets.length - 1);

  function series(key: 'orgs' | 'apps' | 'audits') {
    return buckets.map((b, i) => {
      const x = padX + i * step;
      const y = padTop + innerH - (b[key] / max) * innerH;
      return { x, y };
    });
  }

  function line(points: { x: number; y: number }[]) {
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  }

  function area(points: { x: number; y: number }[]) {
    return [
      `${padX},${padTop + innerH}`,
      ...points.map((p) => `${p.x},${p.y}`),
      `${padX + (buckets.length - 1) * step},${padTop + innerH}`,
    ].join(' ');
  }

  const orgs = series('orgs');
  const apps = series('apps');
  const audits = series('audits');

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap gap-4 text-xs font-semibold">
        <span className="inline-flex items-center gap-2 text-bh-teal-strong">
          <span className="h-2.5 w-2.5 rounded-full bg-bh-teal" />
          New orgs
        </span>
        <span className="inline-flex items-center gap-2 text-bh-accent-blue">
          <span className="h-2.5 w-2.5 rounded-full bg-bh-accent-blue" />
          Applications
        </span>
        <span className="inline-flex items-center gap-2 text-bh-honey-strong">
          <span className="h-2.5 w-2.5 rounded-full bg-bh-honey" />
          Audits
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full"
        role="img"
        aria-label="Weekly platform activity for the last 30 days"
      >
        <defs>
          <linearGradient id="admin-orgs-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16A6B6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#16A6B6" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="admin-apps-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
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
        <polygon fill="url(#admin-orgs-fill)" points={area(orgs)} />
        <polygon fill="url(#admin-apps-fill)" points={area(apps)} />
        <polyline
          fill="none"
          stroke="#087F8C"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={line(orgs)}
        />
        <polyline
          fill="none"
          stroke="#2563EB"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={line(apps)}
        />
        <polyline
          fill="none"
          stroke="#D4A017"
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={line(audits)}
        />
      </svg>

      <div className="flex justify-between px-1 text-[10px] font-medium text-bh-text-muted">
        {buckets.map((b) => (
          <span key={b.weekStartIso} className="min-w-0 truncate text-center">
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
