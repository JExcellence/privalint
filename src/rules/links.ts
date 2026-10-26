import { type Lang, say } from '../i18n.js';
import type { PageLink } from '../types.js';

/**
 * Matches a link by its visible text or its URL path. Only the path counts,
 * so a domain like impressum-example.de doesn't satisfy every page.
 */
export const linkMatches = (pattern: RegExp) => (link: PageLink) =>
  pattern.test(link.text) || pattern.test(pathOf(link.href));

export const linksChecked = (count: number, lang: Lang) =>
  say(lang, { en: `${count} links checked`, de: `${count} Links geprüft` });

function pathOf(href: string): string {
  try {
    return decodeURIComponent(new URL(href).pathname);
  } catch {
    return '';
  }
}
