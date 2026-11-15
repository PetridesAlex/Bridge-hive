import { LegalPolicyDocument } from '@/components/marketing/pages/LegalPolicyDocument';
import type { MarketingLocale } from '@/lib/marketing-i18n/locales';
import {
  POLICY_ARTICLES,
  POLICY_HEADER,
  PRIVACY_POLICY_TAX_ID,
  TAX_ID_PLACEHOLDER,
} from '@/lib/privacy-policy/content';

const GREEK_NOTE =
  'Το κείμενο της Πολιτικής Απορρήτου παρατίθεται στα αγγλικά, όπως υποβλήθηκε από την εταιρεία. Δεν έχει εγκριθεί ελληνική μετάφραση. Σε περίπτωση διαφοράς, ισχύει το αγγλικό κείμενο.';

const DRAFT_BANNER_EN =
  'The Tax ID is a placeholder until the company supplies it.';
const DRAFT_BANNER_EL =
  'Ο Φορολογικός Αριθμός (Tax ID) είναι σήμα θέσης μέχρι να τον προμηθεύσει η εταιρεία.';

function TaxIdValue() {
  if (PRIVACY_POLICY_TAX_ID) return <>{PRIVACY_POLICY_TAX_ID}</>;
  return (
    <span className="m-policy-placeholder" data-placeholder="tax-id">
      {TAX_ID_PLACEHOLDER}
    </span>
  );
}

export function PrivacyPolicyPage({ locale }: { locale: MarketingLocale }) {
  const h = POLICY_HEADER;

  return (
    <LegalPolicyDocument
      locale={locale}
      company={h.company}
      title={h.title}
      subtitle={h.subtitle}
      chips={[h.version, h.lastUpdated]}
      draftBannerEn={DRAFT_BANNER_EN}
      draftBannerEl={DRAFT_BANNER_EL}
      greekNote={GREEK_NOTE}
      identity={{
        beforeTaxId: h.linesBeforeTaxId,
        taxIdValue: <TaxIdValue />,
        afterTaxId: h.linesAfterTaxId,
      }}
      articles={POLICY_ARTICLES}
      end={h.end}
      endVersion={h.endVersion}
    />
  );
}
