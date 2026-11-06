# pre-consent-trackers

[English](pre-consent-trackers.md)

Meldet Analyse-, Werbe-, Session-Replay- und Marketing-Tools, die Anfragen senden oder Cookies
setzen, bevor der Besucher eingewilligt hat.

## Was geprüft wird

Jede Seite wird in einem frischen Browser geladen, ohne das Cookie-Banner zu bedienen. privalint
gleicht dann ab:

- jede Anfrage-URL mit der Tracker-Liste in [`src/data/trackers.ts`](../../src/data/trackers.ts)
- jedes gesetzte Cookie nach Namenspräfix (z. B. `_ga`, `_fbp`, `_hj`) und nach Domain

Befunde werden nach Anbieter gruppiert, mit bis zu fünf Nachweisen pro Anbieter.

| Kategorie                                                            | Schweregrad |
| -------------------------------------------------------------------- | ----------- |
| analytics, advertising, session-replay, social, marketing-automation | `error`     |
| tag-manager (z. B. ein GTM-Container allein)                         | `warning`   |

Ein Tag-Manager-Container ist nur eine Warnung: Schon sein Laden überträgt die IP-Adresse an
einen Dritten, ob er aber ohne Einwilligung Tags auslöst, hängt von seiner Konfiguration ab.
Jedes ausgelöste Tag, das auf der Liste steht, wird gesondert als Fehler gemeldet.

## Warum

Einwilligungspflichtig sind hier zwei Dinge, und ein Tracker tut meist beides:

- **Cookies und vergleichbare Speicher.** Informationen auf dem Endgerät zu speichern oder
  auszulesen, erfordert eine Einwilligung, sofern es nicht unbedingt erforderlich ist, um den vom
  Besucher gewünschten Dienst bereitzustellen. Analyse und Werbung sind das nicht.
- **Die Anfrage selbst.** Wer ein Skript oder Pixel eines Dritten lädt, schickt die IP-Adresse
  und meist auch Kennungen des Besuchers an diesen Anbieter. Zu Tracking-Zwecken braucht das eine
  Rechtsgrundlage, und das ist in der Praxis die Einwilligung. Deshalb meldet privalint auch
  Anfragen ohne Cookies.

- § 25 Abs. 1 TDDDG, Umsetzung von Art. 5 Abs. 3 ePrivacy-Richtlinie
- Art. 6 Abs. 1 lit. a DSGVO für die anschließende Verarbeitung
- EuGH C-673/17 (Planet49), Urteil vom 01.10.2019: Eine Einwilligung muss aktiv erteilt werden,
  vorausgefüllte Kästchen genügen nicht

## Lösung

- Lassen Sie das Skript von Ihrem Consent-Manager erst nach der Einwilligung laden, statt es fest
  ins Seiten-Template zu schreiben. Die meisten CMPs unterstützen blockierte Script-Tags wie
  `<script type="text/plain" data-category="analytics">`.
- Bei Google-Tags sendet der Consent Mode „basic“ vor der Einwilligung nichts. Im Modus
  „advanced“ gehen weiterhin cookielose Pings raus, die privalint meldet. Ob diese Pings ohne
  Einwilligung zulässig sind, ist umstritten; privalint folgt der vorsichtigen Auffassung.
- Wenn Sie auf ein Analyse-Tool ohne Cookies umsteigen, prüfen Sie dessen Dokumentation und die
  Haltung Ihrer Aufsichtsbehörde, bevor Sie sich auf eine Ausnahme verlassen.

## Fehlalarme

