# trackers-after-settings

[Deutsch](trackers-after-settings.de.md)

Reports trackers that still load, or set new cookies, after the visitor switched off every optional
category in the banner's settings and saved. Opt-in: run with `--check-settings` or set
`settingsCheck: true` in the config.

## What it checks

[`trackers-after-reject`](trackers-after-reject.md) tests the reject button. Many sites break the
other way out: the visitor opens "Settings", turns everything off, saves, and the trackers load
anyway, for example because saving is wired to the same code as "Accept all".

With the check on, privalint loads the start page a second time in a fresh browser, so the choice
stored by the reject test doesn't hide the banner. Then it

1. opens the settings layer: by selector for Cookiebot, OneTrust, Usercentrics, Complianz, CookieYes
   and CookieConsent, otherwise by label ("Einstellungen", "Customize", "More options", …), picking
   the control closest to the banner's accept button so a footer link doesn't count,
2. switches off every checked category switch that can be switched (checkboxes and
   `role="switch"` elements; disabled ones are the necessary category and stay on),
3. clicks the save button ("Auswahl speichern", "Save", "Confirm my choices", …; never "Accept all"),
4. waits for the network to settle, reloads the page and waits again.

Every request and every cookie that is new since the save is matched against the tracker list, with
the same severities as `trackers-after-reject`.

The report says what happened in `consent.settings`: which controls were used, how many switches
were turned off, and whether the observation was complete. If the banner has no settings control or
no save button, the rule is not evaluable and says why.

## Why

Switching everything off is a refusal, just like the reject button, and it has to work just as well.

- § 25 Abs. 1 TDDDG
- Art. 6(1)(a) GDPR
- Art. 7(3) GDPR

## How to fix

- Check that saving the settings stores the categories the visitor chose and that your tags read
  those categories, not just whether any choice exists.
- Check that no tool sits outside the categories, or in a category that is on and can't be switched
  off.

## Limits

- On 2026-10-30 the settings path opened, switched and saved on cookiebot.com ("Anpassen" /
  "Auswahl erlauben"), onetrust.com ("Meine Einstellungen anpassen" / "Meine Auswahl bestätigen"),
  cookieyes.com ("Customise" / "Save My Preferences") and complianz.io ("View preferences" /
  "Save preferences"). usercentrics.com and the CookieConsent playground showed no banner to
  headless Chromium, so those two selectors are unchecked. If a selector doesn't match, the label
  fallback takes over.
- Vendor-level switches inside collapsed sections are left alone; switching off their category is
  expected to cover them.
- The check adds one more load and reload of the start page.
