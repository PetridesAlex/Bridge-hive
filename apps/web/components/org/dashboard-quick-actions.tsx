import { type QuickAction } from '@bridge-hive/domain';
import {
  ClipboardList,
  MapPin,
  PlusCircle,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

const ICONS = {
  'create-shift': PlusCircle,
  'create-multiple-shifts': PlusCircle,
  'review-timesheets': ClipboardList,
  'manage-locations': MapPin,
  payments: Wallet,
} as const;

const TONES = {
  teal: {
    card: 'border-bh-teal/20 bg-bh-teal-soft/50 hover:border-bh-teal/40 hover:bg-bh-teal-soft/80',
    icon: 'bg-bh-teal text-white',
  },
  honey: {
    card: 'border-bh-honey/25 bg-bh-honey-soft/70 hover:border-bh-honey/45 hover:bg-bh-honey-soft',
    icon: 'bg-bh-honey text-bh-text',
  },
  navy: {
    card: 'border-bh-border bg-bh-subtle/80 hover:border-bh-sidebar/20 hover:bg-bh-subtle',
    icon: 'bg-bh-sidebar text-white',
  },
  info: {
    card: 'border-bh-accent-blue/20 bg-bh-accent-blue-soft/80 hover:border-bh-accent-blue/40 hover:bg-bh-accent-blue-soft',
    icon: 'bg-bh-accent-blue text-white',
  },
} as const;

export function DashboardQuickActions({
  actions,
}: {
  actions: QuickAction[];
}) {
  if (actions.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-bh-border bg-bh-surface p-4 shadow-[0_4px_16px_rgba(7,29,48,0.04)] sm:p-5"
      aria-labelledby="quick-actions-heading"
    >
      <h2
        id="quick-actions-heading"
        className="mb-4 text-[17px] font-bold tracking-tight text-bh-text"
      >
        Quick actions
      </h2>

      <ul className="grid grid-cols-2 gap-2.5">
        {actions.map((action) => {
          const Icon = ICONS[action.id as keyof typeof ICONS] ?? PlusCircle;
          const tone = TONES[action.tone] ?? TONES.navy;
          return (
            <li key={action.id}>
              <Link
                href={action.href}
                className={cn(
                  'group flex h-full min-h-[108px] flex-col gap-3 rounded-2xl border p-3.5 transition-[border-color,background-color,box-shadow,transform]',
                  'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal motion-reduce:hover:translate-y-0',
                  tone.card,
                )}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl shadow-sm',
                    tone.icon,
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-bh-text">
                    {action.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-bh-text-secondary">
                    {action.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
