import 'server-only';

import { en } from './dictionaries/en';
import { el } from './dictionaries/el';
import type { MarketingDictionary } from './dictionaries';
import type { MarketingLocale } from './locales';

const dictionaries = { en, el } as const;

/**
 * Recursively validates that no string value is empty in the dictionary.
 * Throws an error in development if any empty strings are found.
 */
function assertComplete(
  dict: unknown,
  locale: string,
  path: string[] = [],
): void {
  if (dict === null || typeof dict !== 'object') return;

  for (const [key, value] of Object.entries(dict as Record<string, unknown>)) {
    const currentPath = [...path, key];
    const pathStr = currentPath.join('.');

    if (typeof value === 'string') {
      if (value.trim() === '') {
        throw new Error(
          `Empty string found in ${locale} dictionary at path: ${pathStr}`,
        );
      }
    } else if (Array.isArray(value)) {
      value.forEach((item: unknown, index) => {
        if (typeof item === 'string') {
          if (item.trim() === '') {
            throw new Error(
              `Empty string found in ${locale} dictionary at path: ${pathStr}[${index}]`,
            );
          }
        } else if (typeof item === 'object' && item !== null) {
          assertComplete(item, locale, [...currentPath, `[${index}]`]);
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      assertComplete(value, locale, currentPath);
    }
  }
}

export function getDictionary(locale: MarketingLocale): MarketingDictionary {
  const dict = dictionaries[locale];

  if (process.env.NODE_ENV !== 'production') {
    assertComplete(dict, locale);
  }

  return dict;
}
