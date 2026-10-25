import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { scan } from '../src/scanner.js';

const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));
const TYPES: Record<string, string> = { '.html': 'text/html', '.css': 'text/css' };

let server: Server;
let origin: string;

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    const file = normalize(join(FIXTURES, path.endsWith('/') ? `${path}index.html` : path));
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'text/plain' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const options = { offline: true, settleMs: 500 };

describe('scan', () => {
  it('reports nothing for a clean page', async () => {
    const result = await scan(`${origin}/clean/`, options);
    expect(result.findings).toEqual([]);
    expect(result.pages).toHaveLength(1);
  });

  it('crawls same-host links up to maxPages and checks each page', async () => {
    const result = await scan(`${origin}/clean/`, { ...options, maxPages: 5 });
    const visited = result.pages.map((page) => new URL(page.url).pathname);

    expect(visited).toContain('/clean/about.html');
    expect(visited).not.toContain('/clean/broschuere.pdf');
    expect(result.findings).toEqual([
      expect.objectContaining({ ruleId: 'impressum-link', pageUrl: `${origin}/clean/about.html` }),
    ]);
  });

  it('catches fonts, trackers, cookies and delayed pixels on a leaky page', async () => {
    const result = await scan(`${origin}/leaky/`, options);
    const summary = result.findings.map(({ ruleId, severity }) => `${ruleId}:${severity}`);

    expect(summary).toEqual(
      expect.arrayContaining([
        'google-fonts:error',
        'pre-consent-trackers:error',
        'impressum-link:warning',
      ]),
    );

    const vendors = result.findings
      .filter((finding) => finding.ruleId === 'pre-consent-trackers')
      .map((finding) => finding.message);
    expect(vendors.some((message) => message.startsWith('Google Analytics'))).toBe(true);
    expect(vendors.some((message) => message.startsWith('Meta Pixel'))).toBe(true);
  });
});
