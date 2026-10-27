'use client';

import {
  RECRUITMENT_APPLY_STEPS,
  RECRUITMENT_CONSENT_PLACEHOLDER,
  RECRUITMENT_EMPLOYMENT_TYPE_LABELS,
  RECRUITMENT_SUCCESS_MESSAGE,
  emptyRecruitmentApplicationDraft,
  RECRUITMENT_FILE_ACCEPT,
  recruitmentApplicationDocumentRequirements,
  resolveRecruitmentDocumentExpiresAt,
  resolveRecruitmentUploadMime,
  validateRecruitmentConsentStep,
  validateRecruitmentPersonalStep,
  validateRecruitmentPreferencesStep,
  validateRecruitmentUpload,
  type RecruitmentApplicationDraft,
  type RecruitmentStepId,
} from '@bridge-hive/domain';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import {
  submitRecruitmentApplicationAction,
  type RecruitmentSubmitState,
} from '@/app/actions/recruitment-application';
import { PremiumDatePicker } from '@/components/marketing/premium-date-picker';
import { ResidenceFlag } from '@/components/marketing/residence-flags';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';
import { localizePath } from '@/lib/marketing-i18n';
import type { MarketingLocale } from '@/lib/marketing-i18n/locales';

const initial: RecruitmentSubmitState = {};

const RESIDENCE_COUNTRIES = [
  { value: 'Cyprus', label: 'Cyprus' },
  { value: 'Greece', label: 'Greece' },
] as const;

type PendingFile = {
  credentialType: string;
  file: File;
};

