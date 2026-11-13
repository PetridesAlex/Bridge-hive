import { WORKER_APP_LOGIN_DEEP_LINK } from '@bridge-hive/domain';
import { ArrowRight, Check, Smartphone } from 'lucide-react';
import Link from 'next/link';

import {
  secureAuthPrimaryClass,
  secureAuthSecondaryClass,
} from '@/components/auth/secure-auth-shell';

export type WorkerAppContinueVariant =
  | 'signup-confirmed'
  | 'password-updated'
  | 'neutral';

type StepState = 'done' | 'current' | 'next';

type ContinueStep = {
  label: string;
  detail: string;
  state: StepState;
};

const STEPS: Record<WorkerAppContinueVariant, ContinueStep[]> = {
  'signup-confirmed': [
    {
      label: 'Email confirmed',
      detail: 'This address is verified.',
      state: 'done',
    },
    {
      label: 'Open the worker app',
      detail: 'Continue on your phone.',
      state: 'current',
    },
    {
      label: 'Account Setup',
      detail: 'Submit your verification documents.',
      state: 'next',
    },
  ],
  'password-updated': [
    {
      label: 'Password updated',
      detail: 'Your new password is saved.',
      state: 'done',
    },
    {
      label: 'Open the worker app',
      detail: 'Sign in on your phone.',
      state: 'current',
    },
    {
      label: 'Continue in the app',
      detail: 'Pick up where you left off.',
      state: 'next',
    },
  ],
  neutral: [
    {
      label: 'Open the worker app',
      detail: 'Use the Bridge Hive app on your phone.',
      state: 'current',
    },
    {
      label: 'Sign in',
      detail: 'Use the same email you registered with.',
      state: 'next',
    },
    {
      label: 'Account Setup',
      detail: 'Finish verification inside the app.',
      state: 'next',
    },
  ],
};

const STEP_DELAY = [
  'bh-fade-up-delay-1',
  'bh-fade-up-delay-2',
  'bh-fade-up-delay-3',
] as const;

/**
 * Post-email web continuation for workers. Never embeds OTPs or session tokens in URLs.
 */
export function WorkerAppContinuePanel({
  variant,
}: {
  variant: WorkerAppContinueVariant;
}) {
  const confirmed = variant === 'signup-confirmed';
  const title =
    variant === 'signup-confirmed'
      ? 'Your worker email is confirmed'
      : variant === 'password-updated'
        ? 'Your password was updated'
        : 'Sign in with the Bridge Hive worker app';

  const body =
    variant === 'signup-confirmed'
      ? 'You can now sign in on your phone to continue Account Setup and submit verification documents. This page is for workers — not organization administrators.'
      : variant === 'password-updated'
        ? 'Sign in on your phone with your new password to continue in the worker app.'
        : 'Organization administrators sign in on the web dashboard. Workers use the Bridge Hive mobile app. Open the app on your device to sign in or finish Account Setup.';

  const steps = STEPS[variant];

  return (
    <div className="space-y-5">
      <div className="bh-fade-up rounded-2xl border border-bh-border bg-[linear-gradient(180deg,#f7fbfc_0%,#ffffff_70%)] px-4 py-3.5">
        <p
          className={
            confirmed
              ? 'inline-flex items-center gap-2 text-sm font-semibold text-emerald-800'
              : 'inline-flex items-center gap-2 text-sm font-semibold text-bh-text'
          }
        >
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span
              className={
                confirmed
                  ? 'absolute inline-flex h-full w-full rounded-full bg-emerald-400/70 bh-soft-pulse'
                  : 'absolute inline-flex h-full w-full rounded-full bg-bh-teal/50 bh-soft-pulse'
              }
            />
            <span
              className={
                confirmed
                  ? 'relative m-auto h-2 w-2 rounded-full bg-emerald-600'
                  : 'relative m-auto h-2 w-2 rounded-full bg-bh-teal-strong'
              }
            />
          </span>
          {title}
        </p>
        <p className="mt-2 text-sm leading-6 text-bh-text-secondary">{body}</p>
      </div>

      <ol className="space-y-0">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className={`relative flex gap-3 pb-4 last:pb-0 ${STEP_DELAY[index] ?? ''}`}
          >
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className="absolute bottom-0 left-[15px] top-8 w-px bg-gradient-to-b from-bh-teal/40 to-bh-border"
              />
            ) : null}
            <StepMark index={index} state={step.state} />
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold tracking-tight text-bh-text">
                {step.label}
              </p>
              <p className="text-xs leading-5 text-bh-text-secondary">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2.5 pt-1">
        <a href={WORKER_APP_LOGIN_DEEP_LINK} className={secureAuthPrimaryClass}>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent bh-btn-shine"
          />
          <Smartphone className="relative h-4 w-4" aria-hidden />
          <span className="relative">Open Bridge Hive worker app</span>
          <ArrowRight
            className="relative h-4 w-4 transition group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </a>
        <p className="rounded-2xl bg-bh-subtle px-4 py-3 text-xs leading-5 text-bh-text-secondary ring-1 ring-bh-border">
          If the app does not open, return to this page on your phone and use Open Bridge Hive
          worker app again, or ask your organization admin for the current worker-app install
          instructions. Then sign in with the same email you used to register.
        </p>
        <Link href="/" className={secureAuthSecondaryClass}>
          Back to Bridge Hive home
        </Link>
      </div>
    </div>
  );
}

function StepMark({ index, state }: { index: number; state: StepState }) {
  if (state === 'done') {
    return (
      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_8px_16px_rgba(5,150,105,0.28)]">
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
      </span>
    );
  }

  if (state === 'current') {
    return (
      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bh-sidebar text-xs font-bold text-bh-honey shadow-[0_8px_16px_rgba(7,29,48,0.22)] ring-4 ring-bh-teal/15">
        {index + 1}
      </span>
    );
  }

  return (
    <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bh-border bg-white text-xs font-semibold text-bh-text-secondary">
      {index + 1}
    </span>
  );
}
