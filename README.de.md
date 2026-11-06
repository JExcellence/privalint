# privalint

**English:** [README.md](README.md)

privalint prüft Websites auf die Datenschutzfehler, für die es Abmahnungen gibt: Tracker, die vor
der Einwilligung laden oder nach „Ablehnen“ weiterlaufen, Schriften von Google- oder
Adobe-Servern, eingebundene Inhalte wie YouTube oder Google Maps, ein Cookie-Banner, das sich
nicht wieder öffnen lässt, und ein fehlendes Impressum.

privalint öffnet die Seite in einem echten Chromium-Browser ohne Cookies, wie beim ersten Besuch.
Es zeichnet auf, was geladen wird, bevor jemand das Cookie-Banner bedient, klickt dann auf
„Ablehnen“ und prüft, was trotzdem noch lädt. Es läuft im Terminal oder als GitHub Action bei
jedem Pull Request.

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
| `de` (Standard) | Opt-in, § 25 TDDDG                        | § 5 DDG                                         | –                                                                |
| `at`            | Opt-in, § 165 Abs. 3 TKG 2021             | § 5 ECG, § 25 MedienG                           | –                                                                |
| `ch`            | Opt-out, Art. 45c FMG                     | Art. 3 Abs. 1 lit. s UWG (bei Online-Angeboten) | Tracker, Einbindungen, Schriften und Impressum eine Stufe milder |
| `hu`            | Opt-in, Eht. 155. § (4)                   | Ekertv. 4. §                                    | –                                                                |
| `eu`            | Opt-in, Art. 5 Abs. 3 ePrivacy-Richtlinie | Art. 5 E-Commerce-Richtlinie                    | –                                                                |

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

