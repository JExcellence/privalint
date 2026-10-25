# google-fonts

Reports fonts loaded from Google's servers, and leftover connections to them.

## What it checks

| Situation                                                                           | Severity     |
| ----------------------------------------------------------------------------------- | ------------ |
| A request to `fonts.googleapis.com` or `fonts.gstatic.com`                          | error        |
| No request, but a `<link rel="preconnect">`, `preload` or `prefetch` pointing there | warning      |
| `<link rel="dns-prefetch">` only                                                    | not reported |

`dns-prefetch` only asks your DNS resolver for the address, so Google never sees the visitor.
`preconnect` opens a real connection, and the IP address goes with it.

## Why

Every font request sends the visitor's IP address to Google. On 20.01.2022 the Landgericht
München I (Az. 3 O 17493/20) held that this happens without a legitimate interest, because the
fonts can be self-hosted, and awarded the visitor €100 in damages. The ruling set off a wave of
warning letters to German site owners.

- Art. 6(1) GDPR
- LG München I, 20.01.2022, Az. 3 O 17493/20

## How to fix

Host the font files yourself:

- **Next.js:** `next/font/google` downloads the fonts at build time and serves them from your
  domain. No request goes to Google at runtime.
- **Vite, Astro, plain npm projects:** install the family from
  [Fontsource](https://fontsource.org), e.g. `npm i @fontsource-variable/inter`, and import it.
- **Anything else:** download the files via
  [google-webfonts-helper](https://gwfh.mranftl.com/fonts) and reference them with `@font-face`.

Then search your templates, CSS and plugins for `fonts.googleapis.com` and `fonts.gstatic.com`.
Themes and embedded widgets such as maps or reCAPTCHA often add them back.
