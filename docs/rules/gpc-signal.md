# gpc-signal

[Deutsch](gpc-signal.de.md)

Opt-in (`--gpc`). Notes how the site reacts to Global Privacy Control.

## What it checks

[Global Privacy Control](https://globalprivacycontrol.org/) is a browser setting that sends
`Sec-GPC: 1` with every request and sets `navigator.globalPrivacyControl` to `true`. With `--gpc`,
privalint loads the start page once more in a fresh browser with both, clicks nothing, and compares
that load with the plain one:

| With the signal                    | Finding                                     |
| ---------------------------------- | ------------------------------------------- |
| Banner hidden, no trackers         | `info`: the site honours the signal         |
| Banner hidden, trackers still load | `info`: names the trackers, with a fix      |
| Banner still shown                 | `info`: the site does not react, with a fix |

The finding is always `info`, in every region. The evidence lists the banner and the trackers with
and without the signal. The outcome is in `consent.gpc` of the report. The check runs only when the
start page shows a consent banner.

| Situation                         | Result                                       |
| --------------------------------- | -------------------------------------------- |
| Start page loaded with the signal | checked; always one `info` finding           |
| `--gpc` not given                 | skipped (`gpc-check-disabled`), not a gap    |
| The load with the signal failed   | not evaluable (`browser-interaction-failed`) |

## Why

Under the CCPA, a business has to treat GPC as an opt-out of sale and sharing (Cal. Civ. Code
§ 1798.135). EU law does not oblige a site to follow it, but Art. 21(5) GDPR lets people object by
automated means using technical specifications, and some consent managers treat GPC as a refusal.
A site that honours it spares those visitors the banner.

## How to fix

Treat `Sec-GPC: 1` and `navigator.globalPrivacyControl` as a refusal: store the choice as rejected
and load no trackers. Many consent managers have a setting for it.

## Limits

- Only the start page is loaded with the signal.
- A banner that shows later than the settle time can be missed, as in the reject check.
- Whether the consent manager stored a refusal is not read; only what loads and whether the banner
  shows.
