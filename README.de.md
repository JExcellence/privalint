# privalint

**English:** [README.md](README.md)

privalint prüft Websites auf die Datenschutzfehler, für die es Abmahnungen gibt: Tracker, die vor
der Einwilligung laden oder nach „Ablehnen“ weiterlaufen, ein Ablehnen-Button, der fehlt, blass ist
oder mit der Tastatur nicht erreichbar, Schriften von Google- oder Adobe-Servern, Einbindungen wie
YouTube oder Google Maps vor der Einwilligung, eine Datenschutzerklärung, die die genutzten Dienste
nicht nennt, und ein fehlendes oder unvollständiges Impressum.

privalint öffnet die Seite in einem echten Chromium-Browser ohne Cookies, wie beim ersten Besuch.
Es zeichnet auf, was geladen wird, bevor jemand das Cookie-Banner bedient, klickt auf „Ablehnen“,
lädt neu und prüft, was trotzdem noch lädt. Danach liest es Impressum und Datenschutzerklärung,
die die Website verlinkt. Es läuft im Terminal, als GitHub Action bei jedem Pull Request oder aus
eigenem Code.

```bash
npx privalint https://ihre-seite.de --lang de
```

> [!IMPORTANT]
> privalint führt automatisierte Prüfungen durch. Ein sauberes Ergebnis bedeutet, dass keines der
> geprüften Probleme gefunden wurde. Es macht eine Website nicht DSGVO-konform und ist keine
> Rechtsberatung.

## Deutschland, Österreich, Schweiz

Mit `--region` wählen Sie das Referenz- und Einstufungsprofil des Tools. Das Profil bestimmt
nicht, welches Recht für eine Website anwendbar ist. Befunde sind keine rechtliche Beurteilung.

| Region          | Cookies und Tracking                      | Impressum                                       | Besonderheit                                                     |
| --------------- | ----------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `de` (Standard) | Opt-in, § 25 TDDDG                        | § 5 DDG                                         | keine                                                            |
| `at`            | Opt-in, § 165 Abs. 3 TKG 2021             | § 5 ECG, § 25 MedienG                           | keine                                                            |
| `ch`            | Opt-out, Art. 45c FMG                     | Art. 3 Abs. 1 lit. s UWG (bei Online-Angeboten) | Tracker, Einbindungen, Schriften und Impressum eine Stufe milder |
| `hu`            | Opt-in, Eht. 155. § (4)                   | Ekertv. 4. §                                    | keine                                                            |
| `eu`            | Opt-in, Art. 5 Abs. 3 ePrivacy-Richtlinie | Art. 5 E-Commerce-Richtlinie                    | keine                                                            |

Tracker, die nach einem ausdrücklichen „Ablehnen“ weiterlaufen, bleiben überall ein Fehler, auch in
der Schweiz (Art. 30 Abs. 2 lit. b DSG). Richtet sich eine Schweizer Website auch an Besucher aus
der EU, prüfen Sie sie zusätzlich mit `--region eu`.

```bash
npx privalint https://ihre-seite.at --region at --lang de --max-pages 20
```

Für ungarische Websites schreibt `--lang hu` Befunde, Lösungen und Bericht auf Ungarisch:

```bash
npx privalint https://pelda.hu --region hu --lang hu
```

## Was geprüft wird

Jede Regel hat eine eigene Seite: was sie prüft, warum, wie man es behebt und wo ihre Grenzen
liegen.

### Cookie-Banner

