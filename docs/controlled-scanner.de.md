# Kontrollierte Webscanner

[English / vollständiger API-Vertrag](controlled-scanner.md)

Die Erweiterung ergänzt `scan(url, options)` rückwärtskompatibel. `networkAdapter` integriert
die Transport-Policy des Aufrufers, `signal` bindet den Scan an einen Client-Abbruch. Länderprofile
steuern Referenzen und Einstufungen im Tool; sie bestimmen nicht automatisch anwendbares Recht.
Ein Bericht ist weder eine rechtliche Beurteilung noch ein Konformitätsnachweis.

## Transport und Zuständigkeiten

PrivaLint erstellt den Chromium-Browser und pro Seite einen frischen Context. Beides wird auch
bei Fehlern und Abbruch geschlossen. Ein geteilter BrowserContext wird bewusst nicht übernommen:
vorhandene Cookies oder Storage würden die Beobachtung vor der Einwilligung verfälschen.
Gemeinsame Transport-Clients und Verbindungspools gehören weiterhin dem Aufrufer.

Der Adapter erhält URL, Methode, Header, Body und ein eigenes `AbortSignal`. Er muss genau einen
HTTP-Hop ausführen und darf Redirects nicht intern verfolgen. Jede Weiterleitung wird erneut
abgefangen. DNS, tatsächliche Socket-Ziele, erlaubte Ports und Methoden müssen bei jedem Hop
geprüft werden. Bei Ablehnung darf kein unkontrollierter Ersatz-Fetch erfolgen. Typisierte
`NetworkError`-Fehler geben feste Kategorien weiter; fremde Fehlermeldungen werden nicht gespeichert.

```ts
import { scan, NetworkError, type NetworkAdapter } from 'privalint';

const adapter: NetworkAdapter = async (request) => {
  if (!policy.permits(request.url)) throw new NetworkError('security-blocked');
  return policy.fetchOneHop(request); // Signal beachten, Redirects aus, Body streamen
};

const report = await scan(targetUrl, {
  networkAdapter: adapter,
  signal: clientDisconnected.signal,
  captureTimeoutMs: 45_000,
  networkLimits: { concurrency: 6, maxRequests: 500, maxRedirects: 10 },
  maxDiagnostics: 100,
  lang: 'de',
});
```

`policy`, `targetUrl` und `clientDisconnected` stellt die Anwendung bereit. Das
[typgeprüfte Beispiel](../examples/controlled-scanner.ts) enthält einen ausführbaren Transport:
GET/HEAD, exakt freigegebene Hostname-Origins, feste Socket-IP-Adressen, normale TLS-Prüfung und keine
eigenständige Redirect-Verfolgung. Die IPs müssen vorher vom Betreiber geprüft werden. Die
Allowlist darf niemals vom Scan-Nutzer stammen. Damit findet während des Requests keine
neue DNS-Auflösung statt; die Beispiel-Allowlist ersetzt keine allgemeine Egress-Policy.

Context-Netzwerk bleibt im Adapter-Modus offline, Service Worker sind deaktiviert und WebSockets
werden mit Diagnose abgelehnt. Chromium-Interception erfasst Redirects, die Playwrights normaler
Route-Handler automatisch weiterreichen würde. Nicht vermittelbare Browser-Ziele können deshalb
unbeobachtet bleiben, beispielsweise Popups oder isolierte Worker/Frames vor ihrer Interception.
Solche Ladefehler schränken die Aussagekraft ein. Der Browser gehört zusätzlich in einen isolierten
Worker mit Betriebssystem-/Container-Egress-Regeln. Offline-Modus ist keine Netzwerksandbox für
sämtliche Nicht-HTTP-Kanäle.

Externer Abbruch beendet `scan()` nach Context-Aufräumen mit einem `AbortError` ohne den fremden
Abbruchgrund. Adapter müssen Signale bis zum Ende des Body-Streams beachten und offene Sockets
freigeben. JavaScript kann einen Adapter, der Signale ignoriert, nicht zwangsweise beenden. Beim
Browserstart wird der Browser geschlossen, sobald der Start zurückkehrt.

Eigene Playwright-Erfassungen können `observeConsent(page, context, requests, options)` importieren
und damit vorhandene CMP-Selektoren und Heuristiken weiterverwenden. Sie verantworten Listener,
Context und Cleanup selbst; zum Unterbrechen laufender Playwright-Aufrufe den eigenen Context
bei Abbruch schließen. Die `scan()`-Integration übernimmt das automatisch.

