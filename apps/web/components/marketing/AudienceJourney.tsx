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
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useId, useState, type ComponentType } from 'react';

import { Reveal } from '@/components/marketing/Reveal';

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
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  tone: 'teal' | 'honey';
};

type AudienceContent = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  cardIcon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  calloutTitle: string;
  calloutBody: string;
  workflowTitle: string;
  steps: readonly Step[];
  floatChecks: readonly string[];
};

const ORG: AudienceContent = {
  eyebrow: 'Organizations',
  title: 'Publish shifts with role and ward clarity',
  body: 'Configure locations and wards, create openings for registered nurses or ward assistants, and review completed timesheets. Platform approval is required before your organization can publish shifts.',
  href: '/organizations',
  cta: 'How organizations use Bridge Hive',
  cardIcon: Building2,
  calloutTitle: 'Streamline your staffing',
  calloutBody:
    'Get the right professionals in the right wards, with full visibility and control.',
  workflowTitle: 'From invitation to published shifts',
  floatChecks: [
    'Role and ward clarity',
    'Credential review workflows',
    'Separate wage and commission paths',
  ],
  steps: [
    {
      label: 'Provisioned access',
      body: 'Bridge Hive creates organization accounts. Use the activation email or organization sign-in once invited.',
      icon: Mail,
      tone: 'teal',
    },
    {
      label: 'Set up and publish',
      body: 'Configure locations and wards, then publish role-specific shifts after platform approval.',
      icon: Settings2,
      tone: 'honey',
    },
    {
      label: 'Review and pay wages',
      body: 'Accept timesheets, then pay approved worker wages by bank transfer.',
      icon: FileText,
      tone: 'teal',
    },
  ],
};

const PRO: AudienceContent = {
  eyebrow: 'Professionals',
  title: 'Verify once, then work eligible shifts',
  body: 'Create an account in the worker app, upload role-specific documents, and submit bank details for wage payouts. A platform admin reviews your package before shifts become available — email confirmation alone is not activation.',
  href: '/professionals',
  cta: 'How professionals use Bridge Hive',
  cardIcon: UserRound,
  calloutTitle: 'Activation before marketplace access',
  calloutBody:
    'Upload documents and bank details for review — shifts appear only after a platform admin activates your account.',
  workflowTitle: 'From registration to eligible shifts',
  floatChecks: [
    'Worker app continuation',
    'Document and bank review',
    'Role-matched openings',
  ],
  steps: [
    {
      label: 'Create an account',
      body: 'Register in the Bridge Hive worker app and confirm your email.',
      icon: Smartphone,
      tone: 'teal',
    },
    {
      label: 'Submit for review',
      body: 'Upload role-specific documents and bank details. A platform admin reviews before activation.',
      icon: FileCheck2,
      tone: 'honey',
    },
    {
      label: 'Accept eligible shifts',
      body: 'After activation, browse and accept openings that match your role — then complete timesheets.',
      icon: CalendarCheck,
      tone: 'teal',
    },
  ],
};

export function AudienceJourney() {
  const [audience, setAudience] = useState<'organization' | 'professional'>(
    'organization',
  );
  const baseId = useId();
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
            <p className="m-eyebrow">Two audiences, one platform</p>
            <h2 className="m-audience-title m-display">
              Built for hospitals and the professionals{' '}
              <span className="m-audience-title-accent">who staff them</span>
            </h2>
            <p className="m-audience-lede">
              Bridge Hive keeps organization workflows and worker journeys distinct — so
              sign-in, verification, and payments stay clear.
            </p>

            <div
              className={`m-audience-tabs m-audience-tabs--${audience}`}
              role="tablist"
              aria-label="Audience journey"
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
                Organizations
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
                Professionals
              </button>
            </div>
          </div>

          <div className="m-audience-visual" aria-hidden="true">
            <AudienceHexVisual audience={audience} />

            <aside className="m-audience-float">
              <p>Staffing made simple</p>
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
            <p className="m-eyebrow m-eyebrow--honey">Workflow</p>
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
          Prefer a full page? Read the{' '}
          <Link href="/organizations">organization journey</Link> or the{' '}
          <Link href="/professionals">professional journey</Link>.
        </p>
      </div>
    </Reveal>
  );
}
