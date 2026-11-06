# trackers-after-close

[Deutsch](trackers-after-close.de.md)

Opt-in (`--check-close`). Reports trackers that load after the consent banner was closed with its
close button instead of a choice.

## What it checks

With `--check-close`, privalint loads the start page once more in a fresh browser, looks for the
banner's close control and clicks it: a visible control in the banner layer whose whole text is
"×", "✕", "X", "Close", "Schließen", "Bezár", … or whose `aria-label` or `title` says so. It then
reloads the page and compares what loads, like the reject path. Each tracker on privalint's list
that loads or sets new cookies then is an `error` (a tag manager alone is a `warning`).

| Situation                      | Result                                        |
| ------------------------------ | --------------------------------------------- |
| Close button found and clicked | checked; findings for trackers that loaded    |
| Banner without a close button  | checked, no finding: closing can't be misread |
| `--check-close` not given      | skipped (`close-check-disabled`), not a gap   |
| Banner didn't appear again     | not evaluable (`banner-not-shown`)            |

The report records the result in `consent.close`: outcome, reason, the close control's label and
whether the window after closing was observed completely.

## Why

Consent needs a clear affirmative act. Closing a banner is no choice at all, so a site that loads
trackers afterwards treats silence as consent (EDPB cookie banner taskforce report, 17.01.2023).

- § 25 Abs. 1 TDDDG, Art. 4 Nr. 11 DSGVO (Germany)
- § 165 Abs. 3 TKG 2021, Art. 4 Nr. 11 DSGVO (Austria)
- Art. 45c FMG (Switzerland; opt-out model, so findings drop one level there)
- Eht. 155. § (4), GDPR 4. cikk 11. pont (Hungary)

## How to fix

Handle closing like no choice: keep trackers blocked until the visitor accepts, or remove the
close button so that only accept, reject and settings remain.

## Limits

- Close controls without a recognisable label, such as an unlabelled icon, are not found.
- Only the start page is checked.
