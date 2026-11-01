# accessibility-statement

[Deutsch](accessibility-statement.de.md)

Notes when a site looks like an online shop and its start page has no link to accessibility
information.

## What it checks

Shops are recognised the same way as for [`withdrawal-button`](withdrawal-button.md): a cart or
checkout link, or the scripts of a shop system. On such a start page privalint looks for a link
whose text or path mentions accessibility ("Barrierefreiheit", "Barrierefreiheitserklärung",
"Accessibility", "Akadálymentesség", …).

| Situation                         | Severity |
| --------------------------------- | -------- |
| Shop, a link about accessibility  | passes   |
| Shop, no such link                | info     |
| Not a shop, or not the start page | nothing  |

It is only info: the law lets shops put the information in their terms and conditions, which
privalint doesn't read, and micro-enterprises are exempt.

## Why

Since 28 June 2025, the European Accessibility Act applies to e-commerce services for consumers.
Providers must publish how their service meets the accessibility requirements, in the terms and
conditions or another clearly noticeable way, and keep it available while they offer the service.
Germany implements it in the Barrierefreiheitsstärkungsgesetz (BFSG), Austria in the
Barrierefreiheitsgesetz (BaFG). Micro-enterprises that provide services are exempt
(§ 3 Abs. 3 BFSG).

- § 14 BFSG
- Anlage 3 BFSG
- Art. 13 and Annex V Directive (EU) 2019/882

## How to fix

- Publish the information: what the service is, how it meets the accessibility requirements, and
  the competent market surveillance authority.
- Link it in the footer as "Barrierefreiheitserklärung" / "Accessibility statement", even if it is
  also part of your terms and conditions.
