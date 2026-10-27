# privalint

**English:** [README.md](README.md)

privalint prüft Websites auf die Datenschutzfehler, für die es Abmahnungen gibt: Tracker, die vor
der Einwilligung laden oder nach „Ablehnen“ weiterlaufen, Google Fonts vom Google-Server,
eingebundene Inhalte wie YouTube oder Google Maps und ein fehlendes Impressum.

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
| `eu`            | Opt-in, Art. 5 Abs. 3 ePrivacy-Richtlinie | Art. 5 E-Commerce-Richtlinie                    | –                                                     |

Tracker, die nach einem ausdrücklichen „Ablehnen“ weiterlaufen, bleiben überall ein Fehler, auch in
der Schweiz (Art. 30 Abs. 2 lit. b DSG). Richtet sich eine Schweizer Website auch an Besucher aus
der EU, prüfen Sie sie zusätzlich mit `--region eu`.

```bash
npx privalint https://ihre-seite.at --region at --lang de --max-pages 20
```

## Was geprüft wird

| Regel                   | Was sie findet                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `pre-consent-trackers`  | Analyse-, Werbe- und Session-Replay-Tools, die vor der Einwilligung Anfragen senden oder Cookies setzen |
| `trackers-after-reject` | Tracker, die nach Klick auf „Ablehnen“ und Neuladen weiterlaufen                                        |
| `reject-option`         | Cookie-Banner mit „Zustimmen“, aber ohne „Ablehnen“ auf der ersten Ebene; Pur-Abo-Modelle als Hinweis   |
| `consent-settings-link` | Kein sichtbarer Link oder Button, um die Cookie-Einstellungen nach dem Ablehnen wieder zu öffnen        |
| `google-fonts`          | Schriften von `fonts.googleapis.com` / `fonts.gstatic.com`                                              |
| `adobe-fonts`           | Schriften von Adobe Fonts (`use.typekit.net` / `p.typekit.net`)                                         |
| `third-party-embeds`    | YouTube, Vimeo, Google Maps, reCAPTCHA, Gravatar und Social-Media-Einbindungen vor der Einwilligung     |
| `third-party-cdns`      | Skripte und Styles von jsDelivr, unpkg, cdnjs und anderen öffentlichen CDNs (Hinweis)                   |
| `impressum-link`        | Seiten ohne Link zum Impressum                                                                          |
| `privacy-policy-link`   | Seiten ohne Link zur Datenschutzerklärung                                                               |

Details, Hintergründe und Lösungen stehen auf Englisch in [`docs/rules`](docs/rules).

## GitHub Action

```yaml
- uses: jexcellence/privalint@v0
  with:
    url: https://ihre-seite.de
    max-pages: 20
    lang: de
    region: de
```

