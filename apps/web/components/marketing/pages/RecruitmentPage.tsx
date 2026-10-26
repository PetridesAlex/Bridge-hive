import {
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  Lock,
  Send,
  Smartphone,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

import { MarketingFlowShell } from '@/components/marketing/MarketingFlowShell';
import { Reveal } from '@/components/marketing/Reveal';
import {
  MarketingButton,
  Section,
  SectionHeading,
} from '@/components/marketing/Section';
import { getDictionary } from '@/lib/marketing-i18n/get-dictionary';
import { localizePath, type MarketingLocale } from '@/lib/marketing-i18n';

export function RecruitmentPage({ locale }: { locale: MarketingLocale }) {
  const d = getDictionary(locale);
  const r = d.recruitment;

  const professionalPoints: Array<{
    icon: LucideIcon;
    label: string;
    tone: 'teal' | 'honey';
  }> = [
    { icon: Smartphone, label: r.proPointMobile, tone: 'teal' },
    { icon: ClipboardList, label: r.proPointChecklist, tone: 'honey' },
    { icon: Lock, label: r.proPointPrivateStorage, tone: 'teal' },
  ];

  const steps: Array<{
    step: string;
    title: string;
    body: string;
    icon: LucideIcon;
    tone: 'teal' | 'honey' | 'navy';
  }> = [
    {
      step: r.step1Index,
      title: r.step1Title,
      body: r.step1Body,
      icon: Send,
      tone: 'teal',
    },
    {
      step: r.step2Index,
      title: r.step2Title,
      body: r.step2Body,
      icon: ClipboardCheck,
      tone: 'honey',
    },
    {
      step: r.step3Index,
      title: r.step3Title,
      body: r.step3Body,
      icon: UsersRound,
      tone: 'navy',
    },
  ];

  const orgPortalHref = `${localizePath('/sign-in', locale)}?next=${encodeURIComponent(
    '/organisation/recruitment',
  )}`;

  return (
    <>
      <Section band="dark" className="!pb-10">
        <Reveal>
          <p className="m-eyebrow">{r.heroEyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-[length:var(--m-display)] font-extrabold tracking-tight text-white">
            {r.heroTitle}
          </h1>
          <p className="m-lede mt-5 max-w-2xl !text-[rgba(220,232,238,0.78)]">
            {r.heroLede}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <MarketingButton
              href={localizePath('/recruitment/apply', locale)}
              variant="on-dark"
            >
              {r.heroPrimaryCta}
            </MarketingButton>
            <MarketingButton href={orgPortalHref} variant="on-dark-secondary">
              {r.heroSecondaryCta}
            </MarketingButton>
          </div>
        </Reveal>
      </Section>

      <MarketingFlowShell>
        <Section band="porcelain" className="m-flow-band">
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal>
              <article className="m-rec-pro-card rounded-[1.35rem] border border-[color:var(--m-line)] bg-white p-6 shadow-[0_12px_40px_rgba(11,32,50,0.06)] sm:p-8">
                <p className="m-eyebrow">{r.proCardEyebrow}</p>
                <h2 className="mt-3 text-[length:var(--m-title)] font-bold tracking-tight text-[color:var(--m-navy)]">
                  {r.proCardTitle}
                </h2>
                <p className="m-lede mt-3">{r.proCardBody}</p>
                <ul className="m-rec-pro-list">
                  {professionalPoints.map(({ icon: Icon, label, tone }, index) => (
                    <li
                      key={label}
                      className="m-rec-pro-item"
                      style={{ ['--m-rec-i' as string]: index }}
                    >
                      <span
                        className={`m-rec-pro-check m-rec-pro-check--${tone}`}
                        aria-hidden="true"
                      >
                        <Icon size={14} strokeWidth={2.4} />
                      </span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  <MarketingButton
                    href={localizePath('/recruitment/apply', locale)}
                    variant="primary"
                    className="m-rec-pro-cta"
                  >
                    {r.proCardCta}
                    <ArrowRight
                      className="m-rec-pro-cta-arrow"
                      size={16}
                      strokeWidth={2.3}
                      aria-hidden="true"
                    />
                  </MarketingButton>
                </div>
              </article>
            </Reveal>

            <Reveal>
              <article className="rounded-[1.35rem] border border-[color:var(--m-line)] bg-[color:var(--m-navy)] p-6 text-white shadow-[0_12px_40px_rgba(11,32,50,0.18)] sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--m-honey)]">
                  {r.orgCardEyebrow}
                </p>
                <h2 className="mt-3 text-[length:var(--m-title)] font-bold tracking-tight">
                  {r.orgCardTitle}
                </h2>
                <p className="mt-3 text-[15px] leading-7 text-[rgba(220,232,238,0.78)]">
                  {r.orgCardBody}
                </p>
                <ul className="mt-5 space-y-2 text-sm leading-6 text-[rgba(220,232,238,0.65)]">
                  <li>{r.orgBullet1}</li>
                  <li>{r.orgBullet2}</li>
                  <li>{r.orgBullet3}</li>
                </ul>
                <div className="mt-7 flex flex-wrap gap-3">
                  <MarketingButton href={orgPortalHref} variant="on-dark">
                    {r.orgCardPrimaryCta}
                  </MarketingButton>
                  <MarketingButton
                    href={localizePath('/contact#partnerships', locale)}
                    variant="on-dark-secondary"
                  >
                    {r.orgCardSecondaryCta}
                  </MarketingButton>
                </div>
              </article>
            </Reveal>
          </div>
        </Section>

        <Section band="porcelain" className="m-flow-band">
          <SectionHeading
            eyebrow={r.hiwEyebrow}
            title={r.hiwTitle}
            lede={r.hiwLede}
          />
          <div className="m-rec-steps mt-10 grid gap-4 sm:grid-cols-3">
            {steps.map(({ step, title, body, icon: Icon, tone }, index) => (
              <Reveal key={step}>
                <article
                  className={`m-rec-step-card m-rec-step-card--${tone}`}
                  style={{ ['--m-rec-step-i' as string]: index }}
                >
                  <div className="m-rec-step-top">
                    <span className="m-rec-step-index" aria-hidden="true">
                      {step}
                    </span>
                    <span className="m-rec-step-icon" aria-hidden="true">
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                  </div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                  {index < steps.length - 1 ? (
                    <span className="m-rec-step-connector" aria-hidden="true">
                      <ArrowRight size={14} strokeWidth={2.4} />
                    </span>
                  ) : null}
                </article>
              </Reveal>
            ))}
          </div>
        </Section>
      </MarketingFlowShell>
    </>
  );
}
