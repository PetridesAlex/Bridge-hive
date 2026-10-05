'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';

import { BRIDGE_HIVE_MARK_SRC } from '@/components/brand/BridgeHiveMark';
import { WORKER_JOURNEY_STEPS } from '@/components/marketing/worker-journey-data';

const VIEW_W = 760;
const VIEW_H = 520;

/**
 * Open directional journey 1→6 (no closed loop).
 * Wide S / soft zigzag: start top-left, finish bottom-left — never returns to 1.
 */
const NODE_POINTS = [
  { x: 96, y: 118 },
  { x: 300, y: 72 },
  { x: 520, y: 118 },
  { x: 620, y: 268 },
  { x: 360, y: 368 },
  { x: 118, y: 444 },
] as const;

const PATH_D = [
  `M ${NODE_POINTS[0].x} ${NODE_POINTS[0].y}`,
  `C 170 88, 230 62, ${NODE_POINTS[1].x} ${NODE_POINTS[1].y}`,
  `C 390 88, 450 70, ${NODE_POINTS[2].x} ${NODE_POINTS[2].y}`,
  `C 590 170, 640 210, ${NODE_POINTS[3].x} ${NODE_POINTS[3].y}`,
  `C 580 340, 470 380, ${NODE_POINTS[4].x} ${NODE_POINTS[4].y}`,
  `C 250 355, 180 410, ${NODE_POINTS[5].x} ${NODE_POINTS[5].y}`,
].join(' ');

export function WorkerJourneyVisual({
  activeStep,
  onStepChange,
  playMotion,
  reduceMotion,
}: {
  activeStep: number | null;
  onStepChange: (index: number | null) => void;
  playMotion: boolean;
  reduceMotion: boolean;
}) {
  const reactId = useId();
  const gradId = `m-wj-grad-${reactId.replace(/:/g, '')}`;
  const glowId = `m-wj-glow-${reactId.replace(/:/g, '')}`;
  const pathRef = useRef<SVGPathElement>(null);
  const particleRef = useRef<SVGCircleElement>(null);
  const [pathReady, setPathReady] = useState(reduceMotion);
  const [isDesktopVisual, setIsDesktopVisual] = useState(true);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktopVisual(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setPathReady(true);
      return;
    }
    if (!playMotion) return;

    const path = pathRef.current;
    if (!path) return;

    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    void path.getBoundingClientRect();
    path.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.22, 1, 0.36, 1)';
    path.style.strokeDashoffset = '0';

    const done = window.setTimeout(() => setPathReady(true), 2050);
    return () => window.clearTimeout(done);
  }, [playMotion, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !playMotion || !pathReady) return;

    const path = pathRef.current;
    const particle = particleRef.current;
    if (!path || !particle) return;

    const length = path.getTotalLength();
    let raf = 0;
    let start: number | null = null;
    const duration = 5600;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const t = ((ts - start) % duration) / duration;
      // Ease slightly so the particle rests briefly at the end before restarting.
      const eased = t < 0.88 ? t / 0.88 : 1;
      const point = path.getPointAtLength(eased * length);
      particle.setAttribute('cx', String(point.x));
      particle.setAttribute('cy', String(point.y));
      particle.setAttribute('opacity', t < 0.92 ? '1' : '0.35');
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      particle.setAttribute('opacity', '0');
    };
  }, [playMotion, pathReady, reduceMotion]);

  return (
    <div className="m-wj-visual">
      <p className="m-wj-visual-caption">Illustrative journey</p>

      <div className="m-wj-visual-desktop" hidden={!isDesktopVisual}>
        <div className="m-wj-visual-ambience" aria-hidden="true" />

        <div className="m-wj-logo-anchor">
          <Image
            src={BRIDGE_HIVE_MARK_SRC}
            alt=""
            width={96}
            height={96}
            className="m-wj-logo"
            sizes="96px"
          />
        </div>

        <svg
          className="m-wj-svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="Illustrative open six-step worker journey from account creation to timesheets and commission"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#e4b334" />
            </linearGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            className="m-wj-path-glow"
            d={PATH_D}
            fill="none"
            stroke="rgba(96, 165, 250, 0.35)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          />
          <path
            ref={pathRef}
            className={`m-wj-path${reduceMotion || pathReady ? ' is-drawn' : ''}`}
            d={PATH_D}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${glowId})`}
          />
          {NODE_POINTS.map((point, index) => (
            <circle
              key={`dot-${WORKER_JOURNEY_STEPS[index].id}`}
              className={`m-wj-path-dot${activeStep === index ? ' is-active' : ''}${
                activeStep !== null && activeStep >= index ? ' is-passed' : ''
              }`}
              cx={point.x}
              cy={point.y}
              r="5.5"
              aria-hidden="true"
            />
          ))}
          <circle
            ref={particleRef}
            className="m-wj-particle"
            r="7"
            cx={NODE_POINTS[0].x}
            cy={NODE_POINTS[0].y}
            opacity="0"
            aria-hidden="true"
          />
        </svg>

        <ul className="m-wj-nodes">
          {WORKER_JOURNEY_STEPS.map((step, index) => {
            const point = NODE_POINTS[index];
            const active = activeStep === index;
            return (
              <li
                key={step.id}
                className={`m-wj-node${active ? ' is-active' : ''}`}
                style={
                  {
                    '--m-wj-x': `${(point.x / VIEW_W) * 100}%`,
                    '--m-wj-y': `${(point.y / VIEW_H) * 100}%`,
                    '--m-wj-delay': `${100 + index * 80}ms`,
                  } as React.CSSProperties
                }
              >
                <button
                  type="button"
                  className="m-wj-node-btn"
                  aria-current={active ? 'step' : undefined}
                  aria-label={`Step ${index + 1}: ${step.label}`}
                  onMouseEnter={() => onStepChange(index)}
                  onMouseLeave={() => onStepChange(null)}
                  onFocus={() => onStepChange(index)}
                  onBlur={() => onStepChange(null)}
                  onClick={() => onStepChange(active ? null : index)}
                >
                  <span className="m-wj-node-badge" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="m-wj-node-icon" aria-hidden="true">
                    <step.Icon size={22} strokeWidth={1.9} />
                  </span>
                  <span className="m-wj-node-label">{step.shortLabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="m-wj-visual-mobile" hidden={isDesktopVisual}>
        <div className="m-wj-mobile-spine" aria-hidden="true" />
        <div className="m-wj-logo-anchor m-wj-logo-anchor--mobile">
          <Image
            src={BRIDGE_HIVE_MARK_SRC}
            alt=""
            width={72}
            height={72}
            className="m-wj-logo"
            sizes="72px"
          />
        </div>
        <ul className="m-wj-nodes m-wj-nodes--mobile">
          {WORKER_JOURNEY_STEPS.map((step, index) => {
            const active = activeStep === index;
            return (
              <li
                key={`m-${step.id}`}
                className={`m-wj-node m-wj-node--mobile${active ? ' is-active' : ''}`}
              >
                <button
                  type="button"
                  className="m-wj-node-btn"
                  aria-current={active ? 'step' : undefined}
                  aria-label={`Step ${index + 1}: ${step.label}`}
                  onFocus={() => onStepChange(index)}
                  onBlur={() => onStepChange(null)}
                  onClick={() => onStepChange(active ? null : index)}
                >
                  <span className="m-wj-node-badge" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="m-wj-node-icon" aria-hidden="true">
                    <step.Icon size={18} strokeWidth={1.9} />
                  </span>
                  <span className="m-wj-node-label">{step.shortLabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
