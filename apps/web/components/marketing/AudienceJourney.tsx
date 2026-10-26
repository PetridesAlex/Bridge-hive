'use client';

import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  Check,
  FileCheck2,
  FileText,
  Mail,
  Settings2,
  Smartphone,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useId, useState } from 'react';

import { Reveal } from '@/components/marketing/Reveal';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';
import { localizePath, type MarketingLocale } from '@/lib/marketing-i18n';

type AudienceJourneyProps = {
  locale: MarketingLocale;
  audience: MarketingDictionary['home']['audience'];
};

function AudienceHexVisual({
  audience,
}: {
  audience: 'organization' | 'professional';
}) {
  return (
    <div
      className={`m-audience-hex m-audience-hex--${audience}`}
      aria-hidden="true"
    >
      <div className="m-audience-hex-frame">
        <Image
          src="/marketing/audience-hex.jpg"
          alt=""
          fill
          sizes="(max-width: 960px) 85vw, 460px"
          quality={95}
          className="m-audience-hex-image m-audience-hex-image--org"
        />
        <Image
          src="/marketing/audience-hex-pro.jpg"
          alt=""
          fill
          sizes="(max-width: 960px) 85vw, 460px"
          quality={95}
          className="m-audience-hex-image m-audience-hex-image--pro"
        />
      </div>
      <div className="m-audience-hex-ring" />
    </div>
  );
}

type Step = {
  label: string;
  body: string;
  icon: LucideIcon;
  tone: 'teal' | 'honey';
};

type AudienceContent = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  cardIcon: LucideIcon;
  calloutTitle: string;
  calloutBody: string;
  workflowTitle: string;
  steps: readonly Step[];
  floatChecks: readonly string[];
};

