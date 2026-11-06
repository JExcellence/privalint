# Befunde in Complianz beheben

[English](complianz.md)

So behebst du privalint-Befunde mit dem WordPress-Plugin Complianz. Jeder Schritt nennt die
Einstellung und verlinkt die Complianz-Seite, aus der er stammt. Die Seiten sind englisch, manche
älter als Complianz 7, und das Menü heißt je nach Version „Cookie Banner“ oder „Consent Banner“:
richte dich nach den Bezeichnungen deiner installierten Version. Geprüft am 2026-11-06.

## `pre-consent-trackers`

Ein Tracker lud, bevor der Besucher gewählt hat. Complianz blockiert, was es kennt: seine
Integrationen und die Skripte, die du einträgst.

- **Skript eintragen:** Complianz > Integrations (früher „Script Center“): „Add a Third-Party
  Script“ für ein Skript, das du über Complianz einbindest, oder „Block a script, iframe or plugin“
  mit einer URL oder iframe-Quelle, die bis zur Einwilligung blockiert wird. iframes bekommen einen
  Platzhalter; bei anderen Elementen Klasse oder ID angeben.
  [Integrating plugins](https://complianz.io/integrating-plugins/)
- **Oder im Code markieren:** `<script type="text/plain" data-category="statistics" data-service="matomo">`,
  `<iframe data-category="marketing" data-service="youtube">`. Die Klassen von Versionen vor 6.0
  entsprechen diesen Attributen: `cmplz-native` ist `functional`, `cmplz-stats` ist `statistics`,
  `cmplz-script` ist `marketing`.
  [Developers guide](https://complianz.io/developers-guide-for-third-party-integrations/)

## `trackers-after-reject`

Ein Tracker lud nach „Ablehnen“ weiter. Complianz blockiert ihn nicht, oder in einer Kategorie, die
eingeschaltet bleibt. Eintragen wie unter [`pre-consent-trackers`](#pre-consent-trackers) und die
nötige Kategorie setzen („Trigger on the needed, official, category“).
[Integrating plugins](https://complianz.io/integrating-plugins/)

## `trackers-after-settings`

Ein Tracker lud weiter, nachdem alle Kategorien ausgeschaltet und gespeichert wurden. Sein Skript
hat keine oder eine stets aktive Kategorie: setzen wie unter
[`trackers-after-reject`](#trackers-after-reject).

## `trackers-after-close`

Ein Tracker lud, nachdem das Banner mit seinem Schließen-Button geschlossen wurde. Der
Schließen-Button ist der Schalter „Close button“ unter Consent Banner > Appearance; laut Complianz
wirkt er weiter als Button zum Wegklicken.
[Minimal bottom banner](https://complianz.io/css-lesson-19-the-minimal-bottom-banner-revisited/),
[Close button](https://complianz.io/changing-dismiss-to-close-button/)
Was beim Schließen gespeichert wird, dokumentiert Complianz nicht. Ein Tracker, der danach lädt,
wird von Complianz nicht zurückgehalten: blockieren wie unter
[`pre-consent-trackers`](#pre-consent-trackers) oder den Schließen-Button ausschalten.

## `consent-preselected`

Optionale Kategorien waren beim Öffnen der Einstellungen eingeschaltet. Complianz startet mit allen
ausgeschaltet; vorangekreuzt werden sie nur über das Add-on „AutoCheck“, das Complianz selbst als
nicht konform bezeichnet. Dieses Add-on entfernen.
[Pre-checked categories](https://complianz.io/pre-checked-categories-why-not/)

## `reject-option`

Das Banner hat auf der ersten Ebene keinen Ablehnen-Button. Complianz kann ihn in den
Banner-Einstellungen ausblenden; wieder einblenden. Für ein Banner mit nur zwei Buttons die
Kategorien unter Consent Banner > General > Categories auf „Accept / Deny“ stellen.
[Minimal bottom banner](https://complianz.io/css-lesson-19-the-minimal-bottom-banner-revisited/),
[Customizing the TCF banner](https://complianz.io/help/wordpress/customization/customizing-the-tcf-banner/)

## `reject-less-prominent`

Der Ablehnen-Button ist kleiner, schlichter oder blasser als der Akzeptieren-Button. Complianz
empfiehlt „two equal buttons on the banner, Accept and Reject“ und führt einen deutlichen
Unterschied in Farbe oder Größe der beiden Haupt-Buttons als „Don't“. Beiden in den
Darstellungs-Einstellungen des Banners denselben Stil geben.
[What to include in a GDPR cookie banner](https://complianz.io/what-to-include-in-my-gdpr-cookie-banner/),
[Customizing the TCF banner](https://complianz.io/help/wordpress/customization/customizing-the-tcf-banner/)

## `consent-settings-link`

Nach einer Wahl gibt es keinen sichtbaren Weg zurück zu den Einstellungen.

- Complianz > Cookie Banner > Edit > General > „Manage consent display options“. Standardmäßig ist
  der Button auf Bildschirmen unter 768 px ausgeblendet.
  [Show the settings button on mobile](https://complianz.io/show-settings-button-on-mobile/)
- Oder einen eigenen Link oder Button mit der Klasse `cmplz-show-banner` setzen, etwa
  `<a href="#" class="cmplz-show-banner">Cookie-Einstellungen</a>`.
  [Add a link to show the cookie banner](https://complianz.io/add-a-link-to-show-the-cookie-banner/)
- In der Cookie-Richtlinie zeigt der Shortcode `[cmplz-manage-consent]` die Kategorien zum Ändern.
  [Revoke option on the cookie policy](https://complianz.io/new-revoke-option-on-the-cookies-policies/)

## `banner-legal-links`

Ein blockierendes Banner verlinkt weder Datenschutzerklärung noch Impressum. „Legal document links
on banner“ unter Consent Banner > Appearance einschalten und die verlinkten Seiten unter Wizard >
General > Documents festlegen (ein erzeugtes Dokument, eine gewählte Seite oder eine eigene URL).
[Minimal bottom banner](https://complianz.io/css-lesson-19-the-minimal-bottom-banner-revisited/),
[Impressum on the cookie banner](https://complianz.io/editing-impressum-on-the-cookie-banner/)

## `banner-language`

Das Banner ist in einer anderen Sprache als die Seite. Die Banner-Texte mit dem
Mehrsprachigkeits-Plugin übersetzen:

- WPML: WPML > Translation Dashboard > „Other texts (Strings)“, nach der Domain `complianz`
  filtern.
  [Translating with WPML](https://complianz.io/translate-legal-documents-to-multiple-languages-with-wpml/)
- Polylang: das Banner einmal speichern, damit seine Texte registriert sind, dann die Gruppe
  `complianz` unter String translations übersetzen.
  [Configuring for Polylang](https://complianz.io/configuring-for-polylang/)

## `gpc-signal`

Die Website reagiert nicht auf Global Privacy Control. Complianz > Wizard > General > Security &
Consent: „Respect Do Not Track and Global Privacy Control“ einschalten. Besucher mit dem Signal
sehen dann kein Banner, und die Einwilligung steht auf „nur funktional“. Das ist eine Funktion von
Complianz Premium.
[Browser privacy controls](https://complianz.io/browser-privacy-controls/)
