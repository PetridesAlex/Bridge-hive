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
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';
import { localizePath, type MarketingLocale } from '@/lib/marketing-i18n';

type HomeFaqProps = {
  locale: MarketingLocale;
  faq: MarketingDictionary['home']['faq'];
};

type FaqItem = {
  q: string;
  a: ReactNode;
  Icon: LucideIcon;
  tone: 'blue' | 'honey' | 'teal' | 'navy';
};

function FaqMotif({ faq }: { faq: HomeFaqProps['faq'] }) {
  return (
    <div className="m-faq-motif" aria-hidden="true">
      <span className="m-faq-motif-ring m-faq-motif-ring--outer" />
      <span className="m-faq-motif-ring m-faq-motif-ring--inner" />

      <div className="m-faq-motif-card m-faq-motif-card--main">
        <div className="m-faq-motif-head">
          <span className="m-faq-motif-q">
            <HelpCircle size={18} strokeWidth={2.1} />
          </span>
          <span className="m-faq-motif-tag">{faq.eyebrow}</span>
        </div>
        <p className="m-faq-motif-question">{faq.q2}</p>
        <p className="m-faq-motif-answer">{faq.a2}</p>
        <div className="m-faq-motif-topics">
          <span className="m-faq-motif-topic m-faq-motif-topic--blue">
            <Building2 size={13} strokeWidth={2.1} />
          </span>
          <span className="m-faq-motif-topic m-faq-motif-topic--honey">
            <ShieldCheck size={13} strokeWidth={2.1} />
          </span>
          <span className="m-faq-motif-topic m-faq-motif-topic--teal">
            <CreditCard size={13} strokeWidth={2.1} />
          </span>
          <span className="m-faq-motif-topic m-faq-motif-topic--navy">
            <Smartphone size={13} strokeWidth={2.1} />
          </span>
        </div>
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

export function HomeFaq({ locale, faq }: HomeFaqProps) {
  const partnershipsHref = localizePath('/contact#partnerships', locale);
  const supportHref = localizePath('/contact#support', locale);

  const ITEMS: readonly FaqItem[] = [
    {
      q: faq.q1,
      Icon: Building2,
      tone: 'blue',
      a: (
        <>
          {faq.a1Prefix}
          <a href={partnershipsHref}>{faq.a1LinkText}</a>
          {faq.a1Suffix}
        </>
      ),
    },
    {
      q: faq.q2,
      Icon: ShieldCheck,
      tone: 'honey',
      a: faq.a2,
    },
    {
      q: faq.q3,
      Icon: CreditCard,
      tone: 'teal',
      a: faq.a3,
    },
    {
      q: faq.q4,
      Icon: Smartphone,
      tone: 'navy',
      a: (
        <>
          {faq.a4Prefix}
          <a href={supportHref}>{faq.a4LinkText}</a>
          {faq.a4Suffix}
        </>
      ),
    },
  ];

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
            <p className="m-eyebrow">{faq.eyebrow}</p>
            <h2 className="m-faq-title m-display">
              {faq.title}{' '}
              <span className="m-faq-title-accent">{faq.titleAccent}</span>
            </h2>
            <p className="m-faq-lede">{faq.lede}</p>
          </div>
          <FaqMotif faq={faq} />
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
