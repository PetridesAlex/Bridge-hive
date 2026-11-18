/**
 * Re-export the shared Privacy Policy corpus for the web app.
 * Source of truth: `@bridge-hive/legal-content`.
 */

export type { PolicyArticle, PolicyBlock, PrivacyPolicyLocale } from '@bridge-hive/legal-content';

export {
  POLICY_ARTICLES,
  POLICY_HEADER,
  PRIVACY_POLICY_LAST_UPDATED,
  PRIVACY_POLICY_PUBLISH_APPROVED,
  PRIVACY_POLICY_TAX_ID,
  PRIVACY_POLICY_VERSION_LABEL,
  TAX_ID_LABEL_EL,
  TAX_ID_LABEL_EN,
  TAX_ID_PLACEHOLDER,
  assertFinalPrivacyPolicyContent,
  privacyPolicyIsBlockedHere,
  privacyPolicyIsFinal,
  privacyPolicyIsPublishable,
  taxIdLabel,
  taxIdLine,
} from '@bridge-hive/legal-content';
