import type { PageSnapshot } from '../src/types.js';

export const SITE = new URL('https://example.de/');

export function snapshot(overrides: Partial<PageSnapshot> = {}): PageSnapshot {
  return {
    url: SITE.href,
    finalUrl: SITE.href,
    status: 200,
    requests: [],
    cookies: [],
    links: [],
    resourceHints: [],
    ...overrides,
  };
}

export const request = (url: string, resourceType = 'script') => ({ url, resourceType });

export const cookie = (name: string, domain = '.example.de') => ({
  name,
  domain,
  path: '/',
  expires: -1,
});