/** Today as YYYY-MM-DD in Cyprus time (the zone the server validates expiry in). */
function todayYmdCyprus(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Nicosia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

type RecruitmentApplyFormProps = {
  locale: MarketingLocale;
  recruitmentApply: MarketingDictionary['recruitmentApply'];
};

/** Map a domain validation message to a localized string with English fallback. */
function translateMessage(
  message: string,
  messageMap: MarketingDictionary['recruitmentApply']['messageMap'],
): string {
  if (!message) return message;
  if (message in messageMap) {
    return (messageMap as Record<string, string>)[message] ?? message;
  }
  const prefixes = [
    'Add required document: ',
    'Enter an expiry date for ',
  ] as const;
  for (const prefix of prefixes) {
    if (message.startsWith(prefix)) {
      const inner = message.slice(prefix.length).replace(/\.$/, '');
      const translatedPrefix =
        (messageMap as Record<string, string>)[`${prefix}${inner}.`] ??
        (messageMap as Record<string, string>)[`${prefix}${inner}`];
      if (translatedPrefix) return translatedPrefix;
      const innerTranslation = (messageMap as Record<string, string>)[inner];
      if (innerTranslation) {
        const basePrefix =
          (messageMap as Record<string, string>)[prefix.trim()] ?? prefix;
        return `${basePrefix}${innerTranslation}.`;
      }
    }
  }
  return message;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type DocumentFieldProps = {
  label: string;
  required: boolean;
  requiresExpiry: boolean;
  file: File | null;
  expiresAt: string;
  expiryError: string | null;
  locale: MarketingLocale;
  strings: MarketingDictionary['recruitmentApply'];
  onFile: (file: File) => void;
  onRemove: () => void;
  onExpiry: (value: string) => void;
};

/** One document row: clear upload button, drag-and-drop, and a filled "uploaded" state. */
function DocumentField({
  label,
  required,
  requiresExpiry,
  file,
  expiresAt,
  expiryError,
  locale,
  strings,
  onFile,
  onRemove,
  onExpiry,
}: DocumentFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const expiryId = useId();
  const minDate = useMemo(() => todayYmdCyprus(), []);
  const [dragging, setDragging] = useState(false);
  const badge = (required ? strings.documentRequired : strings.documentOptional)
    .replace(/[()]/g, '')
    .trim();

  function pick(list: FileList | null) {
    const picked = list?.[0];
    if (picked) onFile(picked);
    // Reset so choosing the same file again (after Remove) still fires.
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div
      className={[
        'm-doc',
        required ? 'is-required' : '',
        file ? 'is-filled' : '',
        dragging ? 'is-dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files);
      }}
    >
      <div className="m-doc-head">
        <span className="m-doc-icon" aria-hidden="true">
          {file ? (
            <CheckCircle2 size={20} strokeWidth={2.2} />
          ) : (
            <FileText size={20} strokeWidth={2} />
          )}
        </span>
        <span className="m-doc-title">{label}</span>
        <span
          className={`m-doc-badge${required ? ' m-doc-badge--required' : ''}`}
        >
          {file ? strings.documentUploaded : badge}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={RECRUITMENT_FILE_ACCEPT}
        className="m-doc-input"
        tabIndex={-1}
        aria-label={label}
        onChange={(e) => pick(e.target.files)}
      />

      {file ? (
        <div className="m-doc-file">
          <span className="m-doc-file-name" title={file.name}>
            {file.name}
          </span>
          <span className="m-doc-file-size">{formatFileSize(file.size)}</span>
          <button
            type="button"
            className="m-doc-action"
            onClick={() => inputRef.current?.click()}
          >
            <RefreshCw size={14} strokeWidth={2.2} aria-hidden="true" />
            {strings.documentReplace}
          </button>
          <button
            type="button"
            className="m-doc-action m-doc-action--danger"
            onClick={onRemove}
            aria-label={`${strings.documentRemove}: ${label}`}
          >
            <X size={14} strokeWidth={2.4} aria-hidden="true" />
            {strings.documentRemove}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="m-doc-upload"
          onClick={() => inputRef.current?.click()}
        >
          <span className="m-doc-upload-btn">
            <Upload size={16} strokeWidth={2.4} aria-hidden="true" />
            {strings.documentUploadCta}
          </span>
          <span className="m-doc-upload-hint">{strings.documentDropHint}</span>
        </button>
      )}

      {requiresExpiry ? (
        <div className={`m-doc-expiry${expiryError ? ' has-error' : ''}`}>
          <label htmlFor={expiryId}>{strings.documentExpiryLabel}</label>
          <PremiumDatePicker
            id={expiryId}
            value={expiresAt}
            onChange={onExpiry}
            locale={locale}
            min={minDate}
            max="2099-12-31"
            invalid={Boolean(expiryError)}
            describedBy={`${expiryId}-hint`}
            labels={{
              placeholder: strings.documentDatePlaceholder,
              today: strings.documentDateToday,
              clear: strings.documentDateClear,
              previousMonth: strings.documentDatePrevious,
              nextMonth: strings.documentDateNext,
              chooseYear: strings.documentDateChooseYear,
              dialog: strings.documentExpiryLabel,
            }}
          />
          <p
            id={`${expiryId}-hint`}
            className={expiryError ? 'm-doc-expiry-error' : 'm-doc-expiry-hint'}
            role={expiryError ? 'alert' : undefined}
          >
            {expiryError ?? strings.documentExpiryHint}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function RecruitmentApplyForm({
  locale,
  recruitmentApply,
}: RecruitmentApplyFormProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<RecruitmentApplicationDraft>(
    emptyRecruitmentApplicationDraft,
  );
  const [files, setFiles] = useState<PendingFile[]>([]);
  // Kept apart from files so a date picked before (or after) choosing a file is never lost.
  const [expiries, setExpiries] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    submitRecruitmentApplicationAction,
    initial,
  );
  const [isPending, startTransition] = useTransition();

  const step = RECRUITMENT_APPLY_STEPS[stepIndex]!;
  const busy = pending || isPending;

  const docReqs = useMemo(
    () => recruitmentApplicationDocumentRequirements(),
    [],
  );

  // Localized step titles / descriptions (positional map to domain step list).
  const stepCopy = [
    {
      title: recruitmentApply.stepPersonalTitle,
      description: recruitmentApply.stepPersonalDescription,
    },
    {
      title: recruitmentApply.stepPreferencesTitle,
      description: recruitmentApply.stepPreferencesDescription,
    },
    {
      title: recruitmentApply.stepDocumentsTitle,
      description: recruitmentApply.stepDocumentsDescription,
    },
    {
      title: recruitmentApply.stepConsentTitle,
      description: recruitmentApply.stepConsentDescription,
    },
  ] as const;

  const currentStepCopy = stepCopy[stepIndex] ?? {
    title: step.title,
    description: step.description,
  };

  function update<K extends keyof RecruitmentApplicationDraft>(
    key: K,
    value: RecruitmentApplicationDraft[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setLocalError(null);
  }

  /** Same rules as the server: required for licence types, must be a valid future date. */
  function expiryErrorFor(credentialType: string, hasFile: boolean): string | null {
    const value = expiries[credentialType] ?? '';
    if (!value && !hasFile) return null;
    const result = resolveRecruitmentDocumentExpiresAt({
      documentType: credentialType,
      expiresAtYmd: value,
    });
    return 'error' in result ? result.error : null;
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
          const hasFile = files.some(
            (f) => f.credentialType === req.credentialType,
          );
          if (!hasFile) continue;
          if (!(expiries[req.credentialType] ?? '')) {
            return `Enter an expiry date for ${req.label}.`;
          }
          const error = expiryErrorFor(req.credentialType, true);
          if (error) return error;
        }
        return null;
      }
      case 'consent':
        return validateRecruitmentConsentStep(draft);
      default:
        return null;
    }
  }

  /** Validate immediately so the applicant fixes it here, not after submit. */
  function acceptFile(credentialType: string, file: File) {
    const check = validateRecruitmentUpload({
      type: resolveRecruitmentUploadMime(file),
      size: file.size,
    });
    if (!check.ok) {
      setLocalError(check.error);
      return;
    }
    setFiles((prev) => [
      ...prev.filter((f) => f.credentialType !== credentialType),
      {
        credentialType,
        file,
      },
    ]);
    setLocalError(null);
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
      const expiry = expiries[item.credentialType];
      if (expiry) {
        fd.set(`expiresAt:${item.credentialType}`, expiry);
      }
    }
    startTransition(() => {
      formAction(fd);
    });
  }

  if (state.success) {
    const reference = state.candidateId
      ? state.candidateId.slice(0, 8).toUpperCase()
      : null;
    return (
      <SubmissionSuccess
        locale={locale}
        strings={recruitmentApply}
        message={
          state.message
            ? translateMessage(state.message, recruitmentApply.messageMap)
            : (recruitmentApply.successMessage ?? RECRUITMENT_SUCCESS_MESSAGE)
        }
        reference={reference}
      />
    );
  }

  const errorRaw = localError ?? state.error ?? null;
  const errorText = errorRaw
    ? translateMessage(errorRaw, recruitmentApply.messageMap)
    : null;

  return (
    <div className="rounded-[1.35rem] border border-[color:var(--m-line)] bg-white p-5 shadow-[0_12px_40px_rgba(11,32,50,0.06)] sm:p-8">
      <nav
        aria-label={recruitmentApply.title}
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
            const label = stepCopy[index]?.title ?? s.title;
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
                <span className="m-apply-step-label">{label}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--m-navy)]">
          {currentStepCopy.title}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--m-muted)]">
          {currentStepCopy.description}
        </p>
      </header>

      <form onSubmit={onSubmitFinal} className="space-y-4" noValidate>
        {step.id === 'personal' ? (
          <>
            <Field
              label={recruitmentApply.fieldFullName}
              value={draft.fullName}
              onChange={(v) => update('fullName', v)}
              autoComplete="name"
              required
            />
            <Field
              label={recruitmentApply.fieldEmail}
              type="email"
              value={draft.email}
              onChange={(v) => update('email', v)}
              autoComplete="email"
              required
            />
            <Field
              label={recruitmentApply.fieldPhone}
              type="tel"
              value={draft.phone}
              onChange={(v) => update('phone', v)}
              autoComplete="tel"
              required
            />
            <fieldset>
              <legend className="block text-sm font-medium text-[color:var(--m-navy)]">
                {recruitmentApply.fieldCountryOfResidence}
              </legend>
              <div
                role="radiogroup"
                aria-label={recruitmentApply.fieldCountryOfResidence}
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
              label={recruitmentApply.fieldPreferredCyprusLocation}
              value={draft.preferredCyprusLocation}
              onChange={(v) => update('preferredCyprusLocation', v)}
            />
          </>
        ) : null}

        {step.id === 'preferences' ? (
          <>
            <label className="block text-sm font-medium text-[color:var(--m-navy)]">
              {recruitmentApply.fieldEmploymentType}
              <select
                className="mt-1.5 w-full rounded-xl border border-[color:var(--m-line)] bg-[color:var(--m-porcelain)] px-3 py-2.5 text-sm"
                value="full_time"
                onChange={() => update('employmentType', 'full_time')}
                required
              >
                <option value="full_time">
                  {recruitmentApply.employmentTypeFullTime ??
                    RECRUITMENT_EMPLOYMENT_TYPE_LABELS.full_time}
                </option>
              </select>
            </label>
            <Field
              label={recruitmentApply.fieldPreferredEnvironments}
              value={draft.preferredEnvironments}
              onChange={(v) => update('preferredEnvironments', v)}
            />
            <Field
              label={recruitmentApply.fieldAreasOfInterest}
              value={draft.areasOfInterest}
              onChange={(v) => update('areasOfInterest', v)}
            />
          </>
        ) : null}

        {step.id === 'documents' ? (
          <div className="space-y-4">
            <p className="text-sm text-[color:var(--m-muted)]">
              {recruitmentApply.documentUploadHint}
            </p>
            {docReqs.map((req) => {
              const current = files.find(
                (f) => f.credentialType === req.credentialType,
              );
              return (
                <DocumentField
                  key={req.credentialType}
                  label={translateMessage(req.label, recruitmentApply.messageMap)}
                  required={req.isRequired}
                  requiresExpiry={req.requiresExpiry}
                  file={current?.file ?? null}
                  expiresAt={expiries[req.credentialType] ?? ''}
                  expiryError={(() => {
                    const err = expiryErrorFor(
                      req.credentialType,
                      Boolean(current),
                    );
                    // Don't nag before a date is typed; the Next button explains what's missing.
                    return err && (expiries[req.credentialType] ?? '')
                      ? translateMessage(err, recruitmentApply.messageMap)
                      : null;
                  })()}
                  locale={locale}
                  strings={recruitmentApply}
                  onFile={(file) => acceptFile(req.credentialType, file)}
                  onRemove={() => {
                    setFiles((prev) =>
                      prev.filter((f) => f.credentialType !== req.credentialType),
                    );
                    setLocalError(null);
                  }}
                  onExpiry={(value) => {
                    setExpiries((prev) => ({
                      ...prev,
                      [req.credentialType]: value,
                    }));
                    setLocalError(null);
                  }}
                />
              );
            })}
          </div>
        ) : null}

        {step.id === 'consent' ? (
          <div className="space-y-4">
            <dl className="grid gap-2 rounded-xl border border-[color:var(--m-line)] bg-[color:var(--m-porcelain)] p-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--m-muted)]">
                  {recruitmentApply.fieldFullName}
                </dt>
                <dd className="font-medium text-[color:var(--m-navy)]">
                  {draft.fullName}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--m-muted)]">
                  {recruitmentApply.fieldEmail}
                </dt>
                <dd className="font-medium text-[color:var(--m-navy)]">
                  {draft.email.replace(/(.{2}).+(@.+)/, '$1•••$2')}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--m-muted)]">
                  {recruitmentApply.documentUploadLabel}
                </dt>
                <dd className="font-medium text-[color:var(--m-navy)]">
                  {files.length}
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
              {/*
                Consent wording stays in English pending legal approval; the
                lang="en" wrapper tells assistive tech + translators to leave
                the placeholder copy intact. We never change the submission
                payload, so server validation remains authoritative.
              */}
              <span lang="en">{RECRUITMENT_CONSENT_PLACEHOLDER}</span>
            </label>
            {locale !== 'en' ? (
              <p className="text-xs text-[color:var(--m-muted)]">
                Η συγκατάθεση παραμένει στα Αγγλικά έως την ολοκλήρωση του νομικού
                ελέγχου. Το περιεχόμενο που υποβάλλεται στον διακομιστή δεν αλλάζει.
              </p>
            ) : (
              <p className="text-xs text-[color:var(--m-muted)]">
                Consent wording is a draft pending legal review and is not a claim
                of regulatory compliance.
              </p>
            )}
          </div>
        ) : null}

        {errorText ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {errorText}
          </p>
        ) : null}

        <div className="m-apply-actions flex flex-wrap gap-3 pt-2">
          {stepIndex > 0 ? (
            <button
              type="button"
              className="m-btn m-btn--secondary"
              onClick={goBack}
              disabled={busy}
            >
              <ArrowLeft className="m-btn-back" size={16} aria-hidden />
              <span>{recruitmentApply.btnBack}</span>
            </button>
          ) : null}
          {step.id !== 'consent' ? (
            <button
              type="button"
              className="m-btn m-btn--primary"
              onClick={goNext}
              disabled={busy}
            >
              <span>{recruitmentApply.btnNext}</span>
              <ArrowRight className="m-btn-arrow" size={16} aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              className="m-btn m-btn--primary"
              disabled={busy}
              aria-busy={busy}
            >
              <span>
                {busy ? recruitmentApply.btnSubmitting : recruitmentApply.btnSubmit}
              </span>
              {busy ? (
                <Loader2 className="m-btn-spin" size={16} aria-hidden />
              ) : (
                <Send className="m-btn-send" size={16} aria-hidden />
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function SubmissionSuccess({
  locale,
  strings,
  message,
  reference,
}: {
  locale: MarketingLocale;
  strings: MarketingDictionary['recruitmentApply'];
  message: string;
  reference: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    node.focus({ preventScroll: true });
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      className="m-apply-success"
    >
      <div className="m-apply-success-hero">
        <span className="m-apply-success-check" aria-hidden="true">
          <span className="m-apply-success-ring" />
          <svg viewBox="0 0 52 52" width="52" height="52" fill="none">
            <circle
              className="m-apply-success-circle"
              cx="26"
              cy="26"
              r="23"
              strokeWidth="3"
            />
            <path
              className="m-apply-success-tick"
              d="M15 27.5l7.5 7.5L37.5 19"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="m-apply-success-badge">
          <CheckCircle2 size={14} aria-hidden />
          {strings.successBadge}
        </span>
        <h2 className="m-apply-success-title">{strings.successTitle}</h2>
        <p className="m-apply-success-lead">{message}</p>
        {reference ? (
          <p className="m-apply-success-ref">
            <span>{strings.successReference}</span>
            <code>{reference}</code>
          </p>
        ) : null}
      </div>

      <div className="m-apply-success-next">
        <h3>{strings.successNextTitle}</h3>
        <ol>
          <li>{strings.successNext1}</li>
          <li>{strings.successNext2}</li>
          <li>{strings.successNext3}</li>
        </ol>
      </div>

      <p className="m-apply-success-note">{strings.successNote}</p>

      <div className="m-apply-success-actions">
        <Link
          href={localizePath('/recruitment', locale)}
          className="m-btn m-btn--secondary"
        >
          {strings.successBackCta}
        </Link>
        <Link
          href={localizePath('/', locale)}
          className="m-btn m-btn--primary"
        >
          {strings.successHomeCta}
        </Link>
      </div>
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
