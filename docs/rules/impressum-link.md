# impressum-link

[Deutsch](impressum-link.de.md)

Warns when a page has no link to an Impressum (legal notice).

## What it checks

Every link on the page is matched by its text, `aria-label`, `title` and URL against common names
for a legal notice: Impressum, Imprint, Legal notice, Site notice, Anbieterkennzeichnung,
Mentions légales, Aviso legal, Note legali, Colofon and Informacje prawne.

The rule runs on every crawled page, because the notice has to be reachable from all of them.

| Situation                                      | Severity |
| ---------------------------------------------- | -------- |
| A link matching one of the names above         | passes   |
| No such link, but a "Kontakt" / "Contact" link | info     |
| Neither                                        | warning  |

privalint does not follow the contact link, so it cannot tell whether the Impressum is linked
from there.

## Why

Providers of commercial digital services in Germany must keep certain information easy to
recognise, directly reachable and permanently available. In practice that means a link, usually
in the footer, on every page. The BGH accepted a notice reached in two clicks, via links labelled
"Kontakt" and then "Impressum", which is why a contact link on its own is only reported as info.

- § 5 DDG (formerly § 5 TMG)
- BGH, 20.07.2006, Az. I ZR 228/03

## When to disable

Purely private sites and sites that don't fall under German law may not need one. Turn the rule
off with `--disable impressum-link`, or `disable: impressum-link` in the Action.

## How to fix

Add a link labelled "Impressum" to a part of your layout that appears on every page.
