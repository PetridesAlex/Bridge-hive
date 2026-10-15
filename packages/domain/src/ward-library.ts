/** Organization-owned starter Ward / Unit labels (not a shared DB table). */
export const STANDARD_WARD_LIBRARY = [
  'Pathology ward',
  'Surgical ward',
  'Maternity Department',
  'Accident & Emergency Department',
  'Oncology ward',
  'Paediatric Oncology Ward',
  'Care Unit',
  'Chemotherapy Day Unit',
  'ICU',
] as const;

export type StandardWardLibraryLabel = (typeof STANDARD_WARD_LIBRARY)[number];

/** Trim whitespace; empty after trim becomes ''. */
export function normalizeWardName(name: string): string {
  return name.trim();
}

/** Case-insensitive equality after trim. */
export function wardNamesEqual(a: string, b: string): boolean {
  return normalizeWardName(a).toLowerCase() === normalizeWardName(b).toLowerCase();
}

/**
 * Normalize a list of ward names: trim, drop blanks, dedupe case-insensitively
 * (first occurrence wins).
 */
export function prepareWardNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = normalizeWardName(raw);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/** True if `name` already exists in `existing` (case-insensitive, trimmed). */
export function wardNameExistsAmong(
  name: string,
  existing: readonly string[],
): boolean {
  const normalized = normalizeWardName(name);
  if (!normalized) return false;
  return existing.some((candidate) => wardNamesEqual(candidate, normalized));
}
