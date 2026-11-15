import { MessageCircle } from 'lucide-react';

/**
 * Premium header for the organization Messages page only.
 * Other org pages keep the shared PageHeader.
 */
export function MessagesHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="bh-msg-header relative isolate overflow-hidden rounded-[18px] bg-[linear-gradient(120deg,#8fd0dc_0%,#b4e0e8_52%,#f6dc92_130%)] px-4 py-3 shadow-[0_12px_28px_rgba(14,143,153,0.22)] sm:px-5">
      <span
        aria-hidden
        className="bh-msg-orb pointer-events-none absolute -right-10 -top-20 -z-10 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(20,169,181,0.28),rgba(20,169,181,0)_68%)]"
      />
      <div className="bh-fade-up flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <h1 className="bh-msg-title text-[clamp(1.4rem,2.6vw,1.75rem)] font-semibold leading-none tracking-[-0.03em]">
          {title}
        </h1>
        <span
          aria-hidden
          className="hidden h-5 w-px bg-[rgba(11,42,67,0.25)] sm:block"
        />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
          <MessageCircle className="h-3 w-3" aria-hidden />
          {eyebrow}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(11,42,67,0.75)]">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="bh-msg-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
        {subtitle ? (
          <p className="hidden min-w-0 flex-1 truncate text-sm text-[rgba(11,42,67,0.78)] xl:block">
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}
