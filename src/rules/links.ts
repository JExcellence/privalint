import type { PageLink } from '../types.js';

/**
 * Matches a link by its visible text or its URL path. Only the path counts,
 * so a domain like impressum-example.de doesn't satisfy every page.
 */
export const linkMatches = (pattern: RegExp) => (link: PageLink) =>
  pattern.test(link.text) || pattern.test(pathOf(link.href));

function pathOf(href: string): string {
  try {
    return decodeURIComponent(new URL(href).pathname);
  } catch {
    return '';
  }
}
