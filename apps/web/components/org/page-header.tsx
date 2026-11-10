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
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.03em] text-[#071d30] sm:text-[2rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-xl text-[15px] leading-6 text-bh-text-secondary">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
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
                  <span aria-hidden className="text-bh-text-muted">
                    /
                  </span>
                ) : null}
                {item.href && !last ? (
                  <Link
                    href={item.href}
                    className="rounded-full bg-white/70 px-3 py-1 text-[13px] font-semibold text-bh-text-secondary transition-colors hover:bg-bh-teal-soft hover:text-bh-teal-strong"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-[13px] font-semibold tracking-tight',
                      last
                        ? 'bg-[#071d30] text-white'
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
