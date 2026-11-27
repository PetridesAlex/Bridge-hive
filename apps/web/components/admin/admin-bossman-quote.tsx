'use client';

import { Instrument_Serif } from 'next/font/google';
import { DollarSign, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const quoteFont = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
});

const QUOTE = 'Hello Bossman, How do you feel today?';
const LETTER_IN_MS = 720;
const STAGGER_MS = 42;
const ENTRANCE_BASE_MS = 60;

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

  const animate = ready && !reduceMotion;

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
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="bh-bossman-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-bh-honey via-[#f0c24a] to-bh-honey-strong text-bh-sidebar shadow-[0_8px_18px_rgba(224,170,24,0.4)] ring-1 ring-white/25">
            <DollarSign className="h-[18px] w-[18px]" strokeWidth={2.6} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-bh-honey">
              Bossman desk
            </p>
            <p
              className={cn(
                quoteFont.className,
                'mt-1 text-[1.2rem] italic leading-snug tracking-[-0.01em] text-[#f7f1e3] sm:text-[1.35rem]',
              )}
            >
              <span
                className={cn('mr-1 text-bh-honey', animate && 'bh-bossman-mark')}
                aria-hidden
              >
                “
              </span>
              <span className="sr-only">{QUOTE}</span>
              <span aria-hidden className="inline">
                {QUOTE.split('').map((char, index) => {
                  const entranceDelay = ENTRANCE_BASE_MS + index * STAGGER_MS;
                  const waveDelay = entranceDelay + LETTER_IN_MS + index * 55;
                  return (
                    <span
                      key={`${char}-${index}`}
                      className={cn(
                        'bh-bossman-letter-wave',
                        animate && 'is-animate',
                      )}
                      style={
                        animate
                          ? { animationDelay: `${waveDelay}ms` }
                          : undefined
                      }
                    >
                      <span
                        className={cn(
                          'bh-bossman-letter inline-block whitespace-pre',
                          animate && 'is-animate',
                        )}
                        style={
                          animate
                            ? { animationDelay: `${entranceDelay}ms` }
                            : undefined
                        }
                      >
                        {char}
                      </span>
                    </span>
                  );
                })}
              </span>
              <span
                className={cn('ml-1 text-bh-honey', animate && 'bh-bossman-mark')}
                aria-hidden
                style={animate ? { animationDelay: '0.4s' } : undefined}
              >
                ”
              </span>
            </p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-bh-honey/30 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#f7f1e3] backdrop-blur-sm',
            animate && 'bh-bossman-chip',
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-bh-honey" aria-hidden />
          Premium daily check-in
        </span>
      </div>
    </aside>
  );
}
