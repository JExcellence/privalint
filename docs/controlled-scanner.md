# Controlled web scanning

[Deutsch](controlled-scanner.de.md)

Use the additive `scan(url, options)` API when your public scanner already has a transport policy.
The library does not provide a universal SSRF firewall. It does not determine legal compliance.
`region` chooses tool references/severities, not automatically the applicable law.

## Ownership and cancellation

PrivaLint creates a Chromium browser and a fresh context for each crawled page. It always closes
those resources. Inject a `NetworkAdapter`, not a shared user/browser context: a fresh context is
needed for pre-consent observations. The caller retains ownership of shared adapter pools/clients.
Signals supplied to an adapter cover both execution and response-body consumption. An external
abort rejects `scan()` with a fixed-message `AbortError`, after context cleanup. Adapter transports
must honour their signals and release sockets/body streams. JavaScript cannot forcibly terminate
an adapter that ignores cancellation. Cancellation during browser startup closes the browser as
soon as launch returns.

The provided `observeConsent(page, context, requests, options)` export lets applications with their
own Playwright capture reuse the same CMP selectors and label heuristics. Its caller owns the page,
context, request listener and cleanup. A signal is checked on entry; close the caller-owned context
on abort to interrupt Playwright operations. The `scan()` integration handles this automatically.

## Adapter contract

```ts
import { scan, NetworkError, type NetworkAdapter } from 'privalint';

const adapter: NetworkAdapter = async (request) => {
  // Your existing hardened transport must validate the actual socket destination,
  // prevent DNS rebinding and return ONE hop (redirect following disabled).
  if (!policy.permits(request.url)) throw new NetworkError('security-blocked');
  return policy.fetchOneHop(request); // honours request.signal; streams body bytes
};

const report = await scan(targetUrl, {
  networkAdapter: adapter,
  signal: clientDisconnected.signal,
  networkLimits: { concurrency: 6, maxRequests: 500, maxRedirects: 10 },
  captureTimeoutMs: 45_000,
  maxDiagnostics: 100,
});
```

`policy`, `targetUrl` and `clientDisconnected` above belong to the hosting application. For an
executable transport implementation see [examples/controlled-scanner.ts](../examples/controlled-scanner.ts).
It permits GET/HEAD to exact administrator-configured hostname origins with pinned socket IPs, retains
normal TLS certificate/hostname verification and never follows redirects itself. Validate the
trusted pins before deployment; never let scan submitters populate them. The example does not
attempt to discover all public IP ranges or implement your organization's egress policy.

The adapter receives raw URL, method, headers and body for trusted processing; none are logged by
PrivaLint. Return `{ status, headers, body }`; repeated headers such as Set-Cookie can be arrays.
Bodies can be strings, byte arrays or async byte streams. Stream large bodies: a buffered adapter
has already allocated the data before the scanner can check its size. Preserve Content-Encoding
if returning encoded bytes, or remove it after decoding; budgets count bytes supplied by the adapter,
not Chromium's later decoded-memory usage. Never call a second, unrestricted fetch on policy failure.
Use `NetworkError` for known policy, method, DNS, TLS, connection, timeout or resource-limit reasons.
Unrecognized exceptions become `browser-failure`; their raw messages are discarded.

Controlled capture uses Chromium Fetch interception because Playwright `route()` automatically
continues redirect hops without invoking the user handler again. Contexts are offline and service
workers are disabled; WebSockets are explicitly denied and diagnosed. Native browser traffic that
cannot be mediated fails closed. Unsupported browser targets (for example a popup or isolated
worker/frame before interception attaches) can therefore remain unobserved; load failures make
coverage partial. Run browsers in isolated workers with an OS/container egress policy. Browser
offline mode is not an operating-system network sandbox and does not cover every non-HTTP channel.
The adapter contract cannot prevent an incorrectly implemented adapter from following redirects.

## Independent limits

All transport budgets apply per crawled page, across initial loading and the reject phase.

| Option                           | Default            | Meaning                                                             |
| -------------------------------- | ------------------ | ------------------------------------------------------------------- |
| `networkLimits.concurrency`      | 6                  | Active adapter calls/body reads; FIFO wait, no busy-slot rejections |
| `networkLimits.maxRequests`      | 500                | Adapter-admitted requests including documents and redirect hops     |
| `networkLimits.maxRedirects`     | 10                 | Redirect hops per chain                                             |
| `networkLimits.maxResponseBytes` | 5 MiB              | Maximum bytes consumed for one body                                 |
| `networkLimits.maxTotalBytes`    | 20 MiB             | Combined response-body budget                                       |
| `networkLimits.requestTimeoutMs` | 10000              | Adapter execution/body deadline, starting on dequeue                |
| `captureTimeoutMs`               | 60000 with adapter | Whole page capture, including queue wait and consent                |
| `timeoutMs`                      | 30000              | Individual Playwright navigation/network-idle waits                 |
| `settleMs`                       | 2000               | Additional observation delay                                        |
| `maxDiagnostics`                 | 100                | Stored issue details per page; zero keeps counters only             |

