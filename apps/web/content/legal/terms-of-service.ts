import type { LegalDocumentContent } from './types';

/**
 * Terms of Service section slots for counsel-approved wording.
 *
 * Insert approved paragraphs into each section’s `paragraphs` array.
 * Do not invent company identifiers, addresses, jurisdiction clauses,
 * liability caps, or binding commercial terms here.
 *
 * Insertion notes for counsel (do not render these as page copy):
 * - `worker-commission`: approved commission-percentage disclosure
 * - `payment-term`: approved calendar-day payment term wording
 */
export const termsOfServiceContent: LegalDocumentContent = {
  slug: 'terms',
  documentTitle: 'Terms of Service',
  lastUpdated: null,
  effectiveDate: null,
  version: null,
  sections: [
    {
      id: 'service-overview',
      number: 1,
      heading: 'Service overview',
      paragraphs: [],
    },
    {
      id: 'organization-accounts',
      number: 2,
      heading: 'Organization accounts',
      paragraphs: [],
    },
    {
      id: 'worker-accounts',
      number: 3,
      heading: 'Worker accounts and verification',
      paragraphs: [],
    },
    {
      id: 'shift-postings',
      number: 4,
      heading: 'Shift postings and claims',
      paragraphs: [],
    },
    {
      id: 'timesheets',
      number: 5,
      heading: 'Timesheets and completion approval',
      paragraphs: [],
    },
    {
      id: 'wage-payment',
      number: 6,
      heading: 'Organization-to-worker wage payment',
      paragraphs: [],
    },
    {
      id: 'commission-invoice',
      number: 7,
      heading: 'Separate BridgeHive worker commission invoice',
      paragraphs: [],
    },
    {
      // Counsel: insert approved commission-percentage disclosure here.
      id: 'worker-commission',
      number: 8,
      heading: 'Worker commission',
      paragraphs: [],
    },
    {
      // Counsel: insert approved calendar-day payment term wording here.
      id: 'payment-term',
      number: 9,
      heading: 'Payment term',
      paragraphs: [],
    },
    {
      id: 'overdue-restrictions',
      number: 10,
      heading: 'Overdue account restrictions',
      paragraphs: [],
    },
    {
      id: 'recruitment',
      number: 11,
      heading: 'Recruitment',
      paragraphs: [],
    },
    {
      id: 'acceptable-use',
      number: 12,
      heading: 'Acceptable use',
      paragraphs: [],
    },
    {
      id: 'privacy',
      number: 13,
      heading: 'Privacy and data handling',
      paragraphs: [],
    },
    {
      id: 'disclaimers',
      number: 14,
      heading: 'Disclaimers and platform limits',
      paragraphs: [],
    },
    {
      id: 'suspension',
      number: 15,
      heading: 'Suspension and termination',
      paragraphs: [],
    },
    {
      id: 'liability',
      number: 16,
      heading: 'Liability and disputes',
      paragraphs: [],
    },
    {
      id: 'governing-law',
      number: 17,
      heading: 'Governing law',
      paragraphs: [],
    },
    {
      id: 'contact',
      number: 18,
      heading: 'Contact',
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
