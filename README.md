# privalint

[![CI](https://github.com/jexcellence/privalint/actions/workflows/ci.yml/badge.svg)](https://github.com/jexcellence/privalint/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/privalint)](https://www.npmjs.com/package/privalint)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-privalint-blue?logo=github)](https://github.com/marketplace/actions/privalint)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Deutsch:** [README.de.md](README.de.md)

Lint your website for the privacy mistakes that get people warning letters: trackers that fire
before consent or keep running after "reject", a reject button that is hidden, pale or out of
keyboard reach, fonts loaded from Google or Adobe, embeds before consent, a privacy policy that
doesn't name the services the site uses, and a missing or incomplete Impressum.

privalint opens your site in a real Chromium browser with no cookies or storage, like a first
visit. It records what loads before anyone touches the consent banner, clicks "reject", reloads
and checks what still loads, then reads the legal notice and privacy policy the site links. Run it
from your terminal, as a GitHub Action on every pull request, or from your own code.

```bash
npx privalint https://your-site.de
```

<p align="center">
  <img src="docs/demo.svg" alt="privalint output: Google Analytics still runs after clicking reject, Google Fonts are loaded from Google, a YouTube embed loads before consent" width="820">
</p>

<sub>Output for the demo page in <a href="test/fixtures/demo/index.html"><code>test/fixtures/demo</code></a>, long lines
shortened. Regenerate it with <code>npm run demo</code>.</sub>

> [!IMPORTANT]
> privalint runs automated checks. A clean result means it found none of the problems it looks
> for. It does not make your site GDPR compliant and it is not legal advice.

## What it checks

Each rule has its own page with what it checks, why, how to fix it and its limits.

### Consent banner

| Rule                                                             | Severity | What it finds                                                                                                              |
| ---------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| [`pre-consent-trackers`](docs/rules/pre-consent-trackers.md)     | error    | Analytics, ads and session-replay tools that send requests or set cookies before consent. A bare tag manager is a warning. |
| [`trackers-after-reject`](docs/rules/trackers-after-reject.md)   | error    | Trackers that still load after clicking "reject" and reloading.                                                            |
| [`consent-banner-missing`](docs/rules/consent-banner-missing.md) | warning  | Trackers run and there is no consent banner at all.                                                                        |
| [`reject-option`](docs/rules/reject-option.md)                   | warning  | A banner with "accept" but no "reject" on its first layer. Pay-or-OK banners are noted as info.                            |
| [`reject-less-prominent`](docs/rules/reject-less-prominent.md)   | info     | A reject control shown as plain text, much smaller, or with much lower contrast than the accept button.                    |
| [`banner-keyboard`](docs/rules/banner-keyboard.md)               | warning  | A reject control the Tab key never reaches, such as a `<div>` with a click handler.                                        |
| [`banner-legal-links`](docs/rules/banner-legal-links.md)         | warning  | A banner that blocks the page and links neither the privacy policy nor the Impressum.                                      |
| [`banner-language`](docs/rules/banner-language.md)               | info     | A banner in another language than the page.                                                                                |
| [`consent-settings-link`](docs/rules/consent-settings-link.md)   | warning  | No visible link or button to reopen the cookie settings after rejecting.                                                   |

Opt-in checks load the start page once more in a fresh browser:

| Option             | Rule                                                               | Severity | What it finds                                                                                        |
| ------------------ | ------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------- |
| `--check-settings` | [`trackers-after-settings`](docs/rules/trackers-after-settings.md) | error    | Trackers that still load after switching off every category in the banner settings and saving.       |
| `--check-settings` | [`consent-preselected`](docs/rules/consent-preselected.md)         | error    | Optional categories already switched on when the banner settings open.                               |
| `--check-close`    | [`trackers-after-close`](docs/rules/trackers-after-close.md)       | error    | Trackers that load after the banner was closed with its "×" button.                                  |
| `--gpc`            | [`gpc-signal`](docs/rules/gpc-signal.md)                           | info     | Whether the site hides its banner and blocks trackers when the browser sends Global Privacy Control. |
| `--check-accept`   | [`privacy-policy-vendors`](docs/rules/privacy-policy-vendors.md)   |          | Accepts, and also checks the privacy policy for the services that load only with consent.            |

### Trackers, embeds and fonts

| Rule                                                                   | Severity | What it finds                                                                                                           |
| ---------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| [`google-fonts`](docs/rules/google-fonts.md)                           | error    | Fonts fetched from `fonts.googleapis.com` / `fonts.gstatic.com`. Leftover preconnects are a warning.                    |
| [`adobe-fonts`](docs/rules/adobe-fonts.md)                             | error    | Fonts fetched from Adobe Fonts (`use.typekit.net` / `p.typekit.net`). Leftover preconnects are a warning.               |
| [`third-party-embeds`](docs/rules/third-party-embeds.md)               | warning  | YouTube, Vimeo, Google Maps, reCAPTCHA, Gravatar, social embeds and chat or review widgets before consent.              |
| [`fingerprinting`](docs/rules/fingerprinting.md)                       | warning  | Third-party scripts that read canvas, WebGL renderer or audio fingerprinting signals before consent.                    |
| [`third-party-personal-data`](docs/rules/third-party-personal-data.md) | warning  | Requests to other sites that carry e-mail addresses or phone numbers, plain or hashed. Values are never reported.       |
| [`third-country-providers`](docs/rules/third-country-providers.md)     | info     | Error monitoring, backends and similar services outside the EU/EEA, such as Sentry in the US, contacted before consent. |
| [`third-party-cdns`](docs/rules/third-party-cdns.md)                   | info     | Scripts and styles from jsDelivr, unpkg, cdnjs and other public CDNs.                                                   |
| [`tracking-cookie-lifetime`](docs/rules/tracking-cookie-lifetime.md)   | info     | Tracking cookies that last longer than 13 months.                                                                       |

Trackers are recognised by host and cookie, and also when they hide:

- **Proxied through the site's own domain:** GA4 `/g/collect`, server-side Google Tag Manager and
  the Meta Pixel endpoint are recognised by path and parameters on any host.
- **Behind a first-party CNAME:** in native scans, privalint resolves the CNAME chain of the site's
  own subdomains and reports `metrics.your-site.de` as the tracker it points to.
- **Fingerprinting:** canvas, WebGL and audio reads are recorded with the script that made them.

### Legal notice and privacy policy

| Rule                                                             | Severity | What it finds                                                                                                                         |
| ---------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [`impressum-link`](docs/rules/impressum-link.md)                 | warning  | Pages without a link to an Impressum. A contact link alone is noted as info.                                                          |
| [`legal-notice-content`](docs/rules/legal-notice-content.md)     | warning  | A linked legal notice without a postal address or e-mail address. A registered company without a register entry is noted as info.     |
| [`privacy-policy-link`](docs/rules/privacy-policy-link.md)       | warning  | Pages without a link to a privacy policy.                                                                                             |
| [`privacy-policy-vendors`](docs/rules/privacy-policy-vendors.md) | warning  | Trackers and cookie-setting embeds the start page uses that the privacy policy doesn't name. Fonts, CDNs and other services are info. |
| [`privacy-policy-content`](docs/rules/privacy-policy-content.md) | warning  | A privacy policy without contact details of the controller, or with template placeholders.                                            |

The privacy policy is read together with a cookie policy it links, also when that is a PDF on the
same site.

### Forms, transport and online shops

| Rule                                                               | Severity | What it finds                                                                                            |
| ------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------- |
| [`form-privacy-notice`](docs/rules/form-privacy-notice.md)         | info     | Contact, sign-up or login forms without a privacy-policy link next to them.                              |
| [`form-preticked-consent`](docs/rules/form-preticked-consent.md)   | warning  | Forms that tick a newsletter or advertising consent box in advance.                                      |
| [`https-transport`](docs/rules/https-transport.md)                 | error    | The start page over plain HTTP. HTTP without a redirect to HTTPS is a warning, no HSTS is info.          |
| [`mixed-content`](docs/rules/mixed-content.md)                     | error    | HTTPS pages with a form that submits over HTTP. Resources over HTTP are info.                            |
| [`referrer-policy`](docs/rules/referrer-policy.md)                 | info     | A referrer policy that sends full page addresses to other sites.                                         |
| [`withdrawal-button`](docs/rules/withdrawal-button.md)             | warning  | Online shops without a "withdraw from contract here" link on the start page (required since 19.06.2026). |
| [`accessibility-statement`](docs/rules/accessibility-statement.md) | info     | Online shops without a link to accessibility information (European Accessibility Act).                   |

### Fix guides for consent managers

Using [Cookiebot](docs/fixes/cookiebot.md), [Usercentrics](docs/fixes/usercentrics.md),
[OneTrust](docs/fixes/onetrust.md) or [Complianz](docs/fixes/complianz.md)? Each guide maps the
consent findings to the setting in that consent manager, every step linked to its documentation.
When privalint recognises one of them, the fix of each such finding links the matching section.

## Reports

| Format     | Use                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| `text`     | The terminal. The default.                                                                              |
| `markdown` | Job summaries and PR comments.                                                                          |
| `sarif`    | GitHub code scanning.                                                                                   |
| `json`     | Your own tooling. Versioned and described by a [JSON schema](docs/report-contract.md).                  |
| `html`     | One self-contained page to hand to a client or attach to a ticket, in light and dark. It loads nothing. |

`-o` writes a file and picks the format by its extension (`.json`, `.md`, `.sarif`, `.html`); it
can be repeated. Reports can be written in English, German or Hungarian (`--lang`).

Every report says for each rule and page whether it was checked with no finding, found something,
or could not be checked, and why. That keeps "nothing found" apart from "not looked at".
`--fail-on-incomplete` turns an incomplete check into exit code 3.

**Baselines:** with `--baseline report.json`, privalint compares the findings with an earlier JSON
report. Each finding is marked `new` or `existing` by rule, page and subject (the same identity as
SARIF's fingerprint), findings that are gone are listed as fixed where the rule ran again, and
`--fail-on` counts new findings only. That lets you adopt privalint on a site with known findings
and fail only on new ones. SARIF results carry `baselineState`.

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
          concurrency: 3

      - uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: privalint.sarif
          category: privalint
```

The report shows up in the job summary. With the SARIF upload, findings also appear under
**Security → Code scanning**.

To create or update a PR comment, set `pr-comment: true` and grant the job `pull-requests: write`.
The action updates its own marked bot comment. Fork PRs and read-only tokens skip commenting
without failing the scan, and reports are posted even when findings make the scan step fail.

Scanning a preview deployment instead of production catches problems before they ship. Pass the
preview URL from your hosting provider's deployment event or action output as `url`.

Inputs left empty are not passed to privalint, so `privalint.config.json` in your workspace (or
`config`) decides, and the CLI default applies when neither sets a value.

| Input                | Default              |                                                                                |
| -------------------- | -------------------- | ------------------------------------------------------------------------------ |
| `url`                |                      | Page to scan. Required.                                                        |
| `config`             |                      | JSON config file. Empty reads `./privalint.config.json` if present.            |
| `max-pages`          | config, else `1`     | How many pages of the same site to crawl.                                      |
| `concurrency`        | config, else `1`     | Pages loaded at the same time; same report as with 1.                          |
| `fail-on`            | `error`              | `error`, `warning` or `never`.                                                 |
| `fail-on-incomplete` | config, else off     | `true` or `false`: fail separately for incomplete observations.                |
| `baseline`           |                      | Earlier JSON report; only findings it lacks fail the run.                      |
| `check-settings`     | config, else off     | `true` also tests the banner's settings layer.                                 |
| `check-close`        | config, else off     | `true` also closes the banner with its close button and checks what loads.     |
| `check-accept`       | config, else off     | `true` also accepts and checks the privacy policy for services loaded then.    |
| `gpc`                | config, else off     | `true` also loads the start page with Global Privacy Control (`gpc-signal`).   |
| `sitemap`            | config, else off     | `true` chooses pages from `sitemap.xml`, pages with forms first.               |
| `device`             | config, else desktop | Playwright device to emulate, such as `iPhone 15`, to check the mobile banner. |
| `disable`            |                      | Comma-separated rule ids to skip.                                              |
| `lang`               | config, else `en`    | Language of the report: `en`, `de` or `hu`.                                    |
| `region`             | config, else `de`    | Whose law to cite: `de`, `at`, `ch`, `hu`, `eu`.                               |
| `sarif-file`         | `privalint.sarif`    | Where to write SARIF. Empty to skip.                                           |
| `job-summary`        | `true`               | Add the Markdown report to the job summary.                                    |
| `pr-comment`         | `false`              | Create or update a same-repository PR report comment.                          |

Outputs: `exit-code`, and `sarif-file` when a report was written.

The action uses the runner's Node.js (20.12 or newer) and leaves your job's Node version alone.
On self-hosted runners without it, add `actions/setup-node` before this step.

> [!NOTE]
> Code scanning expects each finding to point at a file in your repository, which a live page
> doesn't have. privalint maps every page to a stable path such as `privalint/your-site.de/kontakt`.
> Alerts show up with message, evidence and fix, but there is no source file to jump to. The
> [demo scan](.github/workflows/demo.yml) runs this setup every week.

## CLI

```
privalint <url> [options]

  -p, --max-pages <n>     Crawl up to n pages of the same site (default 1)
      --concurrency <n>   Load up to n pages at the same time (default 1).
                          The report is the same as with 1
  -f, --format <format>   text | json | markdown | sarif | html (default text)
  -o, --output <file>     Write the report to a file and print a text summary.
                          Repeatable; .sarif, .json, .md and .html pick their format,
                          other extensions use --format
      --evaluations <mode>  full | summary (default full). summary leaves the
                          per-page rule results out of JSON; the per-rule
                          summary stays
      --fail-on <level>   error | warning | never (default error)
      --baseline <file>   Compare with an earlier JSON report: mark findings as new or
                          existing, list fixed ones; --fail-on counts new findings only
      --fail-on-incomplete  Exit 3 if required observation coverage is incomplete
      --allow-incomplete    Override failOnIncomplete from JSON config
      --disable <rules>   Comma-separated rule ids to skip
      --config <file>     JSON config (default: ./privalint.config.json when present)
      --settle <ms>       Wait this long after load for late tags (default 2000)
      --timeout <ms>      Navigation timeout per page (default 30000)
      --locale <locale>   Browser locale (default de-DE)
      --lang <lang>       Language of the report: en | de | hu (default en)
      --region <region>   Whose law to cite: de | at | ch | hu | eu (default de)
      --skip-consent      Don't click "reject" on the consent banner
      --consent           Enable consent checking even if the JSON config disables it
      --check-settings    Also open the banner's settings, switch everything off and
                          save, then check what still loads (loads the start page again)
      --check-close       Also close the banner with its "×" button, reload and check
                          whether that counts as consent (loads the start page again)
      --check-accept      Also accept in a fresh browser and record what loads then, so
                          the privacy policy check covers services that need consent
                          (loads the start page again)
      --gpc               Also load the start page with Global Privacy Control and
                          report whether the site reacts (loads the start page again)
      --host-checks <mode>  each | main (default each). each also runs the consent,
                          banner and HTTPS checks on the first page of up to five
                          other hosts of the site, such as docs. or blog.
      --sitemap           Choose the pages to scan from sitemap.xml, spread over the site
                          and pages with forms first, instead of only following links
      --device <name>     Emulate a Playwright device, such as "iPhone 15" or "Pixel 7":
                          viewport, user agent and touch, to see mobile banners
      --headed            Open a visible browser window instead of running headless
      --channel <name>    Use an installed browser: chrome or msedge
      --sandbox           Run Chromium with its sandbox (recommended for untrusted
                          sites; may not start in containers)
      --list-rules        Print the available rules and exit
  -h, --help              Show this help
  -v, --version           Show the version
```

Exit codes: `0` nothing at or above `--fail-on`, `1` findings, `2` invalid arguments or a failed
scan, `3` incomplete coverage with `--fail-on-incomplete` (findings exit `1` takes precedence;
rules or consent checks you switched off on purpose don't count).

The first run needs a browser. If Playwright hasn't installed one yet:

```bash
npx playwright install chromium
```

## Countries and languages

`--region` selects the references and severity profile used by the tool. It does not determine
which law applies to a website, and findings are not legal determinations:

| Region         | Cookies and tracking                 | Imprint                               | Changes                                                     |
| -------------- | ------------------------------------ | ------------------------------------- | ----------------------------------------------------------- |
| `de` (default) | Opt-in, § 25 TDDDG                   | § 5 DDG                               | none                                                        |
| `at`           | Opt-in, § 165 Abs. 3 TKG 2021        | § 5 ECG, § 25 MedienG                 | none                                                        |
| `ch`           | Opt-out, Art. 45c FMG                | Art. 3 Abs. 1 lit. s UWG (e-commerce) | trackers, embeds, fonts and `impressum-link` drop one level |
| `hu`           | Opt-in, Eht. 155. § (4)              | Ekertv. 4. §                          | none                                                        |
| `eu`           | Opt-in, Art. 5(3) ePrivacy Directive | Art. 5 Directive 2000/31/EC           | none                                                        |

Every finding lists its legal basis for the chosen country. Trackers that run after an explicit
"reject" stay an error everywhere, Switzerland included (Art. 30 Abs. 2 lit. b DSG). If a Swiss
site also targets visitors in the EU, scan it with `--region eu` as well.

`--lang de` writes findings, fixes and the report in German, `--lang hu` in Hungarian:

```bash
npx privalint https://ihre-seite.ch --region ch --lang de
npx privalint https://pelda.hu --region hu --lang hu
```

## Use it from code

```ts
import { scan } from 'privalint';

const result = await scan('https://your-site.de', { maxPages: 10, region: 'at', lang: 'de' });
for (const finding of result.findings) {
  console.log(finding.severity, finding.ruleId, finding.pageUrl);
}
```

The package also exports `applyBaseline` and `readBaseline` for comparisons,
`identifyReportSchema` and `assessCoverage` for stored reports, and the rule list.

The CLI reads `privalint.config.json` when present, or `--config <file>`, and CLI flags win. API
callers pass `ruleSettings` and `allow` explicitly; `scan()` never loads a config file. Allowed
vendors stay visible as info with a policy note; allowlisting does not establish consent or
legal approval.

```json
{
  "url": "https://example.org",
  "maxPages": 20,
  "sitemap": true,
  "rules": { "third-party-cdns": "warning", "impressum-link": "off" },
  "allow": { "vendors": ["Google Analytics"] }
}
```

Going further:

- [Configuration reference](docs/configuration.md)
- [Report contract and the optional coverage gate](docs/report-contract.md): JSON schema,
  versioning, exit codes
- [Running privalint behind a public web form](docs/controlled-scanner.md): network adapter,
  limits and cancellation, with a [type-checked example](examples/controlled-scanner.ts)
- [Consent manager recognition](docs/consent-managers.md)

## How it works

1. Every page is opened in a **fresh browser context**: no cookies and no storage, the same as a
   first visit.
2. privalint waits for the network to go idle plus a settle delay (`--settle`), so tags that load
   late are caught too.
3. It records every request, the final cookie jar, Web Storage, forms, links, resource hints and
   calls to fingerprinting APIs.
4. On the start page (and the first page of each other host of the site) it looks for the consent
   banner, by the selectors of common consent managers or by button labels in several languages.
   It measures how the accept and reject controls look, presses Tab to see whether reject can be
   reached, clicks "reject", reloads, records what still loads and checks that the settings can
   be reopened. Opt-in checks repeat the start page in a fresh browser for the settings layer,
   the close button, accepting and Global Privacy Control.
5. It reads the legal notice and privacy policy the start page links, and a cookie policy the
   privacy policy links.
6. In native scans it resolves the CNAME chain of the site's own subdomains that received requests,
   to find trackers behind them. Scans through a network adapter make no DNS lookups.
7. Each rule looks at those snapshots and reports findings with evidence, a fix and the legal
   basis for the chosen region.
8. With `--max-pages`, links to the same site are followed breadth-first, or chosen from the
   sitemap with `--sitemap`. Query strings are dropped, except the parameters that select a page on
   `/` and `*.php` (`page_id`, `p`, `id`, `cat`, `page`, `lang`). Pages are deduplicated after
   redirects, and pages that fail to load are listed but don't stop the crawl. "Same site" means
   the same registrable domain from the [public suffix list](https://publicsuffix.org/), shipped
   with the [tldts](https://github.com/remusao/tldts) dependency.

### Limitations

- Some sites don't show their consent banner to headless browsers. privalint then reports
  "no banner found" and skips the reject check. Run it locally with `--headed`; with
  `--channel msedge` or `--channel chrome` it uses your installed browser. privalint never
  disguises itself as a different browser.
- Some sites block automated browsers completely and serve a block page instead. privalint scans
  what it gets, so check the scanned URL and the page count in the report.
- Tracker detection uses a hand-maintained list ([`src/data/trackers.ts`](src/data/trackers.ts)),
  with vendor-documented hosts. A vendor missing from the list goes unnoticed; additions are very
  welcome. Unknown cookies are also looked up in the analytics and marketing cookies of the
  [Open Cookie Database](https://github.com/jkwakman/Open-Cookie-Database) (Apache-2.0, see
  [NOTICE](NOTICE)), by name only.
- Server-side tracking can't be seen from the browser.
- Many consent managers decide by IP address whether to show a banner. GitHub-hosted runners have
  US addresses, so the result can differ from what an EU visitor sees. Use a runner or proxy in
  the EU for results you want to rely on.
- PDFs that are only scanned images have no text to read, and a privacy policy that is itself a
  PDF is not read.
- Chromium runs without its sandbox by default, like Playwright's own default, because the sandbox
  often can't start in containers. Pass `--sandbox` when you scan sites you don't trust on a
  machine that holds secrets. The sandbox needs unprivileged user namespaces, which Docker's
  default seccomp profile and AppArmor on Ubuntu 23.10 and later restrict.

## Roadmap

- Region profiles for France, Italy, Spain, Poland, the Netherlands and the UK
  ([#134](https://github.com/jexcellence/privalint/issues/134))
- Report text in French, Italian, Spanish and Polish
  ([#135](https://github.com/jexcellence/privalint/issues/135))

## Contributing

privalint gets better with every tracker, consent manager and false positive someone reports.
Most contributions are a few lines of data plus a test, and you don't need to know the whole
codebase. Good places to start:

| Issue                                                                                    | What it takes                                   |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [#136](https://github.com/jexcellence/privalint/issues/136) Hungarian report text        | Read the Hungarian messages as a native speaker |
| [#71](https://github.com/jexcellence/privalint/issues/71) Vendor sources                 | Find the vendor's own page listing its hosts    |
| [#55](https://github.com/jexcellence/privalint/issues/55) Consent settings selectors     | Check two selectors on a live banner            |
| [#57](https://github.com/jexcellence/privalint/issues/57) Save buttons in more languages | Add labels seen on real banners, plus a test    |

Found a false positive or a tracker privalint missed? The
[issue forms](https://github.com/jexcellence/privalint/issues/new/choose) ask for exactly what's
needed. [CONTRIBUTING.md](CONTRIBUTING.md) covers setup, adding a tracker and writing a rule.

If privalint saved you a warning letter or a review round, a star helps others find it.

## License

[MIT](LICENSE). The cookie data in `src/data/open-cookie-database.ts` comes from the Open Cookie
Database under Apache-2.0; see [NOTICE](NOTICE).
