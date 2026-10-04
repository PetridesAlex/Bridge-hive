import {
  Building2,
  CreditCard,
  MessageCircle,
  FileText,
  HelpCircle,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { type ReactNode } from 'react';

import { Reveal } from '@/components/marketing/Reveal';

type FaqItem = {
  q: string;
  a: ReactNode;
  Icon: LucideIcon;
  tone: 'blue' | 'honey' | 'teal' | 'navy';
};

const ITEMS: readonly FaqItem[] = [
  {
    q: 'Can my hospital create an account online?',
    Icon: Building2,
    tone: 'blue',
    a: (
      <>
        Not via open self-registration. Organization accounts are provisioned by Bridge
        Hive. Existing admins use Organization sign in; new partners should{' '}
        <a href="/contact#partnerships">prepare a partnership inquiry</a>.
      </>
    ),
  },
  {
    q: 'Does confirming my email make me eligible for shifts?',
    Icon: ShieldCheck,
    tone: 'honey',
    a: 'No. Email confirmation proves the address works. Document and bank-detail review by a platform admin is required before shifts become available.',
  },
  {
    q: 'Who pays my wages — and what about commission?',
    Icon: CreditCard,
    tone: 'teal',
    a: 'The healthcare organization pays approved wages by bank transfer. Bridge Hive does not hold or disburse hospital wages. Separately, workers settle a Bridge Hive platform commission invoice on its own schedule. Bank details support wage transfer; they are not used to collect commission.',
  },
  {
    q: 'What does “Worker app continuation” open?',
    Icon: Smartphone,
    tone: 'navy',
    a: (
      <>
        A web page that helps you return to the Bridge Hive worker app after email
        confirmation, including deep-link guidance. It is not a full browser version of the app.
        For account help, contact <a href="/contact#support">platform support</a>.
      </>
    ),
  },
];

function FaqMotif() {
  return (
    <div className="m-faq-motif" aria-hidden="true">
      <span className="m-faq-motif-ring m-faq-motif-ring--outer" />
      <span className="m-faq-motif-ring m-faq-motif-ring--inner" />

      <div className="m-faq-motif-card m-faq-motif-card--main">
        <span className="m-faq-motif-q">
          <HelpCircle size={22} strokeWidth={2.1} />
        </span>
        <span className="m-faq-motif-line" />
        <span className="m-faq-motif-line m-faq-motif-line--short" />
        <span className="m-faq-motif-line" />
      </div>

      <div className="m-faq-motif-card m-faq-motif-card--chat">
        <MessageCircle size={18} strokeWidth={2} />
      </div>

      <div className="m-faq-motif-card m-faq-motif-card--doc">
        <FileText size={16} strokeWidth={2} />
      </div>
    </div>
  );
}

export function HomeFaq() {
  return (
    <Reveal>
      <div className="m-faq-premium">
        <div className="m-faq-atmosphere" aria-hidden="true">
          <span className="m-faq-blob m-faq-blob--blue" />
          <span className="m-faq-blob m-faq-blob--honey" />
          <span className="m-faq-hex m-faq-hex--1" />
          <span className="m-faq-hex m-faq-hex--2" />
          <span className="m-faq-hex m-faq-hex--3" />
        </div>

        <div className="m-faq-intro">
          <div className="m-faq-copy">
            <p className="m-eyebrow">Common questions</p>
            <h2 className="m-faq-title m-display">
              Clear answers before you{' '}
              <span className="m-faq-title-accent">sign in</span>
            </h2>
            <p className="m-faq-lede">
              Everything you need to know about getting started, eligibility, payments,
              and how the worker app continuation works — all in one place.
            </p>
          </div>
          <FaqMotif />
        </div>

        <div className="m-faq m-faq--premium">
          {ITEMS.map((item) => {
            const Icon = item.Icon;
            return (
              <details key={item.q} className="m-faq-item group">
                <summary>
                  <span
                    className={`m-faq-item-icon m-faq-item-icon--${item.tone}`}
                    aria-hidden="true"
                  >
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <span className="m-faq-item-q">{item.q}</span>
                  <span className="m-faq-item-toggle" aria-hidden="true">
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">−</span>
                  </span>
                </summary>
                <div className="m-faq-body">{item.a}</div>
              </details>
            );
          })}
        </div>
      </div>
    </Reveal>
  );
}
