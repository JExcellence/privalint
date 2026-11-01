# consent-banner-missing

[Deutsch](consent-banner-missing.de.md)

Warns when trackers run on the start page and privalint found no consent banner at all. Visitors
then have no way to give or refuse consent.

## What it checks

On the start page privalint looks for a consent banner, by the selectors of common consent
managers and by button labels, and waits up to one more settle period for a banner that renders
late (see [consent manager recognition](../consent-managers.md)). If none appears and at least one
tool from the tracker list ran before any interaction, this rule reports it once, naming the tools.

| Situation                                                  | Severity |
| ---------------------------------------------------------- | -------- |
| No banner, analytics, advertising or session replay runs   | warning  |
| No banner, only a tag manager loads                        | nothing  |
| A banner was found, or the consent check failed or was off | nothing  |
| `--region ch` (opt-out model)                              | info     |

Each tracker is already an error under [`pre-consent-trackers`](pre-consent-trackers.md). This rule
is a warning so the same cause isn't counted twice; it says why the trackers have no consent.

## Why

Trackers need prior, active consent. Without a banner there is no moment where a visitor can give
or refuse it, so every visit is tracked without a legal basis.

- § 25 Abs. 1 TDDDG
- Art. 5(3) ePrivacy Directive
- Art. 6(1)(a) GDPR
- CJEU, 01.10.2019, C-673/17 (Planet49)

## How to fix

- Add a consent manager that blocks these tools until the visitor opts in, with "accept" and
  "reject" on its first layer.
- If you don't need consent, remove the tools or switch to a setup that doesn't store or read
  anything on the device.

## False positives

A banner that privalint can't recognise (unusual markup, a closed shadow root, shown only after
scrolling) looks like no banner. The evidence says how long privalint kept looking. Please
[open an issue](https://github.com/jexcellence/privalint/issues/new?template=false-positive.yml)
with the URL.
