# legal-notice-content

[Deutsch](legal-notice-content.de.md)

Checks that the legal notice linked from the start page gives a postal address, an e-mail address
and, where the legal form has one, a register entry.

## What it checks

[`impressum-link`](impressum-link.md) only checks that a link exists. When the start page links a
legal notice ("Impressum", "Imprint", "Legal notice", "Impresszum", …) on the same site, privalint
loads that page once more after the start page, without counting it as a crawled page, and reads
its visible text. The findings are reported on the start page, with the legal notice URL as
evidence.

When the start page has no legal notice link at all, privalint reads a page behind a vague legal
link ("Rechtliche Hinweise", "Rechtliches", "Jogi tudnivalók", "Legal") instead, or else the
privacy policy, since some sites put the provider details there. Everything found on such a page
is reported as `info`, because the page may not be meant as a legal notice. The privacy policy is
loaded only once, also when the privacy policy rules need it.

| Detail                                 | How it is found                                                                                                                                                | Missing                                                                                                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Postal address                         | a postcode and place, with a street and house number on that line or the line above                                                                            | `warning`                                                                                                                                                                                         |
| E-mail                                 | a `mailto:` link or an address in the text, also written as `(at)` / `[at]`                                                                                    | `warning`                                                                                                                                                                                         |
| Register entry                         | Handelsregister, HRB/HRA, Firmenbuch/FN, Cégjegyzék/Cg., CHE number, RCS, SIREN/SIRET, Registro Imprese/REA, Registro Mercantil, KvK, KRS, "company number", … | `info`, only when a registered legal form (GmbH, UG, AG, e.K., e.V., Kft., Zrt., Bt., Ltd., PLC, LLP, SARL, SAS, SASU, EURL, SNC, S.r.l., S.p.A., S.L., S.A., B.V., N.V., sp. z o.o., …) is named |
| Tax number (Hungary)                   | "adószám" or a number like `12345678-2-42`                                                                                                                     | `info`, only with `--region hu` and a registered legal form                                                                                                                                       |
| Media disclosure (Austria)             | "Offenlegung", "§ 25 MedienG" or "Mediengesetz"                                                                                                                | `info`, only with `--region at`                                                                                                                                                                   |
| Host and publication director (France) | "hébergeur", "hébergé par", "directeur de la publication"                                                                                                      | `info`, only with `--region fr`                                                                                                                                                                   |
| VAT number (Italy)                     | "partita IVA", "P.IVA", `IT` and 11 digits, or "VAT"                                                                                                           | `info`, only with `--region it` and a registered legal form                                                                                                                                       |
| Tax number (Spain)                     | "NIF", "CIF" or a number like `B12345678`                                                                                                                      | `info`, only with `--region es` and a registered legal form                                                                                                                                       |
| KRS, NIP and share capital (Poland)    | "KRS", "NIP", "kapitał zakładowy"                                                                                                                              | `info`, only with `--region pl` and a sp. z o.o. or S.A.                                                                                                                                          |

Postcodes with five digits (Germany) or four (Austria, Switzerland, Hungary), optionally with a
country prefix such as `A-` or `H-`, count in every region, as does the Hungarian order
"Budapest, 1061": a site in one country may be run from another.

## Why

The legal notice must make the provider reachable: by name, at an address that can receive mail,
and quickly by e-mail. A contact form alone is not enough. Registered companies must name the
register and number.

- § 5 Abs. 1 Nr. 1, 2 und 4 DDG (Germany)
- § 5 Abs. 1 ECG, § 14 UGB, § 25 MedienG (Austria)
- Art. 3 Abs. 1 lit. s UWG (Switzerland, for e-commerce)
- Ekertv. 4. § (Hungary, including the tax number)
- Art. 5(1) Directive 2000/31/EC (e-commerce)

## How to fix

Give the full name of the provider, a postal address (no P.O. box) and an e-mail address as text on
the legal notice page. For a company, add the register, the register court or authority and the
registration number.

## Limits

- The provider's name and the managing directors aren't checked; a name can't be told apart from
  other text reliably.
- A VAT ID is only required when the provider has one, so a missing one isn't reported.
- Legal notices on another domain or behind a script that loads after the page settles are not
  read. A legal notice in a PDF on the same site is read with pdf.js; a scanned one without a text
  layer counts as not loaded.
- In Switzerland a legal notice is only required for e-commerce, so the findings drop one level
  there.
