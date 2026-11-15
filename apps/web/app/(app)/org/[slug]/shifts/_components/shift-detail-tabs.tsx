'use client';

import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ShiftDetailTab = {
  id: string;
  label: string;
  /** Small number shown next to the label (e.g. filled positions). */
  count?: number;
  /** Highlights the count (e.g. timesheets waiting for review). */
  attention?: boolean;
  content: ReactNode;
};

export function ShiftDetailTabs({
  tabs,
  defaultTab,
}: {
  tabs: ShiftDetailTab[];
  defaultTab?: string;
}) {
  const initial = tabs.some((tab) => tab.id === defaultTab)
    ? (defaultTab as string)
    : tabs[0]?.id;
  const [active, setActive] = useState(initial);
  const listRef = useRef<HTMLDivElement>(null);

  const select = useCallback((id: string) => {
    setActive(id);
    const url = new URL(window.location.href);
    if (id === tabs[0]?.id) url.searchParams.delete('tab');
    else url.searchParams.set('tab', id);
    window.history.replaceState(null, '', url);
  }, [tabs]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((tab) => tab.id === active);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    select(tabs[next].id);
    listRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }

  return (
    <div className="space-y-5">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Shift sections"
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto rounded-2xl border border-bh-border bg-bh-surface p-1.5 shadow-[0_1px_2px_rgba(7,29,48,0.04)]"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`shift-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`shift-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal motion-reduce:transition-none',
                selected
                  ? 'bg-[linear-gradient(155deg,#16384f_0%,#071d30_80%)] text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)]'
                  : 'text-bh-text-secondary hover:bg-bh-subtle hover:text-bh-text',
              )}
            >
              {tab.label}
              {typeof tab.count === 'number' ? (
                <span
                  className={cn(
                    'bh-tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                    tab.attention
                      ? 'bg-[#e4b334] text-[#071d30]'
                      : selected
                        ? 'bg-white/15 text-white'
                        : 'bg-bh-subtle text-bh-text-muted',
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`shift-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`shift-tab-${tab.id}`}
          hidden={tab.id !== active}
          className="space-y-6"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
