import type { LegalDocumentContent } from './types';

/**
 * Privacy Policy section slots for counsel-approved wording.
 *
 * Insert approved paragraphs into each section’s `paragraphs` array.
 * Do not invent company identifiers, addresses, retention periods,
 * officer contacts, legal bases, jurisdiction, or processor claims here.
 */
export const privacyPolicyContent: LegalDocumentContent = {
  slug: 'privacy',
  documentTitle: 'Privacy Policy',
  lastUpdated: null,
  effectiveDate: null,
  version: null,
  sections: [
    {
      id: 'controller',
      number: 1,
      heading: 'Controller details',
      paragraphs: [],
    },
    {
      id: 'scope',
      number: 2,
      heading: 'Scope',
      paragraphs: [],
    },
    {
      id: 'information-collected',
      number: 3,
      heading: 'Information collected',
      paragraphs: [],
    },
    {
      id: 'purposes',
      number: 4,
      heading: 'Why BridgeHive uses information',
      paragraphs: [],
    },
    {
      id: 'worker-credentials',
      number: 5,
      heading: 'Worker credentials and verification data',
      paragraphs: [],
    },
    {
      id: 'recruitment-documents',
      number: 6,
      heading: 'Recruitment data and private documents',
      paragraphs: [],
    },
    {
      id: 'organization-data',
      number: 7,
      heading: 'Organization data',
      paragraphs: [],
    },
    {
      id: 'bank-transfer-details',
      number: 8,
      heading: 'Worker bank-transfer details and assignment-based sharing',
      paragraphs: [],
    },
    {
      id: 'operational-data',
      number: 9,
      heading: 'Timesheet, shift, and operational data',
      paragraphs: [],
    },
    {
      id: 'stripe-and-commission-invoices',
      number: 10,
      heading: 'Stripe and worker commission invoices',
      paragraphs: [],
    },
    {
      id: 'cookies-and-sessions',
      number: 11,
      heading: 'Cookies, local storage, and authentication sessions',
      paragraphs: [],
    },
    {
      id: 'processors',
      number: 12,
      heading: 'Service providers and processors',
      paragraphs: [],
    },
    {
      id: 'international-transfers',
      number: 13,
      heading: 'International transfers',
      paragraphs: [],
    },
    {
      id: 'retention',
      number: 14,
      heading: 'Retention',
      paragraphs: [],
    },
    {
      id: 'data-subject-rights',
      number: 15,
      heading: 'GDPR and data-subject rights',
      paragraphs: [],
    },
    {
      id: 'security',
      number: 16,
      heading: 'Security',
      paragraphs: [],
    },
    {
      id: 'changes',
      number: 17,
      heading: 'Changes to this policy',
      paragraphs: [],
    },
    {
      id: 'contact',
      number: 18,
      heading: 'Contact and supervisory authority',
      paragraphs: [],
    },
    {
      id: 'effective-date',
      number: 19,
      heading: 'Effective date and version',
      paragraphs: [],
    },
  ],
};