## Getrennte Limits

Limits gelten pro Seite gemeinsam für initiales Laden und Ablehnen. Wartende Ressourcen werden
nicht allein wegen voller Parallelität abgebrochen.

| Option                           | Vorgabe                | Bedeutung                                                          |
| -------------------------------- | ---------------------- | ------------------------------------------------------------------ |
| `networkLimits.concurrency`      | 6                      | Gleichzeitige Adapter-Aufrufe und Body-Streams, FIFO-Warteschlange |
| `networkLimits.maxRequests`      | 500                    | Zugelassene Anfragen einschließlich Dokument und Redirect-Hops     |
| `networkLimits.maxRedirects`     | 10                     | Weiterleitungen pro Kette                                          |
| `networkLimits.maxResponseBytes` | 5 MiB                  | Verbrauchte Bytes eines Antwort-Bodys                              |
| `networkLimits.maxTotalBytes`    | 20 MiB                 | Gemeinsames Body-Budget                                            |
| `networkLimits.requestTimeoutMs` | 10000                  | Zeit ab Abarbeitung, nicht ab Eintritt in die Warteschlange        |
| `captureTimeoutMs`               | 60000 im Adapter-Modus | Gesamte Seiten-Erfassung einschließlich Warteschlange und Consent  |
| `timeoutMs`                      | 30000                  | Einzelne Navigation bzw. Warten auf Netzwerkruhe                   |
| `settleMs`                       | 2000                   | Zusätzliche Beobachtungszeit                                       |
| `maxDiagnostics`                 | 100                    | Gespeicherte Details pro Seite; 0 behält nur Zähler                |

`networkLimits` setzt einen Adapter voraus; der alte Testhelfer `offline` kann nicht gleichzeitig
benutzt werden. Werte werden vor dem Browserstart validiert. Größenlimits zählen die vom Adapter
bereitgestellten Bytes, einschließlich des überschreitenden Chunks. Bei Streams wird vor vollständigem
Puffern abgebrochen. Bereits gepufferte Antworten hat der Adapter vorher allokiert. Komprimierte Bytes
und Content-Encoding müssen zusammenpassen; spätere Browser-Dekompression und DOM-/JavaScript-Speicher
sind nicht durch diese Budgets begrenzt. Worker benötigen zusätzliche CPU-/Speicherquoten.

## Zähler und Datenschutz

`pages[].capture` enthält `complete`, `beforeConsentComplete`, `document` und `diagnostics`.
Die Kategorien sind `security-blocked`, `unsupported-method`, `unsupported-protocol`, `dns`,
`tls`, `connection`, `timeout`, `resource-limit`, `http-error`, `browser-failure` und `aborted`.
Jedes Detail nennt Phase (`before-consent` oder `after-reject`), Origin und gegebenenfalls
HTTP-Status bzw. betroffenes Limit.

- `requests`: Browser-Anfrageversuche beider Phasen einschließlich Dokumenten und Redirect-Hops.
- `omittedRequests`: gezählte Anfragen ohne gespeicherten Evidenz-Eintrag. Abschneiden wird als
  Ressourcenlimit diagnostiziert und kann keine vollständige Erfassung vortäuschen.
- `responses`: empfangene HTTP-Antworten einschließlich Fehlerantworten und Redirects. Eine
  Anfrage kann nach Empfang einer Antwort noch fehlschlagen.
- `finished`: Browser-`requestfinished`-Ereignisse, gegebenenfalls einschließlich HTTP-Fehlern.
- `failed` (alter Sammelwert): `requestfailed` plus bei Erfassungsende noch offene Anfragen, jede genau einmal.
  Nach Abschluss gilt `requests = finished + failed`.
- `blocked`: Teilmenge von `failed`, explizit durch die Sicherheits-Policy abgelehnt.
- Neue Konsumenten verwenden getrennt `skippedRequests`, `failedRequests` und `securityBlockedRequests`.
  Ein ausgelassener Beacon ist kein Ladefehler. Siehe [Berichtsvertrag](configuration.de.md).
