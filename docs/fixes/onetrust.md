# Fixing findings in OneTrust

[Deutsch](onetrust.de.md)

How to fix privalint findings in the OneTrust Cookie Consent banner. Each step names the setting and
links the OneTrust page it comes from. OneTrust changes its interface from time to time; when a
menu looks different, the linked page has the current path. Pages checked on 2026-11-06.

## `pre-consent-trackers`

A tracker loaded before the visitor chose. OneTrust blocks a script only if it knows its category.

- **Block the script by hand:** change the tag to `<script type="text/plain" class="optanon-category-C0002">`,
  with the category ID of the tracker (C0002 is performance in the default set). For an iframe,
  rename `src` to `data-src` and add the same class.
  [Client-side cookie management](https://docs.onetrust.com/en/consent--preferences/cookie-consent/managing-cookie-scripts-cookie-blocking-and-technical-implementation/client-side-cookie-management)
- **Or use auto-blocking:** Cookie Consent > Websites > your site > Auto-Block tab, switch on
  "Auto-Blocking". The OneTrust script then has to be the first item in `<head>`.
  [Auto-blocking](https://docs.onetrust.com/en/consent--preferences/cookie-consent/managing-cookie-scripts-cookie-blocking-and-technical-implementation/onetrust-cookie-auto-blocking-enhanced-interface)
- **Check what auto-blocking leaves out:** it does not block uncategorized cookies, Strictly
  Necessary cookies, or categorized cookies without a source URL. On sites that load trackers
  through a tag manager, OneTrust recommends blocking in the tag manager instead.
  [Auto-blocking FAQ](https://docs.onetrust.com/en/consent--preferences/cookie-consent/managing-cookie-scripts-cookie-blocking-and-technical-implementation/auto-blocking-faq)
- **Categorize the cookie:** in Categorizations, Cookies tab, assign each cookie of the tracker to
  its category. Uncategorized cookies are not blocked.
  [Things to know](https://docs.onetrust.com/en/consent--preferences/cookie-consent/things-to-know-and-best-practices/cookie-consent-things-to-know-and-best-practices)

## `trackers-after-reject`

A tracker still loaded after "Reject All". Usually the tracker is not blocked by category; the
steps under [`pre-consent-trackers`](#pre-consent-trackers) apply. Scripts blocked by hand stay
`text/plain` as long as consent is withheld or withdrawn, and a change of choice applies after the
next page load.
[Client-side cookie management](https://docs.onetrust.com/en/consent--preferences/cookie-consent/managing-cookie-scripts-cookie-blocking-and-technical-implementation/client-side-cookie-management)

## `trackers-after-settings`

A tracker still loaded after every category was switched off and saved in the preference center.
Its script or cookie is in no category, or in one that stays on: categorize it and block it as
under [`pre-consent-trackers`](#pre-consent-trackers).

## `trackers-after-close`

A tracker loaded after the banner was closed with its close button.

- The close button (Templates > your template > Banner tab > Content > Button Set > "Show close
  button", "Show Close Button (X)") closes the banner without accepting or rejecting; OneTrust says
  it cannot be set to act as "Accept all". What applies then is the default of the consent model,
  so use "Opt-in" as under [`consent-preselected`](#consent-preselected).
  [Customizing the banner template](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/customizing-the-banner-template)
- In the geolocation rule, check "Behaviors - Close Banner": it can close the banner on a click
  elsewhere, on scrolling or on the next page. None of these is a choice.
  [Configuring geolocation rules](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/configuring-geolocation-rules)

## `consent-preselected`

Optional categories were switched on when the preference center opened. Set the consent model of
the geolocation rule (Setup > Geolocation Rules > rule group > rule) to "Opt-in": every category
except Strictly Necessary starts inactive. "Custom" sets the default per category; "Opt-out",
"Implied Consent" and "Notice Only" start categories as active.
[Consent models](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/cookie-consent-models),
[Configuring geolocation rules](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/configuring-geolocation-rules)

## `reject-option`

The banner has no reject button on its first layer. Templates > your template > Banner tab >
Content > Button Set: switch on "Show reject all button" and set "Reject all button text".
[Customizing the banner template](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/customizing-the-banner-template)

## `reject-less-prominent`

The reject button is smaller, plainer or paler than the accept button. In the same Button Set,
"Accept & Reject Button Color" styles both buttons alike, and "Button layout" sets their order.
Keep both as buttons of the same kind; the OneTrust page does not cover prominence itself.
[Customizing the banner template](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/customizing-the-banner-template)

## `consent-settings-link`

No visible way to reopen the settings after rejecting.

- Preference Center tab > Content > Button Set: "Enable persistent Cookie Settings hover button"
  shows a floating icon.
  [Customizing the preference center template](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/customizing-the-preference-center-template)
- Or put your own link or button in the footer with the class `ot-sdk-show-settings`, or call
  `OneTrust.ToggleInfoDisplay()`.
  [Single-page applications](https://developer.onetrust.com/onetrust/docs/single-page-applications),
  [JavaScript API](https://developer.onetrust.com/onetrust/docs/javascript-api)

## `banner-legal-links`

A blocking banner links neither the privacy policy nor the legal notice. Banner tab > Content:
switch on "Show Cookie Policy Link" with the URL of your privacy or cookie policy, and "Show
Imprint Link" with "Imprint Link URL".
[Customizing the banner template](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/customizing-the-banner-template)

## `banner-language`

The banner is in another language than the page. When publishing the script, switch on "Enable
Language Detection on Scripts" and choose "Determine the language from HTML page"; the script tag
then has `data-document-language="true"`, and each language of the template has to match the
page's `lang`. Languages are enabled under Template Details > "Manage Languages".
`OneTrust.changeLanguage("de")` switches by code.
[Publishing and implementing scripts](https://docs.onetrust.com/en/privacy-professional/managing-consent-and-privacy-notices/publishing-and-implementing-cookie-consent-scripts),
[JavaScript API](https://developer.onetrust.com/onetrust/docs/javascript-api)

## `gpc-signal`

The site does not react to Global Privacy Control. In Cookie Consent > Geolocation Rules > rule
group > rule > Edit > Cookie categories, tick "Global Privacy Control" for each category it should
switch off, save and publish. Those categories then start disabled for visitors who send the
signal; their own choice still wins.
[Global Privacy Control](https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/leveraging-the-global-privacy-control-signal)
