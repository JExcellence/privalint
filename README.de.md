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

| Region          | Cookies und Tracking                      | Impressum                                       | Besonderheit                                          |
| --------------- | ----------------------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| `de` (Standard) | Opt-in, § 25 TDDDG                        | § 5 DDG                                         | –                                                     |
| `at`            | Opt-in, § 165 Abs. 3 TKG 2021             | § 5 ECG, § 25 MedienG                           | –                                                     |
| `ch`            | Opt-out, Art. 45c FMG                     | Art. 3 Abs. 1 lit. s UWG (bei Online-Angeboten) | Tracker, Einbindungen und Impressum eine Stufe milder |
| `hu`            | Opt-in, Eht. 155. § (4)                   | Ekertv. 4. §                                    | –                                                     |
| `eu`            | Opt-in, Art. 5 Abs. 3 ePrivacy-Richtlinie | Art. 5 E-Commerce-Richtlinie                    | –                                                     |

Tracker, die nach einem ausdrücklichen „Ablehnen“ weiterlaufen, bleiben überall ein Fehler, auch in
der Schweiz (Art. 30 Abs. 2 lit. b DSG). Richtet sich eine Schweizer Website auch an Besucher aus
der EU, prüfen Sie sie zusätzlich mit `--region eu`.

```bash
npx privalint https://ihre-seite.at --region at --lang de --max-pages 20
```

## Was geprüft wird

| Regel                     | Was sie findet                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `pre-consent-trackers`    | Analyse-, Werbe- und Session-Replay-Tools, die vor der Einwilligung Anfragen senden oder Cookies setzen                      |
| `trackers-after-reject`   | Tracker, die nach Klick auf „Ablehnen“ und Neuladen weiterlaufen                                                             |
| `trackers-after-settings` | Optional (`--check-settings`): Tracker, die laufen, obwohl in den Banner-Einstellungen alles abgewählt und gespeichert wurde |
| `reject-option`           | Cookie-Banner mit „Zustimmen“, aber ohne „Ablehnen“ auf der ersten Ebene; Pur-Abo-Modelle als Hinweis                        |
| `consent-settings-link`   | Kein sichtbarer Link oder Button, um die Cookie-Einstellungen nach dem Ablehnen wieder zu öffnen                             |
| `google-fonts`            | Schriften von `fonts.googleapis.com` / `fonts.gstatic.com`                                                                   |
| `adobe-fonts`             | Schriften von Adobe Fonts (`use.typekit.net` / `p.typekit.net`)                                                              |
| `third-party-embeds`      | YouTube, Vimeo, Google Maps, reCAPTCHA, Gravatar und Social-Media-Einbindungen vor der Einwilligung                          |
| `third-party-cdns`        | Skripte und Styles von jsDelivr, unpkg, cdnjs und anderen öffentlichen CDNs (Hinweis)                                        |
| `impressum-link`          | Seiten ohne Link zum Impressum                                                                                               |
| `privacy-policy-link`     | Seiten ohne Link zur Datenschutzerklärung                                                                                    |

Details, Hintergründe und Lösungen stehen auf Englisch in [`docs/rules`](docs/rules).

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

[MIT](LICENSE)
