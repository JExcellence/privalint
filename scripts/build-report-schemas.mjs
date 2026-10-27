import { mkdir, readFile, writeFile } from 'node:fs/promises';

// JSON Schema 2020-12. Keep prior version contracts available for external consumers.
const string = { type: 'string' };
const boolean = { type: 'boolean' };
const count = { type: 'integer', minimum: 0 };
const positive = { type: 'integer', minimum: 1 };
const uuid = {
  type: 'string',
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
};
const choices = (...values) => ({ type: 'string', enum: values });
const array = (items) => ({ type: 'array', items });
const ref = (name) => ({ $ref: `#/$defs/${name}` });
const object = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
});
const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });
const severity = choices('error', 'warning', 'info');
const ruleSettings = {
  type: 'object',
  additionalProperties: choices('error', 'warning', 'info', 'off'),
};
const explanation = choices(
  'disabled',
  'not-start-page',
  'consent-disabled',
  'missing-reject-observation',
  'missing-consent-observation',
  'incomplete-document',
  'positive-evidence',
  'incomplete-observation',
  'required-observations-available',
  'no-supported-banner',
  'no-supported-reject-control',
  'unsupported-banner-markup',
  'browser-interaction-failed',
  'reject-clicked-and-reloaded',
);
const meta = { $schema: 'https://json-schema.org/draft/2020-12/schema' };

function definitions(version) {
  const identified = version === '1.1.0';
  const pageIdentity = identified ? { pageId: uuid } : {};
  return {
    diagnostic: object(
      {
        kind: choices(
          'security-blocked',
          'unsupported-method',
          'unsupported-protocol',
          'dns',
          'tls',
          'connection',
          'timeout',
          'resource-limit',
          'http-error',
          'browser-failure',
          'skipped',
          'aborted',
        ),
        phase: choices('before-consent', 'after-reject'),
        url: { type: 'string', pattern: '^(https?://[^/?#@\\s]+/\\[redacted\\]|\\[redacted\\])$' },
        status: { type: 'integer', minimum: 100, maximum: 599 },
        limit: choices('requests', 'response-bytes', 'total-bytes', 'redirects'),
        skippedReason: choices('beacon', 'unsupported-method', 'unsupported-protocol', 'policy'),
      },
      ['kind', 'phase', 'url'],
    ),
    diagnostics: object({
      requests: count,
      omittedRequests: count,
      responses: count,
      finished: count,
      failed: count,
      blocked: count,
      skippedRequests: count,
      failedRequests: count,
      securityBlockedRequests: count,
      httpErrors: count,
      bytes: count,
      issueCount: count,
      dropped: count,
      issues: array(ref('diagnostic')),
    }),
    capture: {
      ...object({
        complete: boolean,
        beforeConsentComplete: boolean,
        document: boolean,
        diagnostics: ref('diagnostics'),
      }),
      allOf: [
        {
          if: { properties: { complete: { const: true } }, required: ['complete'] },
          then: {
            properties: {
              document: { const: true },
              beforeConsentComplete: { const: true },
              diagnostics: {
                type: 'object',
                properties: Object.fromEntries(
                  [
                    'omittedRequests',
                    'failed',
                    'blocked',
                    'skippedRequests',
                    'failedRequests',
                    'securityBlockedRequests',
                    'httpErrors',
                    'issueCount',
                    'dropped',
                  ].map((name) => [name, { const: 0 }]),
                ),
              },
            },
          },
        },
      ],
    },
    evaluation: {
      ...object(
        {
          ...pageIdentity,
          ruleId: string,
          status: choices('executed', 'skipped', 'not-evaluable'),
          reason: choices('disabled', 'consent-disabled', 'not-start-page', 'missing-observation'),
          partial: boolean,
          outcome: choices('checked-no-finding', 'finding-detected', 'not-evaluable'),
          explanation,
          findingCount: count,
        },
        [
          ...Object.keys(pageIdentity),
          'ruleId',
          'status',
          'partial',
          'outcome',
          'explanation',
          'findingCount',
        ],
      ),
      allOf: [
        {
          if: { properties: { outcome: { const: 'checked-no-finding' } }, required: ['outcome'] },
          then: {
            properties: {
              findingCount: { const: 0 },
              partial: { const: false },
              status: { const: 'executed' },
            },
          },
        },
        {
          if: { properties: { outcome: { const: 'finding-detected' } }, required: ['outcome'] },
          then: { properties: { findingCount: positive, status: { const: 'executed' } } },
        },
      ],
    },
    page: object(
      {
        ...pageIdentity,
        url: string,
        finalUrl: string,
        status: nullable({ type: 'integer', minimum: 100, maximum: 599 }),
        requestCount: count,
        cookieCount: count,
        error: string,
        capture: ref('capture'),
        ruleEvaluations: array(ref('evaluation')),
      },
      [
        ...Object.keys(pageIdentity),
        'url',
        'finalUrl',
        'status',
        'requestCount',
        'cookieCount',
        'capture',
        'ruleEvaluations',
      ],
    ),
    finding: object(
      {
        ...pageIdentity,
        ruleId: string,
        severity,
        message: string,
        pageUrl: string,
        evidence: array(string),
        fix: string,
        subject: string,
        references: array(string),
        policy: object({ allowed: boolean, originalSeverity: severity }),
      },
      [...Object.keys(pageIdentity), 'ruleId', 'severity', 'message', 'pageUrl', 'evidence'],
    ),
    consent: object(
      {
        bannerFound: boolean,
        rejected: boolean,
        state: choices('not-detected', 'reject-unavailable', 'interaction-failed', 'reject-tested'),
        outcome: choices(
          'no-banner-detected',
          'unsupported-banner',
          'interaction-failed',
          'reject-succeeded',
        ),
        reason: choices(
          'no-supported-banner',
          'no-supported-reject-control',
          'unsupported-banner-markup',
          'browser-interaction-failed',
          'reject-clicked-and-reloaded',
        ),
        cmp: string,
        acceptLabel: string,
        rejectLabel: string,
        payOrOk: boolean,
        afterRejectComplete: boolean,
        error: string,
      },
      ['bannerFound', 'rejected', 'state', 'outcome', 'reason'],
    ),
    rule: object(
      {
        id: string,
        title: string,
        description: string,
        references: array(string),
        requires: array(choices('document', 'network', 'consent', 'after-reject')),
      },
      ['id', 'title', 'description', 'references'],
    ),
    networkLimits: object({
      concurrency: positive,
      maxRequests: positive,
      maxResponseBytes: positive,
      maxTotalBytes: positive,
      maxRedirects: count,
      requestTimeoutMs: positive,
    }),
    options: object(
      {
        ...reportOptions,
        // Added within 1.1.0; optional so reports from earlier 1.1.0 scanners stay valid.
        ...(identified ? { sandbox: boolean } : {}),
      },
      Object.keys(reportOptions),
    ),
  };
}

