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

| Detail                     | How it is found                                                                          | Missing                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Postal address             | a postcode and place, with a street and house number on that line or the line above      | `warning`                                                                                               |
| E-mail                     | a `mailto:` link or an address in the text, also written as `(at)` / `[at]`              | `warning`                                                                                               |
| Register entry             | Handelsregister, HRB/HRA, Firmenbuch/FN, Cégjegyzék/Cg., CHE number, "company number", … | `info`, only when a registered legal form (GmbH, UG, AG, e.K., e.V., Kft., Zrt., Bt., Ltd., …) is named |
| Tax number (Hungary)       | "adószám" or a number like `12345678-2-42`                                               | `info`, only with `--region hu` and a registered legal form                                             |
| Media disclosure (Austria) | "Offenlegung", "§ 25 MedienG" or "Mediengesetz"                                          | `info`, only with `--region at`                                                                         |

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
- Legal notices on another domain, in a PDF or behind a script that loads after the page settles
  are not read.
- In Switzerland a legal notice is only required for e-commerce, so the findings drop one level
  there.
