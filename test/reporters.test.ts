import { describe, expect, it } from 'vitest';
import { formatMarkdown, formatSarif, formatText } from '../src/reporters/index.js';
import { defaultRules } from '../src/rules/index.js';
import type { Finding, ScanResult } from '../src/types.js';

const finding = (overrides: Partial<Finding> = {}): Finding => ({
  ruleId: 'google-fonts',
  severity: 'error',
  message: 'Fonts are loaded from Google (1 request).',
  pageUrl: 'https://example.de/',
  evidence: ['https://fonts.googleapis.com/css2?family=Inter'],
  fix: 'Self-host the font files.',
  ...overrides,
});

const result = (findings: Finding[]): ScanResult => ({
  siteUrl: 'https://example.de/',
  lang: 'en',
  region: 'de',
  scannedAt: '2026-01-01T00:00:00.000Z',
  durationMs: 1234,
  pages: [
    {
      url: 'https://example.de/',
      finalUrl: 'https://example.de/',
      status: 200,
      requestCount: 3,
      cookieCount: 0,
    },
  ],
  findings,
  rules: defaultRules.map(({ check: _check, ...meta }) => meta),
});

describe('text', () => {
  it('confirms a clean scan without claiming compliance', () => {
    const output = formatText(result([]));
    expect(output).toContain('No problems found on 1 page');
    expect(output).toContain('not proof of GDPR compliance');
  });

  it('lists findings with evidence and fix', () => {
    const output = formatText(result([finding()]));
    expect(output).toContain('✖ Fonts are loaded from Google');
    expect(output).toContain('fonts.googleapis.com');
    expect(output).toContain('fix: Self-host');
  });
});

describe('markdown', () => {
  it('escapes pipes so table rows stay intact', () => {
    const output = formatMarkdown(result([finding({ message: 'a | b' })]));
    expect(output).toContain('a \\| b');
  });

  it('keeps Markdown in page URLs from rendering', () => {
    const pageUrl = 'https://example.de/x?![pwn](https://evil.example/p.png)';
    const output = formatMarkdown(result([finding({ pageUrl })]));
    expect(output).toContain(`#### \`${pageUrl}\``);
  });
});

describe('sarif', () => {
  const sarif = JSON.parse(formatSarif(result([finding(), finding({ severity: 'info' })])));
  const run = sarif.runs[0];

  it('declares every rule with the fields code scanning requires', () => {
    expect(run.tool.driver.rules).toHaveLength(defaultRules.length);
    for (const rule of run.tool.driver.rules) {
      expect(rule.shortDescription.text).toBeTruthy();
      expect(rule.fullDescription.text).toBeTruthy();
      expect(rule.help.text).toBeTruthy();
    }
  });

  it('maps severities and pages to stable locations', () => {
    expect(run.results.map((r: { level: string }) => r.level)).toEqual(['error', 'note']);
    expect(run.results[0].locations[0].physicalLocation.artifactLocation.uri).toBe(
      'privalint/example.de/index',
    );
    expect(run.results[0].partialFingerprints.primaryLocationLineHash).toMatch(/^[0-9a-f]{32}$/);
  });

  it('keeps fingerprints stable when only the message wording changes', () => {
    const fingerprint = (message: string) =>
      JSON.parse(formatSarif(result([finding({ message })]))).runs[0].results[0].partialFingerprints
        .primaryLocationLineHash;
    expect(fingerprint('1 request')).toBe(fingerprint('2 requests'));
  });
});

describe('German reports', () => {
  const german = (findings: Finding[]): ScanResult => ({ ...result(findings), lang: 'de' });

  it('writes the text summary in German', () => {
    const output = formatText(german([finding(), finding({ severity: 'warning' })]));
    expect(output).toContain('1 Fehler, 1 Warnung auf 1 Seite (1,2 s).');
    expect(output).toContain('Lösung: Self-host the font files.');
    expect(output).toContain('kein Nachweis der DSGVO-Konformität');
  });

  it('confirms a clean scan in German', () => {
    expect(formatText(german([]))).toContain('Keine Probleme auf 1 Seite gefunden (1,2 s).');
  });

  it('translates the Markdown headings', () => {
    const output = formatMarkdown(german([finding()]));
    expect(output).toContain('| | Regel | Befund |');
    expect(output).toContain('<summary>So beheben Sie es</summary>');
  });
});

describe('incomplete observations', () => {
  const incomplete: ScanResult = {
    ...result([]),
    coverage: 'partial',
    pages: [
      {
        ...result([]).pages[0]!,
        capture: {
          complete: false,
          document: true,
          diagnostics: {
            requests: 48,
            omittedRequests: 0,
            responses: 27,
            finished: 27,
            failed: 21,
            blocked: 21,
            httpErrors: 0,
            bytes: 0,
            issueCount: 21,
            dropped: 20,
            issues: [
              {
                kind: 'security-blocked',
                phase: 'before-consent',
                url: 'https://assets.example/[redacted]',
              },
            ],
          },
        },
        ruleEvaluations: [
          {
            ruleId: 'trackers-after-reject',
            status: 'not-evaluable',
            partial: true,
            reason: 'missing-observation',
          },
        ],
      },
    ],
    consent: { bannerFound: false, rejected: false, state: 'not-detected' },
  };

  it('does not print a green clean-scan conclusion for an incomplete scan', () => {
    const text = formatText(incomplete);
    expect(text).toContain('Observation incomplete');
    expect(text).toContain('48 requests');
    expect(text).toContain('21 failed (21 security blocks)');
    expect(text).toContain('trackers-after-reject: not-evaluable');
    expect(text).toContain('reject path untested');
    expect(text).not.toContain('No problems found');
    expect(text).not.toContain('✔');
    expect(formatMarkdown(incomplete)).toContain('Observation incomplete');
  });

  it('reports technical coverage in German without asserting a privacy violation', () => {
    const text = formatText({ ...incomplete, lang: 'de' });
    expect(text).toContain('Erfassung unvollständig');
    expect(text).toContain('Ablehnen-Pfad ungeprüft');
    expect(text).not.toContain('Keine Probleme auf');
  });

  it('keeps loading failures out of SARIF privacy alerts', () => {
    const run = JSON.parse(formatSarif(incomplete)).runs[0];
    expect(run.results).toEqual([]);
    expect(run.invocations[0].executionSuccessful).toBe(false);
    expect(run.invocations[0].toolExecutionNotifications[0].descriptor.id).toBe(
      'incomplete-observation',
    );
    expect(run.properties.observations[0].capture.diagnostics.failed).toBe(21);
  });
});
