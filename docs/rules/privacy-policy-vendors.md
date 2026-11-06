# privacy-policy-vendors

[Deutsch](privacy-policy-vendors.de.md)

Reports services the start page uses that its privacy policy doesn't name.

## What it checks

When the start page links a privacy policy on the same site, privalint loads it once more, without
counting it as a crawled page, and reads its visible text. If the policy links a separate cookie
policy ("Cookie policy", "Cookie-Richtlinie", "Süti tájékoztató", …), that page is read too, one
level deep.

Every service the start page contacted, before consent and after rejecting, is then looked up in
that text:

| Service                                                                                                                    | Missing from the policy |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Trackers, by request or cookie                                                                                             | `warning`               |
| Embeds such as YouTube or Google Maps that set cookies                                                                     | `warning`               |
| Embeds without cookies, font services, public CDNs, providers from [`third-country-providers`](third-country-providers.md) | `info`                  |

A service counts as named when the policy contains its name as a whole word, in any case and with
any spacing or hyphens ("Google-Analytics"), the name without words like "embed" or "pixel"
("YouTube"), a known other name ("GA4", "Facebook Pixel", "reCAPTCHA") or the host it was loaded
from. One finding per service, with the policy URL and the first request or cookie as evidence.
The findings are reported on the start page.

## Why

The privacy policy has to name the recipients of personal data. A policy that never mentions the
analytics tool or the video provider the site uses leaves visitors uninformed.

- Art. 13(1)(e) and (f) GDPR
- Switzerland (`--region ch`): Art. 19 Abs. 2 lit. c DSG

## How to fix

Name each service in the privacy policy, with the purpose, the legal basis and, where it applies,
the transfer outside the EU. If the site no longer needs a service, remove it instead.

## Limits

- Only services that load on the start page without consent, or after rejecting, are seen.
  privalint never accepts a banner, so services that only load after consent are not checked.
- A name in the policy is enough; whether the description is correct is not checked.
- Policies on another domain, in a PDF or split over more than one linked page are only partly
  read.
