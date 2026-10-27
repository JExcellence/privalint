# Konfiguration und Berichtsintegration

[English](configuration.md)

## JSON-Konfiguration

Die CLI liest eine vorhandene `./privalint.config.json`. `--config pfad/config.json` wählt eine
andere Datei, deren Fehlen einen Fehler auslöst. Es wird kein Konfigurationscode ausgeführt.
Ungültiges JSON, unbekannte Felder, unbekannte Regeln und ungültige Werte werden abgelehnt.
Dateien sind auf 64 KiB beschränkt. Zugangsdaten gehören nicht in die Konfiguration; URL-Zugangsdaten
werden abgelehnt.

Unterstützt sind `url` (absolute HTTP(S)-URL), `maxPages` (positive Ganzzahl), `concurrency`
(positive Ganzzahl, gleichzeitig geladene Seiten), `settleMs` (ab 0),
`timeoutMs` (positiv), `locale`, `lang` (`en`/`de`), `region` (`de`/`at`/`ch`/`eu`),
`consentCheck` und `failOnIncomplete` (Boolean), `rules` (bekannte IDs mit `off`/`error`/`warning`/`info`) und
`allow: { vendors: string[] }` (exakte, groß-/kleinschreibungsabhängige `subject`-Anbieternamen).

```json
{
  "url": "https://example.org",
  "maxPages": 20,
  "lang": "de",
  "region": "de",
  "rules": { "third-party-cdns": "warning", "impressum-link": "off" },
  "allow": { "vendors": ["Google Analytics"] }
}
```

Ohne URL-Argument verwendet die CLI `url`. Explizite CLI-Angaben haben Vorrang: URL, Seitenlimit,
Ladezeiten, Locale, Sprache und Länderprofil. `--disable` deaktiviert Regeln zusätzlich und hebt
kein `off` auf. `--consent` aktiviert eine in JSON abgeschaltete Consent-Prüfung wieder.
Der Bericht nennt wirksame Optionen. Die API liest nie automatisch eine Datei; bei Bedarf die
exportierten Funktionen `loadConfig`/`parseConfig` nutzen oder direkt Optionen übergeben:

```ts
await scan(url, {
  ruleSettings: { 'third-party-cdns': 'warning' },
  allow: { vendors: ['Google Analytics'] },
});
```

Explizite Schweregrade werden nach dem Länderprofil angewendet. Freigegebene Anbieter bleiben
als `info` mit `policy.allowed: true` und ursprünglichem Schweregrad sichtbar. Auch manuelle
Schweregradänderungen bewahren den ursprünglichen Wert in `policy`. Freigaben und Länderprofile
bestätigen weder Einwilligung noch Rechtskonformität. Absichtlich werden keine beliebigen Hosts
oder URL-Teilstrings freigegeben: Ein Befund kann mehrere Ressourcen enthalten.

## Berichtsversion und Regelergebnis

`schemaVersion: '1.1.0'` bezeichnet den aktuellen additiven Berichtsvertrag; Schema 1.0.0 bleibt
verfügbar. Siehe [Schemas, Seitenidentität und CI-Schranke](report-contract.de.md). `scannerVersion`
enthält die tatsächlich eingesetzte Paketversion. Berichte von 0.3.0 oder älter haben keine
Schemaversion; fehlende Zähler oder Ergebnisse dürfen nicht als null bzw. Erfolg interpretiert
werden. Schema- und npm-Paketversion werden unabhängig voneinander geführt.

`options` enthält wirksame Seiten-/Zeit-/Sprach-/Länder-/Consent-Optionen, Erfassungsmodus,
Transportlimits (nativ: null), ausgewählte Regeln, Schweregrade und freigegebene Anbieter.
Ziel-URL, Adapter-Rohdaten, Callbacks, AbortSignals und Zugangsdaten sind darin nicht enthalten.
Für Ziel-URLs gelten die bestehenden Bereinigungsregeln der URL-Berichtsfelder.

`ruleEvaluations` behält `status`, `reason` und `partial` und ergänzt `outcome`, einen festen
Begründungscode `explanation` und `findingCount`:

| Outcome              | Bedeutung                                                                            |
| -------------------- | ------------------------------------------------------------------------------------ |
| `checked-no-finding` | Erforderliche Beobachtungen vorhanden, geprüft ohne Befund                           |
| `finding-detected`   | Positive Evidenz erkannt; die Beobachtung kann trotzdem eingeschränkt sein           |
| `not-evaluable`      | Deaktiviert, übersprungen, Beobachtung fehlt oder negatives Ergebnis nicht belastbar |

Eine ausgeführte Netzwerkregel ohne Findings bei unvollständiger Beobachtung bleibt für alte
Konsumenten `status: 'executed'`, bekommt aber `outcome: 'not-evaluable'`. Ausführung und
belastbare Prüfbarkeit werden getrennt. Text und Markdown übersetzen Ergebnis und Grund.
Freigaben entfernen weder Finding-Zähler noch die Kennzeichnung erkannter positiver Evidenz.