- `httpErrors`: Teilmenge von `responses`, Status >= 400. Kein Datenschutzbefund.
- `bytes`: konsumierte Adapter-Body-Bytes, einschließlich des überschreitenden Chunks.
- `issueCount`: sämtliche technischen Probleme. Eine Anfrage kann HTTP-Fehler und anschließenden
  Browserfehler erzeugen; dieser Wert ist kein Zähler fehlgeschlagener Anfragen.
- `issues` enthält maximal `maxDiagnostics` Details; `dropped` zählt ausgelassene Details.

`PageSummary.requestCount` zählt wie bisher nur die initiale Phase, der neue Diagnosezähler beide
Phasen. Gespeicherte Anfrage-Evidenz ist im Adapter-Modus durch das Anfragebudget begrenzt
(nativ: 5000 Einträge); die Zähler laufen weiter.

Diagnose-URLs enthalten ausschließlich die Origin. Zugangsdaten, komplette Pfade, Queries und
Fragmente werden entfernt. Im Adapter-Modus gilt das auch für Seiten-URLs und URL-Evidenz im
fertigen Bericht. Mehrere Seiten derselben Origin tragen deshalb dieselbe Anzeige-URL; für die
Zuordnung eigene opake IDs bzw. die Array-Position verwenden. `onPage` erhält absichtlich rohe
Snapshots für vertrauenswürdige interne Verarbeitung. Nicht ungefiltert veröffentlichen oder loggen.
Eigene Regeln/Logs bleiben in der Verantwortung des Aufrufers. Native Finding-URLs behalten
ihr bisheriges Format und sind kein sicherer öffentlicher API-Output.

## Aussagekraft und Consent

Technische Einschränkungen stehen außerhalb von `findings`. `coverage: 'partial'` verhindert in
Text-/Markdown-Berichten eine uneingeschränkte Entwarnung. SARIF verwendet dafür Invocation-
Notifications und zusätzliche Properties, keine Datenschutz-Alerts. JSON liefert strukturierte Daten.

Pro Seite und Regel zeigt `ruleEvaluations`:

- `executed`: mit verfügbaren Beobachtungen ausgeführt; `partial: true` erlaubt keine Aussage
  über das Fehlen weiterer Probleme.
- `skipped`: deaktiviert, Consent-Prüfung ausgeschaltet oder keine Startseite.
- `not-evaluable`: nötige Beobachtung fehlt.

Blockierte/fehlgeschlagene Ressourcen und HTTP-Fehlerantworten gelten nicht als Nachweis eines
geladenen Anbieters. Positive Beobachtungen können trotz Teilausfällen Findings ergeben. Regeln
für fehlende Dokumentinhalte laufen erst bei vollständig beobachtetem initialen Laden. Eigene
Regeln können `requires` angeben; ohne Angabe benötigen sie ein vollständiges Dokument.

Consent ergänzt die vorhandenen Felder um `state`:

Zusätzlich gibt es ein ausdrückliches `outcome`-/`reason`-Paar; siehe [Berichtsintegration](configuration.de.md).

| Wert                 | Bedeutung                                                                 |
| -------------------- | ------------------------------------------------------------------------- |
| `not-detected`       | Kein unterstütztes Banner erkannt; Ablehnen ungeprüft, allein kein Befund |
| `reject-unavailable` | Banner erkannt, keine unterstützte Ablehnen-Steuerung                     |
| `interaction-failed` | Erkennung, Interaktion oder Neuladen fehlgeschlagen                       |
| `reject-tested`      | Ablehnen geklickt und die Reload-/Beobachtungsschritte beendet            |

`reject-tested` bestätigt den Interaktionsablauf, nicht vollständige Erfassung oder die Wirksamkeit
der Auswahl. Dafür `afterRejectComplete`, Lade-Diagnosen und den Regelstatus berücksichtigen.
Der gespeicherte CMP-Zustand bzw. die visuelle Wirkung wird nicht unabhängig verifiziert.
Ablehnen wird nur auf der Startseite getestet; weitere Seiten starten mit frischem Context.

Ladefehler der Startseite werfen ohne Adapter weiterhin einen Fehler. `failureMode: 'report'`
liefert einen Bericht und ist im Adapter-Modus die Vorgabe; eine explizite Einstellung hat Vorrang.
Externer Abbruch wirft immer. Die Exit-Code-Policy von CLI/Action bleibt erhalten: Exit 0 bedeutet
keine Findings über der Schwelle, nicht vollständige Beobachtung. Berichtskonsumenten müssen
`coverage` und Diagnosen prüfen.