export function AudienceJourney({ locale, audience: a }: AudienceJourneyProps) {
  const [audience, setAudience] = useState<'organization' | 'professional'>(
    'organization',
  );
  const baseId = useId();

  const ORG: AudienceContent = {
    eyebrow: a.orgEyebrow,
    title: a.orgTitle,
    body: a.orgBody,
    href: localizePath('/organizations', locale),
    cta: a.orgCta,
    cardIcon: Building2,
    calloutTitle: a.orgCalloutTitle,
    calloutBody: a.orgCalloutBody,
    workflowTitle: a.orgWorkflowTitle,
    floatChecks: [a.orgFloatCheck1, a.orgFloatCheck2, a.orgFloatCheck3],
    steps: [
      { label: a.orgStep1Label, body: a.orgStep1Body, icon: Mail, tone: 'teal' },
      {
        label: a.orgStep2Label,
        body: a.orgStep2Body,
        icon: Settings2,
        tone: 'honey',
      },
      { label: a.orgStep3Label, body: a.orgStep3Body, icon: FileText, tone: 'teal' },
    ],
  };

  const PRO: AudienceContent = {
    eyebrow: a.proEyebrow,
    title: a.proTitle,
    body: a.proBody,
    href: localizePath('/professionals', locale),
    cta: a.proCta,
    cardIcon: UserRound,
    calloutTitle: a.proCalloutTitle,
    calloutBody: a.proCalloutBody,
    workflowTitle: a.proWorkflowTitle,
    floatChecks: [a.proFloatCheck1, a.proFloatCheck2, a.proFloatCheck3],
    steps: [
      {
        label: a.proStep1Label,
        body: a.proStep1Body,
        icon: Smartphone,
        tone: 'teal',
      },
      {
        label: a.proStep2Label,
        body: a.proStep2Body,
        icon: FileCheck2,
        tone: 'honey',
      },
      {
        label: a.proStep3Label,
        body: a.proStep3Body,
        icon: CalendarCheck,
        tone: 'teal',
      },
    ],
  };

  const active = audience === 'organization' ? ORG : PRO;
  const CardIcon = active.cardIcon;

  return (
    <Reveal>
      <div className="m-audience">
        <div className="m-audience-atmosphere" aria-hidden="true">
          <span className="m-audience-blob m-audience-blob--teal" />
          <span className="m-audience-blob m-audience-blob--honey" />
          <span className="m-audience-blob m-audience-blob--soft" />
        </div>

        <div className="m-audience-intro">
          <div className="m-audience-copy">
            <p className="m-eyebrow">{a.eyebrow}</p>
            <h2 className="m-audience-title m-display">
              {a.title}{' '}
              <span className="m-audience-title-accent">{a.titleAccent}</span>
            </h2>
            <p className="m-audience-lede">{a.lede}</p>

            <div
              className={`m-audience-tabs m-audience-tabs--${audience}`}
              role="tablist"
              aria-label={a.tabsAria}
            >
              <span className="m-audience-tabs-indicator" aria-hidden="true" />
              <button
                type="button"
                role="tab"
                id={`${baseId}-org-tab`}
                aria-controls={`${baseId}-panel`}
                aria-selected={audience === 'organization'}
                tabIndex={audience === 'organization' ? 0 : -1}
                onClick={() => setAudience('organization')}
              >
                <span className="m-audience-tab-icon" aria-hidden="true">
                  <Building2 size={15} strokeWidth={2.35} />
                </span>
                {a.tabOrg}
              </button>
              <button
                type="button"
                role="tab"
                id={`${baseId}-pro-tab`}
                aria-controls={`${baseId}-panel`}
                aria-selected={audience === 'professional'}
                tabIndex={audience === 'professional' ? 0 : -1}
                onClick={() => setAudience('professional')}
              >
                <span className="m-audience-tab-icon" aria-hidden="true">
                  <UserRound size={15} strokeWidth={2.35} />
                </span>
                {a.tabPro}
              </button>
            </div>
          </div>

          <div className="m-audience-visual" aria-hidden="true">
            <AudienceHexVisual audience={audience} />

            <aside className="m-audience-float">
              <p>{a.floatTitle}</p>
              <ul>
                {active.floatChecks.map((item, index) => (
                  <li key={item}>
                    <span
                      className={`m-audience-float-check m-audience-float-check--${
                        index === 1 ? 'honey' : 'teal'
                      }`}
                    >
                      <Check size={12} strokeWidth={2.6} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>

        <div
          className="m-audience-panel"
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={
            audience === 'organization' ? `${baseId}-org-tab` : `${baseId}-pro-tab`
          }
        >
          <article className="m-audience-card m-audience-card--story">
            <div className="m-audience-card-head">
              <p className="m-eyebrow">{active.eyebrow}</p>
              <span
                className={`m-audience-card-mark m-audience-card-mark--${
                  audience === 'organization' ? 'teal' : 'honey'
                }`}
                aria-hidden="true"
              >
                <CardIcon size={34} strokeWidth={1.7} />
              </span>
            </div>
            <h3>{active.title}</h3>
            <p className="m-audience-card-body">{active.body}</p>
            <Link href={active.href} className="m-audience-card-link">
              {active.cta}
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <div className="m-audience-callout">
              <span className="m-audience-callout-icon" aria-hidden="true">
                <BarChart3 size={22} strokeWidth={2} />
              </span>
              <p>
                <strong>{active.calloutTitle}</strong>
                <span> — {active.calloutBody}</span>
              </p>
            </div>
          </article>

          <article className="m-audience-card m-audience-card--workflow">
            <p className="m-eyebrow m-eyebrow--honey">{a.workflowEyebrow}</p>
            <h3>{active.workflowTitle}</h3>
            <ol className="m-audience-steps">
              {active.steps.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <li key={step.label}>
                    <span className="m-audience-step-index" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span
                      className={`m-audience-step-icon m-audience-step-icon--${step.tone}`}
                      aria-hidden="true"
                    >
                      <StepIcon size={28} strokeWidth={1.75} />
                    </span>
                    <div>
                      <strong>{step.label}</strong>
                      <p>{step.body}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </article>
        </div>

        <p className="m-audience-footnote">
          {a.footnotePrefix}
          <Link href={localizePath('/organizations', locale)}>
            {a.footnoteOrgLink}
          </Link>
          {a.footnoteConnector}
          <Link href={localizePath('/professionals', locale)}>
            {a.footnoteProLink}
          </Link>
          {a.footnoteSuffix}
        </p>
      </div>
    </Reveal>
  );
}
