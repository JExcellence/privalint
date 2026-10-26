# Changelog

All notable changes are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org).

## Unreleased

### Added

- Browser-based scanner that loads every page in a fresh context and crawls same-host links
- Consent check: finds the banner on the start page, clicks "reject", reloads and records what
  still loads (`--skip-consent` to turn it off)
- Rules: `pre-consent-trackers`, `trackers-after-reject`, `reject-option`, `google-fonts`,
  `third-party-embeds`, `third-party-cdns`, `impressum-link`, `privacy-policy-link`
- CLI with text, JSON, Markdown and SARIF output
- GitHub Action with job summary and SARIF file
