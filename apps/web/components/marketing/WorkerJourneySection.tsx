'use client';

import { useEffect, useRef, useState } from 'react';

import { WorkerJourneyCard } from '@/components/marketing/WorkerJourneyCard';
import { WorkerJourneyVisual } from '@/components/marketing/WorkerJourneyVisual';

/** Premium “How account setup works” band for /professionals. */
export function WorkerJourneySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [entered, setEntered] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    if (reduceMotion) {
      setEntered(true);
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting);
        setInView(visible);
        if (visible) setEntered(true);
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.18 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reduceMotion]);

  const playMotion = entered && inView && !reduceMotion;

  return (
    <section
      ref={sectionRef}
      className={`m-band m-wj-band${entered ? ' is-entered' : ''}${
        reduceMotion ? ' m-wj-band--reduced' : ''
      }`}
      aria-labelledby="m-wj-heading"
    >
      <div className="m-wj-atmosphere" aria-hidden="true" />
      <div className="m-section m-wj-section">
        <header className="m-wj-header">
          <p className="m-wj-eyebrow">How it works</p>
          <h2 id="m-wj-heading" className="m-wj-heading">
            How account setup <span className="m-wj-heading-accent">works</span>
          </h2>
        </header>

        <div className="m-wj-layout">
          <WorkerJourneyCard activeStep={activeStep} onStepChange={setActiveStep} />
          <WorkerJourneyVisual
            activeStep={activeStep}
            onStepChange={setActiveStep}
            playMotion={playMotion}
            reduceMotion={reduceMotion}
          />
        </div>
      </div>
    </section>
  );
}
