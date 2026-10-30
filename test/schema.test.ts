import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { assessCoverage } from '../src/coverage.js';
import { identifyReportSchema, REPORT_SCHEMA_VERSION } from '../src/report-contract.js';
import { formatSarif } from '../src/reporters/sarif.js';
import { scan } from '../src/scanner.js';
import type { ScanResult } from '../src/types.js';

const readJson = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const ajv = new Ajv2020({ strict: true, allErrors: true });
const schemas = new Map(
  await Promise.all(
    ['1.0.0', '1.1.0', '1.2.0', '1.3.0'].map(async (version) => {
      const report = ajv.compile(
        (await readJson(`../schemas/report-${version}.schema.json`)) as object,
      );
      const sarif = ajv.compile(
        (await readJson(`../schemas/sarif-properties-${version}.schema.json`)) as object,
      );
      return [version, { report, sarif }] as const;
    }),
  ),
);
const fixture = async (name: string) => readJson(`./fixtures/reports/${name}.json`);

describe('standalone report contracts', () => {
  it.each(['complete', 'partial', 'skipped', 'policy-overridden', 'v1.0.0'])(
    'validates the %s fixture and its SARIF properties',
    async (name) => {
      const value = await fixture(name);
      const identity = identifyReportSchema(value);
      expect(identity.kind).toBe('supported');
      if (identity.kind !== 'supported') throw new Error('Expected a supported fixture');
      const validators = schemas.get(identity.version);
      expect(validators?.report(value), JSON.stringify(validators?.report.errors)).toBe(true);
      const report = value as ScanResult;
      const properties = JSON.parse(formatSarif(report)).runs[0].properties;
      expect(validators?.sarif(properties), JSON.stringify(validators?.sarif.errors)).toBe(true);
      for (const page of report.pages) {
        const counters = page.capture?.diagnostics;
        expect(counters?.requests).toBe(
          (counters?.finished ?? 0) +
            (counters?.failedRequests ?? 0) +
            (counters?.skippedRequests ?? 0) +
            (counters?.securityBlockedRequests ?? 0),
        );
        if (identity.version !== '1.0.0') {
          expect(page.ruleEvaluations?.every((rule) => rule.pageId === page.pageId)).toBe(true);
        }
      }
    },
  );
  it('accepts cancelled-by-page only from schema 1.2.0 on', async () => {
    const value = (await fixture('complete')) as ScanResult;
    value.pages[0]?.capture?.diagnostics.issues.push({
      kind: 'skipped',
      phase: 'before-consent',
      url: 'https://example.org/[redacted]',
      skippedReason: 'cancelled-by-page',
    });
    const validate = (version: string) =>
      schemas.get(version)?.report({ ...value, schemaVersion: version });
    expect(validate('1.2.0')).toBe(true);
    expect(validate('1.1.0')).toBe(false);
  });

  it('accepts the settings-layer check only from schema 1.3.0 on', async () => {
    const value = (await fixture('complete')) as ScanResult;
    value.consent = {
      ...(value.consent ?? { bannerFound: true, rejected: false }),
      settings: {
        outcome: 'saved',
        reason: 'settings-saved-and-reloaded',
        openLabel: 'Einstellungen',
        saveLabel: 'Auswahl speichern',
        switchedOff: 2,
        afterSaveComplete: true,
      },
    };
    value.pages[0]?.ruleEvaluations?.push({
      ...(value.pages[0].pageId === undefined ? {} : { pageId: value.pages[0].pageId }),
      ruleId: 'trackers-after-settings',
      status: 'skipped',
      reason: 'settings-check-disabled',
      partial: false,
      outcome: 'not-evaluable',
      explanation: 'settings-check-disabled',
      findingCount: 0,
    });
    const validate = (version: string) =>
      schemas.get(version)?.report({ ...value, schemaVersion: version });
    expect(validate('1.3.0')).toBe(true);
    expect(validate('1.2.0')).toBe(false);
    const broken = { ...value, consent: { ...value.consent, settings: { outcome: 'maybe' } } };
    expect(schemas.get('1.3.0')?.report({ ...broken, schemaVersion: '1.3.0' })).toBe(false);
  });

  it('accepts the Hungary region only from schema 1.3.0 on', async () => {
    const value = (await fixture('complete')) as ScanResult;
    const hungarian = { ...value, region: 'hu' } as ScanResult;
    if (hungarian.options) hungarian.options = { ...hungarian.options, region: 'hu' };
    const validate = (version: string) =>
      schemas.get(version)?.report({ ...hungarian, schemaVersion: version });
    expect(validate('1.3.0')).toBe(true);
    expect(validate('1.2.0')).toBe(false);
  });

  it('never interprets a legacy or unknown report as valid/current or complete', async () => {
    const legacy = await fixture('legacy');
    expect(identifyReportSchema(legacy)).toEqual({ kind: 'legacy' });
    expect(schemas.get(REPORT_SCHEMA_VERSION)?.report(legacy)).toBe(false);
    expect(assessCoverage(legacy as ScanResult)).toEqual({
      complete: false,
      issues: [{ reason: 'legacy-report' }],
    });
    expect(identifyReportSchema({ schemaVersion: '999.0.0' })).toEqual({
      kind: 'unsupported',
      version: '999.0.0',
    });
    expect(identifyReportSchema({ schemaVersion: null })).toEqual({ kind: 'unsupported' });
    expect(identifyReportSchema(null)).toEqual({ kind: 'unsupported' });
  });
  it.each([
    'missing-version',
    'missing-identity',
    'negative-counter',
    'invalid-outcome',
    'contradictory-success',
    'unsafe-diagnostic-url',
    'contradictory-capture',
  ])('rejects %s rather than silently filling fields', async (mutation) => {
    const value = (await fixture('complete')) as ScanResult;
    const page = value.pages[0];
    if (!page) throw new Error('Fixture missing page');
    if (mutation === 'missing-version') delete value.schemaVersion;
    if (mutation === 'missing-identity') delete page.pageId;
    if (mutation === 'negative-counter' && page.capture) page.capture.diagnostics.failed = -1;
    if (mutation === 'contradictory-capture' && page.capture)
      page.capture.diagnostics.failedRequests = 1;
    const evaluation = page.ruleEvaluations?.[0];
    if (mutation === 'invalid-outcome' && evaluation)
      Reflect.set(evaluation, 'outcome', 'probably-fine');
    if (mutation === 'contradictory-success' && evaluation)
      Object.assign(evaluation, { outcome: 'checked-no-finding', partial: true });
    if (mutation === 'unsafe-diagnostic-url' && page.capture)
      page.capture.diagnostics.issues.push({
        kind: 'dns',
        phase: 'before-consent',
        url: 'https://user:password@example.org/private?token=example',
      });
    expect(schemas.get(REPORT_SCHEMA_VERSION)?.report(value)).toBe(false);
  });
  it('validates live output instead of relying only on hand-maintained fixtures', async () => {
    const value = await scan('https://schema.invalid/', {
      settleMs: 0,
      networkAdapter: async () => ({
        status: 200,
        headers: { 'content-type': 'text/html' },
        body: '<div>Cookies <button>Accept all</button><button>Reject all</button></div><a href="/impressum">Impressum</a><a href="/privacy">Privacy policy</a>',
      }),
    });
    const validator = schemas.get(REPORT_SCHEMA_VERSION)?.report;
    expect(validator?.(value), JSON.stringify(validator?.errors)).toBe(true);
  });
  it('ships schemas as addressable package artifacts without a runtime validator dependency', () => {
    const require = createRequire(import.meta.url);
    expect(require.resolve('privalint/schemas/report-1.1.0.schema.json')).toContain(
      'report-1.1.0.schema.json',
    );
  });
});
