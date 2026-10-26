import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  MapPin,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

import { OrgDashboardMock } from '@/components/marketing/OrgDashboardMock';
import { Reveal } from '@/components/marketing/Reveal';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';

type OrgWorkspaceSectionProps = {
  organizations: MarketingDictionary['organizations'];
};

export function OrgWorkspaceSection({ organizations }: OrgWorkspaceSectionProps) {
  const features: Array<{
    icon: LucideIcon;
    tone: 'teal' | 'honey';
    title: string;
    body: string;
  }> = [
    {
      icon: MapPin,
      tone: 'teal',
      title: organizations.feat1Title,
      body: organizations.feat1Body,
    },
    {
      icon: CalendarDays,
      tone: 'honey',
      title: organizations.feat2Title,
      body: organizations.feat2Body,
    },
    {
      icon: ShieldCheck,
      tone: 'teal',
      title: organizations.feat3Title,
      body: organizations.feat3Body,
    },
    {
      icon: BarChart3,
      tone: 'honey',
      title: organizations.feat4Title,
      body: organizations.feat4Body,
    },
    {
      icon: ClipboardList,
      tone: 'teal',
      title: organizations.feat5Title,
      body: organizations.feat5Body,
    },
    {
      icon: CheckCircle2,
      tone: 'honey',
      title: organizations.feat6Title,
      body: organizations.feat6Body,
    },
  ];

  return (
    <div className="m-org-workspace">
      <div className="m-org-workspace-intro">
        <Reveal>
          <p className="m-eyebrow">{organizations.workspaceEyebrow}</p>
          <h2 className="m-org-workspace-title">
            {organizations.workspaceTitlePrefix}{' '}
            <span className="m-org-workspace-accent">
              {organizations.workspaceTitleAccent}
            </span>
          </h2>
          <p className="m-lede m-org-workspace-lede">{organizations.workspaceLede}</p>
        </Reveal>

        <Reveal delay={80}>
          <OrgDashboardMock
            labels={{
              kpiTotalShifts: organizations.workspaceKpiTotalShifts,
              kpiWorkers: organizations.workspaceKpiWorkers,
              kpiOpenPositions: organizations.workspaceKpiOpenPositions,
              shiftActivity: organizations.workspaceShiftActivity,
              live: organizations.workspaceLive,
              upcomingShifts: organizations.workspaceUpcomingShifts,
              verifiedWorkers: organizations.workspaceVerifiedWorkers,
              caption: organizations.workspaceDashboardCaption,
            }}
          />
        </Reveal>
      </div>

      <ul className="m-org-card-grid">
        {features.map((feature, index) => {
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
