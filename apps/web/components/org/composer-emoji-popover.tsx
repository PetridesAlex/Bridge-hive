'use client';

import { ORG_WORKER_COMPOSER_COMMON_EMOJIS } from '@bridge-hive/domain';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  open: boolean;
  title: string;
  searchLabel: string;
  onClose: () => void;
  onPick: (emoji: string) => void;
};

export function ComposerEmojiPopover({
  open,
  title,
  searchLabel,
  onClose,
  onPick,
}: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...ORG_WORKER_COMPOSER_COMMON_EMOJIS];
    return ORG_WORKER_COMPOSER_COMMON_EMOJIS.filter((emoji) => emoji.includes(q));
  }, [query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="absolute bottom-[calc(100%+8px)] left-0 z-30 w-[min(100vw-2rem,18.5rem)] origin-bottom-left animate-in fade-in zoom-in-95 rounded-[18px] border border-[rgba(11,42,67,0.08)] bg-white/95 p-2.5 shadow-[0_12px_32px_rgba(7,29,48,0.12)] backdrop-blur-md duration-150"
      role="dialog"
      aria-label={title}
    >
      <div className="mb-1.5 flex items-center gap-2 px-0.5">
        <p className="flex-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(11,42,67,0.45)]">
          {title}
        </p>
        <button
          type="button"
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-[rgba(11,42,67,0.45)] hover:bg-[rgba(11,42,67,0.05)] hover:text-[#071d30]"
          onClick={onClose}
        >
          Esc
        </button>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchLabel}
        aria-label={searchLabel}
        autoFocus
        className="mb-1.5 w-full rounded-full border-0 bg-[#f0f4f7] px-3 py-1.5 text-sm text-[#071d30] outline-none ring-1 ring-transparent placeholder:text-[rgba(11,42,67,0.35)] focus:bg-white focus:ring-[rgba(20,169,181,0.35)]"
      />
      <div className="grid max-h-44 grid-cols-6 gap-0.5 overflow-y-auto">
        {filtered.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="flex h-9 items-center justify-center rounded-full text-[1.25rem] transition hover:bg-[rgba(20,169,181,0.12)] active:scale-90"
            onClick={() => {
              onPick(emoji);
              onClose();
            }}
            aria-label={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
