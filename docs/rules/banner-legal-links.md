# banner-legal-links

[Deutsch](banner-legal-links.de.md)

Warns when a consent banner blocks the page and doesn't link the privacy policy or the Impressum
itself.

## What it checks

When privalint finds a banner on the start page, it looks at the layer around the accept button:

- **Blocking** means a modal dialog (`aria-modal="true"`), an overlay over at least half of the
  viewport, or a page that can't scroll while the banner is open. Then the footer is out of reach.
- Inside that layer it looks for links matching the same names as
  [`privacy-policy-link`](privacy-policy-link.md) and [`impressum-link`](impressum-link.md).

| Situation                                        | Severity |
| ------------------------------------------------ | -------- |
| Blocking banner that links both pages            | passes   |
| Blocking banner without one or both of the links | warning  |
| Small banner (a bar) that leaves the page usable | nothing  |
| `--region ch`                                    | info     |

## Why

A visitor has to be able to read what they agree to before deciding (Art. 12(1) and 13 GDPR), and
the Impressum has to be directly reachable at all times (§ 5 DDG). A banner that covers the whole
page and links neither leaves no way to do either.

- Art. 12 Abs. 1 DSGVO
- Art. 13 DSGVO
- § 5 DDG

Whether a blocking banner makes footer links "not directly reachable" in the sense of § 5 DDG has
not been settled by a court decision known to us; that is why this is a warning, not an error.

## How to fix

- Put "Datenschutzerklärung" and "Impressum" links into the banner text.
- Many consent managers have a setting for these links (Cookiebot, Usercentrics, Borlabs, …).
