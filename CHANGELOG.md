# Changelog

All notable changes are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org).

## Unreleased

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
