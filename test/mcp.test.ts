import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMcpServer, type McpServerOptions } from '../src/mcp.js';
import type { ScanOptions } from '../src/scanner.js';
import type { ScanResult } from '../src/types.js';

async function connect(options: McpServerOptions = {}): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createMcpServer(options).connect(serverSide);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientSide);
  return client;
}

const text = (result: unknown) => {
  const [first] = (result as CallToolResult).content;
  return first?.type === 'text' ? first.text : '';
};

const fakeResult = (siteUrl: string, lang: 'en' | 'de' = 'en'): ScanResult => ({
  siteUrl,
  lang,
  region: 'de',
  scannedAt: '2026-11-17T00:00:00.000Z',
  durationMs: 1,
  pages: [{ url: siteUrl, finalUrl: siteUrl, status: 200, requestCount: 1, cookieCount: 0 }],
  rules: [],
  findings: [
    {
      ruleId: 'impressum-link',
      severity: 'warning',
      message: 'No link to an Impressum found.',
      pageUrl: siteUrl,
      evidence: [],
      fix: 'Link the Impressum from every page.',
    },
  ],
});

describe('privalint MCP server', () => {
  it('offers scan_site and list_rules', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(['list_rules', 'scan_site']);
    const scanSite = tools.find((tool) => tool.name === 'scan_site');
    expect(scanSite?.inputSchema.required).toEqual(['url']);
    expect(scanSite?.annotations?.readOnlyHint).toBe(true);
  });

  it('passes the arguments to the scan and returns the Markdown report', async () => {
    const calls: { target: string; options: ScanOptions }[] = [];
    const client = await connect({
      scan: async (target, options) => {
        calls.push({ target, options });
        return fakeResult(target);
      },
    });
    const result = await client.callTool({
      name: 'scan_site',
      arguments: { url: 'example.com', maxPages: 3, checkClose: true, region: 'at', lang: 'de' },
    });
    expect(result.isError).toBeFalsy();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.target).toBe('https://example.com/');
    expect(calls[0]?.options).toMatchObject({
      maxPages: 3,
      concurrency: 3,
      region: 'at',
      lang: 'de',
      closeCheck: true,
      settingsCheck: false,
      acceptCheck: false,
      gpc: false,
    });
    expect(calls[0]?.options.signal).toBeInstanceOf(AbortSignal);
    expect(text(result)).toContain('impressum-link');
    expect(text(result)).toContain('Link the Impressum from every page.');
  });

  it.each([
    ['localhost:8080', 'https://localhost:8080/'],
    ['HTTP://Example.com/shop', 'http://example.com/shop'],
  ])('reads %s as %s', async (url, expected) => {
    const targets: string[] = [];
    const client = await connect({
      scan: async (target) => {
        targets.push(target);
        return fakeResult(target);
      },
    });
    const result = await client.callTool({ name: 'scan_site', arguments: { url } });
    expect(result.isError).toBeFalsy();
    expect(targets).toEqual([expected]);
  });

  it('returns the JSON report on request', async () => {
    const client = await connect({ scan: async (target) => fakeResult(target) });
    const result = await client.callTool({
      name: 'scan_site',
      arguments: { url: 'https://example.com', report: 'json' },
    });
    const report = JSON.parse(text(result)) as ScanResult;
    expect(report.findings[0]?.ruleId).toBe('impressum-link');
    expect(report.evaluations).toBe('summary');
  });

  it.each([
    'ftp://example.com',
    'https://',
    'javascript:alert(1)',
    'mailto:a@example.com',
    'http:',
    'https:/example.com',
    'https://user:secret@example.com',
  ])('rejects %s without scanning', async (url) => {
    let scanned = false;
    const client = await connect({
      scan: async (target) => {
        scanned = true;
        return fakeResult(target);
      },
    });
    const result = await client.callTool({ name: 'scan_site', arguments: { url } });
    expect(result.isError).toBe(true);
    expect(scanned).toBe(false);
    expect(text(result)).not.toContain('secret');
  });

  it('refuses more pages than one call may crawl', async () => {
    const client = await connect({ scan: async (target) => fakeResult(target) });
    const result = await client.callTool({
      name: 'scan_site',
      arguments: { url: 'https://example.com', maxPages: 21 },
    });
    expect(result.isError).toBe(true);
  });

  it('aborts the scan when the client cancels the call', async () => {
    let started = false;
    let signal: AbortSignal | undefined;
    const client = await connect({
      scan: (_target, options) => {
        started = true;
        signal = options.signal;
        return new Promise(() => undefined);
      },
    });
    const controller = new AbortController();
    const call = client.callTool(
      { name: 'scan_site', arguments: { url: 'https://example.com' } },
      undefined,
      { signal: controller.signal },
    );
    await expect.poll(() => started).toBe(true);
    expect(signal?.aborted).toBe(false);
    controller.abort();
    await expect(call).rejects.toThrow();
    await expect.poll(() => signal?.aborted).toBe(true);
  });

  it('passes the scan error on', async () => {
    const client = await connect({
      scan: async () => {
        throw new Error('Chromium for Playwright 1.0.0 is not installed.');
      },
    });
    const result = await client.callTool({
      name: 'scan_site',
      arguments: { url: 'https://example.com' },
    });
    expect(result.isError).toBe(true);
    expect(text(result)).toBe('The scan failed: Chromium for Playwright 1.0.0 is not installed.');
  });

  it('lists the rules with the legal references of the region', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'list_rules', arguments: { region: 'at' } });
    const { region, rules } = JSON.parse(text(result)) as {
      region: string;
      rules: { id: string; references: string[]; docs: string }[];
    };
    expect(region).toBe('at');
    const preConsent = rules.find((rule) => rule.id === 'pre-consent-trackers');
    expect(preConsent?.references.join(' ')).toContain('TKG');
    expect(preConsent?.docs).toMatch(/docs\/rules\/pre-consent-trackers\.md$/);
  });
});

describe('privalint MCP server with a real browser', () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    server = createServer((_req, res) => {
      res
        .writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        .end('<!doctype html><html lang="en"><title>Shop</title><main>Hello</main></html>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('scans a page and reports the missing Impressum', async () => {
    const client = await connect();
    const progress: string[] = [];
    const result = await client.callTool(
      { name: 'scan_site', arguments: { url: `${origin}/` } },
      undefined,
      { onprogress: (event) => progress.push(event.message ?? ''), timeout: 60_000 },
    );
    expect(result.isError).toBeFalsy();
    expect(text(result)).toContain('impressum-link');
    expect(progress).toContain('completed');
  }, 60_000);
});
