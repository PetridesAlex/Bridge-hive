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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, type CSSProperties } from 'react';

import { InquiryCta } from '@/components/marketing/blocks';
import { MarketingFlowShell } from '@/components/marketing/MarketingFlowShell';
import { Reveal } from '@/components/marketing/Reveal';
import { MarketingButton, Section } from '@/components/marketing/Section';

type JourneyStep = {
  label: string;
  body: string;
  icon: LucideIcon;
};

const ORG_STEPS: JourneyStep[] = [
  {
    icon: Mail,
    label: 'Invitation / provisioning',
    body: 'Bridge Hive provisions the organization. Admins receive an activation email or credentials — not an open web signup.',
  },
  {
    icon: ShieldCheck,
    label: 'Platform approval',
    body: 'A platform administrator approves the organization before shifts can be published.',
  },
  {
    icon: MapPin,
    label: 'Configure & publish',
    body: 'Set up locations and wards, then publish role-specific openings for registered nurses, ward assistants, or physiotherapists.',
  },
  {
    icon: ClipboardList,
    label: 'Review timesheets',
    body: 'As assignments complete, review timesheets in the organization dashboard and pay approved wages by bank transfer.',
  },
];

const PRO_STEPS: JourneyStep[] = [
  {
    icon: UserRound,
    label: 'Register in the worker app',
    body: 'Create an account and confirm your email. Use the web continuation page if your confirmation link opens in a browser.',
  },
  {
    icon: FileText,
    label: 'Submit verification package',
    body: 'Upload role-specific documents and bank details for wage payouts. Platform review verifies the package before activation.',
  },
  {
    icon: ShieldCheck,
    label: 'Admin review & activation',
    body: 'A platform admin reviews your package. Marketplace shifts appear only after activation.',
  },
  {
    icon: CalendarDays,
    label: 'Accept work & settle separately',
    body: 'Accept eligible shifts, submit timesheets, receive organization wages by bank transfer, and settle Bridge Hive’s separate commission invoice on its own schedule.',
  },
];

function HospitalMotif() {
  return (
    <div className="m-journey-motif m-journey-motif--hospital" aria-hidden="true">
      <span className="m-journey-motif-glow" />
      <svg viewBox="0 0 140 120" fill="none">
        {/* Soft ground shadow */}
        <ellipse cx="70" cy="108" rx="46" ry="7" fill="#1A7EF0" opacity="0.14" />

        {/* Side wings */}
        <rect x="14" y="48" width="28" height="52" rx="8" fill="#D9EBFF" />
        <rect x="98" y="48" width="28" height="52" rx="8" fill="#D9EBFF" />

        {/* Main building body */}
        <rect x="34" y="28" width="72" height="72" rx="12" fill="#EEF5FF" />
        <rect
          x="34"
          y="28"
          width="72"
          height="72"
          rx="12"
          fill="url(#m-hospital-body)"
        />

        {/* Rooftop block */}
        <rect x="48" y="12" width="44" height="26" rx="8" fill="#C9E2FF" />
        <rect x="48" y="12" width="44" height="26" rx="8" fill="url(#m-hospital-roof)" />

        {/* Medical cross badge */}
        <rect x="58" y="17" width="24" height="18" rx="5" fill="#1A7EF0" />
        <path
          d="M67.2 20.5h5.6v4.2H77v5.6h-4.2V34h-5.6v-3.7H63v-5.6h4.2v-4.2Z"
          fill="#fff"
        />

        {/* Windows */}
        <rect x="44" y="48" width="14" height="12" rx="3" fill="#fff" />
        <rect x="63" y="48" width="14" height="12" rx="3" fill="#fff" />
        <rect x="82" y="48" width="14" height="12" rx="3" fill="#fff" />
        <rect x="44" y="66" width="14" height="12" rx="3" fill="#fff" />
        <rect x="82" y="66" width="14" height="12" rx="3" fill="#fff" />

        {/* Side wing windows */}
        <rect x="21" y="58" width="12" height="10" rx="2.5" fill="#fff" opacity="0.95" />
        <rect x="21" y="74" width="12" height="10" rx="2.5" fill="#fff" opacity="0.95" />
        <rect x="107" y="58" width="12" height="10" rx="2.5" fill="#fff" opacity="0.95" />
        <rect x="107" y="74" width="12" height="10" rx="2.5" fill="#fff" opacity="0.95" />

        {/* Entrance */}
        <rect x="60" y="74" width="20" height="26" rx="5" fill="#1A7EF0" />
        <rect x="64" y="78" width="12" height="22" rx="3.5" fill="#4EA8FF" opacity="0.9" />

        {/* Canopy */}
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

        {/* Badge clip */}
        <rect x="62" y="8" width="16" height="10" rx="3" fill="#D4A018" />
        <rect x="58" y="14" width="24" height="6" rx="2" fill="#E4B334" />

        {/* Card body */}
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

        {/* Photo / avatar circle */}
        <circle cx="70" cy="46" r="18" fill="#FFE8A3" />
        <circle cx="70" cy="42" r="8" fill="#E4B334" />
        <path
          d="M54 62c3.5-7 10-10.5 16-10.5S82.5 55 86 62"
          fill="#E4B334"
          opacity="0.85"
        />

        {/* Text lines */}
        <rect x="48" y="72" width="44" height="7" rx="3.5" fill="#E4B334" opacity="0.55" />
        <rect x="54" y="84" width="32" height="6" rx="3" fill="#E4B334" opacity="0.32" />

        {/* Verified check badge */}
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

export function HowItWorksClient() {
  const [emphasis, setEmphasis] = useState<'organization' | 'professional'>(
    'organization',
  );

  return (
    <>
      <section className="m-how-hero">
        <div className="m-how-hero-glow" aria-hidden="true" />
        <div className="m-how-hero-hex" aria-hidden="true" />
        <div className="m-section m-how-hero-inner">
          <Reveal>
            <p className="m-eyebrow">How it works</p>
            <h1 className="m-how-hero-title">
              Two clear paths. A more efficient{' '}
              <span className="m-how-hero-accent">workforce.</span>
            </h1>
            <p className="m-lede m-how-hero-lede">
              Organizations and professionals use different entry points, reviews, and
              destinations — so sign-in, verification, and payment responsibilities stay
              clear.
            </p>
            <div
              className={`m-how-toggle m-how-toggle--${emphasis}`}
              role="tablist"
              aria-label="Emphasize journey"
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
                  <span className="m-how-toggle-label">Organizations</span>
                  <span className="m-how-toggle-hint">Hospital path</span>
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
                  <span className="m-how-toggle-label">Professionals</span>
                  <span className="m-how-toggle-hint">Worker path</span>
                </span>
              </button>
            </div>
            <div className="m-how-hero-ctas">
              <MarketingButton href="/sign-in" variant="primary">
                Organization sign in
              </MarketingButton>
              <MarketingButton href="/auth/worker/login" variant="secondary">
                Worker app continuation
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
              title="Organization journey"
              subtitle="From invitation to published shifts."
              steps={ORG_STEPS}
              active={emphasis === 'organization'}
              motif="hospital"
              onSelect={() => setEmphasis('organization')}
            />
          </Reveal>
          <Reveal delay={80}>
            <JourneyCard
              tone="honey"
              title="Professional journey"
              subtitle="From registration to eligible shifts."
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
          <InquiryCta />
        </Section>
      </MarketingFlowShell>
    </>
  );
}
