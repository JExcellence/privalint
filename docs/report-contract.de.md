# Berichtsvertrag, Seitenidentität und Coverage-Schranke

[English](report-contract.md)

## Versionierte Validierung

Neue Scans verwenden Schema **1.2.0**; 1.0.0 und 1.1.0 bleiben für frühere versionierte Berichte
verfügbar. 1.2.0 ergänzt den Grund `cancelled-by-page`, den ein 1.1.0-Validator ablehnen würde.
Paket-/Scanner-Version und Schemaversion sind unabhängig. Ohne `schemaVersion` ist ein Bericht
Legacy; unbekannte Versionen müssen ausdrücklich unterstützt werden. Alte Daten bekommen nicht
einfach eine neue Version zugewiesen, damit sie validieren.

Das npm-Paket enthält eigenständige JSON-Schema-2020-12-Dateien:

- `privalint/schemas/report-1.0.0.schema.json`
- `privalint/schemas/report-1.1.0.schema.json`
- `privalint/schemas/report-1.2.0.schema.json`
- `privalint/schemas/sarif-properties-1.0.0.schema.json`
- `privalint/schemas/sarif-properties-1.1.0.schema.json`
- `privalint/schemas/sarif-properties-1.2.0.schema.json`

Die SARIF-Schemas prüfen `runs[].properties`, nicht den vollständigen SARIF-Standard. Pflichtfelder,
Typen, Ergebnisse und Widersprüche wie negativer Erfolg mit `partial: true` werden geprüft.
Zusätzliche Felder sind für kompatible Erweiterungen erlaubt. Zählergleichungen und ID-Verweise
brauchen semantische Prüfungen: Die Coverage-Schranke prüft Zählerbeziehungen, Scanner-Tests die
Seiten-/Befund-/Regelidentität. Validierung garantiert weder rechtliche Konformität noch sichere
eigene Texte.

`identifyReportSchema(value)` klassifiziert Versionen und ersetzt keine strukturelle Validierung.
Die [englische Anleitung](report-contract.md) zeigt die Verwendung mit einem vom Konsumenten
installierten Validator. PrivaLint nutzt Ajv ausschließlich in Entwicklungstests und lädt beim
Scannen keine Schemas aus dem Netz.

`npm run schemas:build` erzeugt Schema-Dateien, `npm run schemas:check` erkennt Abweichungen in CI.
`npm run fixtures:reports` baut synthetische Chromium-Fixtures für vollständige, teilweise,
ausgelassene und policyangepasste Beobachtungen. Tests validieren gespeicherte Beispiele und
aktuelle Scanner-Ausgaben. Echte Ziel-Websitedaten werden nicht als Fixtures gespeichert.

## Sichere Identität

`scanId`, `pageId` und `captureId` sind unabhängige zufällige UUIDs, keine URL-Hashes. Sie gelten
innerhalb eines Scans, nicht scanübergreifend.

- Der Bericht trägt `scanId`.
- Jede eindeutige finale URL bekommt eine `pageId`, die Seitenübersicht, Befunde, Regelergebnisse
  und SARIF-Properties verbindet.
- Lade-/Consent-Ereignisse tragen zunächst `captureId`: Das Redirect-Ziel steht noch nicht fest.
- `page-captured` ordnet den Versuch der `pageId` zu. Versuche mit gleichem Redirect-Ziel teilen
  die Seiten-ID, behalten getrennte Versuch-IDs. Auswertungsereignisse tragen `pageId`.
- `onPage` erhält den identifizierten Roh-Snapshot nach Deduplizierung. Adapter-Berichts-URLs
  bleiben bereinigt; IDs unterscheiden mehrere Seiten derselben Origin.

Text/Markdown gruppieren nach Seitenidentität. Natives SARIF behält URL-basierte Orte/Fingerprints.
Adapter-SARIF verwendet opake Orte und lässt Fingerprints aus, die bereinigte Seiten zusammenführen
oder scanübergreifende Stabilität vortäuschen könnten. Scanlokale IDs sind keine Baseline-Schlüssel;
dauerhafte Identität benötigt eine eigene Policy.

## Optionale CI-Schranke

```sh
privalint https://example.org --fail-on-incomplete --output report.json
```

JSON unterstützt `failOnIncomplete: true`; `--allow-incomplete` überschreibt es. Die Action bietet
`fail-on-incomplete: true`, standardmäßig aus. API-Konsumenten erhalten dieselbe Policy über
`assessCoverage(result)` als `{ complete, issues }` mit bereinigten Orten. Externes JSON vorher
strukturell validieren.
Der Action-Input überschreibt die JSON-Einstellung auch bei seinem Standardwert `false`.
Ungültige Boolean-Werte werden abgelehnt statt die Schranke stillschweigend abzuschalten.

Die Schranke scheitert bei fehlenden Seiten/Erfassungen, HTTP-Fehlerseiten, widersprüchlichen Zählern,
fehlenden nötigen Regelergebnissen, nicht prüfbaren Regeln und eingeschränkten Ergebnissen.
Deaktivierte Regeln, ausdrücklich abgeschaltete Consent-Prüfungen und Consent außerhalb der
Startseite sind bewusste Ausnahmen, ebenso Banner-Regeln mit `no-consent-needed` (kein Banner, und
nichts Einwilligungspflichtiges geladen). Lädt ohne Banner etwas Einwilligungspflichtiges, bleiben
die Ablehnen-Regeln ungeprüft und verfehlen die optionale Schranke. Ausgelassene Beacons und von
der Seite selbst abgebrochene Anfragen (`cancelled-by-page`) schränken die Beobachtung nicht ein,
alle anderen ausgelassenen Anfragen schon. Findings können bei vollständiger
Beobachtung vorliegen; Freigabelisten allein lassen die Coverage-Schranke nicht scheitern.

Exit-Vorrang: `2` bei Argument-/Startseiten-Scanfehlern. Nach Berichtserzeugung `1` für Befunde über
`--fail-on`, andernfalls `3` bei aktivierter verfehlter Coverage-Schranke, sonst `0`. `--fail-on never`
schaltet nur Schweregrad-Exits ab. Berichte werden vor Exit 1/3 geschrieben. Die Action erhält
Exit-Code-Output, Zusammenfassung und Kommentare auch bei Exit 3. Der Standard bleibt unverändert.

Die Schranke prüft konkrete Beobachtungen statt nur `coverage: 'partial'`. Sie kann deshalb
bestehen, wenn der allgemeinere Status nur bewusste Consent-Ausnahmen beschreibt. Das ist eine
technische CI-Policy, keine rechtliche Beurteilung oder Zusage vollständiger Datenschutzprüfung.
