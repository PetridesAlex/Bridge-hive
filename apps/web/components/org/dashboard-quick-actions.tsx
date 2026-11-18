'use client';

import { type QuickAction } from '@bridge-hive/domain';
import {
  ArrowUpRight,
  CalendarPlus,
  ChevronDown,
  ClipboardCheck,
  MapPin,
  PlusCircle,
  Sparkles,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { cn } from '@/lib/utils';

const ICONS = {
  'create-shift': PlusCircle,
  'create-multiple-shifts': CalendarPlus,
  'review-timesheets': ClipboardCheck,
  'manage-locations': MapPin,
  payments: Wallet,
} as const;

const TONE_ICON = {
  teal: 'bg-bh-teal-soft text-bh-teal-strong',
  honey: 'bg-bh-honey-soft text-bh-honey-strong',
  navy: 'bg-[#071d30]/10 text-[#071d30]',
  info: 'bg-bh-accent-blue-soft text-bh-accent-blue',
} as const;

export function DashboardQuickActions({
  actions,
}: {
  actions: QuickAction[];
}) {
  const [open, setOpen] = useState(true);

  if (actions.length === 0) return null;

  const featured = actions.find((action) => action.id === 'create-shift') ?? actions[0]!;
  const rest = actions.filter((action) => action.id !== featured.id);
  const FeaturedIcon = ICONS[featured.id as keyof typeof ICONS] ?? PlusCircle;

  return (
    <section
      className="relative overflow-hidden rounded-[var(--bh-org-radius)] border border-white/50 bg-[linear-gradient(180deg,#d7eef2_0%,#eef6fa_55%,#f4f9fb_100%)] shadow-[0_12px_28px_rgba(7,29,48,0.08)]"
      aria-labelledby="quick-actions-heading"
    >
      <div className="relative overflow-hidden border-b border-white/10 bg-[#071d30] px-4 py-3.5">
        <span
          aria-hidden
          className="bh-orb-drift pointer-events-none absolute -left-8 -top-10 h-24 w-24 rounded-full bg-[#5ec8ff]/25 blur-2xl"
        />
        <span
          aria-hidden
          className="bh-orb-drift pointer-events-none absolute -bottom-10 -right-6 h-20 w-20 rounded-full bg-[#5ec8ff]/15 blur-2xl"
          style={{ animationDelay: '-6s' }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,transparent,#5ec8ff,transparent)]"
        />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="quick-actions-list"
          className="relative flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4b334]"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#5ec8ff] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_16px_rgba(94,200,255,0.35)]">
            <Sparkles className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span
                id="quick-actions-heading"
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5ec8ff]"
              >
                Quick actions
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
                <span
                  className="bh-soft-pulse h-1.5 w-1.5 rounded-full bg-[#5ec8ff]"
                  aria-hidden
                />
                Live
              </span>
            </span>
            <span className="mt-0.5 block text-[15px] font-semibold tracking-tight text-white">
              Jump straight into common tasks
            </span>
          </span>
          <span className="mt-1 inline-flex items-center gap-2">
            <span className="bh-tabular rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white">
              {actions.length}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-white/80 transition-transform duration-300',
                open ? 'rotate-180' : 'rotate-0',
              )}
              aria-hidden
            />
          </span>
        </button>
      </div>

      <div
        id="quick-actions-list"
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-2 p-3 sm:p-3.5">
            <Link
              href={featured.href}
              className="bh-drop-in group flex items-center gap-3 rounded-xl bg-[#071d30] px-3 py-2.5 text-white shadow-[0_10px_22px_rgba(7,29,48,0.22)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal motion-reduce:hover:translate-y-0"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e4b334] text-[#071d30]">
                <FeaturedIcon className="h-4 w-4" strokeWidth={2.4} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold tracking-tight">
                  {featured.title}
                </span>
                <span className="mt-0.5 block text-[12px] leading-4 text-white/70">
                  {featured.description}
                </span>
              </span>
              <ArrowUpRight
                className="h-4 w-4 shrink-0 text-[#5ec8ff] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>

            {rest.length > 0 ? (
              <ul className="space-y-1.5">
                {rest.map((action, index) => {
                  const Icon = ICONS[action.id as keyof typeof ICONS] ?? PlusCircle;
                  return (
                    <li
                      key={action.id}
                      className="bh-drop-in"
                      style={{ animationDelay: `${90 + index * 70}ms` }}
                    >
                      <Link
                        href={action.href}
                        className="group flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2.5 text-[#071d30] shadow-[0_1px_2px_rgba(7,29,48,0.05)] backdrop-blur-sm transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_18px_rgba(7,29,48,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal motion-reduce:hover:translate-y-0"
                      >
                        <span
                          className={cn(
                            'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                            TONE_ICON[action.tone],
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold tracking-tight">
                            {action.title}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-4 text-bh-text-secondary">
                            {action.description}
                          </span>
                        </span>
                        <ArrowUpRight
                          className="h-4 w-4 shrink-0 text-bh-text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-bh-teal-strong"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
