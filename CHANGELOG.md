# Changelog

All notable changes are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org).

## Unreleased

Upgrade notes:

- New reports carry `schemaVersion: "1.5.0"`. It adds the report language `hu` and the
  `linked-page` observation with its reasons. Consumers that accept 1.4.0 only must add 1.5.0
  (`schemas/report-1.5.0.schema.json`).
- On sites with subdomains, the first crawled page of up to five other hosts (`docs.`, `blog.`)
  now gets the consent, banner and HTTPS checks too. That can add findings and one consent run
  per host. `--host-checks main` or `"hostChecks": "main"` keeps the previous behaviour.
- The legal notice and the privacy policy linked from the start page are loaded once more for the
  new `legal-notice-content`, `privacy-policy-vendors` and `privacy-policy-content` rules, plus a
  cookie policy the privacy policy links. That is up to three extra page loads per scan, also
  through a network adapter, and can add findings. Deselect a rule to skip its load. Without a
  legal notice link, a page behind a vague legal link or the privacy policy is read instead.
- Native scans make DNS lookups for up to 20 first-party subdomains that received requests, to
  find CNAME-cloaked trackers. Scans through a network adapter make none.
- New rules run by default and can add findings: `mixed-content` reports a form that submits over
  HTTP as an error, so scans with the default `--fail-on error` can fail on it;
  `form-preticked-consent`, `privacy-policy-content`, `third-party-personal-data` and
  `banner-keyboard` add warnings,
  `referrer-policy` info.
- Values of e-mail and phone parameters in request addresses are replaced by `[redacted]` in
  finding evidence, so evidence strings of native scans can differ from earlier reports.
- Scans with the settings check can report the new `consent-preselected` error on banners whose
  settings layer starts with optional categories switched on.

### Added

