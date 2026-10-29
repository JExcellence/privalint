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

  it.each([
    ['https://example.de/', 'https://www.example.de/a.js', true],
    ['https://www.example.de/', 'https://example.de/a.js', true],
    ['https://example.co.uk/', 'https://shop.example.co.uk/a.js', true],
    ['https://shop.example.co.uk/', 'https://example.co.uk/a.js', true],
    ['https://shop.example.co.uk/', 'https://other.co.uk/a.js', false],
    ['https://a.github.io/', 'https://b.github.io/a.js', false],
    ['https://a.github.io/', 'https://cdn.a.github.io/a.js', true],
    ['https://a.netlify.app/', 'https://b.netlify.app/a.js', false],
    ['https://a.vercel.app/', 'https://b.vercel.app/a.js', false],
    ['https://WWW.Example.DE/', 'https://example.de/a.js', true],
  ])('site %s, %s -> %s', (site, url, expected) => {
    expect(isFirstParty(url, new URL(site))).toBe(expected);
  });

  it.each([
    ['http://127.0.0.1:8080/', 'http://127.0.0.1:9090/a.js', true],
    ['http://127.0.0.1/', 'http://127.0.0.2/a.js', false],
    ['http://[::1]/', 'http://[::1]/a.js', true],
    ['http://localhost:3000/', 'http://localhost:4000/a.js', true],
    ['http://localhost/', 'http://example.localhost/a.js', false],
    ['https://github.io/', 'https://github.io/a.js', true],
    ['https://github.io/', 'https://a.github.io/a.js', false],
    ['https://a.github.io/', 'https://github.io/a.js', false],
  ])('without a registrable domain, site %s, %s -> %s', (site, url, expected) => {
    expect(isFirstParty(url, new URL(site))).toBe(expected);
  });
});

describe('crawlTarget', () => {
  it('resolves relative links and drops hash and query', () => {
    expect(crawlTarget('/about?ref=nav#team', SITE)).toBe('https://example.de/about');
  });

  it('follows links to other hosts of the same site', () => {
    expect(crawlTarget('https://www.example.de/blog', SITE)).toBe('https://www.example.de/blog');
  });

  it('does not follow links to a neighbour on a shared host', () => {
    expect(crawlTarget('https://b.github.io/', new URL('https://a.github.io/'))).toBeUndefined();
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
