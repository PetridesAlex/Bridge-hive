'use client';

import { Instrument_Serif } from 'next/font/google';
import { DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const quoteFont = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
});

const QUOTE = 'Hello Bossman, How do you feel today?';

export function AdminBossmanQuote() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(media.matches);
    setReady(true);
    const onChange = () => setReduceMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return (
    <aside
      aria-label="Bossman greeting"
      className="group/quote relative mb-5 overflow-hidden rounded-2xl border border-bh-sidebar/20 px-4 py-3.5 text-white shadow-[0_14px_36px_rgba(7,29,48,0.22)] sm:mb-6 sm:px-5 sm:py-4"
    >
      <span
        aria-hidden
        className="bh-bossman-bg pointer-events-none absolute inset-0"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-bh-honey via-bh-teal to-bh-honey"
      />
      <span
        aria-hidden
        className="bh-orb-drift pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-bh-teal/30 blur-3xl"
      />
      <span
        aria-hidden
        className="bh-orb-drift pointer-events-none absolute -bottom-12 left-1/3 h-24 w-24 rounded-full bg-bh-honey/25 blur-3xl"
        style={{ animationDelay: '-5s' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bh-btn-flow bg-[linear-gradient(110deg,transparent_10%,rgba(255,255,255,0.1)_45%,transparent_75%)] opacity-60"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="bh-bossman-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-bh-honey via-[#f0c24a] to-bh-honey-strong text-bh-sidebar shadow-[0_8px_18px_rgba(224,170,24,0.4)] ring-1 ring-white/25">
            <DollarSign className="h-[18px] w-[18px]" strokeWidth={2.6} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-bh-honey">
              Bossman desk
            </p>
            <p
              className={cn(
                quoteFont.className,
                'mt-1 text-[1.15rem] italic leading-snug tracking-[-0.01em] text-[#f7f1e3] sm:text-[1.3rem]',
              )}
            >
              <span className="mr-1 text-bh-honey" aria-hidden>
                “
              </span>
              <span className="sr-only">{QUOTE}</span>
              <span aria-hidden className="inline">
                {QUOTE.split('').map((char, index) => (
                  <span
                    key={`${char}-${index}`}
                    className={cn(
                      'bh-bossman-letter inline-block whitespace-pre',
                      ready && !reduceMotion && 'is-animate',
                    )}
                    style={
                      ready && !reduceMotion
                        ? { animationDelay: `${80 + index * 38}ms` }
                        : undefined
                    }
                  >
                    {char}
                  </span>
                ))}
              </span>
              <span className="ml-1 text-bh-honey" aria-hidden>
                ”
              </span>
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/80 backdrop-blur-sm">
          Premium daily check-in
        </span>
      </div>
    </aside>
  );
}
