# fingerprinting

[English](fingerprinting.md)

Meldet Skripte von Drittanbietern, die vor der Einwilligung Fingerprinting-Merkmale des Browsers
auslesen.

## Was geprüft wird

Bevor ein Skript der Seite läuft, umhüllt privalint die Browser-APIs, aus denen Fingerprinting seine
Merkmale liest, und hält fest, welches Skript sie aufruft:

| Merkmal         | API                                                                              |
| --------------- | -------------------------------------------------------------------------------- |
| Canvas-Auslesen | `HTMLCanvasElement.toDataURL`, `toBlob`, `CanvasRenderingContext2D.getImageData` |
| WebGL-Renderer  | `getParameter` mit `UNMASKED_VENDOR_WEBGL` oder `UNMASKED_RENDERER_WEBGL`        |
| Audio-Rendering | `OfflineAudioContext.startRendering`                                             |

Jedes Drittanbieter-Skript, das eine davon vor der Einwilligung aufruft, ist eine `warning`, mit
Skript-URL und Merkmalen als Beleg. Auf ein Canvas zu zeichnen, ohne es auszulesen, wie Diagramme es
tun, wird nicht erfasst. Skripte der Website selbst werden nicht gemeldet. reCAPTCHA, hCaptcha und
Cloudflare Turnstile lesen solche Merkmale, um Menschen von Bots zu unterscheiden; sie erscheinen als
`info`.

Der Agent von Fingerprint (FingerprintJS Pro) steht außerdem auf der Tracker-Liste, sodass
[`pre-consent-trackers`](pre-consent-trackers.de.md) ihn am Host erkennt: `fpjscdn.net`,
`fpnpmcdn.net` und `api.fpjs.io`, laut
[CSP-Anleitung](https://docs.fingerprint.com/docs/js-agent-csp) des Anbieters.

## Warum

Informationen vom Gerät des Besuchers auszulesen braucht wie das Speichern eines Cookies eine
Einwilligung, gleich mit welcher Technik (EDSA-Leitlinien 2/2023 zum technischen Anwendungsbereich
von Art. 5 Abs. 3 der ePrivacy-Richtlinie). Fingerprinting setzt kein Cookie, Cookie-Prüfungen
übersehen es also.

- § 25 Abs. 1 TDDDG (Deutschland)
- § 165 Abs. 3 TKG 2021 (Österreich)
- Art. 45c FMG (Schweiz)
- Eht. 155. § (4) (Ungarn)

## Wie beheben

Das Skript wie andere Tracker erst nach der Einwilligung laden oder entfernen. Ein Sicherheits-Widget
nur an dem Formular laden, das es schützt.

## Grenzen

- Das aufrufende Skript wird aus dem Stack gelesen. Code aus `eval` oder einem Blob kann die
  Seiten-URL zeigen und gilt dann als eigener.
- Andere Merkmale (Schriften, Bildschirm, Plugins, Akku) werden nicht erfasst.
