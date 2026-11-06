import { describe, expect, it } from 'vitest';
import { choosePages, sitemapPages } from '../src/sitemap.js';

const SITE = new URL('https://example.de/');
const files = (map: Record<string, string>) => async (url: string) => map[url];
const urlset = (...paths: string[]) =>
  `<?xml version="1.0"?><urlset>${paths.map((path) => `<url><loc>https://example.de${path}</loc></url>`).join('')}</urlset>`;

describe('sitemap pages', () => {
  it('reads the sitemaps robots.txt names, following an index one level', async () => {
    const pages = await sitemapPages(
      SITE,
      files({
        'https://example.de/robots.txt':
          'User-agent: *\nSitemap: https://example.de/sitemap-index.xml\nSitemap: https://other.example/sitemap.xml',
        'https://example.de/sitemap-index.xml':
          '<sitemapindex><sitemap><loc>https://example.de/pages.xml</loc></sitemap><sitemap><loc>https://evil.example/x.xml</loc></sitemap></sitemapindex>',
        'https://example.de/pages.xml': urlset('/', '/ueber-uns', '/blog/a', '/blog/b&amp;c'),
      }),
      10,
    );
    expect(pages).toEqual([
      'https://example.de/ueber-uns',
      'https://example.de/blog/a',
      'https://example.de/blog/b&c',
    ]);
  });

  it('falls back to /sitemap.xml and returns nothing without a sitemap', async () => {
    const fallback = await sitemapPages(
      SITE,
      files({ 'https://example.de/sitemap.xml': urlset('/kontakt') }),
      5,
    );
    expect(fallback).toEqual(['https://example.de/kontakt']);
    expect(await sitemapPages(SITE, files({}), 5)).toEqual([]);
  });

  it('prefers shallow form pages from different sections, for half the pages at most', () => {
    const urls = [
      '/arena/studio/foglalas-torlese',
      '/arena/studio/foglalas',
      '/kontakt',
      '/blog/a',
      '/shop/b',
    ].map((path) => new URL(path, SITE).href);
    expect(choosePages(urls, SITE, 4)).toEqual([
      'https://example.de/kontakt',
      'https://example.de/arena/studio/foglalas-torlese',
      'https://example.de/arena/studio/foglalas',
      'https://example.de/blog/a',
    ]);
  });

  it('puts pages with forms first, then one page per section in turn', () => {
    const urls = [
      '/de/blog/1',
      '/de/blog/2',
      '/de/blog/3',
      '/de/produkte/a',
      '/de/produkte/b',
      '/de/newsletter',
      '/de/impressum',
      'https://other.example/de/kontakt',
      '/files/preise.pdf',
    ].map((path) => new URL(path, SITE).href);
    expect(choosePages(urls, SITE, 5)).toEqual([
      'https://example.de/de/newsletter',
      'https://example.de/de/blog/1',
      'https://example.de/de/produkte/a',
      'https://example.de/de/impressum',
      'https://example.de/de/blog/2',
    ]);
  });
});
