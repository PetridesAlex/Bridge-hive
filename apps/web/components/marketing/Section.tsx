import Link from 'next/link';

export function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`mx-auto w-full max-w-6xl px-5 py-[var(--m-section-y)] sm:px-8 ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-bh-sidebar sm:text-4xl">
        {title}
      </h2>
      {lede ? (
        <p className="mt-4 text-[var(--m-lede)] leading-relaxed text-bh-text-secondary">
          {lede}
        </p>
      ) : null}
    </div>
  );
}

export function MarketingButton({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const styles =
    variant === 'primary'
      ? 'bg-bh-sidebar text-white hover:bg-bh-sidebar-hover'
      : variant === 'secondary'
        ? 'border border-bh-border-strong bg-bh-surface text-bh-text hover:bg-bh-subtle'
        : 'text-bh-teal-strong hover:text-bh-sidebar';

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition-colors ${styles}`}
    >
      {children}
    </Link>
  );
}
