// Generates src/data/open-cookie-database.ts from the Open Cookie Database
// (https://github.com/jkwakman/Open-Cookie-Database, Apache-2.0, see NOTICE).
// Run with `npm run cookies:build`. To pick up upstream changes, set COMMIT to a newer commit
// of the database, run the script and review the diff of the generated file.
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUTPUT = join(ROOT, 'src', 'data', 'open-cookie-database.ts');
const REPOSITORY = 'https://github.com/jkwakman/Open-Cookie-Database';
const COMMIT = '81813835edc9682113a4d95989358da5256d30c1';
const CSV_URL = `https://raw.githubusercontent.com/jkwakman/Open-Cookie-Database/${COMMIT}/open-cookie-database.csv`;

const COLUMNS = [
  'ID',
  'Platform',
  'Category',
  'Cookie / Data Key name',
  'Domain',
  'Description',
  'Retention period',
  'Data Controller',
  'User Privacy & GDPR Rights Portals',
  'Wildcard match',
];

// The database's categories are Functional, Necessary, Personalization, Analytics, Marketing and
// Security. Only the last two need consent as trackers; everything else is left out.
const CATEGORIES = new Map([
  ['Analytics', 'analytics'],
  ['Marketing', 'advertising'],
]);

// Names shorter than this are too likely to be set by something else (`td`, `fr`, `SID`, `uid`).
const MIN_LENGTH = 4;

// Names that are long enough but still generic: a site's own code or an unrelated library can set
// a cookie with the same name, so a match says nothing about the vendor. Compared case-insensitively
// against the name (exact names) or the prefix (wildcard names).
const GENERIC = new Set([
  // Words any app might use for its own session, user, device or settings cookie.
  'anon',
  'apidomain_',
  'audit',
  'auid',
  'auth_token',
  'c_user',
  'comp',
  'data-',
  'done_redirects',
  'europe',
  'geoip',
  'hash',
  'initref',
  'js_ver',
  'l_page',
  'locale',
  'm_user',
  'partner-',
  'recs',
  'recs-',
  'ref-',
  'session',
  'sessionid',
  'sync',
  'test',
  'token',
  'user',
  'uids',
  'usersync',
  'uuid',
  'version',
  'viewer',
  'visitor',
  'visitor-id',
  'visitor_id',
  // Kept for clarity although MIN_LENGTH already drops them.
  'id',
  'lang',
  'uid',
]);

// Cookies that store a consent or opt-out choice (`euconsent`, `mtm_consent_removed`,
// `__gpi_optout`, `matomo_ignore`, `ppms_privacy_…`). Consent tools and the vendors' own opt-out
// switches set them after a reject too, so they are not evidence of tracking.
const CONSENT_STATE = /consent|privacy|opt_?out|opout|optin|accepted|gdpr|ignore/i;

// RFC 6265 cookie-name token. The database also lists SDK storage keys such as
// `barometric[cuid]` or placeholders such as `pagead/conv/%INTEGER%`, which are not cookie names.
const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/** Parses RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF line ends. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Turns a database row into `{ vendor, category, name, wildcard }`, or a reason to skip it. */
function toCookie(record) {
  const category = CATEGORIES.get(record.Category);
  if (category === undefined) {
    return { skip: 'category' };
  }
  let name = record['Cookie / Data Key name'].trim();
  let wildcard = record['Wildcard match'].trim() === '1';
  // A few rows mark the wildcard with a trailing `*` instead of the column.
  if (name.endsWith('*')) {
    name = name.slice(0, -1);
    wildcard = true;
  }
  if (!COOKIE_NAME.test(name)) {
    return { skip: 'not a cookie name' };
  }
  if (name.length < MIN_LENGTH) {
    return { skip: 'too short' };
  }
  if (GENERIC.has(name.toLowerCase())) {
    return { skip: 'generic' };
  }
  if (CONSENT_STATE.test(name)) {
    return { skip: 'consent state' };
  }
  return { vendor: record.Platform.trim(), category, name, wildcard };
}

