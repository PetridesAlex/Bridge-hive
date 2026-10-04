'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';

import { WORKER_JOURNEY_STEPS } from '@/components/marketing/worker-journey-data';

/** Square canvas; six nodes on a symmetric ring, logo at center. */
const VIEW_SIZE = 640;
const RING_CX = VIEW_SIZE / 2;
const RING_CY = VIEW_SIZE / 2;
/** Path radius — leaves clear breathing room around the center mark. */
const RING_R = 236;
/** Start at top, then clockwise so order reads 1→6. */
const RING_START_DEG = -90;

function ringPoint(index: number) {
  const rad = ((RING_START_DEG + index * 60) * Math.PI) / 180;
  return {
    x: RING_CX + RING_R * Math.cos(rad),
    y: RING_CY + RING_R * Math.sin(rad),
  };
}

const NODE_POINTS = WORKER_JOURNEY_STEPS.map((_, index) => ringPoint(index));

/** Closed circular path through all six nodes (clockwise arcs). */
const PATH_D = [
  `M ${NODE_POINTS[0].x.toFixed(2)} ${NODE_POINTS[0].y.toFixed(2)}`,
  ...NODE_POINTS.slice(1).map(
    (point) => `A ${RING_R} ${RING_R} 0 0 1 ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
  ),
  `A ${RING_R} ${RING_R} 0 0 1 ${NODE_POINTS[0].x.toFixed(2)} ${NODE_POINTS[0].y.toFixed(2)}`,
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
    path.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(0.22, 1, 0.36, 1)';
    path.style.strokeDashoffset = '0';

    const done = window.setTimeout(() => setPathReady(true), 1850);
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
    const duration = 5200;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const t = ((ts - start) % duration) / duration;
      const point = path.getPointAtLength(t * length);
      particle.setAttribute('cx', String(point.x));
      particle.setAttribute('cy', String(point.y));
      particle.setAttribute('opacity', '1');
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
            src="/brand/bridge-hive-logo-v2-192.png"
            alt=""
            width={112}
            height={112}
            className="m-wj-logo"
            sizes="112px"
          />
        </div>

        <svg
          className="m-wj-svg"
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          role="img"
          aria-label="Illustrative six-step worker journey path from account creation to timesheets and commission"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="55%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#e4b334" />
            </linearGradient>
          </defs>
          <circle
            className="m-wj-ring-guide"
            cx={RING_CX}
            cy={RING_CY}
            r={RING_R}
            fill="none"
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
          />
          {NODE_POINTS.map((point, index) => (
            <circle
              key={`dot-${WORKER_JOURNEY_STEPS[index].id}`}
              className={`m-wj-path-dot${activeStep === index ? ' is-active' : ''}${
                activeStep !== null && activeStep >= index ? ' is-passed' : ''
              }`}
              cx={point.x}
              cy={point.y}
              r="6"
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
                    '--m-wj-x': `${(point.x / VIEW_SIZE) * 100}%`,
                    '--m-wj-y': `${(point.y / VIEW_SIZE) * 100}%`,
                    '--m-wj-delay': `${120 + index * 70}ms`,
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
                    <step.Icon size={24} strokeWidth={1.85} />
                  </span>
                  <span className="m-wj-node-check" aria-hidden="true">
                    ✓
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
            src="/brand/bridge-hive-logo-v2-192.png"
            alt=""
            width={64}
            height={64}
            className="m-wj-logo"
            sizes="64px"
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
                    <step.Icon size={18} strokeWidth={1.85} />
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
