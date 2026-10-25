# pre-consent-trackers

Reports analytics, advertising, session-replay and marketing tools that send requests or set
cookies before the visitor has agreed to it.

## What it checks

Each page is loaded in a fresh browser without touching the consent banner. privalint then
compares:

- every request URL against the tracker list in [`src/data/trackers.ts`](../../src/data/trackers.ts)
- every cookie in the jar, by name prefix (e.g. `_ga`, `_fbp`, `_hj`) and by domain

Findings are grouped by vendor, with up to five pieces of evidence each.

| Category                                                             | Severity |
| -------------------------------------------------------------------- | -------- |
| analytics, advertising, session-replay, social, marketing-automation | error    |
| tag-manager (e.g. a GTM container on its own)                        | warning  |

A tag manager container is a warning because loading it already transfers the IP address to a
third party, but whether it fires tags without consent depends on its configuration. Any tag it
fires that matches the list is reported separately as an error.

## Why

Two things need consent here, and a tracker usually does both:

- **Cookies and similar storage.** Storing or reading information on the visitor's device needs
  consent unless it is strictly necessary for the service the visitor asked for. Analytics and
  advertising are not.
- **The request itself.** Loading a third-party script or pixel sends the visitor's IP address
  and usually identifiers to that vendor. For tracking purposes this needs a legal basis, which
  in practice is consent. That's why cookieless requests are reported too.

- § 25 Abs. 1 TDDDG (Germany), implementing Art. 5(3) of the ePrivacy Directive
- Art. 6(1)(a) GDPR for the processing that follows
- CJEU, 01.10.2019, C-673/17 (Planet49): consent must be active, pre-ticked boxes don't count

## How to fix

- Let your consent manager load the script after opt-in instead of putting it in the page
  template. Most CMPs support blocked script tags such as
  `<script type="text/plain" data-category="analytics">`.
- With Google tags, Consent Mode "basic" sends nothing before consent. "Advanced" mode still
  sends cookieless pings, which privalint reports. Whether those pings are allowed without
  consent is disputed. privalint takes the cautious view.
- If you switch to an analytics tool that works without cookies, check its documentation and your
  local regulator's view before relying on an exemption.

## False positives

The list matches hostnames, so a domain that serves both tracking and harmless content may be
flagged. Please [open an issue](https://github.com/jexcellence/privalint/issues/new?template=false-positive.yml)
with the URL and the finding.
