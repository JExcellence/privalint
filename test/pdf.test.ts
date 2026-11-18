import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { adapterFetchBytes } from '../src/fetch.js';
import { isPdf, readPdf } from '../src/pdf.js';

const readText = async (...args: Parameters<typeof readPdf>) => (await readPdf(...args))?.text;

const fixture = async () =>
  new Uint8Array(
    await readFile(new URL('./fixtures/policy-vendors/pdf/cookie-policy.pdf', import.meta.url)),
  );

describe('readPdf text', () => {
  it('reads the text of a PDF', async () => {
    expect(await readText(await fixture())).toBe(
      'Cookie policy\nWe embed videos from YouTube on our pages.',
    );
  });

  it('gives up on files that are no PDF or broken, without throwing', async () => {
    const encode = (text: string) => new TextEncoder().encode(text);
    expect(isPdf(encode('<!doctype html>'))).toBe(false);
    expect(await readText(encode('<!doctype html><p>Cookie policy</p>'))).toBeUndefined();
    expect(await readText(encode('%PDF-1.4\nnot really a pdf'))).toBeUndefined();
  });

  it('leaves a PDF unread when pdf.js fails to load, instead of throwing', async () => {
    // As on Node 24 without the optional @napi-rs/canvas package: "DOMMatrix is not defined".
    const failing = () => Promise.reject(new ReferenceError('DOMMatrix is not defined'));
    expect(await readText(await fixture(), failing)).toBeUndefined();
  });

  it('leaves the caller its buffer', async () => {
    const bytes = await fixture();
    await readText(bytes);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });
});

describe('readPdf', () => {
  /** A stand-in for pdf.js: `pages` pages, each with the given text. */
  const fakePdfJs = (pages: number, text: string) => () =>
    Promise.resolve({
      VerbosityLevel: { ERRORS: 0 },
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: pages,
          getPage: async () => ({
            getTextContent: async () => ({ items: [{ str: text, hasEOL: false }] }),
            cleanup: () => undefined,
          }),
        }),
        destroy: async () => undefined,
      }),
    } as unknown as typeof import('pdfjs-dist/legacy/build/pdf.mjs'));

  it('says a short PDF was read completely', async () => {
    expect(await readPdf(await fixture())).toMatchObject({ complete: true });
  });

  it('says when pages or text were cut off', async () => {
    const bytes = new TextEncoder().encode('%PDF-1.4');
    expect(await readPdf(bytes, fakePdfJs(61, 'page'))).toMatchObject({ complete: false });
    expect(await readPdf(bytes, fakePdfJs(60, 'page'))).toMatchObject({ complete: true });
    expect(await readPdf(bytes, fakePdfJs(2, 'x'.repeat(300_000)))).toMatchObject({
      complete: false,
    });
  });
});

describe('adapterFetchBytes', () => {
  it('returns the body, and nothing above the size limit or for an error status', async () => {
    const body = new Uint8Array([37, 80, 68, 70]);
    const ok = adapterFetchBytes(async () => ({ status: 200, headers: {}, body }), 10);
    expect(await ok('https://example.de/a.pdf')).toEqual(body);
    const big = adapterFetchBytes(async () => ({ status: 200, headers: {}, body }), 3);
    expect(await big('https://example.de/a.pdf')).toBeUndefined();
    const missing = adapterFetchBytes(async () => ({ status: 404, headers: {}, body }), 10);
    expect(await missing('https://example.de/a.pdf')).toBeUndefined();
  });

  it('keeps a PDF that an adapter returned as a binary string intact', async () => {
    const bytes = await fixture();
    const binary = String.fromCharCode(...bytes);
    const read = adapterFetchBytes(
      async () => ({ status: 200, headers: {}, body: binary }),
      1_000_000,
    );
    expect(await read('https://example.de/a.pdf')).toEqual(bytes);
    const text = adapterFetchBytes(
      async () => ({ status: 200, headers: {}, body: '<urlset>ü</urlset>' }),
      100,
    );
    expect(await text('https://example.de/sitemap.xml')).toEqual(
      new TextEncoder().encode('<urlset>ü</urlset>'),
    );
  });
});
