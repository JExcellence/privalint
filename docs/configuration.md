# Configuration and report integrations

[Deutsch](configuration.de.md)

## JSON configuration

The CLI reads `./privalint.config.json` if it exists. `--config path/to/config.json` selects an
explicit file, whose absence is an error. No JavaScript/TypeScript configuration is executed.
Invalid JSON, unknown fields, unknown rules and invalid values fail with a safe error message.
Files are limited to 64 KiB. Do not store credentials in config; URL credentials are rejected.

Supported fields: `url` (absolute HTTP(S)), `maxPages` (positive integer), `settleMs` (nonnegative),
`timeoutMs` (positive), `locale`, `lang` (`en`/`de`), `region` (`de`/`at`/`ch`/`eu`),
`consentCheck` (boolean), `rules` (known IDs to `off`/`error`/`warning`/`info`) and
`allow: { vendors: string[] }` (exact, case-sensitive finding `subject` names).

```json
{
  "url": "https://example.org",
  "maxPages": 20,
  "lang": "en",
  "region": "de",
  "rules": { "third-party-cdns": "warning", "impressum-link": "off" },
  "allow": { "vendors": ["Google Analytics"] }
}
```

Run `privalint` without a positional URL to use `url`. Explicit CLI values take precedence,
including URL, page count, timing, locale, language and region. `--disable` additionally disables
rules; it never re-enables an `off` rule. `--consent` explicitly re-enables consent
when JSON has disabled it. The report lists the effective options, not merely file contents.
The API never reads a config file automatically. Use exported `loadConfig`/`parseConfig` if needed,
or pass `ruleSettings` and `allow` directly:

```ts
await scan(url, {
  ruleSettings: { 'third-party-cdns': 'warning' },
  allow: { vendors: ['Google Analytics'] },
});
```

Severity overrides apply after region classification. Allowed vendor findings remain visible as
`info`, with `policy.allowed: true` and the original severity. Overrides also retain their original
severity in `policy`. Neither an allowlist nor a country profile establishes consent or legal
compliance. Allowlists deliberately do not match arbitrary hosts or URL substrings: one finding
can contain several resources, so a partial host match must not suppress unrelated evidence.

## Report version and outcomes

`schemaVersion: '1.0.0'` identifies this additive report contract. `scannerVersion` is the actual
package version used to generate it. Reports from 0.3.0 or earlier lack schemaVersion: treat them
as legacy rather than inferring missing counters/outcomes as zero or success. Versioning the
report contract is independent from releasing the npm package.

`options` contains effective page/timing/locale/language/region/consent settings, capture mode,
transport limits (null in native mode), selected rule IDs, severity policy and allowed vendor
names. It excludes the target URL, raw adapter data, callback functions, AbortSignals and credentials.
The target is already represented by the report's URL fields with the normal redaction policy.

`ruleEvaluations` preserves `status`, `reason` and `partial`. It adds `outcome`, `explanation`
(fixed machine code) and `findingCount`:

| Outcome              | Meaning                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `checked-no-finding` | Required observations available; rule ran without a finding               |
| `finding-detected`   | Positive evidence found; `partial` may still be true                      |
| `not-evaluable`      | Disabled/skipped check, missing observation or incomplete negative result |

An executed network rule with no findings and incomplete observation remains `status: 'executed'`
for legacy consumers but has `outcome: 'not-evaluable'`. This distinguishes running a check from
having enough evidence to exclude the problem. Text/Markdown translate outcomes and reasons into
English/German. Explicit policy overrides do not erase finding counts or positive-evidence outcomes.

## Request counters

Finalized captures partition browser requests as:

```text
requests = finished + skippedRequests + failedRequests + securityBlockedRequests
```

`skippedRequests` is for intentionally omitted requests or unsupported methods/protocols;
`failedRequests` covers transport/browser failures, deadlines, resource exhaustion and unfinished
requests; `securityBlockedRequests` covers explicit safety denials. `httpErrors` remains separate
and may overlap `finished` or `failedRequests`, since Chromium can reject an HTTP error body.
Non-request diagnostics such as WebSocket denials do not increment terminal HTTP counters.

The legacy `failed` aggregate and `blocked` alias remain for compatibility. Do not display the
legacy aggregate as a count of load errors in new consumers. Intentional skip example:

```ts
if (request.resourceType === 'ping') {
  throw new NetworkError('skipped', undefined, 'beacon');
}
```

The scanner does not omit beacons by default. Skips are diagnostic observations (`kind: 'skipped'`,
`skippedReason: 'beacon'`), not privacy findings or transport failures. They still restrict what
the scanner observed; a missing resource can affect downstream behaviour.

## Consent and progress

Consent retains legacy `state` and adds `outcome` with a fixed `reason`:
`no-banner-detected`, `unsupported-banner`, `interaction-failed` or `reject-succeeded`.
Unsupported means a banner was recognized but no supported first-layer reject control was found;
`unsupported-banner-markup` specifically identifies consent UI whose controls could not be classified.
it is not proof that the site lacks a reject path. Successful rejection confirms click and reload,
not the CMP's stored consent state. Check `afterRejectComplete` and rule outcomes separately.

`onProgress(event)` is a synchronous callback for `starting`, `loading-page`, `checking-consent`,
`evaluating-rules` and `completed`. Events include `elapsedMs`; page stages include a zero-based
`pageIndex` and origin-only `pageUrl`. No raw URLs, arbitrary exception reasons or estimated
percentages are emitted. Abort/failure does not emit `completed`; the promise communicates failure.
Callback exceptions propagate after browser/context cleanup.

```ts
await scan(url, {
  signal: clientSignal,
  onProgress(event) {
    sendToClient(event);
  }, // e.g. an application-owned SSE channel
});
```

## Pull request comments

```yaml
permissions:
  contents: read
  pull-requests: write
steps:
  - uses: JExcellence/privalint@v0
    with:
      url: https://example.org
      pr-comment: true
```

Comments are opt-in. Only same-repository `pull_request` events are eligible. The dependency-free
helper uses `github.token`, updates the marked `github-actions[bot]` comment, ignores markers
posted by other users and never fails a scan for missing write permission. Existing Markdown
escaping is preserved. Forks, read-only tokens and non-PR events skip; large reports are truncated
with a notice referring to the full workflow summary. API pagination/timeouts are bounded and redirects are
rejected so authorization is not forwarded. Network/server errors produce a fixed warning without
tokens, response bodies or target data. Concurrent workflow runs should use workflow `concurrency`
per PR to avoid a first-comment creation race; reports from parallel jobs share the single marker.
