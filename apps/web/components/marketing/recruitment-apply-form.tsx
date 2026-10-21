'use client';

import {
  RECRUITMENT_APPLY_STEPS,
  RECRUITMENT_CONSENT_PLACEHOLDER,
  RECRUITMENT_EMPLOYMENT_TYPE_LABELS,
  RECRUITMENT_SUCCESS_MESSAGE,
  WORKER_ROLES,
  WORKER_ROLE_LABELS,
  emptyRecruitmentApplicationDraft,
  isRecruitmentWorkerRole,
  recruitmentApplicationDocumentRequirements,
  recruitmentDocumentRequirementsForRole,
  recruitmentRoleLabel,
  validateRecruitmentConsentStep,
  validateRecruitmentPersonalStep,
  validateRecruitmentPreferencesStep,
  type RecruitmentApplicationDraft,
  type RecruitmentStepId,
  type WorkerRole,
} from '@bridge-hive/domain';
import { useActionState, useMemo, useState, useTransition } from 'react';

import {
  submitRecruitmentApplicationAction,
  type RecruitmentSubmitState,
} from '@/app/actions/recruitment-application';
import { ResidenceFlag } from '@/components/marketing/residence-flags';

const initial: RecruitmentSubmitState = {};

const RESIDENCE_COUNTRIES = [
  { value: 'Cyprus', label: 'Cyprus' },
  { value: 'Greece', label: 'Greece' },
] as const;

type PendingFile = {
  credentialType: string;
  file: File;
  expiresAt: string;
};

