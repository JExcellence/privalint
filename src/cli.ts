#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig } from './config.js';
import { diagnosticUrl } from './diagnostics.js';
import { LANGS } from './i18n.js';
import { REGIONS } from './legal.js';
import { VERSION } from './meta.js';
import { FORMATS, type Format, format, formatText } from './reporters/index.js';
import { defaultRules } from './rules/index.js';
import { scan } from './scanner.js';
import type { Finding, Rule } from './types.js';

const FAIL_LEVELS = ['error', 'warning', 'never'] as const;
const CHANNELS = ['chrome', 'msedge'] as const;
type FailLevel = (typeof FAIL_LEVELS)[number];

const EXIT_OK = 0;
const EXIT_FINDINGS = 1;
const EXIT_ERROR = 2;

const HELP = `privalint ${VERSION}
Find GDPR problems on a live website: trackers before consent or after
"reject", Google Fonts, missing Impressum. Runs the site in a real browser.

Usage
  privalint <url> [options]

Options
  -p, --max-pages <n>     Crawl up to n pages of the same site (default 1)
  -f, --format <format>   ${FORMATS.join(' | ')} (default text)
  -o, --output <file>     Write the report to a file and print a text summary.
                          Repeatable; .sarif, .json and .md pick their format,
                          other extensions use --format
      --fail-on <level>   error | warning | never (default error)
      --disable <rules>   Comma-separated rule ids to skip
      --config <file>     JSON config (default: ./privalint.config.json when present)
      --settle <ms>       Wait this long after load for late tags (default 2000)
      --timeout <ms>      Navigation timeout per page (default 30000)
      --locale <locale>   Browser locale (default de-DE)
      --lang <lang>       Language of the report: en | de (default en)
      --region <region>   Whose law to cite: de | at | ch | eu (default de)
      --skip-consent      Don't click "reject" on the consent banner
      --consent           Enable consent checking even if the JSON config disables it
      --headed            Open a visible browser window instead of running headless
      --channel <name>    Use an installed browser: chrome or msedge
      --list-rules        Print the available rules and exit
  -h, --help              Show this help
  -v, --version           Show the version

Exit codes
  0  no findings at or above --fail-on
  1  findings at or above --fail-on
  2  invalid arguments or the scan failed
`;

const FORMAT_BY_EXTENSION: Record<string, Format> = {
  '.sarif': 'sarif',
  '.json': 'json',
  '.md': 'markdown',
};

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'max-pages': { type: 'string', short: 'p' },
      format: { type: 'string', short: 'f', default: 'text' },
      output: { type: 'string', short: 'o', multiple: true },
      'fail-on': { type: 'string', default: 'error' },
      disable: { type: 'string' },
      config: { type: 'string' },
      settle: { type: 'string' },
      timeout: { type: 'string' },
      locale: { type: 'string' },
      lang: { type: 'string' },
      region: { type: 'string' },
      'skip-consent': { type: 'boolean' },
      consent: { type: 'boolean' },
      headed: { type: 'boolean' },
      channel: { type: 'string' },
      'list-rules': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });

  if (values.help) {
    process.stdout.write(HELP);
    return EXIT_OK;
  }
  if (values.version) {
    process.stdout.write(`${VERSION}\n`);
    return EXIT_OK;
  }
  if (values['list-rules']) {
    for (const rule of defaultRules) {
      process.stdout.write(`${rule.id.padEnd(22)} ${rule.title}\n`);
    }
    return EXIT_OK;
  }

  const config = await loadConfig(values.config);
  const target = parseTarget(positionals.length === 0 && config.url ? [config.url] : positionals);
  const reportFormat = oneOf(values.format, FORMATS, '--format');
  const failOn = oneOf(values['fail-on'], FAIL_LEVELS, '--fail-on');
  const rules = selectRules(values.disable);
  if (values.consent && values['skip-consent']) {
    throw new Error('Use either --consent or --skip-consent, not both.');
  }

  const result = await scan(target.href, {
    rules,
    ...(config.rules === undefined ? {} : { ruleSettings: config.rules }),
    ...(config.allow === undefined ? {} : { allow: config.allow }),
    maxPages: wholeNumber(values['max-pages'], '--max-pages', 1) ?? config.maxPages,
    settleMs: wholeNumber(values.settle, '--settle', 0) ?? config.settleMs,
    timeoutMs: wholeNumber(values.timeout, '--timeout', 1) ?? config.timeoutMs,
    locale: values.locale ?? config.locale,
    lang: oneOf(values.lang ?? config.lang ?? 'en', LANGS, '--lang'),
    region: oneOf(values.region ?? config.region ?? 'de', REGIONS, '--region'),
    consentCheck:
      values.consent === true
        ? true
        : values['skip-consent'] === true
          ? false
          : (config.consentCheck ?? true),
    headed: values.headed === true,
    channel:
      values.channel === undefined ? undefined : oneOf(values.channel, CHANNELS, '--channel'),
    onPage: (page) =>
      process.stderr.write(
        page.error === undefined
          ? `scanned ${diagnosticUrl(page.finalUrl)}\n`
          : `skipped ${diagnosticUrl(page.url)}: ${page.error}\n`,
      ),
  });

  const outputs = values.output ?? [];
  for (const file of outputs) {
    const kind = FORMAT_BY_EXTENSION[extname(file).toLowerCase()] ?? reportFormat;
    await writeFile(file, format(result, kind));
  }

  if (outputs.length > 0) {
    process.stdout.write(`${formatText(result, process.stdout.isTTY)}\n`);
    process.stdout.write(`\nReport written to ${outputs.join(', ')}\n`);
  } else {
    process.stdout.write(format(result, reportFormat, { color: process.stdout.isTTY }));
    if (reportFormat === 'text') {
      process.stdout.write('\n');
    }
  }

  return shouldFail(result.findings, failOn) ? EXIT_FINDINGS : EXIT_OK;
}

function parseTarget(positionals: string[]): URL {
  const [raw, ...rest] = positionals;
  if (raw === undefined || rest.length > 0) {
    throw new Error('Expected exactly one URL. Run privalint --help for usage.');
  }
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme);
  } catch {
    throw new Error('Not a valid HTTP(S) URL.');
  }
}

function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  flag: string,
): T {
  if (value !== undefined && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new Error(`${flag} must be one of: ${allowed.join(', ')}`);
}

function wholeNumber(value: string | undefined, flag: string, min: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`${flag} must be a whole number of at least ${min}`);
  }
  return parsed;
}

function selectRules(disable: string | undefined): Rule[] {
  const disabled = new Set(
    (disable ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
  const unknown = [...disabled].filter((id) => !defaultRules.some((rule) => rule.id === id));
  if (unknown.length > 0) {
    throw new Error(`Unknown rule: ${unknown.join(', ')}. See privalint --list-rules.`);
  }
  return defaultRules.filter((rule) => !disabled.has(rule.id));
}

function shouldFail(findings: Finding[], failOn: FailLevel): boolean {
  switch (failOn) {
    case 'never':
      return false;
    case 'warning':
      return findings.some((f) => f.severity === 'error' || f.severity === 'warning');
    default:
      return findings.some((f) => f.severity === 'error');
  }
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`privalint: ${message}\n`);
    process.exitCode = EXIT_ERROR;
  },
);
