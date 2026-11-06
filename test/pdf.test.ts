import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { adapterFetchBytes } from '../src/fetch.js';
import { isPdf, pdfText } from '../src/pdf.js';

const fixture = async () =>
  new Uint8Array(
    await readFile(new URL('./fixtures/policy-vendors/pdf/cookie-policy.pdf', import.meta.url)),
  );

describe('pdfText', () => {
  it('reads the text of a PDF', async () => {
    expect(await pdfText(await fixture())).toBe(
      'Cookie policy\nWe embed videos from YouTube on our pages.',
    );
  });

  it('gives up on files that are no PDF or broken, without throwing', async () => {
    const encode = (text: string) => new TextEncoder().encode(text);
    expect(isPdf(encode('<!doctype html>'))).toBe(false);
    expect(await pdfText(encode('<!doctype html><p>Cookie policy</p>'))).toBeUndefined();
    expect(await pdfText(encode('%PDF-1.4\nnot really a pdf'))).toBeUndefined();
  });

  it('leaves the caller its buffer', async () => {
    const bytes = await fixture();
    await pdfText(bytes);
    expect(bytes.byteLength).toBeGreaterThan(0);
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
});
