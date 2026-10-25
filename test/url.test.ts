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
  it('resolves relative links and drops the hash', () => {
    expect(crawlTarget('/about#team', SITE)).toBe('https://example.de/about');
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