`networkLimits` requires an adapter. The legacy `offline` fixture helper cannot be combined with
an adapter. Limit values are validated before launching Chromium. Streaming stops at a byte limit,
signals are aborted and body iterators are returned. The chunk that exceeds the budget is counted
but not retained. Up to the request budget's evidence records are retained (5000 in native mode).
These limits do not bound arbitrary page JavaScript/DOM memory; also apply worker memory/CPU quotas.

## Diagnostics and counters

`pages[].capture` contains loading completeness, document availability and `diagnostics`.
`beforeConsentComplete` describes initial loading separately from the entire capture.
Diagnostics distinguish `security-blocked`, `unsupported-method`, `unsupported-protocol`, `dns`,
`tls`, `connection`, `timeout`, `resource-limit`, `http-error`, `browser-failure` and `aborted`.
Each issue has a phase (`before-consent` or `after-reject`), origin-only URL, optional HTTP status
and limit name. They are technical observations, not findings.

- `requests`: browser HTTP(S) attempts across both phases, documents and every redirect included.
- `omittedRequests`: counted requests omitted from the bounded evidence array. Truncation is
  diagnosed as a resource limit, so it cannot silently produce complete coverage.
- `responses`: received HTTP responses, including redirects and errors. An HTTP response may
  subsequently fail, so this counter can overlap `failed`.
- `finished`: browser `requestfinished` events, including HTTP errors if the browser finishes them.
- `failed` (legacy aggregate): `requestfailed` events plus requests still pending at observation end. Each request
  contributes once; `requests = finished + failed` in a finalized capture.
- `blocked`: subset of failed requests explicitly denied as `security-blocked`.
- New consumers use the disjoint `skippedRequests`, `failedRequests` and `securityBlockedRequests`
  instead. An intentional beacon omission is a skip, not a load error. See [report contract](configuration.md).
- `httpErrors`: subset of responses with status >= 400, not a privacy violation.
- `bytes`: adapter response-body bytes consumed, including the chunk exceeding a limit.
- `issueCount`: all technical issues, including non-request waits/protocol denials. One request
  can have an HTTP error response and a later browser failure; do not use issueCount as failed count.
- `issues`: at most `maxDiagnostics` entries; `dropped` counts omitted details, not requests.

Legacy `PageSummary.requestCount` counts initial-phase requests. It does not include rejection;
use `capture.diagnostics.requests` for the combined count. Evidence arrays may be bounded while
the counters continue counting attempts.

Diagnostic URLs always omit credentials, complete paths, queries and fragments. Adapter-mode
report page URLs and URL evidence are also origin-only. Different pages of an origin therefore
have the same displayed URL; retain array position or use your own opaque scan/page IDs. The
trusted `onPage` hook receives raw snapshots for in-process use. It is not a safe public response
or logging interface. Custom rules and application-written logs remain the caller's responsibility.
Native-mode finding URLs retain legacy formatting; never publish those raw reports as public data.

## Report interpretation

`coverage: 'partial'` means observations or enabled checks are missing. Text and Markdown explain
this even when `findings` is empty. SARIF uses invocation notifications/properties, keeping load
problems out of privacy alerts. JSON retains the structured data.

Per-page `ruleEvaluations` reports `executed`, `skipped` (disabled, consent disabled or not the
start page) or `not-evaluable` (missing observation), with a reason and `partial` flag. Network
rules may inspect available positive evidence even with failed resources; blocked/failed requests
and HTTP error responses are excluded as proof of a loaded vendor. Absence-based document rules
do not run against incomplete initial loading. Custom rules can declare `requires`; otherwise a
complete document is required. Built-in rule IDs carry their observation requirements internally.

Consent adds `state` without removing existing fields:

It also supplies an explicit `outcome`/`reason` pair; see [configuration and report APIs](configuration.md).

| State                | Meaning                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `not-detected`       | No supported banner recognized; reject path untested, not itself a finding |
| `reject-unavailable` | Banner recognized, no supported first-layer reject control                 |
| `interaction-failed` | Detection/interaction/reload could not complete                            |
| `reject-tested`      | Reject clicked and reload/observation steps completed                      |

`reject-tested` confirms the interaction, not that every resource loaded or that the site honoured
the choice. Inspect `afterRejectComplete`, diagnostics and `trackers-after-reject` evaluation.
A CMP's stored consent state/visual result is not independently verified. Only the start page's
reject path is attempted; other pages have fresh contexts. No banner may be caused by region,
headless detection, unsupported markup or a failed CMP resource.

The legacy default still throws on a start-page navigation failure; adapter mode defaults to
`failureMode: 'report'`. Explicit `failureMode` overrides either default. External abort always
rejects. Existing CLI/Action exit-code policy is unchanged: exit 0 means no findings above the
threshold, not complete observation. Check coverage/diagnostics in report consumers.
