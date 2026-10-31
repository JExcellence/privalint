# trackers-after-reject

[English](trackers-after-reject.md)

Meldet Tracker, die nach einem Klick auf „Ablehnen“ weiterhin laden oder neue Cookies setzen.

## Was geprüft wird

Auf der Startseite sucht privalint das Cookie-Banner, klickt auf dessen Ablehnen-Button, wartet,
bis das Netzwerk zur Ruhe kommt, lädt die Seite neu und wartet erneut. Jede Anfrage und jedes
Cookie, das seit dem Klick neu hinzugekommen ist, wird mit derselben Tracker-Liste abgeglichen wie
bei [`pre-consent-trackers`](pre-consent-trackers.de.md).

| Kategorie                                    | Schweregrad |
| -------------------------------------------- | ----------- |
| analytics, advertising, session-replay, …    | `error`     |
| tag-manager (z. B. ein GTM-Container allein) | `warning`   |

Das Neuladen ist entscheidend: Viele fehlerhafte Einrichtungen respektieren den Klick auf der
aktuellen Seite, laden beim nächsten Seitenaufruf aber wieder alles. Eine typische Ursache ist
Code, der nur prüft, ob _irgendeine_ Entscheidung gespeichert wurde, statt welche.

Geprüft wird nur die Startseite, weil Banner und Konfiguration auf der ganzen Website dieselben
sind. Mit `--skip-consent` lässt sich die Prüfung überspringen.

## Warum

Eine Ablehnung ist nicht bloß eine fehlende Einwilligung, sondern ein ausdrückliches Nein. Für
eine Verarbeitung danach gibt es keine Rechtsgrundlage, und eine Einwilligung, die sich nicht
verweigern lässt, ist nicht freiwillig.

- § 25 Abs. 1 TDDDG
- Art. 6 Abs. 1 lit. a DSGVO

## Lösung

- Prüfen Sie in Ihrem Consent-Manager, dass jedes Tool einer Kategorie zugeordnet und diese
  Kategorie standardmäßig deaktiviert ist.
- Wenn Sie Tags selbst laden, prüfen Sie die konkrete Entscheidung (`consent === 'accepted'` oder
  das Kategorie-Flag), nicht nur, ob überhaupt eine Entscheidung vorliegt.
- Geben Sie im Google Tag Manager jedem Tag eine Einwilligungsvoraussetzung oder einen passenden
  Trigger. Der Container selbst wird als Warnung gemeldet.
