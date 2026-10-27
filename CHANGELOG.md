# Changelog

All notable changes are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org).

## Unreleased

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
