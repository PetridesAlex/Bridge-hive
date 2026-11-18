'use client';

import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

export function OrgSuccessToast({
  toastId,
  title,
  description,
}: {
  toastId: string | number;
  title: string;
  description?: string;
}) {
  return (
    <div className="bh-org-success-toast group relative w-[min(100vw-2rem,22.5rem)] overflow-hidden rounded-2xl border border-emerald-300/30 bg-[linear-gradient(155deg,#0b5d3c_0%,#147a4f_48%,#0f9a62_100%)] p-4 text-white shadow-[0_22px_48px_rgba(15,154,98,0.42)]">
      <span
        aria-hidden
        className="bh-org-success-toast-sheen pointer-events-none absolute inset-0"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/15 blur-2xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)]"
      />

      <div className="relative flex items-start gap-3">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#0b5d3c] shadow-[0_10px_20px_rgba(0,0,0,0.22)]">
          <span
            aria-hidden
            className="bh-org-success-toast-ping absolute inset-0 rounded-xl bg-white/45"
          />
          <Check className="relative h-5 w-5" strokeWidth={2.8} aria-hidden />
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">
            Success
          </p>
          <p className="mt-0.5 text-[15px] font-bold tracking-tight text-white">
            {title}
          </p>
          {description ? (
            <p className="mt-1 text-sm leading-5 text-white/80">{description}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/75 transition hover:bg-white/15 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function showOrgSuccessToast(
  title: string,
  options?: { description?: string; id?: string; duration?: number },
) {
  return toast.custom(
    (toastId) => (
      <OrgSuccessToast
        toastId={toastId}
        title={title}
        description={options?.description}
      />
    ),
    {
      id: options?.id,
      duration: options?.duration ?? 4_500,
      className: 'bh-org-success-toast-wrap',
    },
  );
}
