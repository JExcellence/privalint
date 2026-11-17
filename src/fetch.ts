import type { Browser } from 'playwright';
import type { NetworkAdapter } from './network.js';

/** Fetches a file of the site, or undefined when it isn't there, failed or is too large. */
export type FetchBytes = (url: string) => Promise<Uint8Array | undefined>;

const TIMEOUT_MS = 10_000;

/** Reads files with the browser's request context, like the transport check: up to 3 redirects. */
export function browserFetchBytes(browser: Browser, maxBytes: number): FetchBytes {
  return async (url) => {
    const context = await browser.newContext();
    try {
      const response = await context.request.get(url, {
        timeout: TIMEOUT_MS,
        maxRedirects: 3,
        failOnStatusCode: false,
      });
      if (response.status() !== 200) return undefined;
      const body = await response.body();
      return body.byteLength > maxBytes ? undefined : new Uint8Array(body);
    } catch {
      return undefined;
    } finally {
      await context.close();
    }
  };
}

/** Reads files through the network adapter: one hop, no redirects followed. */
export function adapterFetchBytes(adapter: NetworkAdapter, maxBytes: number): FetchBytes {
  return async (url) => {
    try {
      const response = await adapter({
        url,
        method: 'GET',
        headers: {},
        body: null,
        resourceType: 'other',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status !== 200 || response.body === undefined) return undefined;
      const body = response.body;
      if (typeof body === 'string') {
        const bytes = isBinaryString(body)
          ? Uint8Array.from(body, (char) => char.charCodeAt(0))
          : new TextEncoder().encode(body);
        return bytes.byteLength > maxBytes ? undefined : bytes;
      }
      if (body instanceof Uint8Array) return body.byteLength > maxBytes ? undefined : body;
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of body) {
        size += chunk.byteLength;
        if (size > maxBytes) return undefined;
        chunks.push(chunk);
      }
      return new Uint8Array(Buffer.concat(chunks));
    } catch {
      return undefined;
    }
  };
}

/**
 * A PDF or gzip file an adapter returned as a "binary string", one character per byte. Encoding
 * it as UTF-8 would turn every byte above 0x7f into two and break the file, so it is copied byte
 * by byte instead. Text such as a sitemap is still encoded as UTF-8.
 */
function isBinaryString(body: string): boolean {
  if (!body.startsWith('%PDF-') && !body.startsWith('\u001f\u008b')) return false;
  for (let i = 0; i < body.length; i++) {
    if (body.charCodeAt(i) > 0xff) return false;
  }
  return true;
}
