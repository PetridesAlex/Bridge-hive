'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { WorkerJourneyCard } from '@/components/marketing/WorkerJourneyCard';
import { WorkerJourneyVisual } from '@/components/marketing/WorkerJourneyVisual';
import { buildWorkerJourneySteps } from '@/components/marketing/worker-journey-data';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';

type WorkerJourneySectionProps = {
  professionals: MarketingDictionary['professionals'];
};

/** Premium "How account setup works" band for /professionals. */
export function WorkerJourneySection({ professionals }: WorkerJourneySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [entered, setEntered] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const steps = useMemo(
    () => buildWorkerJourneySteps(professionals),
    [professionals],
  );

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
      id="m-wj"
      className={`m-band m-wj-band${entered ? ' is-entered' : ''}${
        reduceMotion ? ' m-wj-band--reduced' : ''
      }`}
      aria-labelledby="m-wj-heading"
    >
      <div className="m-wj-atmosphere" aria-hidden="true" />
      <div className="m-section m-wj-section">
        <header className="m-wj-header" id="m-wj-heading-block">
          <p className="m-wj-eyebrow">{professionals.journeyEyebrow}</p>
          <h2 id="m-wj-heading" className="m-wj-heading">
            {professionals.journeyTitlePrefix}{' '}
            <span className="m-wj-heading-accent">
              {professionals.journeyTitleAccent}
            </span>
          </h2>
        </header>

        <div className="m-wj-layout">
          <WorkerJourneyCard
            activeStep={activeStep}
            onStepChange={setActiveStep}
            steps={steps}
            cardTitle={professionals.journeyCardTitle}
            stepAriaTemplate={professionals.journeyStepAriaTemplate}
          />
          <WorkerJourneyVisual
            activeStep={activeStep}
            onStepChange={setActiveStep}
            playMotion={playMotion}
            reduceMotion={reduceMotion}
            steps={steps}
            caption={professionals.journeyVisualCaption}
            diagramAriaLabel={professionals.journeyCardTitle}
            stepAriaTemplate={professionals.journeyStepAriaTemplate}
          />
        </div>
      </div>
    </section>
  );
}
