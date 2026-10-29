# adobe-fonts

[Deutsch](adobe-fonts.de.md)

Reports fonts loaded from Adobe Fonts (formerly Typekit), and leftover connections to it.

## What it checks

| Situation                                                                                          | Severity     |
| -------------------------------------------------------------------------------------------------- | ------------ |
| A request to `use.typekit.net` or `p.typekit.net`                                                  | error        |
| No request, but a `<link>` with `preconnect`, `preload`, `prefetch` or `stylesheet` pointing there | warning      |
| `<link rel="dns-prefetch">` only                                                                   | not reported |

`use.typekit.net` serves the kit stylesheet and the font files. `p.typekit.net` is a page-view
ping that Adobe uses to count usage for font licensing. Other Adobe hosts such as `adobe.com`
are not part of this rule.

## Why

Every request sends the visitor's IP address to Adobe, and the page-view ping also carries the
hostname of the page. The reasoning of the Landgericht München I on Google Fonts (20.01.2022,
Az. 3 O 17493/20) does not name Adobe, but it rests on the same facts: an IP address goes to a
third party for a resource that does not need one. privalint applies it by analogy. There is no
ruling on Adobe Fonts that we know of.

- Art. 6(1) GDPR
- LG München I, 20.01.2022, Az. 3 O 17493/20 (by analogy)

## How to fix

Unlike Google Fonts, Adobe Fonts cannot simply be downloaded and self-hosted. Adobe's licence
for web use covers serving them through Adobe's own servers. You have three options:

- **License the font for self-hosting** directly from its foundry. Many foundries that publish
  through Adobe Fonts also sell web licences.
- **Ask Adobe Sales** whether your plan allows local hosting.
- **Switch to an open-licensed font**, for example from [Fontsource](https://fontsource.org),
  and serve it from your own domain.

Then search your templates, CSS and plugins for `use.typekit.net` and `p.typekit.net`, including
`<link rel="preconnect">` tags left behind.
