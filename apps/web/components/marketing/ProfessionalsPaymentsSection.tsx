'use client';

import Image from 'next/image';
import {
  ArrowDown,
  ArrowRight,
  Building2,
  Check,
  ClipboardCheck,
  FileText,
  Landmark,
  Receipt,
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type ComponentType, type CSSProperties } from 'react';

import { BRIDGE_HIVE_MARK_SRC } from '@/components/brand/BridgeHiveMark';
import { Reveal } from '@/components/marketing/Reveal';

type PayStep = {
  id: string;
  title: string;
  body: string;
  bullets: readonly string[];
  Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

const PAY_STEPS: readonly PayStep[] = [
  {
    id: 'approved',
    title: 'Work is approved',
    body: 'The worker completes a shift. The organization reviews the timesheet and approves completed work before wages are owed.',
    bullets: ['Shift completed', 'Timesheet reviewed', 'Work approved'],
    Icon: ClipboardCheck,
  },
  {
    id: 'wages',
    title: 'Organizations pay workers directly',
    body: 'The healthcare organization pays approved gross wages by bank transfer. Bridge Hive does not collect, hold, or disburse hospital wages.',
    bullets: [
      'Paid by the organization',
      'Direct bank transfer of approved wages',
      'Bridge Hive never holds wages',
    ],
    Icon: Landmark,
  },
  {
    id: 'commission',
    title: 'Separate platform commission',
    body: 'Bridge Hive separately invoices the worker for its platform commission after approved work. The worker settles that invoice on its own schedule — it is not deducted from wages.',
    bullets: [
      'Separate Bridge Hive commission invoice',
      'Paid separately by the worker',
      'Not deducted from organization wage transfer',
    ],
    Icon: Receipt,
  },
];

function PaymentsVisual() {
  const reactId = useId().replace(/:/g, '');
  const trail = `m-pay-trail-${reactId}`;
  const glow = `m-pay-glow-${reactId}`;

  return (
    <div className="m-pay-visual" aria-hidden="true">
      <svg className="m-pay-visual-svg" viewBox="0 0 520 360" fill="none">
        <defs>
          <linearGradient id={trail} x1="40" y1="280" x2="470" y2="70" gradientUnits="userSpaceOnUse">
            <stop stopColor="#93C5FD" stopOpacity="0.15" />
            <stop offset="0.45" stopColor="#2563EB" stopOpacity="0.55" />
            <stop offset="1" stopColor="#E4B334" stopOpacity="0.45" />
          </linearGradient>
          <radialGradient id={glow} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(268 188) rotate(90) scale(120 120)">
            <stop stopColor="#60A5FA" stopOpacity="0.55" />
            <stop offset="1" stopColor="#60A5FA" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="268" cy="250" rx="118" ry="28" fill={`url(#${glow})`} />
        <path
          className="m-pay-trail"
          d="M48 268 C110 210, 150 300, 220 230 C260 190, 300 140, 360 160 C410 176, 440 120, 478 96"
          stroke={`url(#${trail})`}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="92" cy="246" r="4.5" fill="#60A5FA" opacity="0.85" />
        <circle cx="188" cy="252" r="3.5" fill="#93C5FD" />
        <circle cx="410" cy="148" r="4" fill="#E4B334" opacity="0.9" />
        <circle cx="468" cy="102" r="3.2" fill="#2563EB" />

        <g opacity="0.55">
          <path d="M70 86 L86 76 L102 86 L86 96 Z" fill="#E4B334" />
          <path d="M430 250 L444 242 L458 250 L444 258 Z" fill="#93C5FD" />
          <path d="M140 60 L150 54 L160 60 L150 66 Z" fill="#2563EB" opacity="0.45" />
        </g>
      </svg>

      <div className="m-pay-visual-pedestal">
        <div className="m-pay-visual-mark">
          <Image
            src={BRIDGE_HIVE_MARK_SRC}
            alt=""
            width={112}
            height={112}
            className="m-pay-visual-logo"
            sizes="112px"
          />
        </div>
      </div>

      <div className="m-pay-float m-pay-float--wages">
        <span className="m-pay-float-icon">
          <Building2 size={18} strokeWidth={2} />
        </span>
        <span className="m-pay-float-copy">
          <strong>Wages to workers</strong>
          <em>Organization bank transfer</em>
        </span>
      </div>

      <div className="m-pay-float m-pay-float--commission">
        <span className="m-pay-float-icon m-pay-float-icon--doc">
          <FileText size={18} strokeWidth={2} />
        </span>
        <span className="m-pay-float-copy">
          <strong>Platform commission</strong>
          <em>Worker invoice</em>
        </span>
      </div>
    </div>
  );
}

function StageConnector({ orientation }: { orientation: 'horizontal' | 'vertical' }) {
  return (
    <div className={`m-pay-connector m-pay-connector--${orientation}`} aria-hidden="true">
      <span className="m-pay-connector-line" />
      <span className="m-pay-connector-arrow">
        {orientation === 'horizontal' ? (
          <ArrowRight size={18} strokeWidth={2.4} />
        ) : (
          <ArrowDown size={18} strokeWidth={2.4} />
        )}
      </span>
    </div>
  );
}

export function ProfessionalsPaymentsSection() {
  const bandRef = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const node = bandRef.current;
    if (!node) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setEntered(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -6% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={bandRef}
      className={`m-band m-pay-band${entered ? ' is-entered' : ''}`}
      aria-labelledby="m-pay-heading"
    >
      <div className="m-pay-atmosphere" aria-hidden="true">
        <span className="m-pay-wave m-pay-wave--a" />
        <span className="m-pay-wave m-pay-wave--b" />
        <span className="m-pay-wave m-pay-wave--c" />
      </div>

      <div className="m-section m-pay-section">
        <div className="m-pay-intro">
          <Reveal>
            <div className="m-pay-copy">
              <p className="m-pay-eyebrow">How payments work</p>
              <h2 id="m-pay-heading" className="m-pay-heading">
                How payments <span className="m-pay-heading-accent">work</span>
              </h2>
              <p className="m-pay-lede">
                Wage pay and platform commission are separate obligations with separate
                payment methods.
              </p>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <PaymentsVisual />
          </Reveal>
        </div>

        <ol className="m-pay-stages">
          {PAY_STEPS.map((step, index) => (
            <li key={step.id} className="m-pay-stage">
              {index > 0 ? (
                <>
                  <StageConnector orientation="horizontal" />
                  <StageConnector orientation="vertical" />
                </>
              ) : null}
              <article
                className="m-pay-card"
                style={{ '--m-pay-delay': `${120 + index * 90}ms` } as CSSProperties}
              >
                <div className="m-pay-card-top">
                  <span className="m-pay-badge" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="m-pay-card-icon" aria-hidden="true">
                    <step.Icon size={26} strokeWidth={1.85} />
                  </span>
                </div>
                <h3 className="m-pay-card-title">{step.title}</h3>
                <p className="m-pay-card-body">{step.body}</p>
                <ul className="m-pay-bullets">
                  {step.bullets.map((bullet) => (
                    <li key={bullet}>
                      <Check size={15} strokeWidth={2.6} aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
