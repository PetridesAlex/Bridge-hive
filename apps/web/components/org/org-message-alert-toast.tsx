'use client';

import { ArrowUpRight, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';

export function OrgMessageAlertToast({
  toastId,
  title,
  body,
  actionLabel,
  onView,
}: {
  toastId: string | number;
  title: string;
  body: string;
  actionLabel: string;
  onView?: () => void;
}) {
  return (
    <div className="bh-org-msg-toast group relative w-[min(100vw-2rem,22.5rem)] overflow-hidden rounded-2xl border border-white/15 bg-[#071d30] p-4 text-white shadow-[0_22px_48px_rgba(7,29,48,0.45)]">
      <span
        aria-hidden
        className="bh-org-msg-toast-sheen pointer-events-none absolute inset-0"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)]"
      />

      <div className="relative flex items-start gap-3">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#071d30] shadow-[0_10px_20px_rgba(0,0,0,0.25)]">
          <span
            aria-hidden
            className="bh-org-msg-toast-ping absolute inset-0 rounded-xl bg-white/50"
          />
          <MessageSquare className="relative h-[18px] w-[18px]" strokeWidth={2.4} />
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
            Inbox
          </p>
          <p className="mt-0.5 text-[15px] font-bold tracking-tight text-white">
            {title}
          </p>
          <p className="mt-1 text-sm leading-5 text-white/75">{body}</p>

          {onView ? (
            <button
              type="button"
              onClick={() => {
                onView();
                toast.dismiss(toastId);
              }}
              className="group/cta mt-3 inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-[13px] font-bold text-[#071d30] shadow-[0_8px_18px_rgba(0,0,0,0.2)] transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {actionLabel}
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#071d30] text-white">
                <ArrowUpRight
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
        </button>
      </div>
    </div>
  );
}
