import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { type APIRequestContext, request } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { httpsTransport } from '../src/rules/index.js';
import { probeHttp } from '../src/transport.js';
import type { PageSnapshot } from '../src/types.js';
import { SITE, snapshot } from './helpers.js';

const run = (page: PageSnapshot) => httpsTransport.check({ siteUrl: SITE, page, lang: 'en' });

describe('https-transport', () => {
  it('passes HTTPS with a redirect from HTTP and HSTS', () => {
    const page = snapshot({ transport: { https: true, hsts: true, httpRedirectsToHttps: true } });
    expect(run(page)).toEqual([]);
  });

  it('reports a start page served over plain HTTP as an error', () => {
    const page = snapshot({ finalUrl: 'http://example.de/', transport: { https: false } });
    expect(run(page)).toMatchObject([{ severity: 'error' }]);
  });

  it('warns when http:// answers without redirecting', () => {
    const page = snapshot({ transport: { https: true, hsts: true, httpRedirectsToHttps: false } });
    expect(run(page)).toMatchObject([{ severity: 'warning', evidence: ['http://example.de/'] }]);
  });

  it('notes a missing HSTS header as info', () => {
    const page = snapshot({ transport: { https: true, hsts: false, httpRedirectsToHttps: true } });
    expect(run(page)).toMatchObject([{ severity: 'info' }]);
  });

  it('leaves development servers on localhost alone', () => {
    const page = snapshot({ finalUrl: 'http://127.0.0.1:3000/', transport: { https: false } });
    expect(run(page)).toEqual([]);
  });
});

describe('probeHttp', () => {
  let api: APIRequestContext;
  let redirecting: Server;
  let plain: Server;
  const listen = async (server: Server) => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  };

  beforeAll(async () => {
    api = await request.newContext();
    redirecting = createServer((_req, res) =>
      res.writeHead(301, { location: 'https://example.de/' }).end(),
    );
    plain = createServer((_req, res) => res.writeHead(200).end('hello'));
  });

  afterAll(async () => {
    await api.dispose();
    redirecting.close();
    plain.close();
  });

  it('recognises a redirect to HTTPS without following it', async () => {
    expect(await probeHttp(api, await listen(redirecting))).toBe(true);
  });

  it('recognises a page served in clear text', async () => {
    expect(await probeHttp(api, await listen(plain))).toBe(false);
  });

  it('counts a refused connection as nothing served over HTTP', async () => {
    const closed = createServer();
    const url = await listen(closed);
    await new Promise<void>((resolve) => closed.close(() => resolve()));
    expect(await probeHttp(api, url)).toBe(true);
  });
});
