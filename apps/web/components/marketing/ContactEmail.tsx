'use client';

import { useState } from 'react';

type ContactEmailProps = {
  address: string;
  mailtoSubject: string;
  label: string;
};

export function ContactEmail({ address, mailtoSubject, label }: ContactEmailProps) {
  const [copied, setCopied] = useState(false);
  const mailto = `mailto:${address}?subject=${encodeURIComponent(mailtoSubject)}`;

  async function copyAddress() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
      } else {
        const input = document.createElement('input');
        input.value = address;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <a
          href={mailto}
          className="break-all text-lg font-semibold text-bh-teal-strong underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal-strong"
        >
          {address}
        </a>
        <button
          type="button"
          onClick={copyAddress}
          className="inline-flex w-fit items-center justify-center rounded-md border border-bh-border-strong bg-bh-surface px-3 py-1.5 text-sm font-medium text-bh-text transition-colors hover:bg-bh-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal-strong"
          aria-live="polite"
        >
          {copied ? 'Copied' : 'Copy address'}
        </button>
      </div>
      <p className="mt-2 text-sm text-bh-text-muted">
        Opens your email app with a short subject line. You can also copy the address
        if mail is not configured on this device.
      </p>
    </div>
  );
}
