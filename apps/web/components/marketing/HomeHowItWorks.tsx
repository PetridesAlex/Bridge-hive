'use client';

import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  Mail,
  Settings2,
  UserPlus,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { useId, type ComponentType } from 'react';

import { Reveal } from '@/components/marketing/Reveal';

type LoopStep = {
  label: string;
  body: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  tone: 'teal' | 'honey';
};

type PathStep = {
  label: string;
  body: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

const LOOP: readonly LoopStep[] = [
  {
    label: 'Shift published',
    body: 'Organizations create role-specific openings for wards and locations after platform approval.',
    icon: FileText,
    tone: 'teal',
  },
  {
    label: 'Professional claims',
    body: 'Eligible nurses and ward assistants browse and accept shifts that match their activation.',
    icon: Users,
    tone: 'honey',
  },
  {
    label: 'Timesheet reviewed',
    body: 'Completed work flows through organization review before wages are approved.',
    icon: ClipboardList,
    tone: 'teal',
  },
  {
    label: 'Wage + invoice settle',
    body: 'Organizations pay wages by bank transfer; workers settle a separate platform commission invoice.',
    icon: Wallet,
    tone: 'teal',
  },
];

const ORG_STEPS: readonly PathStep[] = [
  {
    label: 'Provisioned access',
    body: 'Bridge Hive creates organization accounts. Use the activation email or organization sign-in once invited — there is no open hospital self-registration.',
    icon: Mail,
  },
  {
    label: 'Set up and publish',
    body: 'Configure locations and wards, then publish shifts for registered nurses or ward assistants after platform approval.',
    icon: Settings2,
  },
  {
    label: 'Review completed work',
    body: 'Accept timesheets and keep operational visibility across locations and wards.',
    icon: BarChart3,
  },
];

const PRO_STEPS: readonly PathStep[] = [
  {
    label: 'Create an account',
    body: 'Register in the Bridge Hive worker app and confirm your email. Confirmation is not the same as account verification.',
    icon: UserPlus,
  },
  {
    label: 'Submit for review',
    body: 'Upload role-specific documents and bank details for wage payouts. A platform admin reviews the package before activation.',
    icon: FileText,
  },
  {
    label: 'Accept eligible shifts',
    body: 'After activation, browse and accept openings that match your role — then complete timesheets in the app.',
    icon: Check,
  },
];

const FLOW_PATH =
  'M28 128 C72 88, 118 148, 152 96 C178 58, 210 42, 248 54';

function FlowMotif() {
  const reactId = useId().replace(/:/g, '');
  const glow = `m-hiw-flow-glow-${reactId}`;
  const soft = `m-hiw-flow-soft-${reactId}`;

  return (
    <div className="m-hiw-flow" aria-hidden="true">
      <svg className="m-hiw-flow-svg" viewBox="0 0 280 180" fill="none">
        <defs>
          <linearGradient id={glow} x1="28" y1="128" x2="248" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1A7EF0" />
            <stop offset="0.5" stopColor="#E4B334" />
            <stop offset="1" stopColor="#14A9B5" />
          </linearGradient>
          <linearGradient id={soft} x1="28" y1="128" x2="248" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1A7EF0" stopOpacity="0.22" />
            <stop offset="0.5" stopColor="#E4B334" stopOpacity="0.2" />
            <stop offset="1" stopColor="#14A9B5" stopOpacity="0.22" />
          </linearGradient>
        </defs>

        {/* Quiet track */}
        <path
          className="m-hiw-flow-track"
          d={FLOW_PATH}
          pathLength={1}
          stroke={`url(#${soft})`}
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Static fallback when motion is reduced */}
        <path
          className="m-hiw-flow-progress-static"
          d={FLOW_PATH}
          stroke={`url(#${glow})`}
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Color fill that draws along the path */}
        <path
          className="m-hiw-flow-progress"
          d={FLOW_PATH}
          pathLength={1}
          stroke={`url(#${glow})`}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="1"
          strokeDashoffset="1"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="1;0;0;1;1"
            keyTimes="0;0.55;0.78;0.9;1"
            dur="4.8s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
          />
          <animate
            attributeName="opacity"
            values="0.9;1;1;0.2;0.9"
            keyTimes="0;0.55;0.78;0.9;1"
            dur="4.8s"
            repeatCount="indefinite"
          />
        </path>

        {/* Soft dashed guide on top */}
        <path
          className="m-hiw-flow-dash"
          d={FLOW_PATH}
          pathLength={1}
          stroke={`url(#${glow})`}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeDasharray="0.025 0.045"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-0.24"
            dur="4.8s"
            repeatCount="indefinite"
          />
        </path>

        <g className="m-hiw-flow-nodes">
          <circle className="m-hiw-flow-node m-hiw-flow-node--1" cx="28" cy="128" r="7" />
          <circle className="m-hiw-flow-node m-hiw-flow-node--2" cx="152" cy="96" r="7" />
          <circle className="m-hiw-flow-node m-hiw-flow-node--3" cx="248" cy="54" r="7" />
        </g>

        {/* Travelling pulse along the path */}
        <circle className="m-hiw-flow-runner" r="5.5" fill="#fff">
          <animateMotion
            dur="4.8s"
            repeatCount="indefinite"
            path={FLOW_PATH}
            keyTimes="0;0.58;0.82;0.8201;1"
            keyPoints="0;1;1;0;0"
            calcMode="linear"
          />
        </circle>
        <circle className="m-hiw-flow-runner-core" r="3" fill="#1A7EF0">
          <animateMotion
            dur="4.8s"
            repeatCount="indefinite"
            path={FLOW_PATH}
            keyTimes="0;0.58;0.82;0.8201;1"
            keyPoints="0;1;1;0;0"
            calcMode="linear"
          />
        </circle>
      </svg>

      <div className="m-hiw-float m-hiw-float--cal">
        <span className="m-hiw-float-fill" />
        <CalendarDays size={28} strokeWidth={1.7} />
        <span>Shift</span>
      </div>
      <div className="m-hiw-float m-hiw-float--check">
        <span className="m-hiw-float-fill" />
        <CheckCircle2 size={26} strokeWidth={1.7} />
        <span>Review</span>
      </div>
      <div className="m-hiw-float m-hiw-float--pay">
        <span className="m-hiw-float-fill" />
        <span className="m-hiw-float-currency">€</span>
        <span>Settle</span>
      </div>
    </div>
  );
}

