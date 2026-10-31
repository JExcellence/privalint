# Report contracts, page identity and coverage gates

[Deutsch](report-contract.de.md)

## Versioned validation

New scans use schema **1.3.0**. Schemas 1.0.0, 1.1.0 and 1.2.0 remain available for earlier
versioned reports. 1.2.0 adds the skip reason `cancelled-by-page`, which a 1.1.0 validator would
reject. 1.3.0 adds the opt-in settings-layer check: `consent.settings`, `options.settingsCheck`,
the observation kind `after-settings`, the skip reason `settings-check-disabled` and its
explanations, and the region `hu`, all of which a 1.2.0 validator would reject.
Scanner/package and schema versions are independent. Absent `schemaVersion` means legacy;
unknown versions are unsupported. Never assign a schema version to old data merely to validate it.

The npm package ships self-contained JSON Schema 2020-12 files:

- `privalint/schemas/report-1.0.0.schema.json`
- `privalint/schemas/report-1.1.0.schema.json`
- `privalint/schemas/report-1.2.0.schema.json`
- `privalint/schemas/report-1.3.0.schema.json`
- `privalint/schemas/sarif-properties-1.0.0.schema.json`
- `privalint/schemas/sarif-properties-1.1.0.schema.json`
- `privalint/schemas/sarif-properties-1.2.0.schema.json`
- `privalint/schemas/sarif-properties-1.3.0.schema.json`

SARIF extension schemas validate `runs[].properties`, not the entire SARIF standard. Required
fields, types, outcomes and contradictions (for example a negative success with `partial: true`)
are validated. Additional fields permit compatible extensions. Counter arithmetic and ID references
also need semantic checks: the coverage gate checks counter equations, and producer tests check
page/finding/evaluation identity. Validation is not proof of legal compliance or safe custom strings.

```ts
import { readFile } from 'node:fs/promises';
import { Ajv2020 } from 'ajv/dist/2020.js'; // Consumer-installed validator
import { identifyReportSchema, assessCoverage, type ScanResult } from 'privalint';

const value: unknown = JSON.parse(await readFile('report.json', 'utf8'));
const identity = identifyReportSchema(value); // Classification, not structural validation
if (identity.kind !== 'supported') throw new Error('Legacy or unsupported report');
const schema = JSON.parse(
  await readFile(
    new URL(import.meta.resolve(`privalint/schemas/report-${identity.version}.schema.json`)),
    'utf8',
  ),
);
const validate = new Ajv2020({ strict: true }).compile<ScanResult>(schema);
if (!validate(value)) throw new Error('Invalid report');
const coverage = assessCoverage(value);
```

Ajv is a development-only dependency of PrivaLint; scanning neither loads a validator nor fetches
remote schemas. `npm run schemas:build` regenerates files, and `npm run schemas:check` detects
drift in CI. `npm run fixtures:reports` regenerates synthetic Chromium fixtures for complete,
partial, intentionally skipped and policy-overridden observations. Tests validate committed
fixtures and live scanner output. No real target data is stored in fixtures.

## Safe identity

`scanId`, `pageId` and `captureId` are independent random UUIDs, not hashes of URLs. They are
stable within one scan, not across scans.

- Each report has a `scanId`.
- Each unique final captured URL has one `pageId`, shared by summaries, findings, evaluations
  and SARIF properties.
- Loading/consent events carry `captureId`: the final redirect destination is not yet known.
- `page-captured` resolves that attempt to `pageId`. Redirecting attempts can share a pageId
  but retain separate captureIds. Rule-evaluation events carry pageId.
- `onPage` receives the identified raw snapshot after deduplication. Report URLs remain redacted
  in adapter mode while IDs distinguish pages on the same origin.

Text/Markdown group by page identity. Native SARIF retains URL-based locations and fingerprints.
Adapter SARIF uses opaque page locations and omits fingerprints that would merge redacted pages
or imply cross-scan stability. Scan-local IDs are not baseline keys; persistent identity needs an
application-owned policy.

## Optional coverage gate

```sh
privalint https://example.org --fail-on-incomplete --output report.json
```

JSON config accepts `failOnIncomplete: true`; `--allow-incomplete` overrides it. The Action offers
`fail-on-incomplete: true` (default false). API consumers use `assessCoverage(result)` returning
`{ complete, issues }` with redacted locations. Validate external JSON structurally first.
The Action input explicitly overrides the JSON gate setting, including its default `false`;
invalid boolean input is rejected rather than silently weakening the gate.

The gate rejects missing pages/capture, HTTP error pages, inconsistent counters, missing required
evaluations, non-evaluable checks and partial results. Disabled rules, explicitly disabled consent
and consent outside the start page are intentional exclusions, and so are banner rules skipped as
`no-consent-needed` (no banner, and nothing needing consent loaded). If something needing consent
did load without a banner, the reject-path checks stay untested and fail this opt-in gate.
Omitted beacons, requests the page cancelled itself (`cancelled-by-page`) and skipped reports to
Sentry's ingest hosts do not restrict observation; every other skip does. The gate follows
`capture.complete`, so such a recorded issue on its own does not fail it. Findings can coexist with complete coverage;
allowlist annotations alone do not fail the coverage gate.

Exit precedence: `2` for argument/start-page scan errors. After generating a report, `1` for
findings above `--fail-on`, otherwise `3` for an enabled failing coverage gate, otherwise `0`.
`--fail-on never` suppresses severity exits but leaves the independent coverage gate active.
Reports are written before exit 1/3. Action exit-code output, summary and comments work for exit 3.
The default exit policy is unchanged.

The gate examines actual observations rather than only `coverage: 'partial'`. Therefore it can
pass when that broader flag only reflects explicit consent exclusions. This is a technical CI
policy, not a legal judgement or an assurance that every privacy issue is covered.