## Getrennte Anfragezähler

Für abgeschlossene Erfassungen gilt:

```text
requests = finished + skippedRequests + failedRequests + securityBlockedRequests
```

`skippedRequests` zählt absichtlich ausgelassene Anfragen und nicht unterstützte Methoden/Protokolle.
`failedRequests` zählt Transport-/Browserfehler, Zeit- und Ressourcenlimits sowie offene Anfragen
bei Erfassungsende. `securityBlockedRequests` zählt explizite Sicherheitsablehnungen.
`httpErrors` bleibt unabhängig: Chromium kann eine HTTP-Fehlerantwort anschließend beenden oder
als fehlgeschlagene Anfrage behandeln. Diagnosen ohne HTTP-Anfrage, etwa WebSocket-Ablehnungen,
erhöhen diese Anfragezähler nicht.

Der alte Sammelzähler `failed` und der Alias `blocked` bleiben kompatibel erhalten. Neue UIs
sollen den Sammelwert nicht als Ladefehlerzahl ausgeben. Ein absichtlich ausgelassener Beacon:

```ts
if (request.resourceType === 'ping') {
  throw new NetworkError('skipped', undefined, 'beacon');
}
```

Standardmäßig werden Beacons nicht ausgelassen. `kind: 'skipped'` und `skippedReason: 'beacon'`
sind technische Diagnosen, keine Datenschutzbefunde oder Transportfehler. Ein ausgelassener Beacon
macht die Erfassung nicht unvollständig: Seine URL wird weiterhin erfasst und von den
Tracker-Regeln geprüft, und die Seite liest die Antwort eines Beacons nie aus. Alle anderen
ausgelassenen Anfragen schränken die Beobachtung weiterhin ein, weil fehlende Ressourcen
nachfolgendes Verhalten beeinflussen können.

## Consent und Fortschritt

Consent behält `state` und ergänzt `outcome` sowie einen festen `reason`:
`no-banner-detected`, `unsupported-banner`, `interaction-failed`, `reject-succeeded`.
Nicht unterstützt bedeutet: Banner erkannt, aber keine unterstützte Ablehnen-Steuerung gefunden.
`unsupported-banner-markup` bezeichnet eine erkannte Consent-Oberfläche mit nicht klassifizierbarer Steuerung.
Das beweist nicht, dass die Website keinen Ablehnen-Pfad besitzt. Erfolg bestätigt Klick und
Neuladen, nicht den gespeicherten CMP-Zustand. `afterRejectComplete` und Regelergebnisse bleiben
gesondert zu prüfen.

`onProgress(event)` meldet synchron die tatsächlichen Phasen `starting`, `loading-page`,
`checking-consent`, `page-captured`, `evaluating-rules`, `completed`. Enthalten sind `elapsedMs`, für Seitenphasen
ein nullbasierter `pageIndex` und eine Origin-only `pageUrl`. Es gibt keine rohen URLs,
beliebigen Fehlertexte oder erfundenen Prozentwerte. Bei Abbruch/Fehler bleibt `completed` aus;
das Promise meldet den Fehler. Callback-Fehler werden nach Browser-/Context-Cleanup weitergegeben.
Laden/Consent tragen eine zufällige `captureId`; `page-captured` ordnet diese einer scanlokalen
`pageId` zu. Alle Ereignisse tragen `scanId`, Regelauswertungsereignisse zusätzlich `pageId`.

```ts
await scan(url, {
  signal: clientSignal,
  onProgress(event) {
    sendToClient(event);
  }, // z. B. eigener SSE-Kanal der Anwendung
});
```

## PR-Kommentare

```yaml
permissions:
  contents: read
  pull-requests: write
steps:
  - uses: JExcellence/privalint@v0
    with:
      url: https://example.org
      pr-comment: true
```

Die Funktion ist standardmäßig aus und gilt nur für `pull_request` aus demselben Repository.
Der Helfer verwendet `github.token`, aktualisiert den markierten `github-actions[bot]`-Kommentar
und ignoriert Marker anderer Nutzer. Markdown-Escaping bleibt erhalten. Forks, fehlende Schreibrechte
und andere Events werden ohne Scanfehler übersprungen. Lange Berichte werden mit einem Hinweis
auf die vollständige Workflow-Zusammenfassung gekürzt. API-Paginierung und Zeitlimits sind begrenzt;
Redirects werden abgelehnt, damit kein Token weitergereicht wird. Fehler erzeugen feste Hinweise
ohne Secrets oder Antwortinhalte. Parallele Workflows sollten eine `concurrency`-Gruppe pro PR
verwenden, um gleichzeitiges erstmaliges Erstellen zu vermeiden. Parallele Jobs teilen den Marker.
