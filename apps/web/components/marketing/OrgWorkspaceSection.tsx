import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

import { OrgDashboardMock } from '@/components/marketing/OrgDashboardMock';
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
    body: 'Publish openings for registered nurses, ward assistants, or physiotherapists with schedule and acceptance windows.',
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
          <OrgDashboardMock />
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
                    <Icon size={20} strokeWidth={2.35} />
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
