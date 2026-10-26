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
  type LucideIcon,
} from 'lucide-react';
import { useId } from 'react';

import { Reveal } from '@/components/marketing/Reveal';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';

type HomeHowItWorksProps = {
  hiw: MarketingDictionary['home']['hiw'];
};

type LoopStep = {
  label: string;
  body: string;
  icon: LucideIcon;
  tone: 'teal' | 'honey';
};

type PathStep = {
  label: string;
  body: string;
  icon: LucideIcon;
};

const FLOW_PATH =
  'M28 128 C72 88, 118 148, 152 96 C178 58, 210 42, 248 54';

function FlowMotif({ hiw }: { hiw: HomeHowItWorksProps['hiw'] }) {
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

        <path
          className="m-hiw-flow-track"
          d={FLOW_PATH}
          pathLength={1}
          stroke={`url(#${soft})`}
          strokeWidth="6"
          strokeLinecap="round"
        />

        <path
          className="m-hiw-flow-progress-static"
          d={FLOW_PATH}
          stroke={`url(#${glow})`}
          strokeWidth="5"
          strokeLinecap="round"
        />

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
        <span>{hiw.floatShift}</span>
      </div>
      <div className="m-hiw-float m-hiw-float--check">
        <span className="m-hiw-float-fill" />
        <CheckCircle2 size={26} strokeWidth={1.7} />
        <span>{hiw.floatReview}</span>
      </div>
      <div className="m-hiw-float m-hiw-float--pay">
        <span className="m-hiw-float-fill" />
        <span className="m-hiw-float-currency">€</span>
        <span>{hiw.floatSettle}</span>
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

export function HomeHowItWorks({ hiw }: HomeHowItWorksProps) {
  const LOOP: readonly LoopStep[] = [
    {
      label: hiw.loopStep1Label,
      body: hiw.loopStep1Body,
      icon: FileText,
      tone: 'teal',
    },
    {
      label: hiw.loopStep2Label,
      body: hiw.loopStep2Body,
      icon: Users,
      tone: 'honey',
    },
    {
      label: hiw.loopStep3Label,
      body: hiw.loopStep3Body,
      icon: ClipboardList,
      tone: 'teal',
    },
    {
      label: hiw.loopStep4Label,
      body: hiw.loopStep4Body,
      icon: Wallet,
      tone: 'teal',
    },
  ];

  const ORG_STEPS: readonly PathStep[] = [
    { label: hiw.orgStep1Label, body: hiw.orgStep1Body, icon: Mail },
    { label: hiw.orgStep2Label, body: hiw.orgStep2Body, icon: Settings2 },
    { label: hiw.orgStep3Label, body: hiw.orgStep3Body, icon: BarChart3 },
  ];

  const PRO_STEPS: readonly PathStep[] = [
    { label: hiw.proStep1Label, body: hiw.proStep1Body, icon: UserPlus },
    { label: hiw.proStep2Label, body: hiw.proStep2Body, icon: FileText },
    { label: hiw.proStep3Label, body: hiw.proStep3Body, icon: Check },
  ];

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
            <p className="m-eyebrow">{hiw.eyebrow}</p>
            <h2 className="m-hiw-title m-display">
              {hiw.title}{' '}
              <span className="m-hiw-title-accent">{hiw.titleAccent}</span>
            </h2>
            <p className="m-hiw-lede">{hiw.lede}</p>
          </div>
          <FlowMotif hiw={hiw} />
        </div>

        <ol className="m-hiw-loop" aria-label={hiw.loopAria}>
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
                <p className="m-eyebrow">{hiw.orgPathEyebrow}</p>
                <h3>{hiw.orgPathTitle}</h3>
                <p className="m-hiw-path-lede">{hiw.orgPathLede}</p>
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
                <p className="m-eyebrow m-eyebrow--honey">{hiw.proPathEyebrow}</p>
                <h3>{hiw.proPathTitle}</h3>
                <p className="m-hiw-path-lede">{hiw.proPathLede}</p>
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
