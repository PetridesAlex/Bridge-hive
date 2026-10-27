import {
  isLikelyValidIbanFormat,
  normalizeIbanInput,
  type PayoutAccountStatusInput,
} from '@bridge-hive/domain';

/** Worker-facing status labels for the payout-account screen only. */
export function payoutAccountScreenStatusLabel(
  status: PayoutAccountStatusInput,
): string {
  switch (status) {
    case 'pending':
      return 'Submitted — under review';
    case 'verified':
      return 'Approved for platform use';
    case 'rejected':
    case 'failed':
      return 'Action required — correction needed';
    case 'suspended':
      return 'Suspended';
    default:
      return 'Not submitted';
  }
}

/** Country metadata from a normalized IBAN prefix (trusted client derive; server still validates IBAN). */
export function countryCodeFromNormalizedIban(iban: string): string {
  return normalizeIbanInput(iban).slice(0, 2);
}

export type PayoutAccountFormInput = {
  holderName: string;
  ibanInput: string;
  proofPath?: string;
  proofMime?: string;
};

export type PayoutAccountFormResult =
  | { ok: true; holderName: string; iban: string; country: string }
  | { ok: false; error: string };

/** Client-side form checks before calling submit_payout_account. */
export function validatePayoutAccountForm(
  input: PayoutAccountFormInput,
): PayoutAccountFormResult {
  const holderName = input.holderName.trim();
  if (holderName.length < 2) {
    return { ok: false, error: 'Enter the account holder name.' };
  }

  const iban = normalizeIbanInput(input.ibanInput);
  if (!isLikelyValidIbanFormat(iban)) {
    return { ok: false, error: 'Enter a valid IBAN.' };
  }

  if (!input.proofPath || !input.proofMime) {
    return { ok: false, error: 'Upload proof of bank account before submitting.' };
  }

  return {
    ok: true,
    holderName,
    iban,
    country: countryCodeFromNormalizedIban(iban),
  };
}

/** Pending/verified payout accounts stay view-only; rejected/failed may resubmit. */
export function canEditPayoutAccount(
  status: PayoutAccountStatusInput | undefined,
): boolean {
  return !status || status === 'rejected' || status === 'failed';
}
