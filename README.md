# privalint

[![CI](https://github.com/jexcellence/privalint/actions/workflows/ci.yml/badge.svg)](https://github.com/jexcellence/privalint/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/privalint)](https://www.npmjs.com/package/privalint)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Lint your website for the GDPR mistakes that get people warning letters: trackers that fire before
consent, Google Fonts loaded from Google, a missing Impressum.

privalint opens your site in a real Chromium browser with no cookies or storage, like a first
visit, and reports what happened before anyone clicked "Accept". Run it from your terminal or as a GitHub
Action on every pull request.

```bash
npx privalint https://your-site.de
```

This is the unedited output for [`test/fixtures/leaky`](test/fixtures/leaky/index.html), a test
page that makes the usual mistakes:

```
http://127.0.0.1:4173/leaky/
  ✖ Google Analytics (analytics) runs before the visitor has given consent. pre-consent-trackers
      request https://www.googletagmanager.com/gtag/js?id=G-TEST
      cookie _ga (127.0.0.1)
      fix: Only load Google Analytics after opt-in, for example by letting your consent manager inject it or by using it in a consent mode that sends no requests until consent is given.
  ✖ Meta Pixel (advertising) runs before the visitor has given consent. pre-consent-trackers
      request https://www.facebook.com/tr?id=1&ev=PageView
      fix: Only load Meta Pixel after opt-in, for example by letting your consent manager inject it or by using it in a consent mode that sends no requests until consent is given.
  ✖ Fonts are loaded from Google (1 request). google-fonts
      https://fonts.googleapis.com/css2?family=Inter&display=swap
      fix: Self-host the font files. In Next.js, next/font/google downloads fonts at build time and serves them from your own domain. Elsewhere, install the family from @fontsource or download it via google-webfonts-helper, then remove every reference to fonts.googleapis.com and fonts.gstatic.com.
  ▲ No link to an Impressum or legal notice was found on this page. impressum-link
      0 links checked
      fix: Add a link labelled "Impressum" to a part of the layout that appears on every page, usually the footer.

3 errors, 1 warning on 1 page (1.5s).
Automated checks only. A clean result is not proof of GDPR compliance.
```

> [!IMPORTANT]
> privalint runs automated checks. A clean result means it found none of the problems it looks
> for. It does not make your site GDPR compliant and it is not legal advice.

## What it checks

| Rule                                                         | Severity | What it finds                                                                                                              |
| ------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| [`pre-consent-trackers`](docs/rules/pre-consent-trackers.md) | error    | Analytics, ads and session-replay tools that send requests or set cookies before consent. A bare tag manager is a warning. |
| [`google-fonts`](docs/rules/google-fonts.md)                 | error    | Fonts fetched from `fonts.googleapis.com` / `fonts.gstatic.com`. Leftover preconnects are a warning.                       |
| [`impressum-link`](docs/rules/impressum-link.md)             | warning  | Pages without a link to an Impressum or legal notice. A contact link alone is only noted as info.                          |

More rules are on the [roadmap](#roadmap). Each one is a small file with tests, see
[CONTRIBUTING.md](CONTRIBUTING.md).

## GitHub Action

```yaml
name: Privacy

on:
  pull_request:
  schedule:
    - cron: "0 6 * * 1"

jobs:
  privalint:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write # only needed for the SARIF upload
    steps:
      - uses: jexcellence/privalint@v0
        with:
          url: https://your-site.de
          max-pages: 20

      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: privalint.sarif
          category: privalint
```

The report shows up in the job summary. With the SARIF upload, findings also appear under
**Security → Code scanning**.

Scanning a preview deployment instead of production catches problems before they ship. Pass the
preview URL from your hosting provider's deployment event or action output as `url`.

| Input         | Default           |                                             |
| ------------- | ----------------- | ------------------------------------------- |
| `url`         |                   | Page to scan. Required.                     |
| `max-pages`   | `1`               | How many pages of the same site to crawl.   |
| `fail-on`     | `error`           | `error`, `warning` or `never`.              |
| `disable`     |                   | Comma-separated rule ids to skip.           |
| `sarif-file`  | `privalint.sarif` | Where to write SARIF. Empty to skip.        |
| `job-summary` | `true`            | Add the Markdown report to the job summary. |

Outputs: `exit-code`, and `sarif-file` when a report was written.

The action uses the runner's Node.js (20.12 or newer) and leaves your job's Node version alone.
On self-hosted runners without it, add `actions/setup-node` before this step.

> [!NOTE]
> Code scanning expects each finding to point at a file in your repository, which a live page
> doesn't have. privalint maps every page to a stable path such as
> `privalint/your-site.de/kontakt`. Treat the SARIF integration as experimental for now.

## CLI

```
privalint <url> [options]

  -p, --max-pages <n>     Crawl up to n pages of the same site (default 1)
  -f, --format <format>   text | json | markdown | sarif (default text)
  -o, --output <file>     Write the report to a file and print a text summary.
                          Repeatable; .sarif, .json and .md pick their format,
                          other extensions use --format
      --fail-on <level>   error | warning | never (default error)
      --disable <rules>   Comma-separated rule ids to skip
      --settle <ms>       Wait this long after load for late tags (default 2000)
      --timeout <ms>      Navigation timeout per page (default 30000)
      --locale <locale>   Browser locale (default de-DE)
      --list-rules        Print the available rules and exit
```

Exit codes: `0` nothing at or above `--fail-on`, `1` findings, `2` bad arguments or a failed scan.

The first run needs a browser. If Playwright hasn't installed one yet:

```bash
npx playwright install chromium
```

## Use it from code

```ts
import { scan } from 'privalint';

const result = await scan('https://your-site.de', { maxPages: 10 });
for (const finding of result.findings) {
  console.log(finding.severity, finding.ruleId, finding.pageUrl);
}
```

## How it works

1. Every page is opened in a **fresh browser context**: no cookies and no storage, the same as a
   first visit.
2. privalint waits for the network to go idle plus a settle delay (`--settle`), so tags that load
   late are caught too.
3. It records every request, the final cookie jar, all links and `<link>` resource hints.
4. Each rule looks at that snapshot and reports findings with evidence and a suggested fix.
5. With `--max-pages`, links to the same site are followed breadth-first. Query strings are
   dropped, pages are deduplicated after redirects, and pages that fail to load (downloads,
   timeouts) are listed but don't stop the crawl.

It never clicks your consent banner, so everything it reports happened **before consent**.

### Limitations

- It doesn't yet test what happens after "Reject" or "Accept". That's next on the roadmap.
- Tracker detection uses a hand-maintained list ([`src/data/trackers.ts`](src/data/trackers.ts)).
  A vendor missing from the list goes unnoticed. Additions are very welcome.
- First-party detection compares hostnames and ignores the public suffix list, so sibling
  subdomains on shared hosts like `*.github.io` count as first party.
- Server-side tracking can't be seen from the browser.
- Many consent managers decide by IP address whether to show a banner. GitHub-hosted runners
  have US addresses, so some sites load trackers there that EU visitors never get, and the
  result differs from what an EU visitor sees. Use a runner or proxy in the EU for results you
  want to rely on.
- Chromium is launched with Playwright's defaults, which turn off the Chromium sandbox. Don't
  scan sites you don't trust on a machine that holds secrets.

## Roadmap

- Consent flows: click "Reject" and "Accept" and check what changes
- Rules for YouTube embeds without `youtube-nocookie.com`, Google Maps, reCAPTCHA, Gravatar,
  unpkg/jsDelivr and other third-party CDNs
- A privacy policy link check
- PR comments from the Action
- Config file (`privalint.config.ts`) for allowlists and per-rule severity
- Larger tracker list built from the Apache-licensed
  [Open Cookie Database](https://github.com/jkwakman/Open-Cookie-Database)

## Contributing

Bug reports, false positives, new trackers and new rules are all welcome. Start with
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
