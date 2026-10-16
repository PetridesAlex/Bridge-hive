import Link from 'next/link';

import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  className,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2.5 flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-bh-teal-strong">
            <span
              aria-hidden
              className="h-px w-7 rounded-full bg-[linear-gradient(90deg,#e4b334,#16a6b6)]"
            />
            {eyebrow}
          </p>
        ) : (
          <div
            aria-hidden
            className="mb-2.5 h-px w-7 rounded-full bg-[linear-gradient(90deg,#e4b334,#16a6b6)]"
          />
        )}
        <h1 className="text-[2rem] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#071d30]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-xl border-l-2 border-[#e4b334] pl-3 text-[15px] leading-6 tracking-[-0.011em] text-bh-text-secondary">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Breadcrumbs({
  items,
  variant = 'default',
}: {
  items: Array<{ label: string; href?: string }>;
  variant?: 'default' | 'premium';
}) {
  if (variant === 'premium') {
    return (
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                {index > 0 ? (
                  <span
                    aria-hidden
                    className="h-1 w-1 rounded-full bg-[linear-gradient(135deg,#16a6b6,#e0aa18)] shadow-[0_0_8px_rgba(22,166,182,0.45)]"
                  />
                ) : null}
                {item.href && !last ? (
                  <Link
                    href={item.href}
                    className="rounded-full border border-[#071d30]/8 bg-white/55 px-3 py-1 text-[13px] font-semibold text-[#3d5564] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:border-bh-teal/40 hover:bg-bh-teal-soft/80 hover:text-bh-teal-strong motion-reduce:hover:translate-y-0"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'rounded-full px-3.5 py-1 text-[13px] font-bold tracking-tight',
                      last
                        ? 'border border-bh-teal/25 bg-[linear-gradient(120deg,#071d30_0%,#0e4a5c_55%,#16a6b6_120%)] text-white shadow-[0_8px_18px_rgba(7,29,48,0.18)]'
                        : 'text-bh-text-muted',
                    )}
                    aria-current={last ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-bh-text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden>/</span> : null}
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-bh-teal-strong">
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(last && 'font-medium text-bh-text')}
                  aria-current={last ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
