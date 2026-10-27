import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig, parseConfig } from '../src/config.js';
import { applyPolicy } from '../src/policy.js';
import { defaultRules } from '../src/rules/index.js';
import { scan } from '../src/scanner.js';
import type { Finding } from '../src/types.js';

const temporary: string[] = [];
beforeAll(async () => {
  await promisify(execFile)(process.execPath, [
    'node_modules/typescript/bin/tsc',
    '-p',
    'tsconfig.build.json',
  ]);
});
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
async function directory() {
  const path = await mkdtemp(join(tmpdir(), 'privalint-config-'));
  temporary.push(path);
  return path;
}

describe('JSON configuration', () => {
  it('loads the default file and allows absent defaults', async () => {
    const cwd = await directory();
    expect(await loadConfig(undefined, cwd)).toEqual({});
    const config = {
      url: 'https://example.org/',
      maxPages: 4,
      rules: { 'google-fonts': 'warning' },
      allow: { vendors: ['Matomo'] },
    };
    await writeFile(join(cwd, 'privalint.config.json'), JSON.stringify(config));
    expect(await loadConfig(undefined, cwd)).toEqual(config);
    await expect(loadConfig(join(cwd, 'missing.json'))).rejects.toThrow('Could not read');
  });
  it.each([
    null,
    [],
    { unknown: true },
    { maxPages: 0 },
    { settleMs: -1 },
    { timeoutMs: 1.5 },
    { region: 'xx' },
    { lang: 'xx' },
    { consentCheck: 'false' },
    { rules: { typo: 'off' } },
    { rules: { 'google-fonts': 'critical' } },
    { allow: { vendors: [1] } },
    { allow: { hosts: ['example.org'] } },
    { url: 'https://user:SECRET@example.org' },
    { url: 'file:///SECRET' },
  ])('rejects invalid input without disclosing supplied data: %j', (value) => {
    expect(() => parseConfig(value)).toThrow();
  });
  it('rejects malformed and oversized files without echoing their contents', async () => {
    const cwd = await directory();
    const path = join(cwd, 'config.json');
    await writeFile(path, '{"SECRET":');
    await expect(loadConfig(path)).rejects.toThrow('Invalid privalint config');
    await writeFile(path, ' '.repeat(65 * 1024));
    await expect(loadConfig(path)).rejects.toThrow('Invalid privalint config');
  });
  it('retains exact vendor allowlist matches as info and applies explicit severity after region', () => {
    const finding: Finding = {
      ruleId: 'pre-consent-trackers',
      severity: 'error',
      message: 'Observed',
      pageUrl: 'https://example.org',
      evidence: [],
      subject: 'Matomo',
    };
    expect(applyPolicy([finding], {}, ['Matomo'])).toMatchObject([
      { severity: 'info', policy: { allowed: true, originalSeverity: 'error' } },
    ]);
    expect(applyPolicy([finding], {}, ['matomo'])[0]?.severity).toBe('error');
    expect(applyPolicy([finding], { 'pre-consent-trackers': 'warning' })[0]?.severity).toBe(
      'warning',
    );
    expect(applyPolicy([finding], { 'pre-consent-trackers': 'off' })).toEqual([]);
  });
  it('applies policy in scan and exposes disabled rules explicitly', async () => {
    const result = await scan('https://config.invalid', {
      settleMs: 0,
      consentCheck: false,
      networkAdapter: async () => ({
        status: 200,
        headers: { 'content-type': 'text/html' },
        body: '<script src="https://www.google-analytics.com/g.js"></script>',
      }),
      ruleSettings: { 'impressum-link': 'off', 'pre-consent-trackers': 'warning' },
      allow: { vendors: ['Google Analytics'] },
    });
    expect(result.findings.find((finding) => finding.subject === 'Google Analytics')).toMatchObject(
      { severity: 'info', policy: { allowed: true } },
    );
    expect(result.pages[0]?.ruleEvaluations).toContainEqual(
      expect.objectContaining({
        ruleId: 'impressum-link',
        status: 'skipped',
        explanation: 'disabled',
      }),
    );
    expect(result.options?.allowedVendors).toEqual(['Google Analytics']);
  });
  it('supports config URL and applies CLI flags ahead of config', async () => {
    const cwd = await directory();
    const server = createServer((_request, response) => {
      response
        .writeHead(200, { 'content-type': 'text/html' })
        .end('<a href="/impressum">Impressum</a><a href="/privacy">Privacy policy</a>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    await writeFile(
      join(cwd, 'privalint.config.json'),
      JSON.stringify({
        url,
        maxPages: 4,
        lang: 'de',
        region: 'at',
        rules: Object.fromEntries(defaultRules.map((rule) => [rule.id, 'off'])),
      }),
    );
    try {
      const cli = resolve('dist/cli.js');
      const { stdout } = await promisify(execFile)(
        process.execPath,
        [
          cli,
          '--max-pages',
          '1',
          '--lang',
          'en',
          '--region',
          'eu',
          '--settle',
          '0',
          '--skip-consent',
          '--format',
          'json',
        ],
        { cwd },
      );
      const report = JSON.parse(stdout);
      expect(report.options).toMatchObject({
        maxPages: 1,
        lang: 'en',
        region: 'eu',
        consentCheck: false,
      });
      expect(report.siteUrl).toBe(`${url}/`);
      expect(report.findings).toEqual([]);
      await expect(
        promisify(execFile)(process.execPath, [cli, '--max-pages', '0'], { cwd }),
      ).rejects.toMatchObject({ stderr: expect.stringContaining('--max-pages') });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
