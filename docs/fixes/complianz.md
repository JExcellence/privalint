# Fixing findings in Complianz

[Deutsch](complianz.de.md)

How to fix privalint findings with the Complianz plugin for WordPress. Each step names the setting
and links the Complianz page it comes from. Some of these pages are older than Complianz 7, and
the menu is called "Cookie Banner" in some versions and "Consent Banner" in others: match the
labels of your installed version. Pages checked on 2026-11-06.

## `pre-consent-trackers`

A tracker loaded before the visitor chose. Complianz blocks what it knows: its integrations and
the scripts you register.

- **Register the script:** Complianz > Integrations (the former Script Center): "Add a Third-Party
  Script" for a script you add through Complianz, or "Block a script, iframe or plugin" with a URL
  or iframe source to block until consent. Iframes get a placeholder; for other elements, enter
  their class or ID.
  [Integrating plugins](https://complianz.io/integrating-plugins/)
- **Or mark it in the code:** `<script type="text/plain" data-category="statistics" data-service="matomo">`,
  `<iframe data-category="marketing" data-service="youtube">`. The classes of versions before 6.0
  map to these attributes: `cmplz-native` is `functional`, `cmplz-stats` is `statistics`,
  `cmplz-script` is `marketing`.
  [Developers guide](https://complianz.io/developers-guide-for-third-party-integrations/)

## `trackers-after-reject`

A tracker still loaded after "Deny". It is not blocked by Complianz, or blocked in a category that
stays on. Register it as under [`pre-consent-trackers`](#pre-consent-trackers) and set the
category it needs ("Trigger on the needed, official, category").
[Integrating plugins](https://complianz.io/integrating-plugins/)

## `trackers-after-settings`

A tracker still loaded after every category was switched off and saved. Its script has no
category, or one that stays on: set it as under [`trackers-after-reject`](#trackers-after-reject).

## `trackers-after-close`

A tracker loaded after the banner was closed with its close button. The close button is the toggle
"Close button" under Consent Banner > Appearance, and Complianz says it still works as a dismiss
button.
[Minimal bottom banner](https://complianz.io/css-lesson-19-the-minimal-bottom-banner-revisited/),
[Close button](https://complianz.io/changing-dismiss-to-close-button/)
Complianz does not document what closing records. A tracker that loads after closing is not held
back by Complianz: block it as under [`pre-consent-trackers`](#pre-consent-trackers), or switch the
close button off.

## `consent-preselected`

Optional categories were switched on when the settings opened. Complianz starts with all of them
off; the only documented way to pre-check them is the "AutoCheck" add-on, which Complianz itself
calls not compliant. Remove that add-on.
[Pre-checked categories](https://complianz.io/pre-checked-categories-why-not/)

## `reject-option`

The banner has no deny button on its first layer. Complianz can hide the deny button in the banner
settings; show it again. For a banner with just two buttons, set the categories to "Accept / Deny"
under Consent Banner > General > Categories.
[Minimal bottom banner](https://complianz.io/css-lesson-19-the-minimal-bottom-banner-revisited/),
[Customizing the TCF banner](https://complianz.io/help/wordpress/customization/customizing-the-tcf-banner/)

## `reject-less-prominent`

The deny button is smaller, plainer or paler than the accept button. Complianz recommends "two
equal buttons on the banner, Accept and Reject", and lists a noticeable difference in color or
size between the two primary buttons as a "don't". Give both the same style in the banner's
appearance settings.
[What to include in a GDPR cookie banner](https://complianz.io/what-to-include-in-my-gdpr-cookie-banner/),
[Customizing the TCF banner](https://complianz.io/help/wordpress/customization/customizing-the-tcf-banner/)

## `consent-settings-link`

No visible way to reopen the settings after a choice.

- Complianz > Cookie Banner > Edit > General > "Manage consent display options". By default the
  manage consent button is hidden on screens under 768 px.
  [Show the settings button on mobile](https://complianz.io/show-settings-button-on-mobile/)
- Or add your own link or button with the class `cmplz-show-banner`, for example
  `<a href="#" class="cmplz-show-banner">Cookie settings</a>`.
  [Add a link to show the cookie banner](https://complianz.io/add-a-link-to-show-the-cookie-banner/)
- On the cookie policy, the shortcode `[cmplz-manage-consent]` shows the categories to change.
  [Revoke option on the cookie policy](https://complianz.io/new-revoke-option-on-the-cookies-policies/)

## `banner-legal-links`

A blocking banner links neither the privacy statement nor the legal notice. Switch on "Legal
document links on banner" under Consent Banner > Appearance, and set the pages it links in Wizard >
General > Documents (a generated document, a page you pick, or a custom URL).
[Minimal bottom banner](https://complianz.io/css-lesson-19-the-minimal-bottom-banner-revisited/),
[Impressum on the cookie banner](https://complianz.io/editing-impressum-on-the-cookie-banner/)

## `banner-language`

The banner is in another language than the page. Translate the banner texts with your multilingual
plugin:

- WPML: WPML > Translation Dashboard > "Other texts (Strings)", filter by the domain `complianz`.
  [Translating with WPML](https://complianz.io/translate-legal-documents-to-multiple-languages-with-wpml/)
- Polylang: save the banner once so its texts are registered, then translate the group `complianz`
  in String translations.
  [Configuring for Polylang](https://complianz.io/configuring-for-polylang/)

## `gpc-signal`

The site does not react to Global Privacy Control. Complianz > Wizard > General > Security &
Consent: switch on "Respect Do Not Track and Global Privacy Control". The banner is then not shown
to visitors who send the signal, and consent is set to functional only. This is a Complianz Premium
feature.
[Browser privacy controls](https://complianz.io/browser-privacy-controls/)
