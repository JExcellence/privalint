# Befunde in Usercentrics beheben

[English](usercentrics.md)

So beheben Sie privalint-Befunde in der Web-CMP von Usercentrics. Jeder Schritt nennt die
Einstellung und verlinkt die Usercentrics-Seite, aus der er stammt. Die Seiten sind englisch. Manche
Wege im Admin Interface stammen aus Artikeln zur CMP v2; wo v3 abweicht und die Seiten das sagen,
sind beide genannt. Geprüft am 2026-11-06.

## `pre-consent-trackers`

Ein Tracker lud, bevor der Besucher gewählt hat. Das Usercentrics-Skript allein blockiert nichts.

- **Von Hand blockieren:** dem Skript `type="text/plain"` und
  `data-usercentrics="Google Analytics"` geben, mit dem Dienstnamen genau wie im Admin Interface.
  Bei Bildern und iframes `src` durch `data-src` ersetzen.
  [Manually blocking services](https://support.usercentrics.com/hc/en-us/articles/18656524460700-Manually-blocking-services-prior-consent)
- **Oder Auto Blocking nutzen:** `https://web.cmp.usercentrics.eu/modules/autoblocker.js` vor
  `loader.js` laden (Implementation > Script Tag > „Auto blocking“). `data-uc-allowed="true"` nimmt
  ein Element aus. Welche Dienste abgedeckt sind, hängt vom Tarif ab.
  [Auto blocking in detail](https://support.usercentrics.com/hc/en-us/articles/17337159049244-Auto-blocking-in-detail),
  [Enable auto blocking](https://usercentrics.com/beta-docs/enable-auto-blocking-for-your-website)
- **Oder den Smart Data Protector:**
  `https://privacy-proxy.usercentrics.eu/latest/uc-block.bundle.js` im `<head>` vor anderen
  Skripten laden, ohne `async` oder `defer`, und die Dienst-Vorlagen in den Einstellungen anlegen.
  [Smart Data Protector](https://usercentrics.com/docs/web/features/extensions/smart-data-protector/)

## `trackers-after-reject`

Ein Tracker lud nach „Alle ablehnen“ weiter. Sein Dienst fehlt in der Konfiguration oder ist nicht
blockiert. Ihn unter Service Settings > Data Processing Services anlegen (aus dem Scanner, der
Datenbank oder als eigenen Dienst), unter Service Settings > Categories genau einer Kategorie
zuordnen und blockieren wie unter [`pre-consent-trackers`](#pre-consent-trackers): Anlegen allein
blockiert nichts.
[Setting up a banner configuration](https://usercentrics.com/beta-docs/setting-up-a-banner-configuration),
[What is a Data Processing Service](https://support.usercentrics.com/hc/en-us/articles/17476246544412-What-s-a-Data-Processing-Service)

## `trackers-after-settings`

Ein Tracker lud weiter, nachdem alle Kategorien ausgeschaltet und gespeichert wurden. Den Dienst
anlegen, zuordnen und blockieren wie unter [`trackers-after-reject`](#trackers-after-reject).

## `trackers-after-close`

Ein Tracker lud, nachdem das Banner geschlossen wurde. Die Schließen-Option
(`firstLayer.closeOption`, ein Link oder ein Symbol) schließt das Banner „ohne zuzustimmen“. Wer
nicht wählt, hat für jeden Dienst, der nicht auf „accepted by default“ steht, einen stillschweigenden
Opt-out. Ein Tracker, der nach dem Schließen lädt, ist also nicht blockiert (siehe
[`pre-consent-trackers`](#pre-consent-trackers)) oder standardmäßig akzeptiert (siehe
[`consent-preselected`](#consent-preselected)).
[Available properties](https://usercentrics.com/beta-docs/available-properties),
[Implied and explicit consent](https://support.usercentrics.com/hc/en-us/articles/17286825846940-What-is-the-difference-between-implied-and-explicit-consent)

## `consent-preselected`

Optionale Dienste waren beim Öffnen der Einstellungen eingeschaltet. Dienste auf „accepted by
default“ erhalten einen stillschweigenden Opt-in; außerhalb der Kategorie „Essential“ keinen Dienst
so einstellen. Die Usercentrics-Seiten nennen den Schalter nicht, also die Einstellungen jedes
Dienstes prüfen. Essenzielle Dienste sind immer an und lassen sich nicht abwählen.
[Implied and explicit consent](https://support.usercentrics.com/hc/en-us/articles/17286825846940-What-is-the-difference-between-implied-and-explicit-consent),
[Default banner settings](https://support.usercentrics.com/hc/en-us/articles/15654847514780-Usercentrics-CMP-default-banner-settings)

## `reject-option`

Das Banner hat auf der ersten Ebene keinen Ablehnen-Button. „Deny All“ ist standardmäßig da und
lässt sich entfernen; wieder einblenden. In einer per Code gesetzten Konfiguration darf
`firstLayer.hideButtonDeny` nicht `true` sein.
[Default banner settings](https://support.usercentrics.com/hc/en-us/articles/15654847514780-Usercentrics-CMP-default-banner-settings),
[Available properties](https://usercentrics.com/beta-docs/available-properties)

## `reject-less-prominent`

Der Ablehnen-Button ist kleiner, schlichter oder blasser als der Akzeptieren-Button. Beide Buttons
haben eigene Farben (`customization.color.acceptBtnBackground` und `denyBtnBackground`): dieselbe
setzen. Zur Hervorhebung selbst sagen die Usercentrics-Seiten nichts.
[Available properties](https://usercentrics.com/beta-docs/available-properties)

## `consent-settings-link`

Nach einer Wahl gibt es keinen sichtbaren Weg zurück zu den Einstellungen.

- Den Privacy Button behalten (das Fingerabdruck-Symbol, standardmäßig unten links) oder durch einen
  Link ersetzen.
  [Default banner settings](https://support.usercentrics.com/hc/en-us/articles/15654847514780-Usercentrics-CMP-default-banner-settings)
- CMP v2: Appearance > Layout > Privacy Trigger > „Privacy Link“, mit
  `<a href="#" onclick="UC_UI.showSecondLayer();">Privatsphäre-Einstellungen</a>`.
  [Setting up a Privacy Link](https://support.usercentrics.com/hc/en-us/articles/10911547924508-How-can-I-set-up-a-Privacy-Link)
- CMP v3: aus dem eigenen Link `window.__ucCmp.showSecondLayer()` aufrufen.
  [Control functionality](https://usercentrics.com/docs/web/features/api/control-functionality/)

## `banner-legal-links`

Ein blockierendes Banner verlinkt weder Datenschutzerklärung noch Impressum. Admin Interface >
Content > First Layer > „Imprint & Privacy Links“; mit „Edit & Translate“ je Sprache eine URL
setzen. Per Code heißen die Eigenschaften `imprintUrl` und `privacyPolicyUrl`.
[Imprint and privacy links on the banner](https://support.usercentrics.com/hc/en-us/articles/17101692077212-Can-links-to-an-imprint-and-or-privacy-policy-be-included-on-the-banner),
[Available properties](https://usercentrics.com/beta-docs/available-properties)

## `banner-language`

Das Banner ist in einer anderen Sprache als die Seite. Die Sprache in der Konfiguration anlegen und
sie dann je Seite mit `data-language="de"` am CMP-Skript-Tag setzen, oder das Attribut weglassen:
Usercentrics folgt dann einer gespeicherten Sprache, dem `<html lang>` der Seite, der
Browsersprache und zuletzt der „Default Visible Language“, in dieser Reihenfolge.
[Banner language assignment](https://support.usercentrics.com/hc/en-us/articles/15886871701532-Banner-language-assignment-logic)

## `gpc-signal`

Die Website reagiert nicht auf Global Privacy Control. Bei DSGVO-Konfigurationen (Opt-in) muss GPC
im Admin Interface eingeschaltet werden; standardmäßig ist es aus. Das Signal gilt dann vor jeder
Wahl, eine gespeicherte Wahl und eine spätere Änderung über Privacy Link oder Button gehen vor. Den
Namen des Schalters nennt die Seite nicht.
[Global Privacy Control](https://support.usercentrics.com/hc/en-us/articles/14641576514844-Global-Privacy-Control-GPC-Signal)
