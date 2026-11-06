# Fixing findings in Cookiebot

[Deutsch](cookiebot.de.md)

How to fix privalint findings in the Cookiebot banner. Each step names the setting and links the
Cookiebot page it comes from. Cookiebot's help center describes two admin layouts: older articles
use Settings with tabs, newer ones Configuration with sections (Compliance, Design, Privacy
trigger). Both are named where the pages give them. Pages checked on 2026-11-06.

## `pre-consent-trackers`

A tracker loaded before the visitor chose. Cookiebot blocks a script only if it knows its category.

- **Automatic blocking:** add `data-blockingmode="auto"` to the `uc.js` script tag. Cookiebot has
  to be the first script on the page, without `async` or `defer`. It blocks what its scan has
  classified; `data-cookieconsent="ignore"` exempts an element.
  [How auto-blocking works](https://support.cookiebot.com/hc/en-us/articles/11438730619804-How-does-auto-blocking-work),
  [Developer reference](https://www.cookiebot.com/en/developer/)
- **Or block by hand:** give the script `type="text/plain"` and
  `data-cookieconsent="statistics"` (or `preferences`, `marketing`, or a comma list). For iframes and
  images, rename `src` to `data-cookieblock-src`.
  [Manual cookie blocking](https://support.cookiebot.com/hc/en-us/articles/4405978132242-Manual-cookie-blocking)

## `trackers-after-reject`

A tracker still loaded after "Reject all". It is not blocked, or its cookies are unclassified. In
the Cookiebot Manager, open the "Cookies" menu, choose a category for each unclassified cookie and
save; mark scripts as under [`pre-consent-trackers`](#pre-consent-trackers).
[Classifying unclassified cookies](https://support.cookiebot.com/hc/en-us/articles/26361882043676-How-do-I-classify-unclassified-cookies-in-the-Cookiebot-Manager)

## `trackers-after-settings`

A tracker still loaded after every category was switched off and saved. Classify and block it as
under [`trackers-after-reject`](#trackers-after-reject).

## `trackers-after-close`

A tracker loaded after the banner was closed with its close icon. Cookiebot has the option "Display
a close icon", off by default. Its public pages do not say what closing records. A tracker that
loads after closing is not blocked: block it as under [`pre-consent-trackers`](#pre-consent-trackers),
or switch the close icon off.
[Default banner settings](https://support.cookiebot.com/hc/en-us/articles/15654523704220-Cookiebot-CMP-default-banner-settings)

## `consent-preselected`

Optional categories were checked when the settings opened. Set "Checkboxes default mode" (newer
layout: Configuration > Compliance > "Default mode for checkboxes") to none pre-checked, the
default.
[Configuring the Swift banner](https://support.cookiebot.com/hc/en-us/articles/26407083994524-Configuration-of-the-Swift-banner-in-the-Cookiebot-Manager),
[Configuration Health Checker](https://support.cookiebot.com/hc/en-us/articles/29420607661852-Cookiebot-Configuration-Health-Checker)

## `reject-option`

The banner has no reject button on its first layer. Choose the buttons "Reject all / Selection /
Allow all" (the default for the Multilevel and Inline Multilevel types). The Health Checker rule
"Reject all button must be visible" points to Configuration > Compliance > Type.
[Configuring the Swift banner](https://support.cookiebot.com/hc/en-us/articles/26407083994524-Configuration-of-the-Swift-banner-in-the-Cookiebot-Manager),
[Configuration Health Checker](https://support.cookiebot.com/hc/en-us/articles/29420607661852-Cookiebot-Configuration-Health-Checker)

## `reject-less-prominent`

The reject button is smaller, plainer or paler than the accept button. Cookiebot's GDPR guidance
says the reject button should be on the same level as the accept button, and its Health Checker
rule "Button colors must not nudge users toward accepting" points to Configuration > Design >
Button styles.
[A GDPR-compliant banner](https://support.cookiebot.com/hc/en-us/articles/26407777992860-Using-a-GDPR-compliant-banner-Cookiebot-Manager),
[Configuration Health Checker](https://support.cookiebot.com/hc/en-us/articles/29420607661852-Cookiebot-Configuration-Health-Checker)

## `consent-settings-link`

No visible way to reopen the settings after a choice.

- Switch on the privacy trigger: Settings > "Privacy trigger" (newer layout: Privacy trigger >
  "Show privacy button"). It is not on by default for existing domain groups.
  [Privacy trigger](https://support.cookiebot.com/hc/en-us/articles/26407453035292-The-Cookiebot-CMP-Privacy-trigger-Cookiebot-Manager)
- Or link `Cookiebot.renew()` from the footer, for example
  `<a href="javascript: Cookiebot.renew()">Cookie settings</a>`. The Cookie Declaration also
  offers changing and withdrawing consent.
  [Changing or withdrawing consent](https://support.cookiebot.com/hc/en-us/articles/360003798814-Changing-or-withdrawing-consent)

## `banner-legal-links`

A blocking banner links neither the privacy policy nor the legal notice. In the Manager, Settings
> "Content" tab: select the banner text and add the links with the link icon of the toolbar, or in
> the HTML editor (`</>`).
> [Customizing the banner content](https://support.cookiebot.com/hc/en-us/articles/26380240216860-Customizing-the-content-in-the-cookie-consent-banner-via-the-Cookiebot-Manager)

## `banner-language`

The banner is in another language than the page. Add the page's languages under Settings >
Content, and set the language per page with `data-culture="de"` (a two-letter code) on the script
tag; it wins over the default and over "Auto-detect user language", which follows the browser.
[Setting the banner language](https://support.cookiebot.com/hc/en-us/articles/26365089106716-How-to-set-the-language-of-the-consent-banner-in-the-Cookiebot-Manager),
[Developer reference](https://www.cookiebot.com/en/developer/)

## `gpc-signal`

The site does not react to Global Privacy Control. Cookiebot documents GPC for its US privacy-law
setup: it then opts the visitor out when the browser sends the signal. Its pages name no setting
for GPC on GDPR banners.
[US multi-state privacy laws](https://support.cookiebot.com/hc/en-us/articles/29898398523548-Using-Cookiebot-CMP-for-MSPL-compliance-Cookiebot-Admin)
