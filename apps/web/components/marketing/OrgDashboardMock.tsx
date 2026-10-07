'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';

const KPIS = [
  { label: 'Total shifts', value: 128 },
  { label: 'Workers', value: 42 },
  { label: 'Open positions', value: 17 },
] as const;

const BARS = [42, 68, 54, 86, 62, 74] as const;

const SHIFTS = [
  { role: 'RN · Night', ward: 'Ward A' },
  { role: 'WA · Day', ward: 'Ward B' },
  { role: 'RN · Evening', ward: 'ICU' },
] as const;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function useCountUp(target: number, active: boolean, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * easeOutCubic(progress)));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, duration, target]);

  return value;
}

function KpiValue({ target, active }: { target: number; active: boolean }) {
  const value = useCountUp(target, active, 1100 + target);
  return <strong>{value}</strong>;
}

function FloatValue({ active }: { active: boolean }) {
  const value = useCountUp(24, active, 1400);
  return <strong>{value}</strong>;
}

export function OrgDashboardMock() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setLive(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setLive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={`m-org-mock${live ? ' is-live' : ''}`}
      aria-hidden="true"
    >
      <div className="m-org-mock-blob m-org-mock-blob--teal" />
      <div className="m-org-mock-blob m-org-mock-blob--honey" />

      <div className="m-org-mock-stage">
        <div className="m-org-mock-panel">
          <aside className="m-org-mock-side">
            <span className="m-org-mock-side-mark">
              <Image
                src="/brand/bridge-hive-logo-v2-64.png"
                alt=""
                width={25}
                height={25}
              />
            </span>
            <span />
            <span />
            <span className="is-active" />
            <span />
          </aside>
          <div className="m-org-mock-main">
            <div className="m-org-mock-kpis">
              {KPIS.map((kpi, index) => (
                <article
                  key={kpi.label}
                  style={{ '--m-kpi-i': index } as CSSProperties}
                >
                  <p>{kpi.label}</p>
                  <KpiValue target={kpi.value} active={live} />
                </article>
              ))}
            </div>
            <div className="m-org-mock-body">
              <div className="m-org-mock-chart">
                <p>
                  Shift activity
                  <span className="m-org-mock-live-dot" />
                  <span className="m-org-mock-live-label">Live</span>
                </p>
                <div className="m-org-mock-bars">
                  {BARS.map((height, index) => (
                    <i
                      key={height + index}
                      style={
                        {
                          '--m-bar-h': `${height}%`,
                          '--m-bar-i': index,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
              </div>
              <div className="m-org-mock-list">
                <p>Upcoming shifts</p>
                <ul>
                  {SHIFTS.map((shift, index) => (
                    <li
                      key={shift.role}
                      style={{ '--m-list-i': index } as CSSProperties}
                    >
                      <span>{shift.role}</span>
                      <em>{shift.ward}</em>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="m-org-mock-float">
          <p>Verified workers</p>
          <FloatValue active={live} />
          <div className="m-org-mock-avatars">
            <span />
            <span />
            <span />
          </div>
          <span className="m-org-mock-float-pulse" />
        </div>
      </div>

      <p className="m-org-mock-caption">Illustrative workspace motif · not live data</p>
    </div>
  );
}
