#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { VERSION } from './meta.js';
import { FORMATS, type Format, format, formatText } from './reporters/index.js';
import { defaultRules } from './rules/index.js';
import { scan } from './scanner.js';
import type { Finding, Rule } from './types.js';

const FAIL_LEVELS = ['error', 'warning', 'never'] as const;
type FailLevel = (typeof FAIL_LEVELS)[number];

const EXIT_OK = 0;
const EXIT_FINDINGS = 1;
const EXIT_ERROR = 2;

const HELP = `privalint ${VERSION}
Find GDPR problems on a live website: trackers before consent, Google Fonts,
missing Impressum. Runs the site in a real browser.

Usage
  privalint <url> [options]

Options
  -p, --max-pages <n>     Crawl up to n pages on the same host (default 1)
  -f, --format <format>   ${FORMATS.join(' | ')} (default text)
  -o, --output <file>     Write the report to a file instead of stdout
      --fail-on <level>   error | warning | never (default error)
      --disable <rules>   Comma-separated rule ids to skip
      --settle <ms>       Wait this long after load for late tags (default 2000)
      --timeout <ms>      Navigation timeout per page (default 30000)
      --locale <locale>   Browser locale (default de-DE)
      --list-rules        Print the available rules and exit
  -h, --help              Show this help
  -v, --version           Show the version

Exit codes
  0  no findings at or above --fail-on
  1  findings at or above --fail-on
  2  invalid arguments or the scan failed
`;

class UsageError extends Error {}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'max-pages': { type: 'string', short: 'p' },
      format: { type: 'string', short: 'f', default: 'text' },
      output: { type: 'string', short: 'o' },
      'fail-on': { type: 'string', default: 'error' },
      disable: { type: 'string' },
      settle: { type: 'string' },
      timeout: { type: 'string' },
      locale: { type: 'string' },
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

  const target = parseTarget(positionals);
  const reportFormat = oneOf(values.format, FORMATS, '--format');
  const failOn = oneOf(values['fail-on'], FAIL_LEVELS, '--fail-on');
  const rules = selectRules(values.disable);

  const result = await scan(target.href, {
    rules,
    maxPages: positiveInt(values['max-pages'], '--max-pages'),
    settleMs: positiveInt(values.settle, '--settle'),
    timeoutMs: positiveInt(values.timeout, '--timeout'),
    locale: values.locale,
    onPage: (page) => process.stderr.write(`scanned ${page.finalUrl}\n`),
  });

  if (values.output) {
    await writeFile(values.output, format(result, reportFormat));
    process.stdout.write(`${formatText(result, process.stdout.isTTY)}\n`);
    process.stdout.write(`\nReport written to ${values.output}\n`);
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
    throw new UsageError('Expected exactly one URL. Run privalint --help for usage.');
  }
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme);
  } catch {
    throw new UsageError(`Not a valid URL: ${raw}`);
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
  throw new UsageError(`${flag} must be one of: ${allowed.join(', ')}`);
}

function positiveInt(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new UsageError(`${flag} must be a non-negative whole number`);
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
    throw new UsageError(`Unknown rule: ${unknown.join(', ')}. See privalint --list-rules.`);
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
