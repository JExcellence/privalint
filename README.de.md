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

Mit `--region` wählen Sie, nach welchem Recht privalint die Befunde einordnet. Jeder Befund nennt
die Rechtsgrundlage des gewählten Landes.

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
| `google-fonts`          | Schriften von `fonts.googleapis.com` / `fonts.gstatic.com`                                              |
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

## Grenzen

- Manche Seiten zeigen ihr Cookie-Banner Headless-Browsern nicht. Dann meldet privalint „kein
  Banner gefunden“. Lokal hilft `--headed --channel msedge` (oder `chrome`).
- Viele Consent-Tools entscheiden anhand der IP-Adresse, ob sie ein Banner zeigen. GitHub-Runner
  haben US-Adressen und sehen deshalb unter Umständen etwas anderes als Besucher aus der EU.
- Serverseitiges Tracking ist im Browser nicht sichtbar.

## Mitmachen

Fehlalarme, fehlende Tracker, Consent-Tools und neue Regeln sind sehr willkommen. Gerade
Anbieter aus dem deutschsprachigen Raum fehlen noch. Der Einstieg steht in
[CONTRIBUTING.md](CONTRIBUTING.md), passende Aufgaben tragen das Label
[`good first issue`](https://github.com/jexcellence/privalint/labels/good%20first%20issue).

## Lizenz

[MIT](LICENSE)