export function RecruitmentApplyForm() {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<RecruitmentApplicationDraft>(
    emptyRecruitmentApplicationDraft,
  );
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    submitRecruitmentApplicationAction,
    initial,
  );
  const [isPending, startTransition] = useTransition();

  const step = RECRUITMENT_APPLY_STEPS[stepIndex]!;
  const busy = pending || isPending;

  const docReqs = useMemo(() => {
    if (isRecruitmentWorkerRole(draft.role)) {
      return recruitmentDocumentRequirementsForRole(draft.role);
    }
    return recruitmentApplicationDocumentRequirements();
  }, [draft.role]);

  function update<K extends keyof RecruitmentApplicationDraft>(
    key: K,
    value: RecruitmentApplicationDraft[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setLocalError(null);
  }

  function validateCurrent(): string | null {
    switch (step.id as RecruitmentStepId) {
      case 'personal':
        return validateRecruitmentPersonalStep(draft);
      case 'preferences':
        return validateRecruitmentPreferencesStep(draft);
      case 'documents': {
        const missing = docReqs.filter(
          (req) =>
            req.isRequired &&
            !files.some((f) => f.credentialType === req.credentialType),
        );
        if (missing.length > 0) {
          return `Add required document: ${missing[0]!.label}.`;
        }
        for (const req of docReqs) {
          if (!req.requiresExpiry) continue;
          const match = files.find(
            (f) => f.credentialType === req.credentialType,
          );
          if (match && !match.expiresAt) {
            return `Enter an expiry date for ${req.label}.`;
          }
        }
        return null;
      }
      case 'consent':
        return validateRecruitmentConsentStep(draft);
      default:
        return null;
    }
  }

  function goNext() {
    const error = validateCurrent();
    if (error) {
      setLocalError(error);
      return;
    }
    setLocalError(null);
    setStepIndex((i) => Math.min(i + 1, RECRUITMENT_APPLY_STEPS.length - 1));
  }

  function goBack() {
    setLocalError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function onSubmitFinal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const error = validateCurrent();
    if (error) {
      setLocalError(error);
      return;
    }
    const fd = new FormData();
    Object.entries(draft).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        fd.set(key, value ? 'true' : 'false');
      } else {
        fd.set(key, String(value ?? ''));
      }
    });
    for (const item of files) {
      fd.append('documents', item.file);
      fd.append('documentTypes', item.credentialType);
      if (item.expiresAt) {
        fd.set(`expiresAt:${item.credentialType}`, item.expiresAt);
      }
    }
    startTransition(() => {
      formAction(fd);
    });
  }

  if (state.success) {
    return (
      <div className="rounded-[1.35rem] border border-[color:var(--m-line)] bg-white p-6 shadow-[0_12px_40px_rgba(11,32,50,0.06)] sm:p-8">
        <p className="m-eyebrow">Application received</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-[color:var(--m-navy)]">
          {state.message ?? RECRUITMENT_SUCCESS_MESSAGE}
        </h2>
        <p className="m-lede mt-3">
          Bridge Hive will review your profile. This does not guarantee employment or
          contact from an organization.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.35rem] border border-[color:var(--m-line)] bg-white p-5 shadow-[0_12px_40px_rgba(11,32,50,0.06)] sm:p-8">
      <nav
        aria-label="Application steps"
        className="m-apply-steps"
        style={{
          ['--m-apply-count' as string]: RECRUITMENT_APPLY_STEPS.length,
          ['--m-apply-progress' as string]:
            RECRUITMENT_APPLY_STEPS.length > 1
              ? stepIndex / (RECRUITMENT_APPLY_STEPS.length - 1)
              : 0,
        }}
      >
        <div className="m-apply-track" aria-hidden="true">
          <span className="m-apply-track-fill" />
        </div>
        <ol>
          {RECRUITMENT_APPLY_STEPS.map((s, index) => {
            const status =
              index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'upcoming';
            return (
              <li
                key={s.id}
                className={`m-apply-step is-${status}`}
                aria-current={status === 'current' ? 'step' : undefined}
              >
                <span className="m-apply-step-mark" aria-hidden="true">
                  {status === 'done' ? (
                    <svg viewBox="0 0 16 16" className="m-apply-step-check">
                      <path
                        d="M3.4 8.2 6.3 11.1 12.6 4.8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="m-apply-step-label">{s.title}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--m-navy)]">
          {step.title}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--m-muted)]">{step.description}</p>
      </header>

      <form onSubmit={onSubmitFinal} className="space-y-4" noValidate>
        {step.id === 'personal' ? (
          <>
            <Field
              label="Full name"
              value={draft.fullName}
              onChange={(v) => update('fullName', v)}
              autoComplete="name"
              required
            />
            <Field
              label="Email"
              type="email"
              value={draft.email}
              onChange={(v) => update('email', v)}
              autoComplete="email"
              required
            />
            <Field
              label="Phone"
              type="tel"
              value={draft.phone}
              onChange={(v) => update('phone', v)}
              autoComplete="tel"
              required
            />
            <Field
              label="Current location"
              value={draft.currentLocation}
              onChange={(v) => update('currentLocation', v)}
              autoComplete="address-level2"
              required
            />
            <fieldset>
              <legend className="block text-sm font-medium text-[color:var(--m-navy)]">
                Country of residence
              </legend>
              <div
                role="radiogroup"
                aria-label="Country of residence"
                className="mt-1.5 grid grid-cols-2 overflow-hidden rounded-xl border border-[color:var(--m-line)] bg-[color:var(--m-porcelain)]"
              >
                {RESIDENCE_COUNTRIES.map((country) => {
                  const selected = draft.countryOfResidence === country.value;
                  return (
                    <button
                      key={country.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                        selected
                          ? 'bg-[color:var(--m-navy)] text-white'
                          : 'text-[color:var(--m-navy)] hover:bg-white'
                      }`}
                      onClick={() => update('countryOfResidence', country.value)}
                    >
                      <ResidenceFlag country={country.value} />
                      {country.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Field
              label="Preferred Cyprus location (optional)"
              value={draft.preferredCyprusLocation}
              onChange={(v) => update('preferredCyprusLocation', v)}
            />
          </>
        ) : null}

        {step.id === 'preferences' ? (
          <>
            <label className="block text-sm font-medium text-[color:var(--m-navy)]">
              Professional role
              <select
                className="mt-1.5 w-full rounded-xl border border-[color:var(--m-line)] bg-[color:var(--m-porcelain)] px-3 py-2.5 text-sm"
                value={draft.role}
                onChange={(e) => {
                  const next = e.target.value as WorkerRole | '';
                  update('role', next);
                  setFiles([]);
                }}
                required
              >
                <option value="">Select a role</option>
                {WORKER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {WORKER_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-[color:var(--m-navy)]">
              Employment type
              <select
                className="mt-1.5 w-full rounded-xl border border-[color:var(--m-line)] bg-[color:var(--m-porcelain)] px-3 py-2.5 text-sm"
                value={draft.employmentType || 'full_time'}
                onChange={(e) =>
                  update(
                    'employmentType',
                    e.target.value as RecruitmentApplicationDraft['employmentType'],
                  )
                }
                required
              >
                <option value="full_time">
                  {RECRUITMENT_EMPLOYMENT_TYPE_LABELS.full_time}
                </option>
              </select>
            </label>
            <Field
              label="Preferred healthcare environments"
              value={draft.preferredEnvironments}
              onChange={(v) => update('preferredEnvironments', v)}
            />
            <Field
              label="Areas of interest"
              value={draft.areasOfInterest}
              onChange={(v) => update('areasOfInterest', v)}
            />
          </>
        ) : null}

        {step.id === 'documents' ? (
          <div className="space-y-4">
            <p className="text-sm text-[color:var(--m-muted)]">
              Uploads are stored privately. PDF, JPEG, or PNG — max 10 MB each.
              Required documents depend on your selected role.
            </p>
            {docReqs.map((req) => {
              const current = files.find(
                (f) => f.credentialType === req.credentialType,
              );
              return (
                <div
                  key={req.credentialType}
                  className="rounded-xl border border-[color:var(--m-line)] bg-[color:var(--m-porcelain)] p-4"
                >
                  <label className="block text-sm font-medium text-[color:var(--m-navy)]">
                    {req.label}
                    {req.isRequired ? ' *' : ' (optional)'}
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png"
                      className="mt-2 block w-full text-sm"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setFiles((prev) => [
                          ...prev.filter(
                            (f) => f.credentialType !== req.credentialType,
                          ),
                          {
                            credentialType: req.credentialType,
                            file,
                            expiresAt: current?.expiresAt ?? '',
                          },
                        ]);
                        setLocalError(null);
                      }}
                    />
                  </label>
                  {current ? (
                    <p className="mt-2 text-xs text-[color:var(--m-muted)]">
                      Selected: {current.file.name}
                    </p>
                  ) : null}
                  {req.requiresExpiry ? (
                    <label className="mt-3 block text-sm font-medium text-[color:var(--m-navy)]">
                      Expiry date
                      <input
                        type="date"
                        className="mt-1.5 w-full rounded-xl border border-[color:var(--m-line)] bg-white px-3 py-2 text-sm"
                        value={current?.expiresAt ?? ''}
                        onChange={(e) => {
                          setFiles((prev) => {
                            const existing = prev.find(
                              (f) => f.credentialType === req.credentialType,
                            );
                            if (!existing) return prev;
                            return prev.map((f) =>
                              f.credentialType === req.credentialType
                                ? { ...f, expiresAt: e.target.value }
                                : f,
                            );
                          });
                        }}
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {step.id === 'consent' ? (
          <div className="space-y-4">
            <dl className="grid gap-2 rounded-xl border border-[color:var(--m-line)] bg-[color:var(--m-porcelain)] p-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--m-muted)]">Name</dt>
                <dd className="font-medium text-[color:var(--m-navy)]">
                  {draft.fullName}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--m-muted)]">Email</dt>
                <dd className="font-medium text-[color:var(--m-navy)]">
                  {draft.email.replace(/(.{2}).+(@.+)/, '$1•••$2')}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--m-muted)]">Location</dt>
                <dd className="font-medium text-[color:var(--m-navy)]">
                  {draft.currentLocation}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--m-muted)]">Role</dt>
                <dd className="font-medium text-[color:var(--m-navy)]">
                  {isRecruitmentWorkerRole(draft.role)
                    ? recruitmentRoleLabel(draft.role)
                    : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--m-muted)]">Documents</dt>
                <dd className="font-medium text-[color:var(--m-navy)]">
                  {files.length} file{files.length === 1 ? '' : 's'}
                </dd>
              </div>
            </dl>
            <label className="flex items-start gap-3 rounded-xl border border-[color:var(--m-line)] p-4 text-sm leading-6 text-[color:var(--m-navy)]">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={draft.consentAccepted}
                onChange={(e) => update('consentAccepted', e.target.checked)}
              />
              <span>{RECRUITMENT_CONSENT_PLACEHOLDER}</span>
            </label>
            <p className="text-xs text-[color:var(--m-muted)]">
              Consent wording is a draft pending legal review and is not a claim of
              regulatory compliance.
            </p>
          </div>
        ) : null}

        {(localError || state.error) && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {localError ?? state.error}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          {stepIndex > 0 ? (
            <button
              type="button"
              className="m-btn m-btn--secondary"
              onClick={goBack}
              disabled={busy}
            >
              Back
            </button>
          ) : null}
          {step.id !== 'consent' ? (
            <button
              type="button"
              className="m-btn m-btn--primary"
              onClick={goNext}
              disabled={busy}
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              className="m-btn m-btn--primary"
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? 'Submitting…' : 'Submit talent profile'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-medium text-[color:var(--m-navy)]">
      {label}
      <input
        type={type}
        className="mt-1.5 w-full rounded-xl border border-[color:var(--m-line)] bg-[color:var(--m-porcelain)] px-3 py-2.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
      />
    </label>
  );
}