function HospitalGlyph() {
  const reactId = useId().replace(/:/g, '');
  const body = `m-hiw-hosp-body-${reactId}`;
  const roof = `m-hiw-hosp-roof-${reactId}`;

  return (
    <div className="m-hiw-path-art m-hiw-path-art--hospital" aria-hidden="true">
      <svg viewBox="0 0 160 140" fill="none">
        <ellipse cx="80" cy="124" rx="48" ry="8" fill="#1A7EF0" opacity="0.12" />
        <rect x="18" y="58" width="30" height="58" rx="8" fill="#D7EBFF" />
        <rect x="112" y="58" width="30" height="58" rx="8" fill="#D7EBFF" />
        <rect x="40" y="36" width="80" height="80" rx="14" fill={`url(#${body})`} />
        <rect x="56" y="18" width="48" height="30" rx="9" fill={`url(#${roof})`} />
        <rect x="66" y="24" width="28" height="18" rx="5" fill="#1A7EF0" />
        <path d="M76.4 28.2h7.2v4.4H88v6.2h-4.4V43h-7.2v-4.2H72v-6.2h4.4v-4.4Z" fill="#fff" />
        <rect x="52" y="58" width="16" height="12" rx="3" fill="#fff" />
        <rect x="72" y="58" width="16" height="12" rx="3" fill="#fff" />
        <rect x="92" y="58" width="16" height="12" rx="3" fill="#fff" />
        <rect x="52" y="78" width="16" height="12" rx="3" fill="#fff" />
        <rect x="92" y="78" width="16" height="12" rx="3" fill="#fff" />
        <rect x="68" y="86" width="24" height="30" rx="6" fill="#1A7EF0" />
        <defs>
          <linearGradient id={body} x1="80" y1="36" x2="80" y2="116" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F7FBFF" />
            <stop offset="1" stopColor="#D0E5FF" />
          </linearGradient>
          <linearGradient id={roof} x1="80" y1="18" x2="80" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E8F3FF" />
            <stop offset="1" stopColor="#B8D8FF" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function PhoneGlyph() {
  return (
    <div className="m-hiw-path-art m-hiw-path-art--phone" aria-hidden="true">
      <svg viewBox="0 0 120 160" fill="none">
        <rect x="28" y="8" width="64" height="144" rx="14" fill="#0B2032" />
        <rect x="32" y="14" width="56" height="132" rx="11" fill="#F7FAFC" />
        <rect x="48" y="18" width="24" height="5" rx="2.5" fill="#0B2032" opacity="0.35" />
        <rect x="40" y="34" width="40" height="10" rx="4" fill="#14A9B5" opacity="0.85" />
        <rect x="40" y="50" width="40" height="28" rx="6" fill="#E8F7F8" />
        <rect x="40" y="84" width="40" height="16" rx="5" fill="#FFF4D6" />
        <rect x="40" y="106" width="40" height="16" rx="5" fill="#EAF3FF" />
        <circle cx="60" cy="136" r="4" fill="#0B2032" opacity="0.25" />
      </svg>
    </div>
  );
}

export function HomeHowItWorks() {
  return (
    <Reveal>
      <div className="m-hiw">
        <div className="m-hiw-atmosphere" aria-hidden="true">
          <span className="m-hiw-blob m-hiw-blob--teal" />
          <span className="m-hiw-blob m-hiw-blob--honey" />
          <span className="m-hiw-blob m-hiw-blob--soft" />
        </div>

        <div className="m-hiw-intro">
          <div className="m-hiw-copy">
            <p className="m-eyebrow">How it works</p>
            <h2 className="m-hiw-title m-display">
              From opening to <span className="m-hiw-title-accent">settlement</span>
            </h2>
            <p className="m-hiw-lede">
              A concise view of the shared operational loop — then the two detailed paths
              below.
            </p>
          </div>
          <FlowMotif />
        </div>

        <ol className="m-hiw-loop" aria-label="Shared operational loop">
          {LOOP.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.label} className="m-hiw-loop-item">
                <article className={`m-hiw-loop-card m-hiw-loop-card--${step.tone}`}>
                  <div className="m-hiw-loop-top">
                    <span
                      className={`m-hiw-loop-icon m-hiw-loop-icon--${step.tone}`}
                      aria-hidden="true"
                    >
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <span className="m-hiw-loop-num" aria-hidden="true">
                      {index + 1}
                    </span>
                  </div>
                  <h3>{step.label}</h3>
                  <p>{step.body}</p>
                </article>
                {index < LOOP.length - 1 ? (
                  <span
                    className={`m-hiw-loop-arrow m-hiw-loop-arrow--${
                      index % 2 === 0 ? 'teal' : 'honey'
                    }`}
                    aria-hidden="true"
                  >
                    <ArrowRight size={14} strokeWidth={2.4} />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="m-hiw-paths">
          <article className="m-hiw-path m-hiw-path--org">
            <div className="m-hiw-path-head">
              <div>
                <span className="m-hiw-path-badge m-hiw-path-badge--teal" aria-hidden="true">
                  <Building2 size={18} strokeWidth={2.1} />
                </span>
                <p className="m-eyebrow">For organizations</p>
                <h3>Publish shifts with role and ward clarity</h3>
                <p className="m-hiw-path-lede">
                  Provisioned access, ward setup, and timesheet review — without open
                  hospital self-registration.
                </p>
              </div>
              <HospitalGlyph />
            </div>
            <ol className="m-hiw-path-steps">
              {ORG_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.label}>
                    <span className="m-hiw-path-index m-hiw-path-index--teal" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span className="m-hiw-path-step-icon m-hiw-path-step-icon--teal" aria-hidden="true">
                      <Icon size={20} strokeWidth={2} />
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

          <article className="m-hiw-path m-hiw-path--pro">
            <div className="m-hiw-path-head">
              <div>
                <span className="m-hiw-path-badge m-hiw-path-badge--honey" aria-hidden="true">
                  <UserRound size={18} strokeWidth={2.1} />
                </span>
                <p className="m-eyebrow m-eyebrow--honey">For professionals</p>
                <h3>From registration to eligible shifts</h3>
                <p className="m-hiw-path-lede">
                  App signup, document review, and role-matched openings — activation is
                  never automatic after email confirmation alone.
                </p>
              </div>
              <PhoneGlyph />
            </div>
            <ol className="m-hiw-path-steps">
              {PRO_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.label}>
                    <span className="m-hiw-path-index m-hiw-path-index--honey" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span
                      className="m-hiw-path-step-icon m-hiw-path-step-icon--honey"
                      aria-hidden="true"
                    >
                      <Icon size={20} strokeWidth={2} />
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
      </div>
    </Reveal>
  );
}