function build(rows) {
  const [header, ...body] = rows;
  if (header.join() !== COLUMNS.join()) {
    throw new Error(`Unexpected CSV columns: ${header.join(', ')}`);
  }
  const skipped = new Map();
  const cookies = [];
  for (const values of body.filter((row) => row.some((value) => value !== ''))) {
    const record = Object.fromEntries(COLUMNS.map((column, i) => [column, values[i] ?? '']));
    const cookie = toCookie(record);
    if (cookie.skip === undefined) {
      cookies.push(cookie);
    } else {
      skipped.set(cookie.skip, (skipped.get(cookie.skip) ?? 0) + 1);
    }
  }

  // A name listed for more than one vendor cannot be attributed, so it is left out.
  const vendorsByName = new Map();
  for (const { vendor, name, wildcard } of cookies) {
    const key = `${wildcard}:${name}`;
    vendorsByName.set(key, (vendorsByName.get(key) ?? new Set()).add(vendor));
  }
  const groups = new Map();
  for (const { vendor, category, name, wildcard } of cookies) {
    if (vendorsByName.get(`${wildcard}:${name}`).size > 1) {
      skipped.set('ambiguous vendor', (skipped.get('ambiguous vendor') ?? 0) + 1);
      continue;
    }
    const key = `${vendor}\u0000${category}`;
    const group = groups.get(key) ?? { vendor, category, names: new Set(), prefixes: new Set() };
    (wildcard ? group.prefixes : group.names).add(name);
    groups.set(key, group);
  }

  const byText = (a, b) => (a < b ? -1 : Number(a > b));
  const entries = [...groups.values()]
    .map((group) => ({
      vendor: group.vendor,
      category: group.category,
      names: [...group.names].sort(byText),
      prefixes: [...group.prefixes].sort(byText),
    }))
    .sort((a, b) => byText(a.vendor, b.vendor) || byText(a.category, b.category));
  return { entries, skipped };
}

function render(entries) {
  const list = (values) => `[${values.map((value) => JSON.stringify(value)).join(', ')}]`;
  const lines = entries.map(
    ({ vendor, category, names, prefixes }) =>
      `{ vendor: ${JSON.stringify(vendor)}, category: '${category}', names: ${list(names)}, prefixes: ${list(prefixes)} },`,
  );
  return `// Generated by scripts/build-cookie-trackers.mjs. Do not edit by hand; run \`npm run cookies:build\`.
// Derived from the Open Cookie Database by Jack Kwakman, licensed under Apache-2.0 (see NOTICE).
// Source: ${REPOSITORY}
// Commit: ${COMMIT}

export interface OpenCookieDatabaseEntry {
  vendor: string;
  category: 'analytics' | 'advertising';
  /** Cookie names that must match exactly. */
  names: readonly string[];
  /** Cookie name prefixes, from rows marked as wildcard in the database. */
  prefixes: readonly string[];
}

/** Analytics and marketing cookies, grouped by vendor. Used for cookie names only, never hosts. */
export const openCookieDatabase: readonly OpenCookieDatabaseEntry[] = [
${lines.join('\n')}
];
`;
}

const response = await fetch(CSV_URL);
if (!response.ok) {
  throw new Error(`Download failed: ${response.status} ${CSV_URL}`);
}
const { entries, skipped } = build(parseCsv(await response.text()));
await writeFile(OUTPUT, render(entries));

// Format with the project's Biome settings so the committed file passes `npm run lint`.
const BIOME = join(ROOT, 'node_modules', '@biomejs', 'biome', 'bin', 'biome');
const biome = spawnSync(process.execPath, [BIOME, 'format', '--write', OUTPUT], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (biome.status !== 0) {
  throw new Error('Biome could not format the generated file');
}

const names = entries.reduce((sum, entry) => sum + entry.names.length, 0);
const prefixes = entries.reduce((sum, entry) => sum + entry.prefixes.length, 0);
console.log(
  `Wrote ${entries.length} vendors, ${names} exact names and ${prefixes} prefixes to ${OUTPUT}`,
);
for (const [reason, count] of skipped) {
  console.log(`Skipped ${count} rows: ${reason}`);
}
