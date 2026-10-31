# Erkennung von Consent-Managern

[English](consent-managers.md)

Bekannte CMP-Selektoren werden in jedem Frame geprüft. Zustimmen und Ablehnen werden im selben
Frame gesucht; versteckte Steuerelemente werden ignoriert. Die bisherigen Selektoren und
mehrsprachigen Beschriftungs-Heuristiken stehen in `scan()` und `observeConsent()` bereit.

| CMP                | Erkennung                                                                            |
| ------------------ | ------------------------------------------------------------------------------------ |
| CookieFirst        | `data-cookiefirst-action=accept/reject`, v3 `data-testid=actionButton-accept/reject` |
| Osano              | `.osano-cm-accept-all`, `.osano-cm-denyAll` (ältere Variante `.osano-cm-deny-all`)   |
| Termly             | `data-tid=banner-accept/banner-decline`, CSS-Modul-Präfix des Zustimmen-Buttons      |
| Sourcepoint        | `button.sp_choice_type_11`, `button.sp_choice_type_13`, auch in Iframes              |
| Real Cookie Banner | Vorhandene Heuristik für sichtbare Beschriftungen plus Script-/Konfigurationsmarker  |
| Axeptio            | `#axeptio_btn_acceptAll`, `#axeptio_btn_dismiss`                                     |
| TrustArc           | `.ta-modal-primary-btn` mit `data-button-key=accept_all/decline_all`                 |
| CookieHub          | `.ch2-allow-all-btn`, `.ch2-deny-all-btn`                                            |
| Cookie Information | `data-testid=coi-banner__accept/decline-all-categories-button`                       |
| Cookie-Script      | `#cookiescript_accept`, `#cookiescript_reject`                                       |
| Usercentrics v3    | `#usercentrics-cmp-ui` mit `data-action-type=accept/deny/more/save`                  |

Real Cookie Banner verwendet die gemeinsame Beschriftungs-Heuristik statt geratener Selektoren
für generierte Klassen/IDs. Es wird keine API zur erzwungenen Einwilligung aufgerufen. Die Einstellungsebene wird nur mit
dem optionalen `--check-settings` geöffnet, siehe
[`trackers-after-settings`](rules/trackers-after-settings.de.md). Ein erkanntes Banner ohne unterstütztes Ablehnen auf der ersten Ebene
liefert `unsupported-banner`. Fehlende Banner-Erkennung allein erzeugt keinen Datenschutzbefund.
Ein erfolgreicher Klick mit Neuladen verifiziert den gespeicherten CMP-Zustand nicht unabhängig.

## Prüfung auf öffentlichen Websites

Am 27.10.2026 lief privalint mit einem Headless-Chromium aus Deutschland gegen diese Websites:

| CMP                | Website               | Ergebnis                                                                  |
| ------------------ | --------------------- | ------------------------------------------------------------------------- |
| CookieFirst        | cookiefirst.com       | erkannt, „Deny“ geklickt und neu geladen                                  |
| Osano              | osano.com             | erkannt, „Nicht wesentliche Cookies ablehnen“ geklickt und neu geladen    |
| Termly             | termly.io             | erkannt, „Ablehnen“ geklickt und neu geladen                              |
| Sourcepoint        | spiegel.de, welt.de   | im Iframe erkannt, korrekt als Pur-Abo-Modell ohne Ablehnen eingestuft    |
| Real Cookie Banner | devowl.io             | Marker erkannt, Banner aber nicht gerendert (leeres, verstecktes Overlay) |
| Axeptio            | axeptio.eu            | erkannt, "No, thanks" geklickt und neu geladen                            |
| TrustArc           | trustarc.com          | erkannt, "REJECT OPTIONAL" geklickt und neu geladen                       |
| CookieHub          | tradedoubler.com      | erkannt, "Alle ablehnen" geklickt und neu geladen                         |
| Cookie Information | cookieinformation.com | erkannt, "Decline all" geklickt und neu geladen                           |
| Cookie-Script      | cookie-script.com     | erkannt, "Decline all" geklickt und neu geladen                           |
| Usercentrics v3    | dkb.de                | erkannt, abgelehnt, Einstellungen geöffnet, 17 Schalter aus, gespeichert  |

Bei Osano stand der Ablehnen-Selektor zuvor auf `.osano-cm-deny-all`. osano.com liefert jedoch
`.osano-cm-denyAll`; der Selektor ist korrigiert und durch ein Fixture abgesichert.

Real Cookie Banner rendert sein Banner auf devowl.io nicht für einen automatisierten Browser.
privalint meldet dort korrekt eine nicht klassifizierbare Banner-Struktur statt eines Erfolgs. Die
Zuordnung über Beschriftungen bleibt deshalb bewusst bestehen; geratene Selektoren für die
generierten Klassen werden nicht hinzugefügt.

Deterministische lokale Fixtures prüfen alle Pfade, beide CookieFirst-Varianten, die
Osano-Klassen und Sourcepoint in einem Iframe. Regionale Auslieferung und CMP-Konfigurationen
können sich ändern.