| Regel                                                               | Stufe   | Was sie findet                                                                                                                              |
| ------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [`pre-consent-trackers`](docs/rules/pre-consent-trackers.de.md)     | Fehler  | Analyse-, Werbe- und Session-Replay-Tools, die vor der Einwilligung Anfragen senden oder Cookies setzen; ein bloßer Tag-Manager als Warnung |
| [`trackers-after-reject`](docs/rules/trackers-after-reject.de.md)   | Fehler  | Tracker, die nach Klick auf „Ablehnen“ und Neuladen weiterlaufen                                                                            |
| [`consent-banner-missing`](docs/rules/consent-banner-missing.de.md) | Warnung | Tracker laufen und es gibt überhaupt kein Cookie-Banner                                                                                     |
| [`reject-option`](docs/rules/reject-option.de.md)                   | Warnung | „Zustimmen“, aber kein „Ablehnen“ auf der ersten Ebene; Pur-Abo-Modelle als Hinweis                                                         |
| [`reject-less-prominent`](docs/rules/reject-less-prominent.de.md)   | Hinweis | Ablehnen als bloßer Text, deutlich kleiner oder mit deutlich weniger Kontrast als Zustimmen                                                 |
| [`banner-keyboard`](docs/rules/banner-keyboard.de.md)               | Warnung | Ein Ablehnen-Element, das die Tab-Taste nie erreicht, etwa ein `<div>` mit Klick-Handler                                                    |
| [`banner-legal-links`](docs/rules/banner-legal-links.de.md)         | Warnung | Ein Banner, das die Seite blockiert und weder Datenschutzerklärung noch Impressum verlinkt                                                  |
| [`banner-language`](docs/rules/banner-language.de.md)               | Hinweis | Ein Banner in einer anderen Sprache als die Seite                                                                                           |
| [`consent-settings-link`](docs/rules/consent-settings-link.de.md)   | Warnung | Kein sichtbarer Link oder Button, um die Cookie-Einstellungen nach dem Ablehnen wieder zu öffnen                                            |

Optionale Prüfungen laden die Startseite ein weiteres Mal in einem frischen Browser:

| Option             | Regel                                                                 | Stufe   | Was sie findet                                                                                      |
| ------------------ | --------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `--check-settings` | [`trackers-after-settings`](docs/rules/trackers-after-settings.de.md) | Fehler  | Tracker, die laufen, obwohl in den Banner-Einstellungen alles abgewählt und gespeichert wurde       |
| `--check-settings` | [`consent-preselected`](docs/rules/consent-preselected.de.md)         | Fehler  | Optionale Kategorien, die beim Öffnen der Banner-Einstellungen schon eingeschaltet sind             |
| `--check-close`    | [`trackers-after-close`](docs/rules/trackers-after-close.de.md)       | Fehler  | Tracker, die laden, nachdem das Banner mit „×“ geschlossen wurde                                    |
| `--gpc`            | [`gpc-signal`](docs/rules/gpc-signal.de.md)                           | Hinweis | Ob die Website bei Global Privacy Control ihr Banner ausblendet und Tracker blockiert               |
| `--check-accept`   | [`privacy-policy-vendors`](docs/rules/privacy-policy-vendors.de.md)   |         | Akzeptiert und prüft auch die Dienste, die erst mit Einwilligung laden, in der Datenschutzerklärung |

### Tracker, Einbindungen und Schriften

| Regel                                                                     | Stufe   | Was sie findet                                                                                                                     |
| ------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [`google-fonts`](docs/rules/google-fonts.de.md)                           | Fehler  | Schriften von `fonts.googleapis.com` / `fonts.gstatic.com`; übrig gebliebene Preconnects als Warnung                               |
| [`adobe-fonts`](docs/rules/adobe-fonts.de.md)                             | Fehler  | Schriften von Adobe Fonts (`use.typekit.net` / `p.typekit.net`)                                                                    |
| [`third-party-embeds`](docs/rules/third-party-embeds.de.md)               | Warnung | YouTube, Vimeo, Google Maps, reCAPTCHA, Gravatar, Social-Media-Einbindungen und Chat- oder Bewertungs-Widgets vor der Einwilligung |
| [`fingerprinting`](docs/rules/fingerprinting.de.md)                       | Warnung | Drittanbieter-Skripte, die vor der Einwilligung Canvas-, WebGL- oder Audio-Fingerprinting-Merkmale lesen                           |
| [`third-party-personal-data`](docs/rules/third-party-personal-data.de.md) | Warnung | Anfragen an fremde Websites mit E-Mail-Adressen oder Telefonnummern, im Klartext oder gehasht; Werte werden nie gemeldet           |
| [`third-country-providers`](docs/rules/third-country-providers.de.md)     | Hinweis | Monitoring-, Backend- und ähnliche Dienste außerhalb von EU/EWR, etwa Sentry in den USA, vor der Einwilligung                      |
| [`third-party-cdns`](docs/rules/third-party-cdns.de.md)                   | Hinweis | Skripte und Styles von jsDelivr, unpkg, cdnjs und anderen öffentlichen CDNs                                                        |
| [`tracking-cookie-lifetime`](docs/rules/tracking-cookie-lifetime.de.md)   | Hinweis | Tracking-Cookies, die länger als 13 Monate gelten                                                                                  |

