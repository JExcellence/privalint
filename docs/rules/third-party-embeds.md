# third-party-embeds

Warns about embedded content that contacts its provider before the visitor agreed to it.

## What it checks

Requests made while the page loads, before any consent, are matched against a list of embed
providers in [`src/data/third-parties.ts`](../../src/data/third-parties.ts):

YouTube (including `youtube-nocookie.com`), Vimeo, Google Maps, Google reCAPTCHA, Gravatar,
X (Twitter) embeds, Instagram embeds, Facebook plugins, Spotify embeds, Disqus, hCaptcha,
Cloudflare Turnstile, OpenStreetMap tiles, TikTok embeds and Calendly.

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

- Art. 6(1) GDPR
- § 25 Abs. 1 TDDDG, where the embed stores or reads data on the device

## How to fix

- Use a click-to-load placeholder: show a preview image and a short notice, and load the embed
  only after a click. Many consent managers have this built in.
- For maps, a static image linking to the map is often enough.
- For captchas, consider a self-hosted or privacy-friendly alternative, or load it only on the form
  page.
