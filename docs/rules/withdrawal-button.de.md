# withdrawal-button

[English](withdrawal-button.md)

Warnt, wenn eine Website wie ein Onlineshop aussieht und auf ihrer Startseite kein Link zu einer
Widerrufsfunktion steht.

## Was geprüft wird

Als Shop gilt eine Seite, deren Startseite einen Warenkorb oder eine Kasse verlinkt („Warenkorb“,
„Kasse“, „Cart“, „Checkout“, „Panier“, „Kosár“, …) oder die Skripte eines Shopsystems lädt
(Shopify, WooCommerce, Shopware, Magento). Auf so einer Startseite sucht privalint einen Link oder
Button mit der Beschriftung, die das Gesetz verlangt: „Vertrag widerrufen“, „Vertrag hier
widerrufen“, „Withdraw from contract here“ und ähnliche Formulierungen auf Französisch, Spanisch,
Italienisch und Niederländisch.

| Situation                                         | Schweregrad |
| ------------------------------------------------- | ----------- |
| Shop, Widerrufs-Link auf der Startseite           | bestanden   |
| Shop, nur eine Widerrufsbelehrung oder gar nichts | `warning`   |
| Kein Shop oder nicht die Startseite               | nichts      |
| `--region ch`                                     | `info`      |

## Warum

Die Richtlinie (EU) 2023/2673 hat Art. 11a in die Verbraucherrechte-Richtlinie eingefügt. Seit dem
19. Juni 2026 müssen Unternehmer, die online Verträge mit Verbrauchern schließen, eine
Widerrufsfunktion anbieten: eine gut lesbar beschriftete Schaltfläche, die während der gesamten
Widerrufsfrist verfügbar ist und zu einem Bestätigungsschritt führt. In Deutschland regelt das
§ 356a BGB, mit den Beschriftungen „Vertrag widerrufen“ und „Widerruf bestätigen“.

- § 356a BGB
- Art. 11a Richtlinie 2011/83/EU

Das Schweizer Recht kennt diese Pflicht nicht; mit `--region ch` ist der Befund ein Hinweis, für
Shops, die in die EU verkaufen.

## Lösung

- Einen Link „Vertrag widerrufen“ in den Footer jeder Seite setzen.
- Er führt zu einem Formular mit den Bestelldaten (Name, Bestellnummer, E-Mail) und endet mit der
  Schaltfläche „Widerruf bestätigen“. Den Eingang per E-Mail bestätigen.
- Eine Seite mit der Widerrufsbelehrung oder ein PDF-Formular ersetzt die Funktion nicht.

## Grenzen

privalint prüft nur die Startseite. Eine Funktion, die nur im Kundenkonto angeboten wird, findet es
nicht; dann die Regel abschalten oder in der Konfiguration erlauben.
