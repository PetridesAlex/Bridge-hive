'use client';

import { WORKER_RECOVERY_PASSWORD_MIN_LENGTH } from '@bridge-hive/domain';
import { ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useMemo, useState } from 'react';

import {
  updateWorkerRecoveryPasswordAction,
  type UpdateWorkerRecoveryPasswordState,
} from '@/app/auth/worker/reset-password/actions';
import { AuthPasswordField } from '@/components/auth/AuthPasswordField';
import { AuthFooterLink, AuthShell } from '@/components/auth/AuthShell';

const initial: UpdateWorkerRecoveryPasswordState = {};

const WORKER_SIGN_IN_HREF = '/auth/worker/login';
const WORKER_FORGOT_DEEP_LINK = 'bridgehive://auth/worker/forgot-password';

type ReqState = 'idle' | 'ok' | 'bad';

function PasswordRequirementRow({
  label,
  state,
}: {
  label: string;
  state: ReqState;
}) {
  return (
    <div className={`auth-req-row auth-req-row--${state}`} role="status">
      <span className="auth-req-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function isInvalidRecoveryError(message?: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('no longer valid') ||
    lower.includes('expired') ||
    lower.includes('invalid') ||
    lower.includes('request a new')
  );
}

function SupportFooter() {
  return (
    <>
      <div className="auth-footer-support">
        <p className="auth-footer-kicker">Need help?</p>
        <a className="auth-footer-mail" href="mailto:support@bridgehive.app">
          support@bridgehive.app
        </a>
      </div>
      <nav className="auth-footer-nav" aria-label="Password recovery help">
        <AuthFooterLink href={WORKER_SIGN_IN_HREF}>Back to sign in</AuthFooterLink>
      </nav>
    </>
  );
}

/**
 * Worker password update after recovery OTP (via /auth/confirm next path).
 * GET never verifies OTP or updates auth state — only the POST server action does.
 * Does not route workers into organization activation.
 */
export function WorkerResetPasswordClient({
  recoverySessionValid,
}: {
  recoverySessionValid: boolean;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [view, setView] = useState<'form' | 'success' | 'invalid'>(
    recoverySessionValid ? 'form' : 'invalid',
  );
  const [state, formAction, pending] = useActionState(
    updateWorkerRecoveryPasswordAction,
    initial,
  );

  useEffect(() => {
    if (state.done) {
      setPassword('');
      setConfirm('');
      setView('success');
    } else if (state.error && isInvalidRecoveryError(state.error)) {
      setView('invalid');
    }
  }, [state.done, state.error]);

  const lengthState: ReqState = useMemo(() => {
    if (!password) return 'idle';
    return password.length >= WORKER_RECOVERY_PASSWORD_MIN_LENGTH ? 'ok' : 'bad';
  }, [password]);

  const matchState: ReqState = useMemo(() => {
    if (!confirm) return 'idle';
    return password === confirm ? 'ok' : 'bad';
  }, [password, confirm]);

  if (view === 'success') {
    return (
      <AuthShell
        variant="organization"
        formWidth="wide"
        eyebrow="SECURE ACCOUNT RECOVERY"
        title="Password updated"
        description="Your Bridge Hive worker password was updated. Sign in again with your new password."
        footer={<SupportFooter />}
      >
        <div className="auth-state-panel">
          <span className="auth-state-icon" aria-hidden="true">
            <CheckCircle2 size={28} strokeWidth={2} />
          </span>
          <Link href={WORKER_SIGN_IN_HREF} className="auth-submit">
            Continue to sign in
            <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (view === 'invalid') {
    return (
      <AuthShell
        variant="organization"
        formWidth="wide"
        eyebrow="SECURE ACCOUNT RECOVERY"
        title="Reset link unavailable"
        description="This reset link is no longer available. Request a new one from the Bridge Hive worker app, then open the fresh email on this device."
        footer={<SupportFooter />}
      >
        <div className="auth-state-panel">
          <span className="auth-state-icon auth-state-icon--warn" aria-hidden="true">
            <ShieldAlert size={28} strokeWidth={2} />
          </span>
          <a href={WORKER_FORGOT_DEEP_LINK} className="auth-submit">
            Request a new reset link
            <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
          </a>
          <Link href={WORKER_SIGN_IN_HREF} className="auth-secondary">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      variant="organization"
      formWidth="wide"
      eyebrow="SECURE ACCOUNT RECOVERY"
      title="Set a new password"
      description={`Choose a new password for your Bridge Hive worker account. Use at least ${WORKER_RECOVERY_PASSWORD_MIN_LENGTH} characters.`}
      footer={<SupportFooter />}
    >
      <form action={formAction} className="auth-form">
        <div className="auth-field-delay-1">
          <AuthPasswordField
            id="worker-recovery-password"
            name="password"
            label="New password"
            autoComplete="new-password"
            placeholder="Create a new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={WORKER_RECOVERY_PASSWORD_MIN_LENGTH}
          />
        </div>

        <div className="auth-field-delay-2">
          <AuthPasswordField
            id="worker-recovery-confirm"
            name="confirm"
            label="Confirm password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={WORKER_RECOVERY_PASSWORD_MIN_LENGTH}
          />
        </div>

        <div className="auth-req-list" aria-live="polite">
          <PasswordRequirementRow
            label={`At least ${WORKER_RECOVERY_PASSWORD_MIN_LENGTH} characters`}
            state={lengthState}
          />
          <PasswordRequirementRow label="Passwords match" state={matchState} />
        </div>

        {state.error && !isInvalidRecoveryError(state.error) ? (
          <p className="auth-error" role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="auth-submit"
          aria-busy={pending}
        >
          {pending ? (
            <span className="auth-submit-pending">
              <span className="auth-submit-spinner" aria-hidden="true" />
              Updating…
            </span>
          ) : (
            <>
              Update password
              <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
            </>
          )}
        </button>

        <Link href={WORKER_SIGN_IN_HREF} className="auth-secondary">
          Back to sign in
        </Link>
      </form>
    </AuthShell>
  );
}
