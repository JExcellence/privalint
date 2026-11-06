# reject-less-prominent

[Deutsch](reject-less-prominent.de.md)

Notes, as `info`, a reject control on the first layer of the consent banner that is harder to see
than the accept button.

## What it checks

When privalint finds both an accept and a reject control on the first layer (see
[`reject-option`](reject-option.md)), it measures both in the browser, from their rendered box and
computed styles, without screenshots:

- **Form:** a control with a visible background or border counts as a button, one without as plain
  text. A reject shown as plain text next to an accept button is noted.
- **Size:** an accept button that covers more than twice the area of the reject control is noted.
- **Contrast:** the contrast of the text against the first solid background behind it. A reject
  below 3:1 is noted when the accept button reaches at least 4.5:1, the WCAG minimum for normal text.
  On a background image or gradient, contrast is not computed.

The finding lists what was noted and gives both measurements as evidence, for example
`reject "Reject all": plain text, 70×20 px, contrast 6:1`.

## Why

Refusing must be as easy as accepting. The EDPB cookie banner taskforce names a reject shown as a
text link next to an accept button, and a reject with very low contrast, as designs that can make
consent invalid.

- Art. 4(11) GDPR
- EDPB Cookie Banner Taskforce report, 17.01.2023
- EDPB Guidelines 03/2022 on deceptive design patterns

## How to fix

Give the reject control the same form, size and contrast as the accept button, for example two
buttons of the same style side by side.

## Limits

- The thresholds are privalint's own, not the regulators'. That is why the rule only notes, at
  `info`.
- Colour, position and wording also matter, but are not compared.
- Text over an image or gradient gets no contrast value.
