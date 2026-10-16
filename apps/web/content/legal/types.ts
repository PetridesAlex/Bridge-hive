export type LegalSection = {
  id: string;
  number: number;
  heading: string;
  /** Counsel-approved paragraphs only. Leave empty until approved. */
  paragraphs: string[];
};

export type LegalDocumentContent = {
  slug: 'privacy' | 'terms';
  documentTitle: string;
  /** ISO date or display string once counsel sets it; null while draft. */
  lastUpdated: string | null;
  /** ISO date or display string once counsel sets it; null while draft. */
  effectiveDate: string | null;
  /** Version label once counsel sets it; null while draft. */
  version: string | null;
  sections: LegalSection[];
};
