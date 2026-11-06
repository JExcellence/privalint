# Fixing findings in Usercentrics

[Deutsch](usercentrics.de.md)

How to fix privalint findings in the Usercentrics web CMP. Each step names the setting and links
the Usercentrics page it comes from. Some Admin Interface paths come from articles written for CMP
v2; where v3 differs and the pages say so, both are named. Pages checked on 2026-11-06.

## `pre-consent-trackers`

A tracker loaded before the visitor chose. The Usercentrics script alone blocks nothing.

- **Block by hand:** give the script `type="text/plain"` and
  `data-usercentrics="Google Analytics"`, with the service name exactly as in the Admin Interface.
  For images and iframes, replace `src` with `data-src`.
  [Manually blocking services](https://support.usercentrics.com/hc/en-us/articles/18656524460700-Manually-blocking-services-prior-consent)
- **Or use auto blocking:** load `https://web.cmp.usercentrics.eu/modules/autoblocker.js` before
  `loader.js` (Implementation > Script Tag > "Auto blocking"). `data-uc-allowed="true"` exempts an
  element. Which services it covers depends on the plan.
  [Auto blocking in detail](https://support.usercentrics.com/hc/en-us/articles/17337159049244-Auto-blocking-in-detail),
  [Enable auto blocking](https://usercentrics.com/beta-docs/enable-auto-blocking-for-your-website)
- **Or the Smart Data Protector:** load
  `https://privacy-proxy.usercentrics.eu/latest/uc-block.bundle.js` in `<head>` before other
  scripts, without `async` or `defer`, and add the service templates in the settings.
  [Smart Data Protector](https://usercentrics.com/docs/web/features/extensions/smart-data-protector/)

## `trackers-after-reject`

A tracker still loaded after "Deny All". Its service is missing from the configuration or not
blocked. Add it under Service Settings > Data Processing Services (from the scanner, the database
or as a custom service), give it exactly one category under Service Settings > Categories, and
block it as under [`pre-consent-trackers`](#pre-consent-trackers): adding a service does not block
it.
[Setting up a banner configuration](https://usercentrics.com/beta-docs/setting-up-a-banner-configuration),
[What is a Data Processing Service](https://support.usercentrics.com/hc/en-us/articles/17476246544412-What-s-a-Data-Processing-Service)

## `trackers-after-settings`

A tracker still loaded after every category was switched off and saved. Add, categorize and block
its service as under [`trackers-after-reject`](#trackers-after-reject).

## `trackers-after-close`

A tracker loaded after the banner was closed. The close option (`firstLayer.closeOption`, a link or
an icon) closes the banner "without accepting". A visitor who does not choose has an implicit
opt-out from every service that is not set to "accepted by default". So a tracker that loads after
closing is either not blocked (see [`pre-consent-trackers`](#pre-consent-trackers)) or accepted by
default (see [`consent-preselected`](#consent-preselected)).
[Available properties](https://usercentrics.com/beta-docs/available-properties),
[Implied and explicit consent](https://support.usercentrics.com/hc/en-us/articles/17286825846940-What-is-the-difference-between-implied-and-explicit-consent)

## `consent-preselected`

Optional services were switched on when the settings opened. Services set to "accepted by default"
get an implicit opt-in; set no service outside the essential category that way. The Usercentrics
pages do not name the switch, so check the settings of each service. Essential services are always
on and cannot be switched off.
[Implied and explicit consent](https://support.usercentrics.com/hc/en-us/articles/17286825846940-What-is-the-difference-between-implied-and-explicit-consent),
[Default banner settings](https://support.usercentrics.com/hc/en-us/articles/15654847514780-Usercentrics-CMP-default-banner-settings)

## `reject-option`

The banner has no deny button on its first layer. "Deny All" is there by default and can be
removed; show it again. In a configuration set by code, `firstLayer.hideButtonDeny` must not be
true.
[Default banner settings](https://support.usercentrics.com/hc/en-us/articles/15654847514780-Usercentrics-CMP-default-banner-settings),
[Available properties](https://usercentrics.com/beta-docs/available-properties)

## `reject-less-prominent`

The deny button is smaller, plainer or paler than the accept button. The two buttons have their
own colors (`customization.color.acceptBtnBackground` and `denyBtnBackground`): give them the same.
The Usercentrics pages do not cover prominence itself.
[Available properties](https://usercentrics.com/beta-docs/available-properties)

## `consent-settings-link`

No visible way to reopen the settings after a choice.

- Keep the privacy button (the fingerprint icon, bottom left by default), or replace it with a
  link.
  [Default banner settings](https://support.usercentrics.com/hc/en-us/articles/15654847514780-Usercentrics-CMP-default-banner-settings)
- CMP v2: Appearance > Layout > Privacy Trigger > "Privacy Link", with
  `<a href="#" onclick="UC_UI.showSecondLayer();">Privacy settings</a>`.
  [Setting up a Privacy Link](https://support.usercentrics.com/hc/en-us/articles/10911547924508-How-can-I-set-up-a-Privacy-Link)
- CMP v3: call `window.__ucCmp.showSecondLayer()` from your link.
  [Control functionality](https://usercentrics.com/docs/web/features/api/control-functionality/)

## `banner-legal-links`

A blocking banner links neither the privacy policy nor the legal notice. Admin Interface > Content
> First Layer > "Imprint & Privacy Links"; with "Edit & Translate", set one URL per language. In
> code, the properties are `imprintUrl` and `privacyPolicyUrl`.
> [Imprint and privacy links on the banner](https://support.usercentrics.com/hc/en-us/articles/17101692077212-Can-links-to-an-imprint-and-or-privacy-policy-be-included-on-the-banner),
> [Available properties](https://usercentrics.com/beta-docs/available-properties)

## `banner-language`

The banner is in another language than the page. Add the language to the configuration, then
either set it per page with `data-language="de"` on the CMP script tag, or leave the attribute out:
Usercentrics then follows a stored language, the page's `<html lang>`, the browser language and
finally "Default Visible Language", in that order.
[Banner language assignment](https://support.usercentrics.com/hc/en-us/articles/15886871701532-Banner-language-assignment-logic)

## `gpc-signal`

The site does not react to Global Privacy Control. For GDPR (opt-in) configurations, GPC has to be
switched on in the Admin Interface; it is off by default. The signal is then honoured before any
choice, while a stored choice and a later change through the privacy link or button win over it.
The page does not name the switch.
[Global Privacy Control](https://support.usercentrics.com/hc/en-us/articles/14641576514844-Global-Privacy-Control-GPC-Signal)
