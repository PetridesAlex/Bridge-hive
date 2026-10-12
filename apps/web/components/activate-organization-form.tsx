'use client';

import {
  activateOrganizationAccountAction,
  type ActivateActionResult,
} from '@/app/actions/organization-activation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getOrgActivationPasswordFeedback,
  ORG_ACTIVATION_MIN_PASSWORD_LENGTH,
} from '@/lib/organization-activation-ui';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useId, useState } from 'react';

const initial: ActivateActionResult = {};

function ActivationPasswordField({
  id,
  name,
  label,
  value,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="org-activation-password-field">
      <Label htmlFor={id}>{label}</Label>
      <div className="org-activation-password-wrap">
        <Input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={ORG_ACTIVATION_MIN_PASSWORD_LENGTH}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11"
        />
        <button
          type="button"
          className="org-activation-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            <EyeOff size={17} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Eye size={17} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

export function ActivateOrganizationForm() {
  const passwordId = useId();
  const confirmId = useId();
  const [state, formAction, pending] = useActionState(
    activateOrganizationAccountAction,
    initial,
  );
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const feedback = getOrgActivationPasswordFeedback(password, confirmPassword);

  useEffect(() => {
    if (state.success && state.slug) {
      setDone(true);
    }
  }, [state]);

  if (done && state.slug) {
    return (
      <div className="space-y-4">
        <div className="org-activation-success" role="status">
          <p className="org-activation-success-title">Your account is ready</p>
          <p className="org-activation-success-body">
            Continue to organization setup for{' '}
            {state.displayName ?? 'your organization'}.
          </p>
        </div>
        <Button asChild className="w-full min-h-11" size="lg">
          <Link href={`/org/${state.slug}/settings`}>
            Continue to organization setup
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p
          className="rounded-xl border border-bh-danger/30 bg-bh-danger-soft/40 px-3 py-2 text-sm text-bh-text"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <ActivationPasswordField
        id={passwordId}
        name="password"
        label="New password"
        value={password}
        onChange={setPassword}
      />
      <ActivationPasswordField
        id={confirmId}
        name="confirmPassword"
        label="Confirm password"
        value={confirmPassword}
        onChange={setConfirmPassword}
      />

      <ul className="org-activation-reqs" aria-live="polite">
        <li
          className="org-activation-req"
          data-met={feedback.lengthMet ? 'true' : 'false'}
        >
          <span className="org-activation-req-mark" aria-hidden="true">
            {feedback.lengthMet ? '✓' : ''}
          </span>
          At least {ORG_ACTIVATION_MIN_PASSWORD_LENGTH} characters
        </li>
        <li
          className="org-activation-req"
          data-met={
            feedback.matchVisible && feedback.matchMet ? 'true' : 'false'
          }
        >
          <span className="org-activation-req-mark" aria-hidden="true">
            {feedback.matchVisible && feedback.matchMet ? '✓' : ''}
          </span>
          Passwords match
        </li>
        <li className="org-activation-req" data-met="false">
          <span className="org-activation-req-mark" aria-hidden="true" />
          Use a unique password you do not share with anyone
        </li>
        <li className="org-activation-req" data-met="false">
          <span className="org-activation-req-mark" aria-hidden="true" />
          Bridge Hive staff will never ask for this password
        </li>
      </ul>

      {feedback.mismatchMessage ? (
        <p className="text-sm text-bh-danger" role="alert">
          {feedback.mismatchMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full min-h-11"
        size="lg"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? 'Activating…' : 'Activate account'}
      </Button>
    </form>
  );
}
