/** Shared block and article shapes for legal policy pages. */

export type PolicyBlock =
  | string
  | { kind: 'h3'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'lines'; lines: string[]; withTaxId?: 'after-registration' };

export type PolicyArticle = {
  id: string;
  title: string;
  blocks: PolicyBlock[];
};
