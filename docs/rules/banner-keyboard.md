# banner-keyboard

[Deutsch](banner-keyboard.de.md)

Warns when the reject control of the consent banner cannot be reached with the keyboard.

## What it checks

Before it clicks reject, privalint presses Tab up to 60 times, starting where the page put focus
when it loaded, and records after how many presses the reject and the accept control had focus.
Focus on an element inside the control, or on a button or link around it, counts. Focus is
followed into iframes and open shadow roots.

When the reject control never gets focus, that is a `warning`, with the element, its role and
tabindex, and the press that focused the accept control as evidence. Typical causes are a
`<div>` or `<span>` with a click handler, a link without `href`, or `tabindex="-1"`.

The check runs on the start page (and the first page of each other host) whenever the banner has a
reject control. It adds at most 60 key presses to the consent check.

## Why

Consent must be freely given, and refusing must be as easy as accepting (Art. 4(11) and 7(3)
GDPR). A reject control that only works with a mouse or touch leaves keyboard and screen reader
users with "accept" as the only choice they can make. Accessibility law asks for keyboard operation
of every function as well (EN 301 549 9.2.1.1, WCAG 2.1 success criterion 2.1.1).

- Art. 4 Nr. 11, Art. 7 Abs. 3 DSGVO; BFSG (Germany)
- Art. 4 Nr. 11, Art. 7 Abs. 3 DSGVO; BaFG (Austria)
- Art. 6 Abs. 6 DSG (Switzerland, lower severity)
- GDPR 4. cikk 11. pont, 7. cikk (3) bekezdés (Hungary)
- Annex I Directive (EU) 2019/882

## How to fix

Use a `<button>` for the reject control, like the accept button. If it has to be another element,
give it `tabindex="0"` and `role="button"` and handle Enter and Space. Keep it in the banner's tab
order, and do not trap focus in a part of the banner without it.

## Limits

- Only the Tab key is tested, not arrow keys inside a widget or a "skip to banner" shortcut.
- A banner that moves focus away while Tab is pressed (for example by reopening) can be
  misjudged.
- Whether the control works with Enter or Space after it got focus is not tested.
