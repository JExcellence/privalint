import { type Lang, say } from '../i18n.js';
import type { PageLink } from '../types.js';

/**
 * Soft hyphens and zero-width characters. German sites put them into long words so they break
 * nicely ("Daten&shy;schutz&shy;erklärung"); they are invisible but split the word for a pattern.
 * src/capture.ts and src/forms.ts pass its source into the page. Global flag: use it with replace,
 * never with test, which would carry lastIndex from one call to the next.
 */
export const INVISIBLE_CHARS = /[\u00AD\u200B-\u200D\u2060\uFEFF]/g;

/**
 * Matches a link by its visible text or its URL path. Only the path counts,
 * so a domain like impressum-example.de doesn't satisfy every page.
 */
export const linkMatches = (pattern: RegExp) => (link: PageLink) =>
  pattern.test(link.text.replace(INVISIBLE_CHARS, '')) || pattern.test(pathOf(link.href));

export const linksChecked = (count: number, lang: Lang) =>
  say(lang, {
    en: `${count} links checked`,
    de: `${count} Links geprüft`,
    hu: `${count} hivatkozás ellenőrizve`,
  });

export function pathOf(href: string): string {
  try {
    return decodeURIComponent(new URL(href).pathname).replace(INVISIBLE_CHARS, '');
  } catch {
    return '';
  }
}
