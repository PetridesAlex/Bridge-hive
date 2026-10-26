'use client';

import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Mail,
  MapPin,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useState, type CSSProperties } from 'react';

import { InquiryCta } from '@/components/marketing/blocks';
import { MarketingFlowShell } from '@/components/marketing/MarketingFlowShell';
import { Reveal } from '@/components/marketing/Reveal';
import { MarketingButton, Section } from '@/components/marketing/Section';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';
import { localizePath, type MarketingLocale } from '@/lib/marketing-i18n';

type JourneyStep = {
  label: string;
  body: string;
  icon: LucideIcon;
};

function HospitalMotif() {
  return (
    <div className="m-journey-motif m-journey-motif--hospital" aria-hidden="true">
      <span className="m-journey-motif-glow" />
      <svg viewBox="0 0 140 120" fill="none">
        <ellipse cx="70" cy="108" rx="46" ry="7" fill="#1A7EF0" opacity="0.14" />
        <rect x="14" y="48" width="28" height="52" rx="8" fill="#D9EBFF" />
        <rect x="98" y="48" width="28" height="52" rx="8" fill="#D9EBFF" />
        <rect x="34" y="28" width="72" height="72" rx="12" fill="#EEF5FF" />
        <rect
          x="34"
          y="28"
          width="72"
          height="72"
          rx="12"
          fill="url(#m-hospital-body)"
        />
        <rect x="48" y="12" width="44" height="26" rx="8" fill="#C9E2FF" />
        <rect x="48" y="12" width="44" height="26" rx="8" fill="url(#m-hospital-roof)" />
        <rect x="58" y="17" width="24" height="18" rx="5" fill="#1A7EF0" />
        <path
          d="M67.2 20.5h5.6v4.2H77v5.6h-4.2V34h-5.6v-3.7H63v-5.6h4.2v-4.2Z"
          fill="#fff"
        />
        <rect x="44" y="48" width="14" height="12" rx="3" fill="#fff" />
        <rect x="63" y="48" width="14" height="12" rx="3" fill="#fff" />
        <rect x="82" y="48" width="14" height="12" rx="3" fill="#fff" />
        <rect x="44" y="66" width="14" height="12" rx="3" fill="#fff" />
        <rect x="82" y="66" width="14" height="12" rx="3" fill="#fff" />
        <rect x="21" y="58" width="12" height="10" rx="2.5" fill="#fff" opacity="0.95" />
        <rect x="21" y="74" width="12" height="10" rx="2.5" fill="#fff" opacity="0.95" />
        <rect x="107" y="58" width="12" height="10" rx="2.5" fill="#fff" opacity="0.95" />
        <rect x="107" y="74" width="12" height="10" rx="2.5" fill="#fff" opacity="0.95" />
        <rect x="60" y="74" width="20" height="26" rx="5" fill="#1A7EF0" />
        <rect x="64" y="78" width="12" height="22" rx="3.5" fill="#4EA8FF" opacity="0.9" />
        <rect x="54" y="70" width="32" height="6" rx="3" fill="#7CBCFF" />
        <defs>
          <linearGradient id="m-hospital-body" x1="70" y1="28" x2="70" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F7FBFF" />
            <stop offset="1" stopColor="#D7E9FF" />
          </linearGradient>
          <linearGradient id="m-hospital-roof" x1="70" y1="12" x2="70" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E7F2FF" />
            <stop offset="1" stopColor="#B7D8FF" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function BadgeMotif() {
  return (
    <div className="m-journey-motif m-journey-motif--badge" aria-hidden="true">
      <span className="m-journey-motif-glow m-journey-motif-glow--honey" />
      <svg viewBox="0 0 140 120" fill="none">
        <ellipse cx="70" cy="108" rx="42" ry="7" fill="#E4B334" opacity="0.18" />
        <rect x="62" y="8" width="16" height="10" rx="3" fill="#D4A018" />
        <rect x="58" y="14" width="24" height="6" rx="2" fill="#E4B334" />
        <rect x="34" y="18" width="72" height="84" rx="14" fill="#FFF8E6" />
        <rect x="34" y="18" width="72" height="84" rx="14" fill="url(#m-badge-body)" />
        <rect
          x="34"
          y="18"
          width="72"
          height="84"
          rx="14"
          stroke="#F0D48A"
          strokeWidth="1.5"
        />
        <circle cx="70" cy="46" r="18" fill="#FFE8A3" />
        <circle cx="70" cy="42" r="8" fill="#E4B334" />
        <path
          d="M54 62c3.5-7 10-10.5 16-10.5S82.5 55 86 62"
          fill="#E4B334"
          opacity="0.85"
        />
        <rect x="48" y="72" width="44" height="7" rx="3.5" fill="#E4B334" opacity="0.55" />
        <rect x="54" y="84" width="32" height="6" rx="3" fill="#E4B334" opacity="0.32" />
        <circle cx="98" cy="28" r="14" fill="#E4B334" />
        <circle cx="98" cy="28" r="14" fill="url(#m-badge-check)" />
        <path
          d="M91.5 28.2 96 32.6 105 23.5"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="m-badge-body" x1="70" y1="18" x2="70" y2="102" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFCF3" />
            <stop offset="1" stopColor="#FFE9B0" />
          </linearGradient>
          <linearGradient id="m-badge-check" x1="98" y1="14" x2="98" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F0C24A" />
            <stop offset="1" stopColor="#C9920F" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function JourneyCard({
  tone,
  title,
  subtitle,
  steps,
  active,
  motif,
  onSelect,
}: {
  tone: 'teal' | 'honey';
  title: string;
  subtitle: string;
  steps: JourneyStep[];
  active: boolean;
  motif: 'hospital' | 'badge';
  onSelect: () => void;
}) {
  const HeaderIcon = tone === 'teal' ? Building2 : UserRound;

  return (
    <article
      className={`m-journey-card m-journey-card--${tone}${active ? ' is-active' : ''}`}
      data-active={active ? 'true' : 'false'}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={active}
    >
      <span className="m-journey-card-sheen" aria-hidden="true" />
      <span className="m-journey-card-orb m-journey-card-orb--a" aria-hidden="true" />
      <span className="m-journey-card-orb m-journey-card-orb--b" aria-hidden="true" />

      <header className="m-journey-card-head">
        <div className="m-journey-card-head-copy">
          <span className="m-journey-card-badge" aria-hidden="true">
            <HeaderIcon size={18} strokeWidth={1.9} />
          </span>
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>
        {motif === 'hospital' ? <HospitalMotif /> : <BadgeMotif />}
      </header>

      <ol className="m-journey-timeline">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.label}
              style={{ '--m-step-i': index } as CSSProperties}
            >
              <span className="m-journey-timeline-index" aria-hidden="true">
                {index + 1}
              </span>
              <span className="m-journey-timeline-icon" aria-hidden="true">
                <Icon size={16} strokeWidth={1.85} />
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
  );
}

type HowItWorksClientProps = {
  locale: MarketingLocale;
  howItWorks: MarketingDictionary['howItWorks'];
  inquiry: MarketingDictionary['home']['inquiry'];
};

export function HowItWorksClient({
  locale,
  howItWorks,
  inquiry,
}: HowItWorksClientProps) {
  const [emphasis, setEmphasis] = useState<'organization' | 'professional'>(
    'organization',
  );

  const ORG_STEPS: JourneyStep[] = [
    {
      icon: Mail,
      label: howItWorks.orgStep1Label,
      body: howItWorks.orgStep1Body,
    },
    {
      icon: ShieldCheck,
      label: howItWorks.orgStep2Label,
      body: howItWorks.orgStep2Body,
    },
    {
      icon: MapPin,
      label: howItWorks.orgStep3Label,
      body: howItWorks.orgStep3Body,
    },
    {
      icon: ClipboardList,
      label: howItWorks.orgStep4Label,
      body: howItWorks.orgStep4Body,
    },
  ];

  const PRO_STEPS: JourneyStep[] = [
    {
      icon: UserRound,
      label: howItWorks.proStep1Label,
      body: howItWorks.proStep1Body,
    },
    {
      icon: FileText,
      label: howItWorks.proStep2Label,
      body: howItWorks.proStep2Body,
    },
    {
      icon: ShieldCheck,
      label: howItWorks.proStep3Label,
      body: howItWorks.proStep3Body,
    },
    {
      icon: CalendarDays,
      label: howItWorks.proStep4Label,
      body: howItWorks.proStep4Body,
    },
  ];

  return (
    <>
      <section className="m-how-hero">
        <div className="m-how-hero-glow" aria-hidden="true" />
        <div className="m-how-hero-hex" aria-hidden="true" />
        <div className="m-section m-how-hero-inner">
          <Reveal>
            <p className="m-eyebrow">{howItWorks.heroEyebrow}</p>
            <h1 className="m-how-hero-title">
              {howItWorks.heroTitlePrefix}{' '}
              <span className="m-how-hero-accent">
                {howItWorks.heroTitleAccent}
              </span>
            </h1>
            <p className="m-lede m-how-hero-lede">{howItWorks.heroLede}</p>
            <div
              className={`m-how-toggle m-how-toggle--${emphasis}`}
              role="tablist"
              aria-label={howItWorks.toggleAria}
            >
              <span className="m-how-toggle-thumb" aria-hidden="true" />
              <button
                type="button"
                role="tab"
                className="m-how-toggle-tab"
                aria-selected={emphasis === 'organization'}
                onClick={() => setEmphasis('organization')}
              >
                <span className="m-how-toggle-icon" aria-hidden="true">
                  <Building2 size={15} strokeWidth={2} />
                </span>
                <span className="m-how-toggle-copy">
                  <span className="m-how-toggle-label">
                    {howItWorks.toggleOrgLabel}
                  </span>
                  <span className="m-how-toggle-hint">
                    {howItWorks.toggleOrgHint}
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="tab"
                className="m-how-toggle-tab"
                aria-selected={emphasis === 'professional'}
                onClick={() => setEmphasis('professional')}
              >
                <span className="m-how-toggle-icon" aria-hidden="true">
                  <UserRound size={15} strokeWidth={2} />
                </span>
                <span className="m-how-toggle-copy">
                  <span className="m-how-toggle-label">
                    {howItWorks.toggleProLabel}
                  </span>
                  <span className="m-how-toggle-hint">
                    {howItWorks.toggleProHint}
                  </span>
                </span>
              </button>
            </div>
            <div className="m-how-hero-ctas">
              <MarketingButton
                href={localizePath('/sign-in', locale)}
                variant="primary"
              >
                {howItWorks.ctaOrgSignIn}
              </MarketingButton>
              <MarketingButton
                href={localizePath('/auth/worker/login', locale)}
                variant="secondary"
              >
                {howItWorks.ctaWorkerAppContinuation}
              </MarketingButton>
            </div>
          </Reveal>
        </div>
      </section>

      <Section band="porcelain" className="m-how-journeys-band">
        <div className="m-journey-grid">
          <Reveal>
            <JourneyCard
              tone="teal"
              title={howItWorks.orgCardTitle}
              subtitle={howItWorks.orgCardSubtitle}
              steps={ORG_STEPS}
              active={emphasis === 'organization'}
              motif="hospital"
              onSelect={() => setEmphasis('organization')}
            />
          </Reveal>
          <Reveal delay={80}>
            <JourneyCard
              tone="honey"
              title={howItWorks.proCardTitle}
              subtitle={howItWorks.proCardSubtitle}
              steps={PRO_STEPS}
              active={emphasis === 'professional'}
              motif="badge"
              onSelect={() => setEmphasis('professional')}
            />
          </Reveal>
        </div>
      </Section>

      <MarketingFlowShell>
        <Section band="white" className="m-flow-band">
          <InquiryCta locale={locale} inquiry={inquiry} />
        </Section>
      </MarketingFlowShell>
    </>
  );
}
