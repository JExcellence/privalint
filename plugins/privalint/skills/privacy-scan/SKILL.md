---
name: privacy-scan
description: Scan a website with privalint for GDPR and consent problems (trackers before consent or after reject, consent banner design, Google Fonts, embeds, missing Impressum or privacy policy links, forms without a privacy notice) and fix the findings in the user's code. Use when the user asks whether a site is GDPR or DSGVO compliant, wants a cookie, consent or tracking check, or changed analytics, tag manager, consent banner, fonts or footer links and wants to verify it.
argument-hint: <url> [more pages, region, opt-in checks]
allowed-tools: mcp__plugin_privalint_privalint__scan_site mcp__plugin_privalint_privalint__list_rules
---

# Privacy scan with privalint

privalint loads a live website in a real browser (Chromium), clicks "reject" on the consent banner and records what loads. Its findings are technical observations with a legal reference, not legal advice. Say so once when you report them.

## 1. Scan

Call the `scan_site` tool of the privalint MCP server with the URL the user gave (`$ARGUMENTS`). If there is none, ask for it. A local dev server works too; give it with `http://`, such as `http://localhost:3000`, because a URL without a scheme is scanned with `https://`.

- `maxPages`: 1 by default. Use 5 to 10 when the user wants the whole site or forms on subpages checked; each page takes 10 to 60 seconds.
- `region`: `de` by default. Use `at`, `ch`, `hu`, `fr` (France), `it` (Italy), `es` (Spain), `nl` (Netherlands), `pl` (Poland), `uk` (United Kingdom) or `eu` when the site is clearly for that country.
- `lang`: answer in the user's language; pass `de` or `hu` when the user writes German or Hungarian.
- Opt-in checks, only when the user asks or the question needs them: `checkSettings` (switch everything off in the banner settings), `checkClose` (close the banner with its "×"), `checkAccept` (services that run after consent, for the privacy policy check), `gpc` (Global Privacy Control).

If the tool is unavailable, run the CLI instead: `npx -y privalint@latest <url> --format markdown`.

If the result says Chromium is not installed, show the user the install command from the error (it pins the Playwright version privalint uses), run it with their permission, then scan again.

## 2. Report

- Lead with the errors, then warnings. Group a finding that appears on several pages once.
- For each finding give what was observed (the evidence: request URL, cookie, link) and the fix.
- If the report says coverage is incomplete or a rule could not be evaluated, say which checks did not run. Never call a site clean when coverage is incomplete.
- Do not add findings privalint did not report, and do not call the site "compliant": privalint checks a fixed set of rules.

## 3. Fix in the code

When the user's repository contains the site, find the cause of each error and propose or make the change:

- Trackers before consent or after reject: find where the script is loaded (`gtag(`, `googletagmanager.com`, `fbq(`, `hotjar`, tag manager IDs such as `GTM-` or `G-`) and gate it behind the consent manager, or set Google Consent Mode defaults to `denied` before the tag loads.
- Google Fonts or Adobe Fonts: self-host the font files and remove the external stylesheet link.
- Missing Impressum or privacy policy link: add the link to the shared footer or layout, not to one page.
- Banner findings (reject option, preselected categories, prominence): change the consent manager's configuration or theme.

Make code changes only when the user asked for fixes. After a fix, scan the dev server or the deployed preview again and compare.

Use `list_rules` when the user asks what privalint checks or what a rule id means.