Tracker erkennt privalint an Host und Cookie, und auch, wenn sie sich verstecken:

- **Über die eigene Domain geleitet:** GA4 `/g/collect`, serverseitiger Google Tag Manager und der
  Meta-Pixel-Endpunkt werden an Pfad und Parametern erkannt, auf jedem Host.
- **Hinter einem eigenen CNAME:** In nativen Scans löst privalint die CNAME-Kette der eigenen
  Subdomains auf und meldet `metrics.ihre-seite.de` als den Tracker, auf den sie zeigt.
- **Fingerprinting:** Canvas-, WebGL- und Audio-Abfragen werden mit dem aufrufenden Skript
  festgehalten.

### Impressum und Datenschutzerklärung

| Regel                                                               | Stufe   | Was sie findet                                                                                                                                    |
| ------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`impressum-link`](docs/rules/impressum-link.de.md)                 | Warnung | Seiten ohne Link zum Impressum; ein bloßer Kontakt-Link als Hinweis                                                                               |
| [`legal-notice-content`](docs/rules/legal-notice-content.de.md)     | Warnung | Ein verlinktes Impressum ohne Postanschrift oder E-Mail-Adresse; fehlender Registereintrag als Hinweis                                            |
| [`privacy-policy-link`](docs/rules/privacy-policy-link.de.md)       | Warnung | Seiten ohne Link zur Datenschutzerklärung                                                                                                         |
| [`privacy-policy-vendors`](docs/rules/privacy-policy-vendors.de.md) | Warnung | Tracker und Cookie-setzende Einbindungen der Startseite, die die Datenschutzerklärung nicht nennt; Schriften, CDNs und andere Dienste als Hinweis |
| [`privacy-policy-content`](docs/rules/privacy-policy-content.de.md) | Warnung | Eine Datenschutzerklärung ohne Kontaktdaten des Verantwortlichen oder mit Vorlagen-Platzhaltern                                                   |

Die Datenschutzerklärung wird zusammen mit einer Cookie-Richtlinie gelesen, die sie verlinkt, auch
wenn diese ein PDF auf derselben Website ist.

### Formulare, Übertragung und Onlineshops

| Regel                                                                 | Stufe   | Was sie findet                                                                                          |
| --------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| [`form-privacy-notice`](docs/rules/form-privacy-notice.de.md)         | Hinweis | Kontakt-, Anmelde- oder Login-Formulare ohne Datenschutz-Link daneben                                   |
| [`form-preticked-consent`](docs/rules/form-preticked-consent.de.md)   | Warnung | Formulare, die eine Einwilligung in Newsletter oder Werbung vorab anhaken                               |
| [`https-transport`](docs/rules/https-transport.de.md)                 | Fehler  | Startseite über unverschlüsseltes HTTP; HTTP ohne Weiterleitung als Warnung, fehlendes HSTS als Hinweis |
| [`mixed-content`](docs/rules/mixed-content.de.md)                     | Fehler  | HTTPS-Seiten mit einem Formular, das über HTTP sendet; Ressourcen über HTTP als Hinweis                 |
| [`referrer-policy`](docs/rules/referrer-policy.de.md)                 | Hinweis | Eine Referrer-Policy, die vollständige Seitenadressen an fremde Websites schickt                        |
| [`withdrawal-button`](docs/rules/withdrawal-button.de.md)             | Warnung | Onlineshops ohne Link „Vertrag widerrufen“ auf der Startseite (Pflicht seit 19.06.2026)                 |
| [`accessibility-statement`](docs/rules/accessibility-statement.de.md) | Hinweis | Onlineshops ohne Link zu Angaben über die Barrierefreiheit (BFSG)                                       |

