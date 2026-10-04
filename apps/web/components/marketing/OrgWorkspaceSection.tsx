import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

import { Reveal } from '@/components/marketing/Reveal';

const FEATURES = [
  {
    icon: MapPin,
    tone: 'teal' as const,
    title: 'Locations and wards',
    body: 'Model where care is delivered so openings map to the right clinical context.',
  },
  {
    icon: CalendarDays,
    tone: 'honey' as const,
    title: 'Role-specific shifts',
    body: 'Publish openings for registered nurses or ward assistants with schedule and acceptance windows.',
  },
  {
    icon: ShieldCheck,
    tone: 'teal' as const,
    title: 'Verified eligibility',
    body: 'Only workers who complete platform verification and activation can see and accept matching shifts.',
  },
  {
    icon: BarChart3,
    tone: 'honey' as const,
    title: 'Scheduling visibility',
    body: 'Track published openings and assignments as work progresses through the organization workspace.',
  },
  {
    icon: ClipboardList,
    tone: 'teal' as const,
    title: 'Timesheet review',
    body: 'Review completed shifts before closing the operational loop on each assignment.',
  },
  {
    icon: CheckCircle2,
    tone: 'honey' as const,
    title: 'Admin approval first',
    body: 'A platform administrator approves your organization before shift publishing is available.',
  },
];

function DashboardMockup() {
  return (
    <div className="m-org-mock" aria-hidden="true">
      <div className="m-org-mock-blob m-org-mock-blob--teal" />
      <div className="m-org-mock-blob m-org-mock-blob--honey" />

      <div className="m-org-mock-stage">
        <div className="m-org-mock-panel">
          <aside className="m-org-mock-side">
            <span className="m-org-mock-side-mark" />
            <span />
            <span />
            <span className="is-active" />
            <span />
          </aside>
          <div className="m-org-mock-main">
            <div className="m-org-mock-kpis">
              <article>
                <p>Total shifts</p>
                <strong>128</strong>
              </article>
              <article>
                <p>Workers</p>
                <strong>42</strong>
              </article>
              <article>
                <p>Open positions</p>
                <strong>17</strong>
              </article>
            </div>
            <div className="m-org-mock-body">
              <div className="m-org-mock-chart">
                <p>Shift activity</p>
                <div className="m-org-mock-bars">
                  <i style={{ height: '42%' }} />
                  <i style={{ height: '68%' }} />
                  <i style={{ height: '54%' }} />
                  <i style={{ height: '86%' }} />
                  <i style={{ height: '62%' }} />
                  <i style={{ height: '74%' }} />
                </div>
              </div>
              <div className="m-org-mock-list">
                <p>Upcoming shifts</p>
                <ul>
                  <li>
                    <span>RN · Night</span>
                    <em>Ward A</em>
                  </li>
                  <li>
                    <span>WA · Day</span>
                    <em>Ward B</em>
                  </li>
                  <li>
                    <span>RN · Evening</span>
                    <em>ICU</em>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="m-org-mock-float">
          <p>Verified workers</p>
          <strong>24</strong>
          <div className="m-org-mock-avatars">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      <p className="m-org-mock-caption">Illustrative workspace motif · not live data</p>
    </div>
  );
}

export function OrgWorkspaceSection() {
  return (
    <div className="m-org-workspace">
      <div className="m-org-workspace-intro">
        <Reveal>
          <p className="m-eyebrow">Organization workspace</p>
          <h2 className="m-org-workspace-title">
            What you can operate in the{' '}
            <span className="m-org-workspace-accent">dashboard</span>
          </h2>
          <p className="m-lede m-org-workspace-lede">
            The organization workspace covers the staffing workflow from locations
            through timesheet review — with organization isolation after admin approval.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <DashboardMockup />
        </Reveal>
      </div>

      <ul className="m-org-card-grid">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Reveal key={feature.title} delay={index * 50}>
              <li className={`m-org-card m-org-card--${feature.tone}`}>
                <div className="m-org-card-top">
                  <span className="m-org-card-icon" aria-hidden="true">
                    <Icon size={18} strokeWidth={1.85} />
                  </span>
                  <ChevronRight
                    className="m-org-card-chevron"
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </li>
            </Reveal>
          );
        })}
      </ul>
    </div>
  );
}
