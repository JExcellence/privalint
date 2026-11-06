import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPinnedAdapter } from '../examples/controlled-scanner.js';
import type { NetworkRequest } from '../src/network.js';
import { scan } from '../src/scanner.js';

let server: Server;
let origin: string;
let received = 0;
const posted: string[] = [];
beforeAll(async () => {
  server = createServer((request, response) => {
    received++;
    if (request.method === 'POST') {
      let body = '';
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        posted.push(`${request.url} ${body}`);
        response.writeHead(204).end();
      });
      return;
    }
    if (request.url === '/with-api-call') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(
        '<a href="/impressum">Impressum</a><a href="/privacy">Privacy policy</a>' +
          '<script>fetch("/api", { method: "POST", body: JSON.stringify({ q: 1 }) })</script>',
      );
      return;
    }
    if (request.url === '/redirect') {
      response.writeHead(302, { location: 'http://169.254.169.254/private?token=SECRET' }).end();
    } else {
      response.writeHead(200, {
        'content-type': 'text/html',
        'set-cookie': ['one=1; Path=/', 'two=2; Path=/'],
      });
      response.end('<a href="/impressum">Impressum</a><a href="/privacy">Privacy policy</a>');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://pinned.invalid:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const request = (url: string): NetworkRequest => ({
  url,
  method: 'GET',
  headers: {},
  body: null,
  resourceType: 'document',
  signal: new AbortController().signal,
});

describe('pinned transport example', () => {
  it('connects to the configured IP without resolving the submitted hostname and preserves cookies', async () => {
    const result = await scan(origin, {
      networkAdapter: createPinnedAdapter(new Map([[origin, '127.0.0.1']])),
      settleMs: 0,
    });
    expect(result.pages[0]?.capture?.complete).toBe(true);
    expect(result.pages[0]?.cookieCount).toBe(2);
    expect(result.findings).toEqual([]);
  });
  it('rejects unknown origins, credentials and methods before network access', async () => {
    const adapter = createPinnedAdapter(new Map([[origin, '127.0.0.1']]));
    const before = received;
    await expect(adapter(request('http://unknown.invalid/'))).rejects.toMatchObject({
      kind: 'security-blocked',
    });
    await expect(
      createPinnedAdapter(new Map([['http://127.0.0.1', '192.0.2.1']]))(
        request('http://127.0.0.1'),
      ),
    ).rejects.toMatchObject({ kind: 'security-blocked' });
    await expect(
      adapter(request(origin.replace('http://', 'http://user:SECRET@'))),
    ).rejects.toMatchObject({ kind: 'security-blocked' });
    await expect(adapter({ ...request(origin), method: 'TRACE' })).rejects.toMatchObject({
      kind: 'unsupported-method',
    });
    expect(received).toBe(before);
  });
  it("forwards the page's own POST requests with their body", async () => {
    const result = await scan(`${origin}/with-api-call`, {
      networkAdapter: createPinnedAdapter(new Map([[origin, '127.0.0.1']])),
      settleMs: 200,
      maxPages: 1,
    });
    expect(posted).toContain('/api {"q":1}');
    expect(result.pages[0]?.capture?.complete).toBe(true);
  });
  it('does not follow a redirect to a forbidden destination or use browser fallback', async () => {
    const before = received;
    const result = await scan(`${origin}/redirect`, {
      networkAdapter: createPinnedAdapter(new Map([[origin, '127.0.0.1']])),
      settleMs: 0,
    });
    expect(received).toBe(before + 1);
    expect(result.pages[0]?.capture?.diagnostics.blocked).toBe(1);
    expect(JSON.stringify(result)).not.toContain('SECRET');
  });
});
