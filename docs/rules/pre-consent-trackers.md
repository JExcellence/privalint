# pre-consent-trackers

[Deutsch](pre-consent-trackers.de.md)

Reports analytics, advertising, session-replay and marketing tools that send requests or set
cookies before the visitor has agreed to it.

## What it checks

Each page is loaded in a fresh browser without touching the consent banner. privalint then
compares:

- every request URL against the tracker list in [`src/data/trackers.ts`](../../src/data/trackers.ts)
- every cookie in the jar, by name prefix (e.g. `_ga`, `_fbp`, `_hj`) and by domain, then, if
  neither matches, by name against the analytics and marketing cookies generated from the
  [Open Cookie Database](https://github.com/jkwakman/Open-Cookie-Database)
  ([`src/data/open-cookie-database.ts`](../../src/data/open-cookie-database.ts))

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

Cookies are also matched against the Open Cookie Database by name, on any domain. Names that any
site could use for its own cookie (`session`, `token`, `put_`, …) are left out of that list when it
is generated; see `GENERIC` in `scripts/build-cookie-trackers.mjs`.

Dynatrace (`dtCookie`, `dtPC`, `rxVisitor`, …) is reported as analytics on purpose. Its real user
monitoring records sessions and user actions per visitor, which goes beyond what is strictly
necessary to run the site. If you only use it for server-side monitoring, the browser cookies
won't be there.

## Sources for the session-replay hosts

Guessed domains cause false positives, so each host comes from the vendor or from a live site
(checked 2026-10-28):

| Vendor        | Hosts                                               | Source                                                                                                                                                                      |
| ------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FullStory     | `edge.fullstory.com`, `rs.fullstory.com`            | [FullStory system requirements](https://developer.fullstory.com/browser/system-requirements/) name `edge.fullstory.com/s/fs.js`; `rs.fullstory.com` loaded on fullstory.com |
| Mouseflow     | `cdn.mouseflow.com`                                 | Tracking snippet in Mouseflow's own WordPress plugin (`mouseflow-for-wordpress` 5.1.3)                                                                                      |
| Smartlook     | `web-sdk.smartlook.com`                             | Loaded on fogbugz.com, braiins.com and pinata.cloud                                                                                                                         |
| Lucky Orange  | `tools.luckyorange.com`, `settings.luckyorange.com` | Loaded on luckyorange.com                                                                                                                                                   |
| Contentsquare | `contentsquare.net`, cookies `_cs_*`                | Tag, page view and recording requests and the cookies on contentsquare.com                                                                                                  |

## Sources for the hosts added on 2026-11-01

Each host is named in the vendor's own install, CSP or allowlist documentation. Customers can run
some of these tools on their own subdomain (CNAME); privalint can't recognise those by host.

| Vendor                                    | Hosts                                                                                               | Source                                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Adobe Analytics, Target, Audience Manager | `omtrdc.net` (Target: `tt.omtrdc.net`), `2o7.net`, `demdex.net`, `everesttech.net`, `everestjs.net` | [Adobe Experience Cloud ID: CSP](https://experienceleague.adobe.com/en/docs/id-service/using/reference/csp)                  |
| Adobe Experience Platform Web SDK         | `edge.adobedc.net`                                                                                  | [Web SDK `edgeDomain`](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/commands/configure/edgedomain) |
| Adobe Experience Platform Tags            | `assets.adobedtm.com`                                                                               | [Adobe Experience Cloud ID: CSP](https://experienceleague.adobe.com/en/docs/id-service/using/reference/csp)                  |
| etracker                                  | `code.etracker.com`, `etracker.de`                                                                  | [etracker basic integration](https://help.etracker.com/en/article/basic-integration/)                                        |
| INFOnline                                 | `ioam.de`, `iocnt.net`                                                                              | [INFOnline web integration](https://docs.infonline.de/infonline-measurement/en/integration/web/)                             |
| Piwik PRO                                 | `<org>.piwik.pro`, `<org>.containers.piwik.pro`                                                     | [Piwik PRO CSP](https://developers.piwik.pro/docs/content-security-policy-csp)                                               |
| Heap                                      | `heap-api.com`, `cdn.heapanalytics.com`, cookies `_hp2_*`                                           | [Heap web installation](https://developers.heap.io/docs/web)                                                                 |
| Pendo                                     | `cdn.pendo.io`, `data.pendo.io` and their `eu.` forms                                               | [Pendo allowlist](https://support.pendo.io/hc/en-us/articles/360032209131)                                                   |
| Optimizely                                | `cdn.optimizely.com`, `logx.optimizely.com`                                                         | [Optimizely CSP](https://support.optimizely.com/hc/en-us/articles/4410289675149)                                             |
| Chartbeat                                 | `static.chartbeat.com`, `ping.chartbeat.net`                                                        | [Chartbeat JavaScript](https://docs.chartbeat.com/cbp/tracking/standard-websites/our-javascript)                             |
| Comscore                                  | `scorecardresearch.com`                                                                             | [Comscore support](https://direct-support.comscore.com/hc/en-us/articles/360002578333)                                       |
| Facebook SDK                              | `connect.facebook.net/<locale>/sdk.js` (category social, apart from the Meta Pixel)                 | [Facebook JavaScript SDK quickstart](https://developers.facebook.com/docs/javascript/quickstart)                             |
