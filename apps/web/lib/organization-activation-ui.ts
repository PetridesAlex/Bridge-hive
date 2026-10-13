/** Client-side password checks for org activation UI (mirrors server rules). */

export const ORG_ACTIVATION_MIN_PASSWORD_LENGTH = 8;

export function passwordMeetsMinLength(password: string): boolean {
  return password.length >= ORG_ACTIVATION_MIN_PASSWORD_LENGTH;
}

export function passwordsMatch(
  password: string,
  confirmPassword: string,
): boolean {
  if (!password || !confirmPassword) return false;
  return password === confirmPassword;
}

export type OrgActivationPasswordFeedback = {
  lengthMet: boolean;
  matchMet: boolean;
  matchVisible: boolean;
  mismatchMessage: string | null;
};

export function getOrgActivationPasswordFeedback(
  password: string,
  confirmPassword: string,
): OrgActivationPasswordFeedback {
  const lengthMet = passwordMeetsMinLength(password);
  const matchVisible = confirmPassword.length > 0;
  const matchMet = passwordsMatch(password, confirmPassword);
  const mismatchMessage =
    matchVisible && !matchMet ? 'Passwords do not match.' : null;

  return { lengthMet, matchMet, matchVisible, mismatchMessage };
}
