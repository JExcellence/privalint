# tracking-cookie-lifetime

[English](tracking-cookie-lifetime.md)

Weist auf Tracking-Cookies hin, die die Website länger als 13 Monate speichert.

## Was geprüft wird

Jedes Cookie, das die Seite setzt, vor der Einwilligung und nach dem Ablehnen, wird mit der
Tracker-Liste abgeglichen. Ein passendes Cookie, das mehr als 13 Monate (395 Tage) nach dem Scan
abläuft, wird pro Anbieter als `info` gemeldet, mit seiner Laufzeit in Tagen. Session-Cookies und
Cookies, die nicht auf der Tracker-Liste stehen, etwa die des Consent-Tools selbst, werden nicht
geprüft.

privalint stimmt einem Banner nie zu. Die meisten hier gemeldeten Cookies erscheinen daher schon
als Fehler unter [`pre-consent-trackers`](pre-consent-trackers.de.md) oder
[`trackers-after-reject`](trackers-after-reject.de.md). Die Laufzeit ist ein eigener Punkt: Sie
bleibt falsch, wenn das Einwilligungsproblem behoben ist.

## Warum

Personenbezogene Daten dürfen nur so lange gespeichert werden, wie der Zweck es erfordert
(Speicherbegrenzung). Die französische Aufsichtsbehörde CNIL empfiehlt für Tracking-Cookies
höchstens 13 Monate; der Wert dient vielfach als Maßstab. Google Analytics setzt `_ga`
standardmäßig für zwei Jahre.

- Art. 5 Abs. 1 lit. e DSGVO
- CNIL-Empfehlung zu Cookies, 17.09.2020

## Lösung

Die Laufzeit in der Konfiguration des Werkzeugs verkürzen. In Google Analytics 4 `cookie_expires`
(in Sekunden, zum Beispiel `34128000` für 395 Tage) im Aufruf `gtag('config', …)` oder in den
Einstellungen des Google-Tags im Tag-Manager setzen. Andere Werkzeuge haben ähnliche Einstellungen.