### Anleitungen für Consent-Manager

Für [Cookiebot](docs/fixes/cookiebot.de.md), [Usercentrics](docs/fixes/usercentrics.de.md),
[OneTrust](docs/fixes/onetrust.de.md) und [Complianz](docs/fixes/complianz.de.md) ordnet je eine
Anleitung die Consent-Befunde der Einstellung im Consent-Manager zu, jeder Schritt mit Link zu
dessen Dokumentation. Erkennt privalint einen davon, verlinkt die Lösung jedes solchen Befunds den
passenden Abschnitt.

## Berichte

Berichte gibt es als Text für das Terminal, Markdown für Job-Zusammenfassungen und PR-Kommentare,
SARIF für GitHub Code Scanning, JSON für eigene Werkzeuge (versioniert, mit
[JSON-Schema](docs/report-contract.de.md)) und HTML: eine eigenständige Seite für Kunden oder
Tickets, hell und dunkel, die nichts nachlädt. `-o bericht.html` wählt das Format über die Endung.

Jeder Bericht sagt pro Regel und Seite, ob geprüft wurde und nichts gefunden wurde, ob ein Befund
vorliegt oder ob die Regel nicht prüfbar war, und warum. So bleibt „nichts gefunden“ von „nicht
angesehen“ getrennt.

Mit `--baseline bericht.json` vergleicht privalint die Befunde mit einem früheren JSON-Bericht:
Jeder Befund ist `new` oder `existing`, behobene werden aufgelistet, und `--fail-on` zählt nur neue.
So lässt sich privalint auf einer Website mit bekannten Befunden einführen und schlägt nur bei
neuen fehl.

## GitHub Action

```yaml
- uses: jexcellence/privalint@v0
  with:
    url: https://ihre-seite.de
    max-pages: 20
    concurrency: 3
    lang: de
    region: de
```