Die Liste vergleicht Hostnamen. Eine Domain, die sowohl Tracking als auch harmlose Inhalte
ausliefert, kann deshalb anschlagen. Bitte
[eröffnen Sie ein Issue](https://github.com/jexcellence/privalint/issues/new?template=false-positive.yml)
mit der URL und dem Befund.

Cookies und die Schlüsselnamen in localStorage und sessionStorage (nie deren Werte) werden außerdem
per Name mit der Open Cookie Database abgeglichen, auf jeder Domain. Namen,
die jede Seite für ein eigenes Cookie verwenden könnte (`session`, `token`, `put_`, …), sind beim
Erzeugen der Liste ausgenommen; siehe `GENERIC` in `scripts/build-cookie-trackers.mjs`.

Dynatrace (`dtCookie`, `dtPC`, `rxVisitor`, …) wird bewusst als Analyse gemeldet. Sein Real User
Monitoring zeichnet Sitzungen und Nutzeraktionen je Besucher auf; das geht über das unbedingt
Erforderliche für den Betrieb der Seite hinaus. Wer es nur serverseitig nutzt, hat diese
Browser-Cookies nicht.

## Quellen für die Session-Replay-Hosts

Geratene Domains führen zu Fehlalarmen. Deshalb stammt jeder Host vom Anbieter selbst oder von
einer Live-Website (geprüft am 28.10.2026):

| Anbieter      | Hosts                                               | Quelle                                                                                                                                                                                   |
| ------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FullStory     | `edge.fullstory.com`, `rs.fullstory.com`            | Die [FullStory-Systemanforderungen](https://developer.fullstory.com/browser/system-requirements/) nennen `edge.fullstory.com/s/fs.js`; `rs.fullstory.com` wird auf fullstory.com geladen |
| Mouseflow     | `cdn.mouseflow.com`                                 | Tracking-Snippet in Mouseflows eigenem WordPress-Plugin (`mouseflow-for-wordpress` 5.1.3)                                                                                                |
| Smartlook     | `web-sdk.smartlook.com`                             | Geladen auf fogbugz.com, braiins.com und pinata.cloud                                                                                                                                    |
| Lucky Orange  | `tools.luckyorange.com`, `settings.luckyorange.com` | Geladen auf luckyorange.com                                                                                                                                                              |
| Contentsquare | `contentsquare.net`, Cookies `_cs_*`                | Tag-, Seitenaufruf- und Aufzeichnungsanfragen sowie die Cookies auf contentsquare.com                                                                                                    |

## Quellen für die am 01.11.2026 ergänzten Hosts

Jeder Host steht in der Installations-, CSP- oder Allowlist-Dokumentation des Anbieters selbst.
Manche Tools lassen sich unter einer eigenen Subdomain betreiben (CNAME); daran erkennt privalint
sie nicht.

| Anbieter                                  | Hosts                                                                                               | Quelle                                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Adobe Analytics, Target, Audience Manager | `omtrdc.net` (Target: `tt.omtrdc.net`), `2o7.net`, `demdex.net`, `everesttech.net`, `everestjs.net` | [Adobe Experience Cloud ID: CSP](https://experienceleague.adobe.com/en/docs/id-service/using/reference/csp)                  |
| Adobe Experience Platform Web SDK         | `edge.adobedc.net`                                                                                  | [Web SDK `edgeDomain`](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/commands/configure/edgedomain) |
| Adobe Experience Platform Tags            | `assets.adobedtm.com`                                                                               | [Adobe Experience Cloud ID: CSP](https://experienceleague.adobe.com/en/docs/id-service/using/reference/csp)                  |
| etracker                                  | `code.etracker.com`, `etracker.de`                                                                  | [etracker basic integration](https://help.etracker.com/en/article/basic-integration/)                                        |
| INFOnline                                 | `ioam.de`, `iocnt.net`                                                                              | [INFOnline web integration](https://docs.infonline.de/infonline-measurement/en/integration/web/)                             |
| Piwik PRO                                 | `<org>.piwik.pro`, `<org>.containers.piwik.pro`                                                     | [Piwik PRO CSP](https://developers.piwik.pro/docs/content-security-policy-csp)                                               |
| Heap                                      | `heap-api.com`, `cdn.heapanalytics.com`, Cookies `_hp2_*`                                           | [Heap web installation](https://developers.heap.io/docs/web)                                                                 |
| Pendo                                     | `cdn.pendo.io`, `data.pendo.io` und ihre `eu.`-Formen                                               | [Pendo allowlist](https://support.pendo.io/hc/en-us/articles/360032209131)                                                   |
| Optimizely                                | `cdn.optimizely.com`, `logx.optimizely.com`                                                         | [Optimizely CSP](https://support.optimizely.com/hc/en-us/articles/4410289675149)                                             |
| Chartbeat                                 | `static.chartbeat.com`, `ping.chartbeat.net`                                                        | [Chartbeat JavaScript](https://docs.chartbeat.com/cbp/tracking/standard-websites/our-javascript)                             |
| Comscore                                  | `scorecardresearch.com`                                                                             | [Comscore support](https://direct-support.comscore.com/hc/en-us/articles/360002578333)                                       |
| Facebook SDK                              | `connect.facebook.net/<locale>/sdk.js` (Kategorie Social, getrennt vom Meta Pixel)                  | [Facebook JavaScript SDK quickstart](https://developers.facebook.com/docs/javascript/quickstart)                             |


## Quellen für die am 06.11.2026 ergänzten Hosts

Gelesen am 06.11.2026. Hosts, die der Anbieter nicht selbst nennt, bleiben draußen: der Skriptpfad
von Reddit, das Amazon-Ads-Tag (nur in einem GitHub-Template genannt, nicht auf einer Amazon-Seite)
und ProvenExpert.

| Anbieter          | Hosts                                                | Quelle                                                                                                                   |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Google Ads        | `www.google.com/pagead/1p-conversion/`               | [Google Ads: verify conversion tracking](https://support.google.com/google-ads/answer/13258081)                          |
| Reddit Pixel      | `alb.reddit.com`, `pixel-config.reddit.com`          | [About the Reddit Pixel](https://business.reddithelp.com/articles/Knowledge/reddit-pixel)                                |
| VWO               | `dev.visualwebsiteoptimizer.com`, `edge.wingify.net` | [Wingify for WordPress](https://help.wingify.com/hc/en-us/articles/59247859917465-Integrate-Wingify-with-WordPress)      |
| VWO               | `r1.` bis `r3.visualwebsiteoptimizer.com`            | [Wingify reverse proxy](https://help.wingify.com/hc/en-us/articles/58762169770265-Reverse-Proxy-Methodology-for-Wingify) |
| VWO               | Cookies `_vwo_*`, `_vis_opt_*`, `_wingify_*`         | [Cookies stored by Wingify](https://help.wingify.com/hc/en-us/articles/58793798517785-Cookies-Stored-by-Wingify)         |
| Microsoft Xandr   | `acdn.adnxs.com/dmp/up/`, `ib.adnxs.com/pixie`       | [Universal pixel code structure](https://learn.microsoft.com/en-us/xandr/monetize/universal-pixel-code-structure)        |
| Amazon Associates | `z-na.amazon-adsystem.com/widgets/onejs`             | [Amazon Associates oneTag](https://affiliate-program.amazon.com/help/node/topic/GZ2P5RSW6AMWWKTM)                        |
