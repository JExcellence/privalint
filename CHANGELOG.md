# Changelog

All notable changes are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org).

## Unreleased

### Added

- Chat and review widgets in `third-party-embeds`: Intercom, Tawk.to, Zendesk Web Widget,
  Trustpilot and Typeform, with hosts from the vendors or observed on live sites (#32)
- Opt-in check of the consent banner's settings layer (#38): with `--check-settings` (or
  `settingsCheck: true`) privalint loads the start page again in a fresh browser, opens the
  settings, switches off every optional category, saves and reloads. The new rule
  `trackers-after-settings` reports trackers that still load. Without the flag the rule is
  skipped with `settings-check-disabled`, which does not make a report partial
- Report schema 1.3.0 with `consent.settings`, `options.settingsCheck`, the observation kind
  `after-settings` and the matching reasons, and the region `hu`. 1.0.0 to 1.2.0 stay unchanged
  and supported
- Region `hu` for Hungary (#47): findings cite Eht. 155. § (4) for cookies, Ekertv. 4. § for the
  imprint and the GDPR in Hungarian form. Hungarian banner buttons ("Elfogadom", "Elutasítom",
  "Csak a szükségesek"), settings links ("Süti beállítások"), "Impresszum" and
  "Adatkezelési tájékoztató" are recognised. Reports stay in English or German

### Changed

- First-party detection uses the registrable domain from the public suffix list, including
  private suffixes like `github.io`, `netlify.app` and `vercel.app`. A crawl on `a.github.io` no
  longer follows links to `b.github.io`, and `shop.example.co.uk` counts as part of
  `example.co.uk`. Sibling subdomains such as `blog.example.de` and `shop.example.de` now count
  as one site. IP addresses, `localhost` and hosts that are themselves a public suffix only match
  the exact same host. The list ships with the new runtime dependency `tldts`, so scans make no
  extra network requests (#36)
- The error for `--sandbox` failing to start now names Docker's default seccomp profile as the
  usual cause inside containers. Tested on Ubuntu 24.04 in Docker: the sandbox fails with the
  default profile and starts once the profile allows user namespaces. Before, the message only
  pointed to AppArmor, which does not apply there

## 0.6.1 - 2026-10-28

### Fixed

- A request the page cancels itself, for example a framework dropping a prefetch on a slow
  network, no longer makes the page capture incomplete. privalint detects the cancel from Chromium,
  stops the adapter call if it is still running, and records the request as skipped with
  `cancelled-by-page`. Its URL still counts for the tracker rules. Real failures (adapter errors,
  timeouts, connection, TLS, DNS, limits) stay restricting. Before, one cancelled prefetch on a
  busy server could mark every rule on the start page as not checkable

### Changed

- Report schema 1.2.0: adds the skip reason `cancelled-by-page`. New reports use 1.2.0; schemas
  1.0.0 and 1.1.0 are unchanged and still supported

## 0.6.0 - 2026-10-28

### Added

- Action input `concurrency`, passed to `--concurrency`, so multi-page scans in CI can load
  several pages at once (#34)
- Axeptio, TrustArc, CookieHub, Cookie Information and Cookie-Script are recognised by their
  button selectors, read from their live banners. Reports name the tool, and the reject path is
  tested with the real button instead of a label guess (#30)
- Session-replay tools FullStory, Mouseflow, Smartlook, Lucky Orange and Contentsquare in the
  tracker list, with hosts from the vendors or observed on live sites (#31)

### Changed

- On a site without a consent banner where nothing that needs consent loaded before a choice
  (`pre-consent-trackers` and `third-party-embeds` checked completely, no findings), the banner
  rules are now skipped with the reason `no-consent-needed` instead of being not evaluable.
  `--fail-on-incomplete` and the Action no longer fail such sites, and the rules no longer need
  to be disabled by name. Schema 1.1.0 gains the reason (#35)

## 0.5.0 - 2026-10-27

### Added

- `adobe-fonts` rule: reports fonts loaded from Adobe Fonts (`use.typekit.net`, `p.typekit.net`)
  as an error and leftover preconnects as a warning. The fix text explains that these fonts need
  a separate licence to be self-hosted
- `consent-settings-link` rule: after rejecting and reloading, warns when no visible link or
  button reopens the cookie settings (Art. 7(3) GDPR). Known reopen widgets of the supported
  consent managers count, and so do links and buttons labelled like "Cookie-Einstellungen".
  Reports carry the result as `consent.settingsControl`
- Criteo, Taboola, Outbrain, Adform and Quantcast in the tracker list, based on requests observed
  on public news sites
- `--sandbox` (API: `sandbox: true`) runs Chromium with its sandbox. It stays off by default.
  When the sandbox can't start, the error says why and links to Chromium's notes on Ubuntu's
  user-namespace restrictions. Reports record the setting as `options.sandbox`
- `--concurrency <n>` (config and API: `concurrency`) loads up to n pages of a crawl at the same
  time. Pages are still committed in breadth-first order, so the pages, findings and SARIF
  fingerprints are the same as with the default of 1. On a six-page site it halved the scan time

### Fixed

- Osano banners: the reject button is found again (`osano-cm-denyAll`), so the reject path is
  tested instead of being reported as missing

## 0.4.1 - 2026-10-27

### Fixed

- A beacon that the network adapter deliberately did not send no longer marks the page capture as
  incomplete. Its URL is still checked by the tracker rules, so a skipped tracker beacon is still
  reported. Before, a single first-party statistics ping made every rule on a clean site report
  "not checkable".

## 0.4.0 - 2026-10-27

### Added

- Random scan/page identities with explicit capture-attempt resolution after redirects; redacted
  pages remain distinct in text, Markdown and SARIF without claiming cross-scan stability
- Standalone report and SARIF-property JSON Schemas for versions 1.0.0/1.1.0, shipped in npm,
  with conformance fixtures, live validation and drift checks
- Opt-in CLI/Action coverage gate (exit 3), API coverage assessment and conservative legacy/schema
  identification; severity exits retain precedence and default behaviour is unchanged

- Report schema/scanner versions, effective scan options, explicit per-rule outcomes/reasons,
  consent outcomes and redacted progress events
- Disjoint skipped/failed/security-blocked request counters; intentional beacon omissions stay
  distinct from transport failures while legacy aggregates remain available
- Strict JSON CLI configuration, API severity policy and visible vendor allowlist annotations
- Optional create/update PR report comments, skipping forks and read-only tokens safely
- hCaptcha, Turnstile, OpenStreetMap tiles, TikTok and Calendly embed detection
- Frame-aware CookieFirst, Osano, Termly and Sourcepoint recognition, plus Real Cookie Banner
  vendor identification through existing label heuristics; public-site interactive verification pending
- English/German configuration, report-contract, CMP and embed documentation

### Fixed

- Config size limits now apply while reading, rather than after unbounded buffering
- Inherited object properties cannot become rule severity overrides
- Coverage assessment rejects inconsistent request-counter equations and incomplete required checks

## 0.3.0 - 2026-10-27

### Added

- Controlled Chromium capture through a per-hop network adapter, with FIFO resource scheduling,
  independent count/byte/redirect/time limits and AbortSignal cleanup
- Bounded, origin-redacted load diagnostics and per-page rule evaluation/coverage status
- Explicit consent outcomes and an exported consent observer for existing Playwright captures
- English/German controlled-scanner guides and a type-checked pinned-transport example

### Fixed

- Failed or security-blocked requests are no longer treated as loaded-vendor evidence
- Incomplete capture is explained separately from findings in text, Markdown, JSON and SARIF

## 0.2.0 - 2026-10-26

### Added

- `--lang de` writes findings, fixes and reports in German
- `--region de|at|ch|eu` cites the law of the chosen country with every finding; Swiss sites get
  softer severities where Swiss law uses opt-out
- `lang` and `region` inputs for the GitHub Action
- German README

### Changed

- Releases publish to npm through trusted publishing instead of a stored token

## 0.1.1 - 2026-10-26

### Added

- `--headed` opens a visible browser window, for sites that hide their consent banner from
  headless browsers. Local use only; CI runners have no display.
- `--channel chrome|msedge` scans with an installed browser instead of Playwright's Chromium

### Fixed

- The release workflow builds before `npm publish`, so the `privalint` command is part of the
  published package

## 0.1.0 - 2026-10-26

### Added

- Browser-based scanner that loads every page in a fresh context and crawls same-host links
- Consent check: finds the banner on the start page, clicks "reject", reloads and records what
  still loads (`--skip-consent` to turn it off)
- Rules: `pre-consent-trackers`, `trackers-after-reject`, `reject-option`, `google-fonts`,
  `third-party-embeds`, `third-party-cdns`, `impressum-link`, `privacy-policy-link`
- CLI with text, JSON, Markdown and SARIF output
- GitHub Action with job summary and SARIF file, tested against code scanning by a weekly demo
  scan
