# fingerprinting

[Deutsch](fingerprinting.de.md)

Reports third-party scripts that read browser fingerprinting signals before consent.

## What it checks

Before any page script runs, privalint wraps the browser APIs that fingerprinting reads its
signals from, and records the script that calls each one:

| Signal          | API                                                                              |
| --------------- | -------------------------------------------------------------------------------- |
| Canvas readback | `HTMLCanvasElement.toDataURL`, `toBlob`, `CanvasRenderingContext2D.getImageData` |
| WebGL renderer  | `getParameter` with `UNMASKED_VENDOR_WEBGL` or `UNMASKED_RENDERER_WEBGL`         |
| Audio rendering | `OfflineAudioContext.startRendering`                                             |

Each third-party script that calls one of them before consent is a `warning`, with the script URL
and the signals as evidence. Drawing on a canvas without reading it back, as charts do, records
nothing. Scripts from the site itself are not reported. reCAPTCHA, hCaptcha and Cloudflare
Turnstile read such signals to tell people from bots; they are noted as `info`.

The Fingerprint (FingerprintJS Pro) agent is also on the tracker list, so
[`pre-consent-trackers`](pre-consent-trackers.md) reports it by host: `fpjscdn.net`, `fpnpmcdn.net`
and `api.fpjs.io`, from the vendor's
[CSP guide](https://docs.fingerprint.com/docs/js-agent-csp).

## Why

Reading information from the visitor's device needs consent just like storing a cookie, whatever
technique is used (EDPB Guidelines 2/2023 on the technical scope of Art. 5(3) ePrivacy Directive).
Fingerprinting sets no cookie, so cookie-based checks miss it.

- § 25 Abs. 1 TDDDG (Germany)
- § 165 Abs. 3 TKG 2021 (Austria)
- Art. 45c FMG (Switzerland)
- Eht. 155. § (4) (Hungary)

## How to fix

Load the script only after consent, like other trackers, or remove it. For a security widget, load
it only on the form it protects.

## Limits

- The calling script is taken from the stack. Code that runs from `eval` or a blob may show the page
  URL instead and is then treated as the site's own.
- Other signals (fonts, screen, plugins, battery) are not recorded.
