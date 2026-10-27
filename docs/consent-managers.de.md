# Erkennung von Consent-Managern

[English](consent-managers.md)

Bekannte CMP-Selektoren werden in jedem Frame geprüft. Zustimmen und Ablehnen werden im selben
Frame gesucht; versteckte Steuerelemente werden ignoriert. Die bisherigen Selektoren und
mehrsprachigen Beschriftungs-Heuristiken stehen in `scan()` und `observeConsent()` bereit.

| CMP                | Erkennung                                                                            |
| ------------------ | ------------------------------------------------------------------------------------ |
| CookieFirst        | `data-cookiefirst-action=accept/reject`, v3 `data-testid=actionButton-accept/reject` |
| Osano              | `.osano-cm-accept-all`, `.osano-cm-deny-all`                                         |
| Termly             | `data-tid=banner-accept/banner-decline`, CSS-Modul-Präfix des Zustimmen-Buttons      |
| Sourcepoint        | `button.sp_choice_type_11`, `button.sp_choice_type_13`, auch in Iframes              |
| Real Cookie Banner | Vorhandene Heuristik für sichtbare Beschriftungen plus Script-/Konfigurationsmarker  |

Real Cookie Banner verwendet die gemeinsame Beschriftungs-Heuristik statt geratener Selektoren
für generierte Klassen/IDs. Es wird keine API zur erzwungenen Einwilligung aufgerufen und keine
Einstellungsebene geöffnet. Ein erkanntes Banner ohne unterstütztes Ablehnen auf der ersten Ebene
liefert `unsupported-banner`. Fehlende Banner-Erkennung allein erzeugt keinen Datenschutzbefund.
Ein erfolgreicher Klick mit Neuladen verifiziert den gespeicherten CMP-Zustand nicht unabhängig.

Am 27.10.2026 wurden öffentliches HTML und offizielle Scripts von CookieFirst, devowl, Osano,
Termly und Sourcepoint per HTTP untersucht. Die [englische Fassung](consent-managers.md) nennt
Quellen und tatsächlich gefundene Attribute. Das ist eine Quellprüfung, keine interaktive
Verifikation jedes öffentlichen Banners. Die lokale Browser-Steuerung ist deaktiviert.

Deterministische lokale Chromium-Fixtures prüfen alle fünf Pfade, beide CookieFirst-Varianten
und Sourcepoint in einem Iframe. Regionale Auslieferung und CMP-Konfigurationen können davon
abweichen. Issue #9 bleibt daher für die geforderte öffentliche Interaktionsprüfung offen,
insbesondere für Sourcepoint und weitere Termly-Ablehnen-Varianten. Die dortigen
Browser-Abnahmekriterien sind noch nicht vollständig verifiziert.