| Regel                                                                     | Was sie findet                                                                                                                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`pre-consent-trackers`](docs/rules/pre-consent-trackers.de.md)           | Analyse-, Werbe- und Session-Replay-Tools, die vor der Einwilligung Anfragen senden oder Cookies setzen                                                            |
| [`trackers-after-reject`](docs/rules/trackers-after-reject.de.md)         | Tracker, die nach Klick auf „Ablehnen“ und Neuladen weiterlaufen                                                                                                   |
| [`trackers-after-settings`](docs/rules/trackers-after-settings.de.md)     | Optional (`--check-settings`): Tracker, die laufen, obwohl in den Banner-Einstellungen alles abgewählt und gespeichert wurde                                       |
| [`consent-preselected`](docs/rules/consent-preselected.de.md)             | Optional (`--check-settings`): optionale Kategorien, die beim Öffnen der Banner-Einstellungen schon eingeschaltet sind                                             |
| [`trackers-after-close`](docs/rules/trackers-after-close.de.md)           | Optional (`--check-close`): Tracker, die laden, nachdem das Banner mit „×“ geschlossen wurde                                                                       |
| [`reject-option`](docs/rules/reject-option.de.md)                         | Cookie-Banner mit „Zustimmen“, aber ohne „Ablehnen“ auf der ersten Ebene; Pur-Abo-Modelle als Hinweis                                                              |
| [`reject-less-prominent`](docs/rules/reject-less-prominent.de.md)         | Ablehnen als bloßer Text, deutlich kleiner oder mit deutlich weniger Kontrast als der Zustimmen-Button (Hinweis)                                                   |
| [`banner-language`](docs/rules/banner-language.de.md)                     | Ein Consent-Banner in einer anderen Sprache als die Seite; Hinweis                                                                                                 |
| [`banner-keyboard`](docs/rules/banner-keyboard.de.md)                     | Ein Ablehnen-Element, das die Tab-Taste nie erreicht, etwa ein `<div>` mit Klick-Handler; Warnung                                                                  |
| [`gpc-signal`](docs/rules/gpc-signal.de.md)                               | Optional (`--gpc`): ob die Website bei Global Privacy Control ihr Banner ausblendet und Tracker blockiert; Hinweis                                                 |
| [`consent-banner-missing`](docs/rules/consent-banner-missing.de.md)       | Tracker laufen und es gibt überhaupt kein Cookie-Banner; Besucher können weder einwilligen noch ablehnen                                                           |
| [`banner-legal-links`](docs/rules/banner-legal-links.de.md)               | Ein Banner, das die Seite blockiert und weder Datenschutzerklärung noch Impressum verlinkt                                                                         |
| [`consent-settings-link`](docs/rules/consent-settings-link.de.md)         | Kein sichtbarer Link oder Button, um die Cookie-Einstellungen nach dem Ablehnen wieder zu öffnen                                                                   |
| [`google-fonts`](docs/rules/google-fonts.de.md)                           | Schriften von `fonts.googleapis.com` / `fonts.gstatic.com`                                                                                                         |
| [`adobe-fonts`](docs/rules/adobe-fonts.de.md)                             | Schriften von Adobe Fonts (`use.typekit.net` / `p.typekit.net`)                                                                                                    |
| [`third-party-embeds`](docs/rules/third-party-embeds.de.md)               | YouTube, Vimeo, Google Maps, reCAPTCHA, Gravatar, Social-Media-Einbindungen und Chat-/Bewertungs-Widgets wie Intercom vor der Einwilligung                         |
| [`third-party-cdns`](docs/rules/third-party-cdns.de.md)                   | Skripte und Styles von jsDelivr, unpkg, cdnjs und anderen öffentlichen CDNs (Hinweis)                                                                              |
| [`third-country-providers`](docs/rules/third-country-providers.de.md)     | Monitoring-, Backend- und ähnliche Dienste außerhalb von EU/EWR, etwa Sentry in den USA, vor der Einwilligung (Hinweis)                                            |
| [`third-party-personal-data`](docs/rules/third-party-personal-data.de.md) | Anfragen an fremde Websites mit E-Mail-Adressen oder Telefonnummern, im Klartext oder gehasht; Werte werden nie gemeldet                                           |
| [`fingerprinting`](docs/rules/fingerprinting.de.md)                       | Drittanbieter-Skripte, die vor der Einwilligung Canvas-, WebGL- oder Audio-Fingerprinting-Merkmale lesen                                                           |
| [`tracking-cookie-lifetime`](docs/rules/tracking-cookie-lifetime.de.md)   | Tracking-Cookies, die länger als 13 Monate gelten (Hinweis)                                                                                                        |
| [`impressum-link`](docs/rules/impressum-link.de.md)                       | Seiten ohne Link zum Impressum                                                                                                                                     |
| [`legal-notice-content`](docs/rules/legal-notice-content.de.md)           | Ein verlinktes Impressum ohne Postanschrift oder E-Mail-Adresse; fehlender Registereintrag als Hinweis                                                             |
| [`privacy-policy-link`](docs/rules/privacy-policy-link.de.md)             | Seiten ohne Link zur Datenschutzerklärung                                                                                                                          |
| [`privacy-policy-vendors`](docs/rules/privacy-policy-vendors.de.md)       | Tracker und Cookie-setzende Einbindungen der Startseite, die die Datenschutzerklärung nicht nennt; Schriften, CDNs und andere Dienste als Hinweis                  |
| [`privacy-policy-content`](docs/rules/privacy-policy-content.de.md)       | Eine Datenschutzerklärung ohne E-Mail-Adresse oder Anschrift des Verantwortlichen oder mit Vorlagen-Platzhaltern; Datenschutzbeauftragter ohne Kontakt als Hinweis |
| [`form-privacy-notice`](docs/rules/form-privacy-notice.de.md)             | Kontakt-, Anmelde- oder Login-Formulare ohne Datenschutz-Link daneben; Hinweis                                                                                     |
| [`https-transport`](docs/rules/https-transport.de.md)                     | Startseite über unverschlüsseltes HTTP; HTTP ohne Weiterleitung auf HTTPS als Warnung, fehlendes HSTS als Hinweis                                                  |
| [`form-preticked-consent`](docs/rules/form-preticked-consent.de.md)       | Formulare, die eine Einwilligung in Newsletter oder Werbung vorab anhaken                                                                                          |
| [`mixed-content`](docs/rules/mixed-content.de.md)                         | HTTPS-Seiten mit einem Formular, das über HTTP sendet; Ressourcen über HTTP als Hinweis                                                                            |
| [`referrer-policy`](docs/rules/referrer-policy.de.md)                     | Eine Referrer-Policy, die vollständige Seitenadressen an fremde Websites schickt; Hinweis                                                                          |
| [`withdrawal-button`](docs/rules/withdrawal-button.de.md)                 | Onlineshops ohne Link „Vertrag widerrufen“ auf der Startseite (Pflicht seit 19.06.2026)                                                                            |
| [`accessibility-statement`](docs/rules/accessibility-statement.de.md)     | Onlineshops ohne Link zu Angaben über die Barrierefreiheit (BFSG); Hinweis                                                                                         |

Details, Hintergründe und Lösungen stehen auf den verlinkten Regelseiten in [`docs/rules`](docs/rules).

Für [Cookiebot](docs/fixes/cookiebot.de.md), [Usercentrics](docs/fixes/usercentrics.de.md),
[OneTrust](docs/fixes/onetrust.de.md) und [Complianz](docs/fixes/complianz.de.md) ordnet je eine
Anleitung die Consent-Befunde der Einstellung im Consent-Manager zu, mit Links zu dessen
Dokumentation. Erkennt privalint einen davon, verlinkt die Lösung jedes solchen Befunds den
passenden Abschnitt.

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

## Konfiguration und Berichte

