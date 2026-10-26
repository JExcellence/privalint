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