Der Bericht erscheint auf Deutsch in der Zusammenfassung des Workflow-Laufs. Alle Eingaben und
die Anbindung an GitHub Code Scanning beschreibt die [englische README](README.md#github-action).

Mit `pr-comment: true` wird ein vorhandener Bot-Kommentar aktualisiert oder einmalig erstellt.
Dafür benötigt der Job `pull-requests: write`. Bei Fork-PRs oder einem schreibgeschützten Token
wird der Kommentar ohne Scanfehler ausgelassen. Befunde mit einem fehlgeschlagenen Scan-Schritt
verhindern den Kommentar nicht.

## Konfiguration, Berichtsversion und Fortschritt

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

Neue Berichte enthalten `schemaVersion`, `scannerVersion` und die wirksamen `options`.
Ohne Schemaversion handelt es sich um einen alten Bericht. `ruleEvaluations[].outcome`
unterscheidet „Geprüft, kein Befund“, „Befund erkannt“ und „Nicht prüfbar“ mit Begründung.
`onProgress` liefert tatsächliche Phasen mit verstrichener Zeit und bereinigten Seiten-URLs,
keinen geschätzten Prozentwert. Die Exit-Code-Policy von CLI/Action bleibt erhalten.

Schema 1.1.0 ergänzt zufällige Scan-/Seiten-IDs und die Zuordnung von Erfassungsversuchen nach
Redirects. Eigenständige Schemas und Konformitätsbeispiele sind enthalten. Mit
`--fail-on-incomplete` bzw. Action-Input `fail-on-incomplete: true` wird unvollständige nötige
Beobachtung optional mit Exit 3 bewertet; Befunde mit Exit 1 haben Vorrang. Bewusst deaktivierte
Regeln und Consent-Prüfungen sind ausgenommen. Details stehen im
[Berichtsvertrag](docs/report-contract.de.md) und seiner [englischen Fassung](docs/report-contract.md).

## Öffentliche Webscanner und kontrollierte Erfassung

`scan()` unterstützt einen `networkAdapter` und ein `AbortSignal`. Jeder HTTP-Hop einschließlich
Redirects durchläuft den Adapter. Er gibt eine Antwort zurück oder lehnt mit einem typisierten
`NetworkError` ab. Eine Warteschlange puffert Lastspitzen; Parallelität, Anfragemenge,
Antwortgrößen und Zeitlimits sind getrennt. Im Adapter-Modus gibt es keinen Browser-HTTP-Fallback.

PrivaLint erstellt und schließt Browser sowie frische Contexts selbst, auch bei Abbruch. Der
Aufrufer verwaltet gemeinsam genutzte Transport-Clients. Die bestehende Egress-Policy muss bei
jedem Hop DNS-Auflösung und tatsächliche Socket-Ziele kontrollieren und das Request-Signal beachten.
Die [Anleitung](docs/controlled-scanner.de.md) beschreibt den Vertrag und die Zähler. Ein
[typgeprüftes Beispiel](examples/controlled-scanner.ts) nutzt ausschließlich vom Betreiber
freigegebene Origins und festgelegte IP-Adressen.

`findings` enthält ausschließlich Regelbefunde. Technische Einschränkungen stehen getrennt unter
`pages[].capture.diagnostics`. Bei 48 Anfragen mit 21 blockierten oder fehlgeschlagenen Ressourcen
bleibt die Erfassung unvollständig, auch wenn keine Findings vorliegen. `ruleEvaluations` zeigt
pro Seite und Regel `executed`, `skipped` oder `not-evaluable`; `partial: true` kennzeichnet die
Auswertung verfügbarer positiver Evidenz bei eingeschränkter Beobachtung.

Consent-Zustände unterscheiden „kein Banner erkannt“, „keine unterstützte Ablehnen-Möglichkeit“,
„Interaktion fehlgeschlagen“ und „Ablehnen getestet“. Fehlende Erkennung allein ist kein
Datenschutzverstoß. Ein getesteter Klick sagt noch nichts über vollständige Ressourcen-Erfassung aus.

Bestehende CLI-, API- und Action-Aufrufe bleiben gültig. Startseiten-Ladefehler werfen weiterhin
einen Fehler; `failureMode: 'report'` liefert stattdessen einen strukturierten Bericht und ist im
Adapter-Modus die Vorgabe. Es werden keine Zusagen rechtlicher Konformität gemacht.

## Grenzen

- Manche Seiten zeigen ihr Cookie-Banner Headless-Browsern nicht. Dann meldet privalint „kein
  Banner gefunden“. Lokal hilft `--headed --channel msedge` (oder `chrome`).
- Viele Consent-Tools entscheiden anhand der IP-Adresse, ob sie ein Banner zeigen. GitHub-Runner
  haben US-Adressen und sehen deshalb unter Umständen etwas anderes als Besucher aus der EU.
- Serverseitiges Tracking ist im Browser nicht sichtbar.
- Chromium läuft standardmäßig ohne seine Sandbox, weil sie in vielen Containern nicht startet.
  Wer fremde Seiten auf einem Rechner mit Zugangsdaten prüft, sollte `--sandbox` setzen.

## Mitmachen

Fehlalarme, fehlende Tracker, Consent-Tools und neue Regeln sind sehr willkommen. Gerade
Anbieter aus dem deutschsprachigen Raum fehlen noch. Der Einstieg steht in
[CONTRIBUTING.md](CONTRIBUTING.md), passende Aufgaben tragen das Label
[`good first issue`](https://github.com/jexcellence/privalint/labels/good%20first%20issue).

## Lizenz

[MIT](LICENSE)
