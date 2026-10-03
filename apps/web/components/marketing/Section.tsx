import Link from 'next/link';

export function Section({
  children,
  className = '',
  id,
  band,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  band?: 'porcelain' | 'white' | 'dark' | 'teal';
}) {
  const bandClass = band ? `m-band m-band--${band}` : '';
  return (
    <section id={id} className={`${bandClass} ${className}`.trim()}>
      <div className="m-section">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'left',
  tone = 'light',
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: 'left' | 'center';
  tone?: 'light' | 'dark';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? <p className="m-eyebrow">{eyebrow}</p> : null}
      <h2
        className={`m-display mt-3 text-[length:var(--m-title)] ${
          tone === 'dark' ? 'text-white' : 'text-[color:var(--m-navy)]'
        }`}
      >
        {title}
      </h2>
      {lede ? <p className="m-lede">{lede}</p> : null}
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
  variant?: 'primary' | 'secondary' | 'ghost' | 'on-dark' | 'on-dark-secondary';
}) {
  const styles =
    variant === 'primary'
      ? 'm-btn m-btn--primary'
      : variant === 'secondary'
        ? 'm-btn m-btn--secondary'
        : variant === 'on-dark'
          ? 'm-btn m-btn--on-dark'
          : variant === 'on-dark-secondary'
            ? 'm-btn m-btn--on-dark-secondary'
            : 'm-btn m-btn--ghost';

  return (
    <Link href={href} className={styles}>
      {children}
    </Link>
  );
}
