'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

export function CopyTextButton({
  value,
  label = 'Copy',
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const el = document.createElement('textarea');
        el.value = value;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-bh-border bg-bh-surface px-3 py-1.5 text-sm font-medium text-bh-text transition-colors hover:border-bh-teal hover:bg-bh-teal-soft hover:text-bh-teal-strong',
        className,
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
      {copied ? 'Copied' : label}
    </button>
  );
}
