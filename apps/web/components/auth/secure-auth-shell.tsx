import { Lock, ShieldAlert, ShieldCheck } from 'lucide-react';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { cn } from '@/lib/utils';

export function SecureAuthShell({
  children,
  kicker,
  caption = 'Secure account link',
  tone = 'default',
  wide = false,
}: {
  children: React.ReactNode;
  kicker: string;
  caption?: string;
  tone?: 'default' | 'danger';
  wide?: boolean;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071d30] px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(900px 520px at 12% -10%, rgba(22, 166, 182, 0.28), transparent 60%)',
            'radial-gradient(760px 480px at 92% 110%, rgba(224, 170, 24, 0.18), transparent 58%)',
            'linear-gradient(160deg, #0b2a43 0%, #071d30 55%, #05172a 100%)',
          ].join(', '),
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255, 255, 255, 0.08) 0.7px, transparent 0.7px)',
          backgroundSize: '22px 22px',
          maskImage:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.7), transparent 75%)',
        }}
      />

      <div
        className={cn(
          'bh-fade-up relative w-full',
          wide ? 'max-w-[34rem]' : 'max-w-[30rem]',
        )}
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="rounded-[1.15rem] bg-gradient-to-br from-bh-honey via-bh-teal to-[#0b2a43] p-[2px] shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
            <div className="rounded-[1.05rem] bg-[#071d30] p-1 ring-1 ring-white/10">
              <BridgeHiveMark
                size={56}
                priority
                className="h-14 w-14 rounded-[0.85rem]"
              />
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold tracking-tight text-white">
            Bridge Hive
          </p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
            {caption}
          </p>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] bg-bh-surface shadow-[0_30px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
          <div
            aria-hidden
            className={
              tone === 'danger'
                ? 'h-1.5 bg-gradient-to-r from-bh-danger via-bh-honey to-bh-danger'
                : 'h-1.5 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey'
            }
          />
          <div className="p-7 sm:p-9">
            <div className="mb-5 flex items-center gap-3">
              <span
                className={
                  tone === 'danger'
                    ? 'flex h-11 w-11 items-center justify-center rounded-2xl bg-bh-danger-soft text-bh-danger ring-1 ring-bh-danger/25'
                    : 'flex h-11 w-11 items-center justify-center rounded-2xl bg-bh-sidebar text-bh-honey shadow-[0_8px_18px_rgba(7,29,48,0.25)]'
                }
              >
                {tone === 'danger' ? (
                  <ShieldAlert className="h-5 w-5" aria-hidden />
                ) : (
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                )}
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
                {kicker}
              </p>
            </div>
            {children}
          </div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-white/50">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Protected by Bridge Hive · Never share this link
        </p>
      </div>
    </div>
  );
}

export const secureAuthTitleClass =
  'text-[1.65rem] font-bold leading-tight tracking-tight text-bh-text';

export const secureAuthBodyClass =
  'mt-3 text-sm leading-6 text-bh-text-secondary';

export const secureAuthPrimaryClass =
  'group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-bh-sidebar via-[#0e4a63] to-bh-teal text-sm font-semibold text-white shadow-[0_14px_30px_rgba(7,29,48,0.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(7,29,48,0.36)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal disabled:pointer-events-none disabled:opacity-70 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

export const secureAuthSecondaryClass =
  'group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-bh-border bg-white text-sm font-semibold text-bh-text shadow-sm transition hover:-translate-y-0.5 hover:border-bh-border-strong hover:bg-bh-subtle';
