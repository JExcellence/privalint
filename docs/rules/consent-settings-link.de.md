# consent-settings-link

[English](consent-settings-link.md)

Meldet Websites, auf denen Besucher nach dem Ablehnen keinen sichtbaren Weg zurück in die
Cookie-Einstellungen finden.

## Was geprüft wird

Auf der Startseite klickt privalint im Cookie-Banner auf „Ablehnen“ und lädt die Seite neu
(derselbe Durchlauf wie bei [`trackers-after-reject`](trackers-after-reject.de.md)). Sobald das
Banner verschwunden ist, sucht es in jedem Frame nach einem sichtbaren Element, das die
Einstellungen wieder öffnet:

- die Widgets und Aufrufe bekannter Consent-Manager zum erneuten Öffnen, z. B. ein Link auf
  `Cookiebot.renew()` oder `UC_UI.showSecondLayer()`, OneTrusts `ot-sdk-show-settings`, der Reiter
  „Manage consent“ von Complianz, der Revisit-Button von CookieYes, der Einstellungslink von
  iubenda, das Osano-Widget;
- jeden Link oder Button, dessen Text, `aria-label` oder `title` etwa „Cookie-Einstellungen“,
  „Datenschutz-Einstellungen“, „Einwilligung widerrufen“, „Cookie settings“ oder „Manage cookies“
  lautet.

| Situation                                                                    | Schweregrad   |
| ---------------------------------------------------------------------------- | ------------- |
| Ablehnen getestet, kein solches Element sichtbar                             | `warning`     |
| Ein Element wurde gefunden                                                   | keine Meldung |
| Kein Banner gefunden, kein Ablehnen-Button oder der Klick ist fehlgeschlagen | nicht prüfbar |

## Warum

Der Widerruf einer Einwilligung muss so einfach sein wie ihre Erteilung. Verschwindet das Banner
nach dem ersten Klick für immer, haben Besucher, die zugestimmt haben, keinen einfachen Weg, es
sich anders zu überlegen.

- Art. 7 Abs. 3 DSGVO
- § 25 Abs. 1 TDDDG

In der Schweiz, wo für Cookies ein Opt-out-Modell gilt (Art. 45c FMG), wird der Befund als `info`
gemeldet.

## Grenzen

- Geprüft wird nur die Startseite. Ein Einstellungslink, der nur auf der Seite mit der
  Datenschutzerklärung steht, wird nicht gefunden, obwohl einige Aufsichtsbehörden ihn dort
  akzeptieren.
- Die Liste der Beschriftungen deckt deutsche, englische und französische Formulierungen ab. Ein
  Link, der nur „Einstellungen“ heißt, wird gefunden, wenn er einen bekannten Consent-Manager
  aufruft, nicht aber über seinen Text.
- privalint klickt das Element nicht an und kann daher nicht feststellen, ob es die Einstellungen
  tatsächlich öffnet.

## Lösung

Fügen Sie im Footer jeder Seite einen Link „Cookie-Einstellungen“ ein oder aktivieren Sie den
schwebenden Button Ihres Consent-Managers. Die meisten dokumentieren einen Aufruf für den Link,
zum Beispiel:

| Consent-Manager | Aufruf zum erneuten Öffnen                           |
| --------------- | ---------------------------------------------------- |
| Cookiebot       | `javascript:Cookiebot.renew()`                       |
| Usercentrics    | `UC_UI.showSecondLayer()`                            |
| OneTrust        | beliebiges Element mit Klasse `ot-sdk-show-settings` |
| Didomi          | `Didomi.preferences.show()`                          |
| Klaro           | `klaro.show()`                                       |
