# Consent manager recognition

[Deutsch](consent-managers.de.md)

All known-CMP selectors are evaluated inside every page frame. Accept and reject controls are
resolved in the same frame; hidden controls are ignored. Existing selectors and multilingual
label heuristics remain available through `scan()` and exported `observeConsent()`.

Additional support:

| CMP                | Recognition                                                                          |
| ------------------ | ------------------------------------------------------------------------------------ |
| CookieFirst        | `data-cookiefirst-action=accept/reject`, v3 `data-testid=actionButton-accept/reject` |
| Osano              | `.osano-cm-accept-all`, `.osano-cm-denyAll` (older `.osano-cm-deny-all`)             |
| Termly             | `data-tid=banner-accept/banner-decline`, accept-button CSS-module prefix             |
| Sourcepoint        | `button.sp_choice_type_11`, `button.sp_choice_type_13`, including iframe messages    |
| Real Cookie Banner | Existing visible-button label heuristics plus vendor script/config marker            |

Real Cookie Banner deliberately uses the shared label heuristic rather than guessed selectors
against its generated classes/IDs. No API is invoked to force consent, and no settings layer is
opened. A detected banner without a recognized first-layer reject control is `unsupported-banner`.
No banner detected alone produces no privacy finding. A click/reload success does not independently
verify the CMP's stored state; check rejection completeness and rule outcomes.

## Evidence and verification boundary

On 2026-10-27, public HTML and official scripts were inspected by HTTP from these examples:

- [CookieFirst](https://cookiefirst.com/): loaded the official `consent.cookiefirst.com` site script;
  its v3 action renderer publishes the `actionButton-` test IDs.
- [Real Cookie Banner / devowl](https://devowl.io/): HTML identifies `real-cookie-banner-pro`
  5.4.0 and references its frontend bundle; its generated UI falls back to visible labels.
- [Osano](https://www.osano.com/): HTML references the official `cmp.osano.com` loader.
- [Termly](https://termly.io/): HTML references the `app.termly.io/resource-blocker` loader;
  the shipped renderer contains the `termly-styles-module-acceptButton-` class prefix.
- [Sourcepoint](https://sourcepoint.com/): public vendor site inspected; its returned HTML did
  not provide a live Sourcepoint first-layer message to verify the control selectors.

## Checked on public sites

On 2026-10-27 privalint ran in headless Chromium from Germany against these sites:

| CMP                | Site                | Result                                                              |
| ------------------ | ------------------- | ------------------------------------------------------------------- |
| CookieFirst        | cookiefirst.com     | recognized, clicked "Deny" and reloaded                             |
| Osano              | osano.com           | recognized, clicked "Nicht wesentliche Cookies ablehnen", reloaded  |
| Termly             | termly.io           | recognized, clicked "Ablehnen" and reloaded                         |
| Sourcepoint        | spiegel.de, welt.de | recognized in its iframe, correctly classified as pay-or-OK         |
| Real Cookie Banner | devowl.io           | marker found, but the banner is not rendered (empty hidden overlay) |

The Osano reject selector used to be `.osano-cm-deny-all`, while osano.com serves
`.osano-cm-denyAll`. The selector is fixed and covered by a fixture.

Real Cookie Banner does not render its banner for an automated browser on devowl.io; privalint
correctly reports banner markup it cannot classify instead of a success. Label-based recognition
stays on purpose, and no guessed selectors for its generated class names are added.

Deterministic local fixtures cover all manager paths, both CookieFirst variants, the Osano classes
and Sourcepoint in an iframe. Production markup, region rules and CMP configurations can change.
