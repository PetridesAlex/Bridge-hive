'use client';

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';

import {
  activateOrganizationAccountAction,
  type ActivateActionResult,
} from '@/app/actions/organization-activation';
import { secureAuthPrimaryClass } from '@/components/auth/secure-auth-shell';
import { cn } from '@/lib/utils';

const initial: ActivateActionResult = {};

const FIELD =
  'h-12 w-full rounded-xl border border-bh-border/90 bg-bh-subtle/50 pl-11 pr-12 text-sm font-medium text-bh-text outline-none transition placeholder:font-normal placeholder:text-bh-text-muted focus:border-bh-teal focus:bg-white focus:ring-2 focus:ring-bh-teal/20';

export function ActivateOrganizationForm() {
  const [state, formAction, pending] = useActionState(
    activateOrganizationAccountAction,
    initial,
  );
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state.success && state.slug) {
      setDone(true);
    }
  }, [state]);

  if (done && state.slug) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-bh-success/30 bg-gradient-to-br from-bh-success-soft to-bh-surface p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-success text-white shadow-[0_8px_18px_rgba(25,135,84,0.3)]">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold tracking-tight text-bh-text">
              Your account is ready
            </p>
            <p className="mt-1 text-sm leading-6 text-bh-text-secondary">
              Continue to organization setup for{' '}
              {state.displayName ?? 'your organization'}.
            </p>
          </div>
        </div>
        <Link href={`/org/${state.slug}/settings`} className={secureAuthPrimaryClass}>
          <ShineAndArrow label="Continue to organization setup" />
        </Link>
      </div>
    );
  }

  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    {
      label: 'Passwords match',
      ok: confirm.length > 0 && password === confirm,
    },
  ];

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p
          className="rounded-xl border border-bh-danger/30 bg-bh-danger-soft px-3.5 py-2.5 text-sm font-medium text-bh-danger"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <PasswordField
        id="password"
        label="New password"
        value={password}
        onChange={setPassword}
        visible={visible}
        onToggle={() => setVisible((v) => !v)}
      />
      <PasswordField
        id="confirmPassword"
        label="Confirm password"
        value={confirm}
        onChange={setConfirm}
        visible={visible}
        onToggle={() => setVisible((v) => !v)}
      />

      <div className="rounded-2xl border border-bh-border/70 bg-bh-subtle/40 px-4 py-3.5">
        <ul className="space-y-2">
          {checks.map((c) => (
            <li
              key={c.label}
              className={cn(
                'flex items-center gap-2.5 text-[13px] font-medium transition-colors',
                c.ok ? 'text-bh-success' : 'text-bh-text-secondary',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 transition duration-300',
                  c.ok
                    ? 'scale-100 bg-bh-success text-white ring-bh-success'
                    : 'bg-white text-transparent ring-bh-border',
                )}
              >
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </span>
              {c.label}
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-bh-border/70 pt-3 text-xs leading-5 text-bh-text-muted">
          Use a unique password you do not share with anyone. Bridge Hive staff
          will never ask for this password.
        </p>
      </div>

      <button type="submit" disabled={pending} className={secureAuthPrimaryClass}>
        {pending ? (
          <>
            <Loader2 className="relative h-4 w-4 animate-spin" aria-hidden />
            <span className="relative">Activating…</span>
          </>
        ) : (
          <ShineAndArrow label="Activate account" />
        )}
      </button>
    </form>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted"
      >
        {label}
      </label>
      <div className="relative">
        <KeyRound
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-bh-text-muted"
          aria-hidden
        />
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={FIELD}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'Hide passwords' : 'Show passwords'}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-bh-text-muted transition hover:bg-bh-subtle hover:text-bh-text"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

function ShineAndArrow({ label }: { label: string }) {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-full"
      />
      <span className="relative">{label}</span>
      <span
        aria-hidden
        className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition duration-300 group-hover:translate-x-0.5 group-hover:bg-bh-honey group-hover:text-bh-sidebar"
      >
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </>
  );
}
