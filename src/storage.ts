import type { Page } from 'playwright';
import type { StorageKey } from './types.js';

/** More keys than this say nothing more about which vendors are present. */
const MAX_KEYS = 200;

/**
 * Names of the localStorage and sessionStorage keys of the page's own origin. Never the values:
 * they can hold personal data, and the name is enough to recognise a vendor. Undefined when the page
 * could not be read, which is not the same as empty storage.
 */
export async function readStorageKeys(page: Page): Promise<StorageKey[] | undefined> {
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
    .catch(() => undefined);
}

/**
 * Keys in `after` that were not in `before`: what a choice or a reload added. Undefined when either
 * read failed or hit the cap: every key would look new, or the new ones could be missing.
 */
export function newStorageKeys(
  before: readonly StorageKey[] | undefined,
  after: readonly StorageKey[] | undefined,
): StorageKey[] | undefined {
  if (before === undefined || after === undefined) return undefined;
  // A read cut at the cap may have left out exactly the keys the choice added.
  if (before.length >= MAX_KEYS || after.length >= MAX_KEYS) return undefined;
  const seen = new Set(before.map(({ area, name }) => `${area}:${name}`));
  return after.filter(({ area, name }) => !seen.has(`${area}:${name}`));
}
