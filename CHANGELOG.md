# Changelog

All notable changes are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org).

## Unreleased

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
