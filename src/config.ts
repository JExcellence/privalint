import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LANGS, type Lang } from './i18n.js';
import { REGIONS, type Region } from './legal.js';
import { validateRuleSettings } from './policy.js';
import { defaultRules } from './rules/index.js';
import type { RuleSettings } from './types.js';

export interface PrivalintConfig {
  url?: string;
  maxPages?: number;
  settleMs?: number;
  timeoutMs?: number;
  locale?: string;
  lang?: Lang;
  region?: Region;
  consentCheck?: boolean;
  rules?: RuleSettings;
  allow?: { vendors: string[] };
}

const KEYS = [
  'url',
  'maxPages',
  'settleMs',
  'timeoutMs',
  'locale',
  'lang',
  'region',
  'consentCheck',
  'rules',
  'allow',
];
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function invalid(): never {
  throw new TypeError(
    'Invalid privalint config. See docs/configuration.md for the supported JSON fields.',
  );
}

/** JSON only; no execution of repository-supplied code. Reject typos instead of ignoring them. */
export function parseConfig(value: unknown): PrivalintConfig {
  if (!record(value) || Object.keys(value).some((key) => !KEYS.includes(key))) invalid();
  for (const key of ['url', 'locale']) {
    if (value[key] !== undefined && (typeof value[key] !== 'string' || !value[key].trim()))
      invalid();
  }
  if (typeof value.url === 'string') {
    let url: URL;
    try {
      url = new URL(value.url);
    } catch {
      invalid();
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) invalid();
  }
  for (const key of ['maxPages', 'settleMs', 'timeoutMs']) {
    const number = value[key];
    if (
      number !== undefined &&
      (typeof number !== 'number' ||
        !Number.isSafeInteger(number) ||
        number < (key === 'settleMs' ? 0 : 1))
    )
      invalid();
  }
  if (value.lang !== undefined && !LANGS.includes(value.lang as Lang)) invalid();
  if (value.region !== undefined && !REGIONS.includes(value.region as Region)) invalid();
  if (value.consentCheck !== undefined && typeof value.consentCheck !== 'boolean') invalid();
  if (value.rules !== undefined) {
    if (!record(value.rules)) invalid();
    validateRuleSettings(value.rules as RuleSettings, defaultRules);
  }
  if (value.allow !== undefined) {
    if (
      !record(value.allow) ||
      Object.keys(value.allow).some((key) => key !== 'vendors') ||
      !Array.isArray(value.allow.vendors) ||
      !value.allow.vendors.every(
        (vendor) => typeof vendor === 'string' && vendor.trim().length > 0 && vendor.length <= 200,
      )
    )
      invalid();
  }
  // Copy only validated fields into ordinary objects, avoiding prototype-bearing input objects.
  return JSON.parse(JSON.stringify(value)) as PrivalintConfig;
}

export async function loadConfig(file?: string, cwd = process.cwd()): Promise<PrivalintConfig> {
  let text: string;
  try {
    text = await readFile(file ?? join(cwd, 'privalint.config.json'), 'utf8');
  } catch (error) {
    if (file === undefined && error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return {};
    throw new Error('Could not read privalint config file.');
  }
  if (Buffer.byteLength(text) > 64 * 1024) invalid();
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    invalid();
  }
  return parseConfig(value);
}
