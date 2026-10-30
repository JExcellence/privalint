# third-party-embeds

[Deutsch](third-party-embeds.de.md)

Warns about embedded content that contacts its provider before the visitor agreed to it.

## What it checks

Requests made while the page loads, before any consent, are matched against a list of embed
providers in [`src/data/third-parties.ts`](../../src/data/third-parties.ts):

YouTube (including `youtube-nocookie.com`), Vimeo, Google Maps, Google reCAPTCHA, Gravatar,
X (Twitter) embeds, Instagram embeds, Facebook plugins, Spotify embeds, Disqus, hCaptcha,
Cloudflare Turnstile, OpenStreetMap tiles, TikTok embeds, Calendly, and the chat and review widgets
Intercom, Tawk.to, Zendesk Web Widget, Trustpilot and Typeform.

New provider patterns are deliberately bounded: Turnstile matches `challenges.cloudflare.com/turnstile/`,
OpenStreetMap matches `tile.openstreetmap.org` and subdomains, and TikTok matches `/embed`,
`/embed.js` and `/player/` on `tiktok.com`. Unrelated pages on shared provider domains do not match.
Failed/skipped/security-blocked requests are not treated as successful provider loads.

Each provider is reported once per page, as a warning.

## Why

An embedded player, map or captcha is loaded from the provider's servers, which receive the
visitor's IP address and usually set cookies or read device information. For most embeds there is
no legitimate interest that outweighs this before the visitor has chosen to view the content.
`youtube-nocookie.com` delays cookies, but still contacts Google as soon as the page loads.

reCAPTCHA is a special case: some argue it is necessary to protect forms. Even then it should only
load on pages with a form, not site-wide.

The same need for a contextual assessment applies to hCaptcha and Turnstile. A network contact
is an observation, not proof that consent is required in every deployment. Review purpose,
necessity and applicable law rather than treating a tool warning as a legal decision.

Provider integration references:

- [hCaptcha developer guide](https://docs.hcaptcha.com/)
- [Cloudflare Turnstile rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
- [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
- [TikTok embedded videos](https://developers.tiktok.com/doc/embed-videos/)
- [Calendly embed options](https://help.calendly.com/hc/en-us/articles/223147027-Embed-options-overview)

Chat and review widgets (hosts checked 2026-10-30). Only documented widget and Messenger service
hosts match; marketing pages and Inbox/dashboard hosts do not. The CSP guide's generic YouTube,
Vimeo and Wistia entries are integrations, so they stay under their own providers.

| Widget                                | Hosts                                                                                                                                                                                                                                                                                                                                                            | Source                                                                                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intercom Messenger (scripts)          | `app.intercom.io`, `widget.intercom.io`, `js.intercomcdn.com`                                                                                                                                                                                                                                                                                                    | [Intercom CSP guide](https://www.intercom.com/help/en/articles/3894-using-intercom-with-content-security-policy)                                                    |
| Intercom Messenger (API/realtime)     | `via.intercom.io`, `api.intercom.io`, `api.au.intercom.io`, `api.eu.intercom.io`, `api-iam.intercom.io`, `api-iam.eu.intercom.io`, `api-iam.au.intercom.io`, `api-ping.intercom.io`, `*.intercom-messenger.com`, `nexus-websocket-a.intercom.io`, `nexus-websocket-b.intercom.io`, `nexus-europe-websocket.intercom.io`, `nexus-australia-websocket.intercom.io` | [Intercom CSP guide](https://www.intercom.com/help/en/articles/3894-using-intercom-with-content-security-policy)                                                    |
| Intercom Messenger (uploads)          | `uploads.intercomcdn.com`, `uploads.intercomcdn.eu`, `uploads.au.intercomcdn.com`, `uploads.eu.intercomcdn.com`, `uploads.intercomusercontent.com`                                                                                                                                                                                                               | [Intercom CSP guide](https://www.intercom.com/help/en/articles/3894-using-intercom-with-content-security-policy)                                                    |
| Intercom Messenger (forms/frames)     | `intercom-sheets.com`, `www.intercom-reporting.com`, `intercom.help`, `fonts.intercomcdn.com`                                                                                                                                                                                                                                                                    | [Intercom CSP guide](https://www.intercom.com/help/en/articles/3894-using-intercom-with-content-security-policy)                                                    |
| Intercom Messenger (media)            | `downloads.intercomcdn.com`, `downloads.intercomcdn.eu`, `downloads.au.intercomcdn.com`, `static.intercomassets.com`, `gifs.intercomcdn.com`, `video-messages.intercomcdn.com`                                                                                                                                                                                   | [Intercom CSP guide](https://www.intercom.com/help/en/articles/3894-using-intercom-with-content-security-policy)                                                    |
| Intercom Messenger (apps/attachments) | `messenger-apps.intercom.io`, `messenger-apps.eu.intercom.io`, `messenger-apps.au.intercom.io`, `*.intercom-attachments-1.com`, `*.intercom-attachments.eu`, `*.au.intercom-attachments.com`, `*.intercom-attachments-2.com` through `*.intercom-attachments-9.com`, `static.intercomassets.eu`, `static.au.intercomassets.com`                                  | [Intercom CSP guide](https://www.intercom.com/help/en/articles/3894-using-intercom-with-content-security-policy)                                                    |
| Tawk.to                               | `embed.tawk.to`                                                                                                                                                                                                                                                                                                                                                  | Loaded on tawk.to                                                                                                                                                   |
| Zendesk Web Widget                    | `static.zdassets.com/ekr/`, `ekr.zdassets.com`, `zopim.com`                                                                                                                                                                                                                                                                                                      | [Zendesk CSP guide](https://developer.zendesk.com/documentation/zendesk-web-widget-sdks/sdks/web/csp/); help centre themes on `static.zdassets.com/hc/` don't count |
| Trustpilot                            | `widget.trustpilot.com`                                                                                                                                                                                                                                                                                                                                          | Bootstrap script in Trustpilot's WordPress plugin (`trustpilot-reviews` 3.16.0)                                                                                     |
| Typeform                              | `embed.typeform.com`, `form.typeform.com`                                                                                                                                                                                                                                                                                                                        | [`@typeform/embed` README](https://www.npmjs.com/package/@typeform/embed)                                                                                           |

Intercom lists regional CDN variants for workspaces hosted in different regions. The rule includes all
of them because a scan cannot infer the workspace region. Its Inbox firewall hosts
(`app.intercom.com`, `app.eu.intercom.com`, `app.au.intercom.com`) are not Messenger endpoints.

Legal basis:

- Art. 6(1) GDPR
- § 25 Abs. 1 TDDDG, where the embed stores or reads data on the device

## How to fix

- Use a click-to-load placeholder: show a preview image and a short notice, and load the embed
  only after a click. Many consent managers have this built in.
- For maps, a static image linking to the map is often enough.
- For captchas, consider a self-hosted or privacy-friendly alternative, or load it only on the form
  page.
