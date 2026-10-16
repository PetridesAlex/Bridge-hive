/**
 * Publication gate for public Privacy / Terms pages.
 *
 * Keep `'draft'` until owner/counsel supplies approved wording.
 * Flip to `'approved'` only after legal copy is inserted and reviewed —
 * that removes the Preview draft banner, allows indexing metadata, and
 * is the signal to add `/privacy` and `/terms` to the sitemap.
 */
export type LegalPublicationStatus = 'draft' | 'approved';

export const LEGAL_PUBLICATION_STATUS: LegalPublicationStatus = 'draft';

export const LEGAL_DRAFT_BANNER =
  'Draft legal-page layout — legal wording is awaiting owner/counsel approval and is not yet published.';

/** Shared empty-slot copy. Never present this as an approved or binding policy. */
export const LEGAL_SECTION_PLACEHOLDER =
  'This section is reserved for counsel-approved wording and is not a published policy.';

export function legalPagesAreIndexable(
  status: LegalPublicationStatus = LEGAL_PUBLICATION_STATUS,
): boolean {
  return status === 'approved';
}

export function showLegalDraftBanner(
  status: LegalPublicationStatus = LEGAL_PUBLICATION_STATUS,
): boolean {
  return status !== 'approved';
}
