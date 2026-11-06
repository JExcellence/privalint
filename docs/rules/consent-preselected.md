# consent-preselected

[Deutsch](consent-preselected.de.md)

Reports optional cookie categories that are already switched on when the visitor opens the banner's
settings. Opt-in: runs with the settings check (`--check-settings` or `settingsCheck: true`).

## What it checks

The settings check of [`trackers-after-settings`](trackers-after-settings.md) opens the settings
layer of the banner on the start page and switches every optional category off. Before it switches
a category off, privalint notes that the category was on. On banners that offer levels as radio
buttons, it notes the level that was selected when it is wider than the narrowest one.

Disabled switches are the necessary category and are not counted. Only switches inside the consent
layer count, so a "remember me" box elsewhere on the page is ignored.

The finding names each category by its label, as far as the page labels it, and the labels are in
`consent.settings.preselected`. If nothing was on, or the settings check could not open the layer,
there is no finding; the second case is not evaluable and says why.

## Why

Consent needs an active choice. A box ticked in advance is not one, even if the visitor could untick
it.

- Art. 4(11) GDPR
- CJEU, 01.10.2019, C-673/17 (Planet49)
- § 25 Abs. 1 TDDDG (Germany)

## How to fix

- Configure the consent manager so that every optional category starts switched off in the settings
  layer.
- Check the setting after updates of the consent manager. Some templates switch categories on by
  default.

## Limits

- privalint reads the state at the moment the settings layer opens. A category that a script switches
  on later, for example when the visitor scrolls, is not seen.
- Vendor-level switches inside collapsed sections are not opened and not counted.
- A label is read from the switch's `<label>`, `aria-label`, `aria-labelledby` or the text next to it.
  A switch without any of them is counted without a name.
