import { LegalPolicyDocument } from '@/components/marketing/pages/LegalPolicyDocument';
import {
  COOKIE_POLICY_ARTICLES,
  COOKIE_POLICY_HEADER,
} from '@/lib/cookie-policy/content';
import type { MarketingLocale } from '@/lib/marketing-i18n/locales';

const GREEK_NOTE =
  'Το κείμενο της Πολιτικής Cookies παρατίθεται στα αγγλικά, όπως υποβλήθηκε από την εταιρεία. Δεν έχει εγκριθεί ελληνική μετάφραση. Σε περίπτωση διαφοράς, ισχύει το αγγλικό κείμενο.';

export function CookiePolicyPage({ locale }: { locale: MarketingLocale }) {
  const h = COOKIE_POLICY_HEADER;

  return (
    <LegalPolicyDocument
      locale={locale}
      company={h.company}
      title={h.title}
      subtitle={h.subtitle}
      chips={[h.version, h.lastUpdated]}
      greekNote={GREEK_NOTE}
      identity={{ lines: h.identityLines }}
      articles={COOKIE_POLICY_ARTICLES}
      end={h.end}
      endVersion={h.endVersion}
    />
  );
}
