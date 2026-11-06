# Befunde in OneTrust beheben

[English](onetrust.md)

So behebst du privalint-Befunde im Cookie-Consent-Banner von OneTrust. Jeder Schritt nennt die
Einstellung und verlinkt die OneTrust-Seite, aus der er stammt. Die Seiten sind englisch; die
Menünamen stehen hier so, wie OneTrust sie schreibt. Ändert sich die Oberfläche, nennt die
verlinkte Seite den aktuellen Weg. Geprüft am 2026-11-06.

## `pre-consent-trackers`

Ein Tracker lud, bevor der Besucher gewählt hat. OneTrust blockiert ein Skript nur, wenn es seine
Kategorie kennt.

- **Skript von Hand blockieren:** das Tag in `<script type="text/plain" class="optanon-category-C0002">`
  ändern, mit der Kategorie-ID des Trackers (C0002 ist im Standard „Performance“). Bei einem iframe
  `src` in `data-src` umbenennen und dieselbe Klasse setzen.
  [Client-side cookie management](https://docs.onetrust.com/en/consent--preferences/cookie-consent/managing-cookie-scripts-cookie-blocking-and-technical-implementation/client-side-cookie-management)
- **Oder Auto-Blocking nutzen:** Cookie Consent > Websites > deine Website > Reiter „Auto-Block“,
  „Auto-Blocking“ einschalten. Das OneTrust-Skript muss dann das erste Element im `<head>` sein.
  [Auto-blocking](https://docs.onetrust.com/en/consent--preferences/cookie-consent/managing-cookie-scripts-cookie-blocking-and-technical-implementation/onetrust-cookie-auto-blocking-enhanced-interface)
- **Lücken des Auto-Blockings beachten:** nicht kategorisierte Cookies, „Strictly Necessary“ und
  kategorisierte Cookies ohne Quell-URL werden nicht blockiert. Lädt die Website Tracker über einen
  Tag-Manager, empfiehlt OneTrust, dort zu blockieren.
  [Auto-blocking FAQ](https://docs.onetrust.com/en/consent--preferences/cookie-consent/managing-cookie-scripts-cookie-blocking-and-technical-implementation/auto-blocking-faq)
- **Cookie kategorisieren:** unter „Categorizations“, Reiter „Cookies“, jedes Cookie des Trackers
  seiner Kategorie zuordnen. Nicht kategorisierte Cookies werden nicht blockiert.
  [Things to know](https://docs.onetrust.com/en/consent--preferences/cookie-consent/things-to-know-and-best-practices/cookie-consent-things-to-know-and-best-practices)

## `trackers-after-reject`

Ein Tracker lud nach „Reject All“ weiter. Meist ist er keiner blockierten Kategorie zugeordnet; es
gelten die Schritte unter [`pre-consent-trackers`](#pre-consent-trackers). Von Hand blockierte
Skripte bleiben `text/plain`, solange keine Einwilligung vorliegt oder sie widerrufen ist; eine
geänderte Wahl gilt ab dem nächsten Seitenaufruf.
[Client-side cookie management](https://docs.onetrust.com/en/consent--preferences/cookie-consent/managing-cookie-scripts-cookie-blocking-and-technical-implementation/client-side-cookie-management)

## `trackers-after-settings`

Ein Tracker lud weiter, nachdem im Preference Center alle Kategorien ausgeschaltet und gespeichert
wurden. Sein Skript oder Cookie liegt in keiner oder einer stets aktiven Kategorie: kategorisieren
und blockieren wie unter [`pre-consent-trackers`](#pre-consent-trackers).

## `trackers-after-close`

Ein Tracker lud, nachdem das Banner mit seinem Schließen-Button geschlossen wurde.

- Der Schließen-Button (Templates > dein Template > Reiter „Banner“ > Content > Button Set > „Show
  close button“, „Show Close Button (X)“) schließt das Banner, ohne zuzustimmen oder abzulehnen;
  laut OneTrust lässt er sich nicht als „Accept all“ einstellen. Danach gilt die Vorgabe des
  Consent-Modells, also „Opt-in“ wählen wie unter [`consent-preselected`](#consent-preselected).
  [Customizing the banner template](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/customizing-the-banner-template)
- In der Geolocation-Regel „Behaviors - Close Banner“ prüfen: Sie kann das Banner bei einem Klick
  daneben, beim Scrollen oder auf der nächsten Seite schließen. Nichts davon ist eine Wahl.
  [Configuring geolocation rules](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/configuring-geolocation-rules)

## `consent-preselected`

Optionale Kategorien waren beim Öffnen des Preference Centers eingeschaltet. Das Consent-Modell der
Geolocation-Regel (Setup > Geolocation Rules > Regelgruppe > Regel) auf „Opt-in“ stellen: Alle
Kategorien außer „Strictly Necessary“ starten inaktiv. „Custom“ setzt die Vorgabe je Kategorie;
„Opt-out“, „Implied Consent“ und „Notice Only“ starten Kategorien aktiv.
[Consent models](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/cookie-consent-models),
[Configuring geolocation rules](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/configuring-geolocation-rules)

## `reject-option`

Das Banner hat auf der ersten Ebene keinen Ablehnen-Button. Templates > dein Template > Reiter
„Banner“ > Content > Button Set: „Show reject all button“ einschalten und „Reject all button text“
setzen.
[Customizing the banner template](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/customizing-the-banner-template)

## `reject-less-prominent`

Der Ablehnen-Button ist kleiner, schlichter oder blasser als der Akzeptieren-Button. Im selben
Button Set gestaltet „Accept & Reject Button Color“ beide gleich, „Button layout“ legt die
Reihenfolge fest. Beide als gleichartige Buttons belassen; zur Hervorhebung selbst sagt die
OneTrust-Seite nichts.
[Customizing the banner template](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/customizing-the-banner-template)

## `consent-settings-link`

Nach dem Ablehnen gibt es keinen sichtbaren Weg zurück zu den Einstellungen.

- Reiter „Preference Center“ > Content > Button Set: „Enable persistent Cookie Settings hover
  button“ zeigt ein schwebendes Symbol.
  [Customizing the preference center template](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/customizing-the-preference-center-template)
- Oder einen eigenen Link oder Button im Footer mit der Klasse `ot-sdk-show-settings` versehen
  oder `OneTrust.ToggleInfoDisplay()` aufrufen.
  [Single-page applications](https://developer.onetrust.com/onetrust/docs/single-page-applications),
  [JavaScript API](https://developer.onetrust.com/onetrust/docs/javascript-api)

## `banner-legal-links`

Ein blockierendes Banner verlinkt weder Datenschutzerklärung noch Impressum. Reiter „Banner“ >
Content: „Show Cookie Policy Link“ mit der URL der Datenschutz- oder Cookie-Erklärung einschalten,
dazu „Show Imprint Link“ mit „Imprint Link URL“.
[Customizing the banner template](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/customizing-the-banner-template)

## `banner-language`

Das Banner ist in einer anderen Sprache als die Seite. Beim Veröffentlichen des Skripts „Enable
Language Detection on Scripts“ einschalten und „Determine the language from HTML page“ wählen; das
Skript-Tag trägt dann `data-document-language="true"`, und jede Sprache des Templates muss zum
`lang` der Seite passen. Sprachen werden unter Template Details > „Manage Languages“ freigeschaltet.
`OneTrust.changeLanguage("de")` wechselt per Code.
[Publishing and implementing scripts](https://docs.onetrust.com/en/privacy-professional/managing-consent-and-privacy-notices/publishing-and-implementing-cookie-consent-scripts),
[JavaScript API](https://developer.onetrust.com/onetrust/docs/javascript-api)

## `gpc-signal`

Die Website reagiert nicht auf Global Privacy Control. Unter Cookie Consent > Geolocation Rules >
Regelgruppe > Regel > Edit > Cookie categories bei jeder Kategorie, die das Signal ausschalten
soll, „Global Privacy Control“ ankreuzen, speichern und veröffentlichen. Diese Kategorien starten
dann für Besucher mit dem Signal ausgeschaltet; ihre eigene Wahl geht weiter vor.
[Global Privacy Control](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/leveraging-the-global-privacy-control-signal)