Der Bericht erscheint auf Deutsch in der Zusammenfassung des Workflow-Laufs. Alle Eingaben und
die Anbindung an GitHub Code Scanning beschreibt die [englische README](README.md#github-action).

Mit `pr-comment: true` wird ein vorhandener Bot-Kommentar aktualisiert oder einmalig erstellt.
Dafür benötigt der Job `pull-requests: write`. Bei Fork-PRs oder einem schreibgeschützten Token
wird der Kommentar ohne Scanfehler ausgelassen. Befunde mit einem fehlgeschlagenen Scan-Schritt
verhindern den Kommentar nicht.

## Konfiguration

Die CLI liest eine vorhandene `privalint.config.json`, alternativ `--config <datei>`.
CLI-Argumente haben Vorrang. JSON kann URL, Seitenlimit, Sprache, Länderprofil, Ladeoptionen, die
optionalen Prüfungen, Regel-Schweregrade und eine Anbieter-Freigabeliste enthalten. API-Aufrufer
setzen `ruleSettings` und `allow` ausdrücklich; `scan()` liest keine Konfigurationsdateien
automatisch.

```json
{
  "url": "https://example.org",
  "maxPages": 20,
  "sitemap": true,
  "rules": { "third-party-cdns": "warning", "impressum-link": "off" },
  "allow": { "vendors": ["Google Analytics"] }
}
```

Freigegebene Anbieter bleiben als Hinweise mit Policy-Kennzeichnung sichtbar. Eine Freigabe ist
kein Nachweis von Einwilligung oder rechtlicher Zulässigkeit.

Weiterführend:

- [Konfiguration](docs/configuration.de.md)
- [Berichtsvertrag und optionales Coverage-Gate](docs/report-contract.de.md): JSON-Schema,
  Versionierung, Exit-Codes
- [privalint hinter einem öffentlichen Webformular betreiben](docs/controlled-scanner.de.md):
  Netzwerk-Adapter, Limits und Abbruch, mit [typgeprüftem Beispiel](examples/controlled-scanner.ts)
- [Erkennung von Consent-Managern](docs/consent-managers.de.md)

## Grenzen

- Manche Seiten zeigen ihr Cookie-Banner Headless-Browsern nicht. Dann meldet privalint „kein
  Banner gefunden“. Lokal hilft `--headed --channel msedge` (oder `chrome`).
- Viele Consent-Tools entscheiden anhand der IP-Adresse, ob sie ein Banner zeigen. GitHub-Runner
  haben US-Adressen und sehen deshalb unter Umständen etwas anderes als Besucher aus der EU.
- Tracker erkennt privalint über eine handgepflegte Liste
  ([`src/data/trackers.ts`](src/data/trackers.ts)) mit Hosts aus der Doku der Anbieter. Cookies,
  die dort fehlen, werden zusätzlich mit den Analyse- und Marketing-Cookies der
  [Open Cookie Database](https://github.com/jkwakman/Open-Cookie-Database) abgeglichen
  (Apache-2.0, siehe [NOTICE](NOTICE)), nur über den Cookie-Namen.
- Serverseitiges Tracking ist im Browser nicht sichtbar.
- PDFs, die nur aus Bildern bestehen, enthalten keinen lesbaren Text, und eine
  Datenschutzerklärung, die selbst ein PDF ist, wird nicht gelesen.
- Chromium läuft standardmäßig ohne seine Sandbox, weil sie in vielen Containern nicht startet.
  Wer fremde Seiten auf einem Rechner mit Zugangsdaten prüft, sollte `--sandbox` setzen.
  Die Sandbox braucht unprivilegierte User-Namespaces. In Docker-Containern blockiert sie das
  Standard-Seccomp-Profil, unter Ubuntu ab 23.10 schränkt AppArmor sie ein.

## Mitmachen

privalint wird mit jedem Tracker, jedem Consent-Tool und jedem gemeldeten Fehlalarm besser. Die
meisten Beiträge sind ein paar Zeilen Daten plus ein Test, ohne dass man den ganzen Code kennen
muss. Gute Einstiege:

| Issue                                                                                         | Aufwand                                               |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [#71](https://github.com/jexcellence/privalint/issues/71) Quellen der Anbieter                | Die Seite des Anbieters finden, die seine Hosts nennt |
| [#55](https://github.com/jexcellence/privalint/issues/55) Selektoren der Banner-Einstellungen | Zwei Selektoren an einem echten Banner prüfen         |
| [#57](https://github.com/jexcellence/privalint/issues/57) Speichern-Buttons in mehr Sprachen  | Beschriftungen echter Banner ergänzen, plus Test      |
| [#136](https://github.com/jexcellence/privalint/issues/136) Ungarische Berichtstexte          | Die ungarischen Texte als Muttersprachler lesen       |

Gerade Anbieter aus dem deutschsprachigen Raum fehlen noch. Fehlalarme und fehlende Tracker
lassen sich über die [Issue-Formulare](https://github.com/jexcellence/privalint/issues/new/choose)
melden; Einrichtung und Ablauf stehen in [CONTRIBUTING.md](CONTRIBUTING.md).

Wenn privalint Ihnen eine Abmahnung oder eine Korrekturschleife erspart hat, hilft ein Stern
anderen, es zu finden.

## Lizenz

[MIT](LICENSE). Die Cookie-Daten in `src/data/open-cookie-database.ts` stammen aus der Open
Cookie Database unter Apache-2.0; siehe [NOTICE](NOTICE).
