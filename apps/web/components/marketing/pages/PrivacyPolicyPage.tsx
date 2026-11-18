import { LegalPolicyDocument } from '@/components/marketing/pages/LegalPolicyDocument';
import type { MarketingLocale } from '@/lib/marketing-i18n/locales';
import {
  POLICY_ARTICLES,
  POLICY_HEADER,
  PRIVACY_POLICY_TAX_ID,
  taxIdLabel,
} from '@/lib/privacy-policy/content';

const GREEK_NOTE =
  'Το κείμενο της Πολιτικής Απορρήτου παρατίθεται στα αγγλικά, όπως υποβλήθηκε από την εταιρεία. Δεν έχει εγκριθεί ελληνική μετάφραση. Σε περίπτωση διαφοράς, ισχύει το αγγλικό κείμενο.';

function TaxIdValue() {
  return <>{PRIVACY_POLICY_TAX_ID}</>;
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
      greekNote={GREEK_NOTE}
      taxIdLabel={taxIdLabel(locale)}
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
