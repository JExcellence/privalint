# reject-less-prominent

[English](reject-less-prominent.md)

Weist mit `info` auf eine Ablehnen-Steuerung auf der ersten Ebene des Cookie-Banners hin, die
schwerer zu sehen ist als der Zustimmen-Button.

## Was geprüft wird

Findet privalint auf der ersten Ebene sowohl eine Zustimmen- als auch eine Ablehnen-Steuerung (siehe
[`reject-option`](reject-option.de.md)), misst es beide im Browser, aus ihrer gerenderten Fläche und
den berechneten Styles, ohne Screenshots:

- **Form:** Eine Steuerung mit sichtbarem Hintergrund oder Rahmen gilt als Button, eine ohne als
  bloßer Text. Ein Ablehnen als bloßer Text neben einem Zustimmen-Button wird notiert.
- **Größe:** Ein Zustimmen-Button mit mehr als doppelter Fläche der Ablehnen-Steuerung wird notiert.
- **Kontrast:** der Kontrast des Textes zum ersten deckenden Hintergrund dahinter. Ein Ablehnen unter
  3:1 wird notiert, wenn der Zustimmen-Button mindestens 4,5:1 erreicht, das WCAG-Minimum für
  normalen Text. Auf einem Hintergrundbild oder Verlauf wird kein Kontrast berechnet.

Der Befund nennt, was auffiel, und gibt beide Messungen als Beleg an, etwa
`Ablehnen "Alle ablehnen": Text, 70×20 px, Kontrast 6:1`.

## Warum

Ablehnen muss so einfach sein wie Zustimmen. Die Cookie-Banner-Taskforce des EDSA nennt ein Ablehnen
als Textlink neben einem Zustimmen-Button und ein Ablehnen mit sehr geringem Kontrast als
Gestaltungen, die eine Einwilligung unwirksam machen können.

- § 25 Abs. 1 TDDDG
- Art. 4 Nr. 11 DSGVO
- EDSA Cookie-Banner-Taskforce, 17.01.2023

## Wie beheben

Der Ablehnen-Steuerung dieselbe Form, Größe und denselben Kontrast wie dem Zustimmen-Button geben,
etwa zwei gleich gestaltete Buttons nebeneinander.

## Grenzen

- Die Schwellen sind die von privalint, nicht die der Aufsichtsbehörden. Deshalb meldet die Regel
  nur als `info`.
- Farbe, Position und Wortlaut zählen auch, werden aber nicht verglichen.
- Text über einem Bild oder Verlauf bekommt keinen Kontrastwert.
