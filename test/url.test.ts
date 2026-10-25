import { describe, expect, it } from 'vitest';
import { crawlTarget, isFirstParty } from '../src/url.js';
import { SITE } from './helpers.js';

describe('isFirstParty', () => {
  it.each([
    ['https://example.de/a.js', true],
    ['https://www.example.de/a.js', true],
    ['https://cdn.example.de/a.js', true],
    ['https://example.com/a.js', false],
    ['https://badexample.de/a.js', false],
  ])('%s -> %s', (url, expected) => {
    expect(isFirstParty(url, SITE)).toBe(expected);
  });
});

describe('crawlTarget', () => {
  it('resolves relative links and drops hash and query', () => {
    expect(crawlTarget('/about?ref=nav#team', SITE)).toBe('https://example.de/about');
  });

  it('follows links to other hosts of the same site', () => {
    expect(crawlTarget('https://www.example.de/blog', SITE)).toBe('https://www.example.de/blog');
  });

  it.each([
    'https://other.de/',
    'mailto:info@example.de',
    'tel:+49123',
    '/files/agb.pdf',
    'javascript:void(0)',
  ])('skips %s', (href) => {
    expect(crawlTarget(href, SITE)).toBeUndefined();
  });
});