Die CLI liest eine vorhandene `privalint.config.json`, alternativ `--config <datei>`.
CLI-Argumente haben Vorrang. JSON kann URL, Seitenlimit, Sprache, Länderprofil, Ladeoptionen,
Regel-Schweregrade und eine Anbieter-Freigabeliste enthalten. API-Aufrufer setzen `ruleSettings`
und `allow` ausdrücklich; `scan()` liest keine Konfigurationsdateien automatisch.

```json
{
  "url": "https://example.org",
  "maxPages": 20,
  "rules": { "third-party-cdns": "warning", "impressum-link": "off" },
  "allow": { "vendors": ["Google Analytics"] }
}
```

Freigegebene Anbieter bleiben als Hinweise mit Policy-Kennzeichnung sichtbar. Eine Freigabe ist
kein Nachweis von Einwilligung oder rechtlicher Zulässigkeit. Details stehen in der
[deutschen Anleitung](docs/configuration.de.md) und der [englischen Fassung](docs/configuration.md).

Jeder Bericht sagt pro Regel und Seite, ob geprüft wurde und nichts gefunden wurde, ob ein
Befund vorliegt oder ob die Regel nicht prüfbar war, und warum. So bleibt „nichts gefunden“ von
„nicht angesehen“ getrennt.

Weiterführend:

- [Berichtsvertrag und optionales Coverage-Gate](docs/report-contract.de.md): JSON-Schema,
  Versionierung, Exit-Codes
- [privalint hinter einem öffentlichen Webformular betreiben](docs/controlled-scanner.de.md):
  Netzwerk-Adapter, Limits und Abbruch, mit [typgeprüftem Beispiel](examples/controlled-scanner.ts)

## Grenzen

- Manche Seiten zeigen ihr Cookie-Banner Headless-Browsern nicht. Dann meldet privalint „kein
  Banner gefunden“. Lokal hilft `--headed --channel msedge` (oder `chrome`).
- Viele Consent-Tools entscheiden anhand der IP-Adresse, ob sie ein Banner zeigen. GitHub-Runner
  haben US-Adressen und sehen deshalb unter Umständen etwas anderes als Besucher aus der EU.
- Tracker erkennt privalint über eine handgepflegte Liste
  ([`src/data/trackers.ts`](src/data/trackers.ts)). Cookies, die dort fehlen, werden zusätzlich
  mit den Analyse- und Marketing-Cookies der
  [Open Cookie Database](https://github.com/jkwakman/Open-Cookie-Database) abgeglichen
  (Apache-2.0, siehe [NOTICE](NOTICE)), nur über den Cookie-Namen und ohne kurze, generische oder
  Einwilligungs-Cookies.
- Serverseitiges Tracking ist im Browser nicht sichtbar.
- Chromium läuft standardmäßig ohne seine Sandbox, weil sie in vielen Containern nicht startet.
  Wer fremde Seiten auf einem Rechner mit Zugangsdaten prüft, sollte `--sandbox` setzen.
  Die Sandbox braucht unprivilegierte User-Namespaces. In Docker-Containern blockiert sie das
  Standard-Seccomp-Profil, unter Ubuntu ab 23.10 schränkt AppArmor sie ein.

## Mitmachen

privalint wird mit jedem Tracker, jedem Consent-Tool und jedem gemeldeten Fehlalarm besser. Die
meisten Beiträge sind ein paar Zeilen Daten plus ein Test, ohne dass man den ganzen Code kennen
muss. Gute Einstiege:

| Issue                                                                                  | Aufwand                                              |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [#33](https://github.com/jexcellence/privalint/issues/33) Regel-Doku auf Deutsch       | Eine Seite übersetzen                                |
| [#30](https://github.com/jexcellence/privalint/issues/30) Consent-Tools                | Zwei Button-Selektoren auf einer echten Seite finden |
| [#31](https://github.com/jexcellence/privalint/issues/31) Session-Replay-Tools         | Hosts aus der Anbieter-Doku eintragen, plus Test     |
| [#32](https://github.com/jexcellence/privalint/issues/32) Chat- und Bewertungs-Widgets | Dasselbe für `third-party-embeds`                    |
| [#34](https://github.com/jexcellence/privalint/issues/34) Action-Input                 | Ein Input in `action.yml`                            |

Gerade Anbieter aus dem deutschsprachigen Raum fehlen noch. Fehlalarme und fehlende Tracker
lassen sich über die [Issue-Formulare](https://github.com/jexcellence/privalint/issues/new/choose)
melden; Einrichtung und Ablauf stehen in [CONTRIBUTING.md](CONTRIBUTING.md).

Wenn privalint Ihnen eine Abmahnung oder eine Korrekturschleife erspart hat, hilft ein Stern
anderen, es zu finden.

## Lizenz

[MIT](LICENSE). Die Cookie-Daten in `src/data/open-cookie-database.ts` stammen aus der Open
Cookie Database unter Apache-2.0; siehe [NOTICE](NOTICE).
