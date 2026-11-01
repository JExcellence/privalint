import type { Page } from 'playwright';
import type { StorageKey } from './types.js';

/** More keys than this say nothing more about which vendors are present. */
const MAX_KEYS = 200;

/**
 * Names of the localStorage and sessionStorage keys of the page's own origin. Never the values:
 * they can hold personal data, and the name is enough to recognise a vendor.
 */
export async function readStorageKeys(page: Page): Promise<StorageKey[]> {
  return page
    .evaluate((max) => {
      const keys: { area: 'local' | 'session'; name: string }[] = [];
      for (const [area, storage] of [
        ['local', window.localStorage],
        ['session', window.sessionStorage],
      ] as const) {
        for (let i = 0; i < storage.length && keys.length < max; i++) {
          const name = storage.key(i);
          if (name !== null) keys.push({ area, name });
        }
      }
      return keys;
    }, MAX_KEYS)
    .catch(() => []);
}

/** Keys in `after` that were not in `before`: what a choice or a reload added. */
export function newStorageKeys(before: readonly StorageKey[], after: readonly StorageKey[]) {
  const seen = new Set(before.map(({ area, name }) => `${area}:${name}`));
  return after.filter(({ area, name }) => !seen.has(`${area}:${name}`));
}
