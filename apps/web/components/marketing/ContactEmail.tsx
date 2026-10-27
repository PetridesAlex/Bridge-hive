'use client';

import { Check, Copy, Mail } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type ContactEmailProps = {
  address: string;
  mailtoSubject: string;
  label?: string;
  tone?: 'teal' | 'honey';
  /** Default (idle) copy-button label. */
  copyLabel?: string;
  /** Label shown briefly after a successful copy. */
  copiedLabel?: string;
  /** Helper text under the row explaining the mailto behaviour. */
  hint?: string;
};

export function ContactEmail({
  address,
  mailtoSubject,
  label = 'Email',
  tone = 'teal',
  copyLabel = 'Copy address',
  copiedLabel = 'Copied',
  hint = 'Opens your email app with a short subject line. You can also copy the address if mail is not configured on this device.',
}: ContactEmailProps) {
  const [copied, setCopied] = useState(false);
  const [burst, setBurst] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  const mailto = `mailto:${address}?subject=${encodeURIComponent(mailtoSubject)}`;

  function legacyCopy(): boolean {
    const input = document.createElement('input');
    input.value = address;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(input);
    return ok;
  }

  async function copyAddress() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(address);
      ok = true;
    } catch {
      // Clipboard API unavailable or blocked — fall back to execCommand.
      ok = legacyCopy();
    }
    if (!ok) {
      setCopied(false);
      return;
    }
    setCopied(true);
    setBurst((n) => n + 1);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className={`m-contact-email m-contact-email--${tone}`}>
      <p className="m-contact-email-label">{label}</p>
      <div className="m-contact-email-row">
        <a href={mailto} className="m-contact-email-link">
          <Mail size={16} strokeWidth={2} aria-hidden="true" />
          <span>{address}</span>
        </a>
        <button
          type="button"
          onClick={copyAddress}
          className={`m-contact-email-copy${copied ? ' is-copied' : ''}`}
        >
          <span className="m-contact-email-copy-icon" aria-hidden="true">
            <Copy size={14} strokeWidth={2} className="m-copy-ico-idle" />
            <Check size={16} strokeWidth={3} className="m-copy-ico-done" />
          </span>
          <span className="m-contact-email-copy-label">
            <span className="m-copy-label-idle" aria-hidden={copied}>
              {copyLabel}
            </span>
            <span className="m-copy-label-done" aria-hidden={!copied}>
              {copiedLabel}
            </span>
          </span>
          {copied ? (
            <span key={burst} className="m-copy-burst" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          ) : null}
          <span className="sr-only" role="status" aria-live="polite">
            {copied ? copiedLabel : ''}
          </span>
        </button>
      </div>
      <p className="m-contact-email-hint">{hint}</p>
    </div>
  );
}
