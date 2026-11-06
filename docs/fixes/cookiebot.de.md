# Befunde in Cookiebot beheben

[English](cookiebot.md)

So beheben Sie privalint-Befunde im Cookiebot-Banner. Jeder Schritt nennt die Einstellung und
verlinkt die Cookiebot-Seite, aus der er stammt. Die Seiten sind englisch. Das Hilfecenter
beschreibt zwei Oberflächen: ältere Artikel nutzen „Settings“ mit Reitern, neuere „Configuration“
mit Abschnitten (Compliance, Design, Privacy trigger). Beide sind genannt, wo die Seiten sie
angeben. Geprüft am 2026-11-06.

## `pre-consent-trackers`

Ein Tracker lud, bevor der Besucher gewählt hat. Cookiebot blockiert ein Skript nur, wenn es seine
Kategorie kennt.

- **Automatisch blockieren:** `data-blockingmode="auto"` am Skript-Tag von `uc.js` setzen.
  Cookiebot muss das erste Skript der Seite sein, ohne `async` oder `defer`. Blockiert wird, was der
  Scan klassifiziert hat; `data-cookieconsent="ignore"` nimmt ein Element aus.
  [How auto-blocking works](https://support.cookiebot.com/hc/en-us/articles/11438730619804-How-does-auto-blocking-work),
  [Developer reference](https://www.cookiebot.com/en/developer/)
- **Oder von Hand blockieren:** dem Skript `type="text/plain"` und
  `data-cookieconsent="statistics"` (oder `preferences`, `marketing` oder eine Liste mit Kommas)
  geben. Bei iframes und Bildern `src` in `data-cookieblock-src` umbenennen.
  [Manual cookie blocking](https://support.cookiebot.com/hc/en-us/articles/4405978132242-Manual-cookie-blocking)

## `trackers-after-reject`

Ein Tracker lud nach „Alle ablehnen“ weiter. Er ist nicht blockiert oder seine Cookies sind nicht
klassifiziert. Im Cookiebot Manager das Menü „Cookies“ öffnen, jedem nicht klassifizierten Cookie
eine Kategorie geben und speichern; Skripte markieren wie unter
[`pre-consent-trackers`](#pre-consent-trackers).
[Classifying unclassified cookies](https://support.cookiebot.com/hc/en-us/articles/26361882043676-How-do-I-classify-unclassified-cookies-in-the-Cookiebot-Manager)

## `trackers-after-settings`

Ein Tracker lud weiter, nachdem alle Kategorien ausgeschaltet und gespeichert wurden. Klassifizieren
und blockieren wie unter [`trackers-after-reject`](#trackers-after-reject).

## `trackers-after-close`

Ein Tracker lud, nachdem das Banner mit seinem Schließen-Symbol geschlossen wurde. Cookiebot hat die
Option „Display a close icon“, standardmäßig aus. Was beim Schließen gespeichert wird, sagen die
öffentlichen Seiten nicht. Ein Tracker, der danach lädt, ist nicht blockiert: blockieren wie unter
[`pre-consent-trackers`](#pre-consent-trackers) oder das Schließen-Symbol ausschalten.
[Default banner settings](https://support.cookiebot.com/hc/en-us/articles/15654523704220-Cookiebot-CMP-default-banner-settings)

## `consent-preselected`

Optionale Kategorien waren beim Öffnen der Einstellungen angekreuzt. „Checkboxes default mode“
(neuere Oberfläche: Configuration > Compliance > „Default mode for checkboxes“) auf keine
vorangekreuzten stellen, die Vorgabe.
[Configuring the Swift banner](https://support.cookiebot.com/hc/en-us/articles/26407083994524-Configuration-of-the-Swift-banner-in-the-Cookiebot-Manager),
[Configuration Health Checker](https://support.cookiebot.com/hc/en-us/articles/29420607661852-Cookiebot-Configuration-Health-Checker)

## `reject-option`

Das Banner hat auf der ersten Ebene keinen Ablehnen-Button. Die Buttons „Reject all / Selection /
Allow all“ wählen (Vorgabe bei den Typen Multilevel und Inline Multilevel). Die Health-Checker-Regel
„Reject all button must be visible“ verweist auf Configuration > Compliance > Type.
[Configuring the Swift banner](https://support.cookiebot.com/hc/en-us/articles/26407083994524-Configuration-of-the-Swift-banner-in-the-Cookiebot-Manager),
[Configuration Health Checker](https://support.cookiebot.com/hc/en-us/articles/29420607661852-Cookiebot-Configuration-Health-Checker)

## `reject-less-prominent`

Der Ablehnen-Button ist kleiner, schlichter oder blasser als der Akzeptieren-Button. Laut
DSGVO-Hinweisen von Cookiebot soll er auf derselben Ebene stehen wie der Akzeptieren-Button, und die
Health-Checker-Regel „Button colors must not nudge users toward accepting“ verweist auf
Configuration > Design > Button styles.
[A GDPR-compliant banner](https://support.cookiebot.com/hc/en-us/articles/26407777992860-Using-a-GDPR-compliant-banner-Cookiebot-Manager),
[Configuration Health Checker](https://support.cookiebot.com/hc/en-us/articles/29420607661852-Cookiebot-Configuration-Health-Checker)

## `consent-settings-link`

Nach einer Wahl gibt es keinen sichtbaren Weg zurück zu den Einstellungen.

- Den Privacy Trigger einschalten: Settings > „Privacy trigger“ (neuere Oberfläche: Privacy trigger
  > „Show privacy button“). Für bestehende Domain-Gruppen ist er nicht voreingestellt.
  [Privacy trigger](https://support.cookiebot.com/hc/en-us/articles/26407453035292-The-Cookiebot-CMP-Privacy-trigger-Cookiebot-Manager)
- Oder `Cookiebot.renew()` im Footer verlinken, etwa
  `<a href="javascript: Cookiebot.renew()">Cookie-Einstellungen</a>`. Auch die Cookie-Erklärung
  bietet Ändern und Widerrufen an.
  [Changing or withdrawing consent](https://support.cookiebot.com/hc/en-us/articles/360003798814-Changing-or-withdrawing-consent)

## `banner-legal-links`

Ein blockierendes Banner verlinkt weder Datenschutzerklärung noch Impressum. Im Manager Settings >
Reiter „Content“: den Bannertext markieren und die Links mit dem Link-Symbol der Werkzeugleiste oder
im HTML-Editor (`</>`) setzen.
[Customizing the banner content](https://support.cookiebot.com/hc/en-us/articles/26380240216860-Customizing-the-content-in-the-cookie-consent-banner-via-the-Cookiebot-Manager)

## `banner-language`

Das Banner ist in einer anderen Sprache als die Seite. Die Sprachen der Seite unter Settings >
Content anlegen und die Sprache je Seite mit `data-culture="de"` (zweistelliger Code) am
Skript-Tag setzen; das geht vor der Vorgabe und vor „Auto-detect user language“, das der
Browsersprache folgt.
[Setting the banner language](https://support.cookiebot.com/hc/en-us/articles/26365089106716-How-to-set-the-language-of-the-consent-banner-in-the-Cookiebot-Manager),
[Developer reference](https://www.cookiebot.com/en/developer/)

## `gpc-signal`

Die Website reagiert nicht auf Global Privacy Control. Cookiebot dokumentiert GPC für seine
Einrichtung nach US-Datenschutzgesetzen: Dann wird der Besucher abgemeldet, sobald der Browser das
Signal sendet. Für DSGVO-Banner nennen die Seiten keine GPC-Einstellung.
[US multi-state privacy laws](https://support.cookiebot.com/hc/en-us/articles/29898398523548-Using-Cookiebot-CMP-for-MSPL-compliance-Cookiebot-Admin)