- `--check-accept` (config `acceptCheck`, Action input `check-accept`): privalint also accepts in a
  fresh browser, reloads and records what loads then. `privacy-policy-vendors` then also looks for
  services that run only with consent, and `thirdParties` lists them with the phase
  `after-accept`. The outcome is in `consent.accept` (schema 1.5.0); there is no finding of its
  own (#131)
- New rule `banner-keyboard` (warning): before clicking reject, privalint presses Tab up to 60
  times and warns when the reject control never gets focus, with the element and the press that
  focused the accept control as evidence (#122)
- CNAME-cloaked trackers: native scans resolve the CNAME chain of first-party subdomains that
  received requests and report a chain that reaches a tracker (from the tracker list and AdGuard's
  cname-trackers list) through `pre-consent-trackers`, with the chain as evidence. No DNS lookups
  through a network adapter or offline (#126)
- New rule `fingerprinting` (warning): a third-party script reads back a canvas, the unmasked WebGL
  renderer or an offline audio rendering before consent. Charts that only draw are not reported;
  reCAPTCHA, hCaptcha and Turnstile are info. The Fingerprint agent hosts are on the tracker list
  (#124)
- Trackers routed through the site's own domain are recognised by their path and parameters on
  any host: GA4 `/g/collect?v=2&tid=G-…`, Universal Analytics collect hits, server-side Google Tag
  Manager `gtm.js?id=GTM-…` and `gtag/js?id=G-…`, and Meta Pixel `/tr?id=…&ev=…`. The evidence names
  the host they were proxied through (#125)
- New opt-in rule `trackers-after-close` (`--check-close`, config `closeCheck`, Action input
  `check-close`): privalint closes the banner with its close button ("×", "Schließen") in a fresh
  browser, reloads and reports trackers that load then as errors, since closing is no choice. A
  banner without a close button counts as checked. The result is in `consent.close` (schema
  1.5.0) (#121)
- New rule `banner-language` (info): the consent banner is in another language than the page's
  `<html lang>`, guessed from common words of eight languages. A banner in the language of the
  browser locale is not reported, since many consent managers follow it (#123)
- `--sitemap` (config `sitemap`, Action input `sitemap`) chooses the pages after the start page from
  the sitemap: `Sitemap:` lines in robots.txt, else `/sitemap.xml`, with sitemap indexes one level
  deep. Up to half the pages go to pages likely to hold forms or checkout steps (`/kontakt`,
  `/newsletter`, `/checkout`, …), shallowest first and one per section; the rest take one page per
  section in turn. Same-site pages only, within `maxPages`; without
  a sitemap the crawl follows links as before (#133)
- Reports list every host outside the site that answered a request in `thirdParties`: registrable
  domain, first page, phases, request count and the vendor privalint knows it as, hosts only. The
  Markdown report shows it as a collapsed table, a starting point for the privacy policy and for
  new list entries (#127)
- `--device <name>` (config `device`, Action input `device`) emulates a Playwright device such as
  "iPhone 15": viewport, user agent and touch, so banners are checked in their mobile layout, where
  the reject button is often hidden or smaller. The report records it in `options.device`
  (schema 1.5.0) (#130)
- New rule `third-party-personal-data` (warning): requests to other sites carry e-mail
  addresses or phone numbers in their query string, plain or as SHA-256 hashes in parameters
  such as `em` or `ud[em]`. Only parameter names are reported, and the values are replaced by
  `[redacted]` in every finding that shows a request address (#118)
- `third-party-embeds` fixes point to the YouTube privacy-enhanced mode, the Vimeo `dnt=1`
  parameter and a placeholder image for Google Maps. None replaces consent (#137)
- New rule `form-preticked-consent` (warning): a form ticks a newsletter or advertising consent
  checkbox before the visitor chooses (#139)
- New rule `mixed-content`: a form on an HTTPS page submits to an `http://` address (error);
  scripts, images, frames or stylesheets referenced over HTTP are info (#120)
- New rule `referrer-policy` (info): the page sets `unsafe-url` or `no-referrer-when-downgrade` by
  header or meta tag and contacts other hosts, which then receive the full page address (#119)
- New rule `privacy-policy-content`: the privacy policy gives no e-mail or postal address of the
  controller, or still contains template text such as `[Firmenname]` or "Musterstraße" (warning);
  a data protection officer named without contact details is info. On an overview page that links
  further privacy documents, a missing contact is info (#116)
- `legal-notice-content` reads a page behind a vague legal link ("Rechtliche Hinweise") or the
  privacy policy when the start page links no legal notice, and reports what it misses there as
  info (#114)
- Trackers from the vendors' own documentation: Google Ads conversions on `www.google.com`,
  Reddit Pixel, VWO (hosts and cookies), Microsoft Xandr universal pixel and the Amazon Associates
  oneTag (#71)
- The Drupal banner EU Cookie Compliance is recognised by name, as seen on a Hungarian railway
  site that offers only "accept all"
- `--lang hu`: findings, fixes and the text, Markdown and SARIF reports in Hungarian, with
  schema 1.5.0 for the new language value (#59)
- New rule `privacy-policy-vendors`: trackers and cookie-setting embeds the start page uses that
  the privacy policy, or a cookie policy it links, doesn't name (warning); font services, CDNs and
  other listed services as info. Names match as whole words, with known other names (#105)
- New rule `legal-notice-content`: the legal notice linked from the start page gives no postal
  address or e-mail address (warning), or names a registered legal form without a register entry
  (info). Postcodes of Germany, Austria, Switzerland and Hungary are recognised (#104). With
  `--region hu` a missing tax number of a company, with `--region at` a missing media disclosure
  (Offenlegung) is noted as info (#115)
- New rule `third-country-providers` (info): error monitoring, performance monitoring, feature
  flag and backend services outside the EU/EEA contacted before consent, such as Sentry on
  `ingest.us.sentry.io` or a Supabase project. Region hosts in the EU are not reported (#109)
- New rule `reject-less-prominent` (info): a first-layer reject control shown as plain text next
  to an accept button, with less than half its area, or with low text contrast, measured from the
  rendered box and computed styles (#107)
- New rule `consent-preselected` (error, with the settings check): optional categories, or a wider
  consent level, already switched on when the banner settings open, named by their labels in
  `consent.settings.preselected` (#106)
- New rule `tracking-cookie-lifetime` (info): tracking cookies that last longer than 13 months,
  the CNIL's recommended maximum, with their lifetime in days (#108)
- Start-page checks on other hosts of the site: consent, reject, banner and HTTPS rules run on the
  first crawled page of each subdomain, up to five. Their consent results are in `consentByHost`.
  `--host-checks main` turns it off (#103)
- Every report has `ruleSummary`: per rule, pages with a finding, checked without one, not
  evaluable and skipped by reason, plus the page IDs worth a look. `--evaluations summary` writes
  JSON without the per-page rule evaluations; the coverage gate reads the summary then and gives
  the same verdict (#101)
- Adapter scans record how long the adapter took: `capture.diagnostics.timing.adapter` has the
  number of requests, the median and 95th percentile time to the response headers, and the five
  slowest requests split into queue, headers and body time. Text and Markdown reports print it on
  pages with timeouts, so a slow adapter environment stands out (#99)

### Changed

- Text and Markdown reports show an `impressum-link` or `privacy-policy-link` finding that repeats
  on several pages once, under "On several pages", with the pages listed. JSON and SARIF still
  have one finding per page. The messages no longer say "on this page" (#102)

### Fixed

- `legal-notice-content` only accepts an address when the street sits on the postcode's line or
  the line above it, so a stray number and a year in other paragraphs no longer pass (#142)
- `legal-notice-content` and `privacy-policy-vendors` no longer say "checked, no finding" when
  they had nothing to read: on other pages they are skipped (`not-start-page`), without a link
  they are skipped (`no-linked-page`), and when the page didn't load they are not evaluable
  (`linked-page-not-loaded`). A finding about something missing from a page that didn't load
  completely is not evaluable either (#141). A start page without such a link does not count as incomplete for
  `--fail-on-incomplete`; `impressum-link` and `privacy-policy-link` report the missing link
- A request that never finishes no longer makes every document rule not evaluable. When the page
  itself was read, a rule that finds what it looks for (the Impressum link, the privacy link)
  counts as checked; a finding about something missing stays not evaluable, since the missing
  part may not have loaded (#140)
- Side loads of the legal notice and the privacy policy skip error pages (404, 500) and links that
  lead nowhere, such as a "Privacy settings" button with `href="#"` before the policy link
- `consent-preselected` only counts switches the visitor can actually switch off, and keeps what
  it saw when a later step of the settings check fails
- `legal-notice-content` recognises UK postcodes and Irish Eircodes, ignores floors written as
  "OG"/"UG", legal forms of the host or web designer, copyright years, phone numbers and
  "at office." when looking for address, e-mail and legal form
- `privacy-policy-vendors` matches vendors named with a slash ("DoubleClick/Google Marketing")
  and "X" as Twitter
- `reject-less-prominent` measures translucent buttons on dark banners and `oklch()` colours
- `tracking-cookie-lifetime` measures 13 calendar months, so a cookie set for exactly 13 months
  is never reported
- Hungarian report text uses the right article before abbreviations and numbers ("az SE", "az 5")
- Grouped findings in text and Markdown reports keep different vendors with the same fix apart
- `privacy-policy-vendors` drops to info when the privacy policy links a cookie policy it can't
  read, such as a PDF, and names that link
- Text and Markdown reports also show a `third-country-providers` or `third-party-cdns` finding
  that repeats on several pages once per vendor
- `consent-preselected` is evaluated whenever the settings layer opened, also when no save button
  was found; before, it was not evaluable there
- A video, image or font over `maxResponseBytes` no longer makes an adapter scan page partial. It
  is delivered without its body, with status and headers kept, and noted as `resource-limit` with
  `skippedReason: 'policy'` (#100)

## 0.9.1 - 2026-11-06

Upgrade notes:

- If your network adapter refuses POST requests, pages with API or analytics calls stay partial.
  Forward the page's own POST, PUT, PATCH, DELETE and OPTIONS requests with their body, like
  `examples/controlled-scanner.ts` now does.

### Changed

- The fixes of `impressum-link` and `privacy-policy-link` suggest labels in the language the page
  declares in `<html lang>`: "Legal notice" and "Privacy policy" on an English site, "Impresszum"
  and "Adatkezelési tájékoztató" on a Hungarian one, "Impressum" and "Datenschutzerklärung" on a
  German one. Without a declared language the region decides. The BGH two-click ruling is only
  cited with `--region de` (#96)
- The example adapter in `examples/controlled-scanner.ts` forwards the page's own POST, PUT,
  PATCH, DELETE and OPTIONS requests with their body instead of refusing them. Refused API and
  analytics calls made every page with one partial. The controlled-scanning docs explain why an
  adapter should do the same (#98)

### Fixed

- A crawled link that redirects to another site is no longer scanned as one of the site's pages.
  It is listed in `offSiteRedirects` and doesn't count against `--max-pages` (#95)
- `impressum-link` no longer takes a deeper page such as `/blocks/contact` for the contact page.
  A contact page is `/kontakt`, `/contact`, `/contact-us` or `/kapcsolat` at the top of the site
  or under a language prefix, or a link labelled as one. "Kapcsolat" is recognised (#97)

## 0.9.0 - 2026-11-01

Upgrade notes:

- The Action's `max-pages`, `concurrency`, `lang`, `region` and `fail-on-incomplete` inputs now
  default to empty and are then not passed, so `privalint.config.json` applies. Workflows without a
  config file behave as before; workflows with one now get its values.
- New scans write report schema 1.4.0. Schemas 1.0.0 to 1.3.0 are unchanged and still shipped.
- Six new rules may add findings to existing scans: `consent-banner-missing`, `banner-legal-links`,
  `https-transport`, `form-privacy-notice`, `withdrawal-button` and `accessibility-statement`.
  Disable any of them with `--disable` or `"rules"` in the config.

### Added

- `--check-settings` reads the IAB TCF API (`__tcfapi('getTCData')`) after saving with
  everything off. Consent the API still reports for a purpose or vendor is a
  `trackers-after-settings` error; purposes left on through legitimate interest are a warning. The
  numbers are in `consent.settings.tcf` (#60, step 1)
- Capture timing in the diagnostics: `timing.loadMs`, `timing.networkIdleMs` and, for adapter
  scans, `timing.peakQueued`. Adapter timeouts say whether the request was `queued` or `fetching`
  (#70)
- Report schema 1.4.0 with the fields above. Schemas 1.0.0 to 1.3.0 stay available
- Trackers: Adobe Analytics, Target, Audience Manager and Experience Platform Tags, etracker,
  INFOnline, Piwik PRO, Heap, Pendo, Optimizely, Chartbeat and Comscore, each from the vendor's own
  documentation. The Facebook SDK (`connect.facebook.net/<locale>/sdk.js`) is reported as its own
  vendor in the social category instead of as the Meta Pixel
- Embeds: SoundCloud, Mapbox, Trusted Shops, Pinterest widgets and Google Calendar
- Bugsnag, Rollbar and Datadog Browser RUM/Logs ingest hosts join Sentry: a skipped error report
  to them no longer makes a capture incomplete (#69)
- `--check-settings` picks the narrowest level when a banner offers consent levels as radio
  buttons (otpbank.hu), and knows the save labels "Elfogadom a kiválasztottakat" (telekom.hu) and
  "Elfogadom a fenti …" (#57)
- Action inputs `config` and `check-settings`
- The Markdown report (job summary, PR comment) shows the first two evidence items under each
  finding
- `trackers-after-reject` reads the IAB TCF API after "Reject all" too, stored as `consent.tcf`
  (#79)
- Consent banners that appear late are found: without a result, privalint looks again for up to
  one more settle period. `consent.bannerWaitMs` says how long (#77)
- With `--max-pages`, pages selected by a query parameter (`/?page_id=2`, `/index.php?id=7`) are
  crawled as separate pages (#75)
- New rule `consent-banner-missing` (warning): trackers run on the start page and no consent
  banner was found at all. New observation kind `banner-search` (#82)
- New rules for online shops, checked on the start page of sites with a cart, checkout or shop
  system: `withdrawal-button` (warning, § 356a BGB / Art. 11a Directive 2011/83/EU, since
  19.06.2026) and `accessibility-statement` (info, § 14 BFSG / European Accessibility Act) (#83,
  #84)
- Trackers are recognised by their localStorage and sessionStorage key names too, before consent
  and after a refusal. Only names are read, never values (#80)
- New rule `banner-legal-links` (warning): a banner that blocks the page (modal, half the viewport
  or no scrolling) and doesn't link the privacy policy or the Impressum (#89)
- New rule `https-transport`: start page over plain HTTP (error), `http://` without a redirect to
  HTTPS (warning), no HSTS (info). Native scans only; adapter and offline scans skip it by design
  with `transport-not-checked` (#90)
- `--check-settings` objects to legitimate interest on TCF banners: it opens a "Berechtigtes
  Interesse" / "Legitimate interest" tab and uses its "object to all" button, or switches off the
  toggles there. `consent.settings.legitimateInterest` says what it did (#60)
- New rule `form-privacy-notice` (info): forms with an email, phone or password field and no
  privacy-policy link next to them, while the page links it elsewhere (#91)

### Changed

- `google-fonts` and `adobe-fonts` drop one level with `--region ch`, like the other third-party
  rules (#85)
- `impressum-link` notes vague legal links ("Rechtliche Hinweise", "Rechtliches", "Legal", "Jogi
  tudnivalók") as info instead of warning that there is no Impressum (#72)

- SARIF declares the label-based rules (`reject-option`, `consent-settings-link`,
  `impressum-link`, `privacy-policy-link`) with precision `medium` (#76)
- An `--output` path in a missing directory fails before the scan starts. If writing fails after
  the scan, the report is still printed and the exit code is 2 (#74)

- Tracker, embed and font rules count requests that got an HTTP error response. A pixel that
  answers 403 has still received the visitor's IP address and referrer
- Action inputs `max-pages`, `concurrency`, `lang`, `region` and `fail-on-incomplete` default to
  empty and are then not passed, so `privalint.config.json` applies. Before, their defaults
  silently overrode the config file

### Fixed

- Basic-auth credentials in the target URL (`https://user:pass@staging…`) no longer appear in any
  report, SARIF upload or PR comment. They still open the site
- A real request failure is no longer relabelled as "cancelled by the page" when two requests
  share a URL, which could make an incomplete capture look complete
- When the banner doesn't appear in the settings check's fresh browser, the report says
  `banner-not-shown` instead of a browser failure
- The SARIF rule help cites the scan's region, like each result
- SARIF page locations keep percent escapes, so `/über-uns` no longer shares a location with a
  page named `/_C3_BCber-uns`. Locations of pages with non-ASCII paths change once (#86)
- A fetch from a worker that got its answer but wasn't read no longer makes an adapter capture
  incomplete. Requests from cross-origin iframes and workers are confirmed to go through the
  adapter (#88)
- A shop cookie named `put_…` is no longer reported as Magnite advertising (#73)
- The settings control is found when it sits in a nested shadow root (#78)
- An open Server-Sent Events stream no longer makes a capture incomplete (#81)
- `--check-settings` could click "Alle bestätigen", "Confirm all" or "Alle übernehmen" as the save
  button, which switches everything on. A label covering everything only counts as saving when it
  names the selection ("Alle Einstellungen speichern")
- A page with "Angebot annehmen" and a privacy link in the footer, or a footer menu with
  "Acceptable Use Policy" next to "Cookie Policy", no longer counts as a consent banner. Accept
  buttons must sit in a dialog, an overlay or a small container about cookies, and must not lead to
  another page
- A known consent manager whose reject selector is out of date no longer produces a "no reject"
  finding; the reject button next to the accept button is found by its label
- The settings check leaves checkboxes outside the consent layer alone, such as "remember me" in a
  login form
- "Cookie beállítások" is recognised as a link to reopen the settings
- A JavaScript redirect while the page settles no longer leaves the report on the old URL
- The Markdown "How to fix" section lists each vendor's fix instead of one per rule, and escapes
  `@` so a PR comment can't mention anyone
- `docs/configuration.md` lists the region `hu`
- `test/config.test.ts` builds the CLI into its own temporary directory, so a parallel build can't
  change it mid-test (#68)

## 0.8.0 - 2026-10-31

### Changed

- Legal references in findings: `trackers-after-reject` and `trackers-after-settings` cite
  Art. 6(1)(a) GDPR (no legal basis after a refusal) instead of Art. 7(3), which is about
  withdrawing consent; `reject-option` no longer cites Art. 7(3) and adds EDPB Opinion 08/2024 for
  the EU; `third-party-cdns` cites the Munich Google Fonts ruling by analogy for Germany, and
  Planet49 carries its date. Findings and rule pages now cite the same provisions (#58)

### Fixed

- A skipped report to error monitoring (Sentry's ingest hosts) no longer makes a page capture
  incomplete. Read-only adapters skip these `POST`s, and on sites using Sentry every page used to
  end up "not checkable" because of them. The issue stays in the report with the adapter's
  reason (#64)
- The coverage gate (`--fail-on-incomplete`, `assessCoverage`) no longer fails a page whose
  capture is complete but recorded an omitted beacon or a request the page cancelled. It counted
  every recorded issue, which contradicted `capture.complete`
- The Usercentrics v3 banner (`#usercentrics-cmp-ui`) is recognised by name again, and
  `--check-settings` uses its own settings and save buttons. Only the older v2 selectors were
  known, so v3 banners fell back to the label heuristic (#55)

## 0.7.1 - 2026-10-30

### Fixed

- `third-party-embeds` recognizes Intercom Messenger's documented service hosts, including regional and realtime endpoints (#61)
- Contentsquare's opt-out cookie `_cs_optout` is no longer reported as a tracker, so
  `trackers-after-reject` doesn't flag the visitor's own refusal (#56)

## 0.7.0 - 2026-10-30

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
- Cookies the hand-maintained tracker list doesn't know are looked up in about 1,000 analytics
  and marketing cookies from the [Open Cookie Database](https://github.com/jkwakman/Open-Cookie-Database)
  (Apache-2.0, credited in the new `NOTICE` file). The data matches cookie names only, never
  request hosts; wildcard entries match as prefixes, all others exactly. Names shorter than four
  characters, generic names such as `session` or `visitor` and cookies that store a consent or
  opt-out choice are left out. Entries in `src/data/trackers.ts` still win, by cookie name and by
  the cookie's domain. `npm run cookies:build` regenerates the list (#39)

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