const reportOptions = {
  maxPages: positive,
  settleMs: count,
  timeoutMs: positive,
  locale: string,
  lang: choices('en', 'de'),
  region: choices('de', 'at', 'ch', 'eu'),
  consentCheck: boolean,
  headed: boolean,
  channel: string,
  captureTimeoutMs: nullable(positive),
  maxDiagnostics: count,
  failureMode: choices('throw', 'report'),
  captureMode: choices('native', 'adapter', 'offline-fixture'),
  networkLimits: nullable(ref('networkLimits')),
  selectedRules: { ...array(string), uniqueItems: true },
  ruleSettings,
  allowedVendors: array(string),
};

function reportSchema(version) {
  return {
    ...meta,
    $id: `https://github.com/JExcellence/privalint/raw/refs/heads/main/schemas/report-${version}.schema.json`,
    title: `PrivaLint scan report ${version}`,
    description:
      'Structural contract; not a guarantee of complete observation, URL safety or legal compliance. Counter equations and page-ID references require semantic checks.',
    ...object(
      {
        ...(version === '1.1.0' ? { scanId: uuid } : {}),
        schemaVersion: { const: version },
        scannerVersion: { type: 'string', minLength: 1 },
        options: ref('options'),
        siteUrl: string,
        lang: choices('en', 'de'),
        region: choices('de', 'at', 'ch', 'eu'),
        scannedAt: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$',
        },
        durationMs: { type: 'number', minimum: 0 },
        pages: array(ref('page')),
        consent: ref('consent'),
        findings: array(ref('finding')),
        rules: array(ref('rule')),
        coverage: choices('complete', 'partial'),
      },
      [
        ...(version === '1.1.0' ? ['scanId'] : []),
        'schemaVersion',
        'scannerVersion',
        'options',
        'siteUrl',
        'lang',
        'region',
        'scannedAt',
        'durationMs',
        'pages',
        'findings',
        'rules',
        'coverage',
      ],
    ),
    $defs: definitions(version),
  };
}

function sarifPropertiesSchema(version) {
  return {
    ...meta,
    $id: `https://github.com/JExcellence/privalint/raw/refs/heads/main/schemas/sarif-properties-${version}.schema.json`,
    title: `PrivaLint SARIF run properties ${version}`,
    description: 'Validates PrivaLint run.properties only, not the enclosing SARIF 2.1.0 standard.',
    ...object(
      {
        ...(version === '1.1.0' ? { scanId: uuid } : {}),
        schemaVersion: { const: version },
        scannerVersion: string,
        options: ref('options'),
        coverage: choices('complete', 'partial'),
        observations: array(
          object({
            ...(version === '1.1.0' ? { pageId: uuid } : {}),
            url: string,
            capture: ref('capture'),
            ruleEvaluations: array(ref('evaluation')),
          }),
        ),
        consent: ref('consent'),
      },
      [
        ...(version === '1.1.0' ? ['scanId'] : []),
        'schemaVersion',
        'scannerVersion',
        'options',
        'coverage',
        'observations',
      ],
    ),
    $defs: definitions(version),
  };
}

const directory = new URL('../schemas/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const version of ['1.0.0', '1.1.0']) {
  for (const [name, schema] of [
    ['report', reportSchema(version)],
    ['sarif-properties', sarifPropertiesSchema(version)],
  ]) {
    const file = new URL(`${name}-${version}.schema.json`, directory);
    const expected = `${JSON.stringify(schema, null, 2)}\n`;
    if (process.argv.includes('--check')) {
      if ((await readFile(file, 'utf8')) !== expected)
        throw new Error(`Stale ${name} schema ${version}; run npm run schemas:build`);
    } else await writeFile(file, expected);
  }
}
