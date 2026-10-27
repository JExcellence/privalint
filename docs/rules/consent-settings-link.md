# consent-settings-link

Reports a site where the visitor has no visible way back into the cookie settings after rejecting.

## What it checks

On the start page privalint clicks "reject" on the consent banner and reloads the page (the same
run as [`trackers-after-reject`](trackers-after-reject.md)). With the banner gone, it looks in
every frame for a visible control that reopens the settings:

- the reopen widgets and calls of known consent managers, e.g. a link to `Cookiebot.renew()` or
  `UC_UI.showSecondLayer()`, OneTrust's `ot-sdk-show-settings`, Complianz's "Manage consent" tab,
  the CookieYes revisit button, iubenda's preferences link, the Osano widget;
- any link or button whose text, `aria-label` or `title` reads like "Cookie-Einstellungen",
  "Datenschutz-Einstellungen", "Einwilligung widerrufen", "Cookie settings" or "Manage cookies".

| Situation                                                | Severity       |
| -------------------------------------------------------- | -------------- |
| Reject tested, no such control visible                   | warning        |
| A control was found                                      | not reported   |
| No banner found, no reject button, or the click failed   | not evaluable  |

## Why

Withdrawing consent must be as easy as giving it. A banner that disappears for good after the
first click leaves visitors who accepted with no simple way to change their mind.

- Art. 7(3) GDPR
- § 25 Abs. 1 TDDDG

In Switzerland, where cookies follow an opt-out model (Art. 45c FMG), the finding is reported as
info.

## Limits

- Only the start page is checked. A settings link that exists only on the privacy policy page is
  not found, even though some supervisory authorities accept it there.
- The label list covers German, English and French wording. A link labelled only "Einstellungen"
  is found when it calls a known consent manager, not by its text.
- privalint does not click the control, so it can't tell whether it really opens the settings.

## How to fix

Add a "Cookie-Einstellungen" / "Cookie settings" link to the footer of every page, or turn on the
floating button of your consent manager. Most document a call for the link, for example:

| Consent manager | Reopen call                                   |
| --------------- | --------------------------------------------- |
| Cookiebot       | `javascript:Cookiebot.renew()`                |
| Usercentrics    | `UC_UI.showSecondLayer()`                     |
| OneTrust        | any element with class `ot-sdk-show-settings` |
| Didomi          | `Didomi.preferences.show()`                   |
| Klaro           | `klaro.show()`                                |
