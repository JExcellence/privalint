# tracking-cookie-lifetime

[Deutsch](tracking-cookie-lifetime.de.md)

Notes tracking cookies that the site keeps for longer than 13 months.

## What it checks

Every cookie the page sets, before consent and after rejecting, is matched against the tracker
list. A matching cookie that expires more than 13 months (395 days) after the scan is reported,
grouped by vendor, as **info**, with its lifetime in days. Session cookies and cookies that aren't
on the tracker list, such as the consent manager's own, are not checked.

privalint never accepts a banner, so most cookies reported here already appear as errors under
[`pre-consent-trackers`](pre-consent-trackers.md) or [`trackers-after-reject`](trackers-after-reject.md).
The lifetime is a separate point: it stays wrong after the consent problem is fixed.

## Why

Personal data may only be kept as long as the purpose needs it (storage limitation). The French
regulator CNIL recommends at most 13 months for tracking cookies, and the figure is widely used
as a benchmark. Google Analytics sets `_ga` for two years by default.

- Art. 5(1)(e) GDPR
- CNIL recommendation on cookies, 17.09.2020

## How to fix

Shorten the lifetime in the tool's configuration. In Google Analytics 4 set `cookie_expires` (in
seconds, for example `34128000` for 395 days) in the `gtag('config', …)` call or the tag
manager's Google tag settings. Other tools have similar settings.
