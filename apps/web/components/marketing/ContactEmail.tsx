'use client';

import { Copy, Mail } from 'lucide-react';
import { useState } from 'react';

type ContactEmailProps = {
  address: string;
  mailtoSubject: string;
  label?: string;
  tone?: 'teal' | 'honey';
};

export function ContactEmail({
  address,
  mailtoSubject,
  label = 'Email',
  tone = 'teal',
}: ContactEmailProps) {
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
          className="m-contact-email-copy"
          aria-live="polite"
        >
          <Copy size={14} strokeWidth={2} aria-hidden="true" />
          {copied ? 'Copied' : 'Copy address'}
        </button>
      </div>
      <p className="m-contact-email-hint">
        Opens your email app with a short subject line. You can also copy the address
        if mail is not configured on this device.
      </p>
    </div>
  );
}
