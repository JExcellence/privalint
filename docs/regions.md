# Region profiles: France, Italy, Spain, the Netherlands, Poland and the United Kingdom

`--region fr`, `it`, `es`, `nl`, `pl` and `uk` choose which law privalint cites and how it rates
some findings. They do not decide which law applies to a website, and no finding is a legal
determination. The
citations were researched on 2026-11-17 against the official sources below. Have them reviewed by a
lawyer in that country before you rely on them; corrections are welcome as issues.

## France (`fr`)

| Topic                                      | Citation                                                                                           | Source                                                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Cookies and trackers                       | Art. 82 loi n° 78-17 du 6 janvier 1978                                                             | [Légifrance](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000037813978)                                                |
| CNIL guidelines                            | CNIL, délibération n° 2020-091 du 17 septembre 2020                                                | [cnil.fr](https://www.cnil.fr/sites/cnil/files/atoms/files/lignes_directrices_de_la_cnil_sur_les_cookies_et_autres_traceurs.pdf) |
| CNIL recommendation                        | CNIL, recommandation n° 2020-092 du 17 septembre 2020, consolidated 16.01.2026                     | [cnil.fr](https://www.cnil.fr/sites/default/files/2026-01/recommandation_cookies_consolidee.pdf)                                 |
| Refusing as easily as accepting            | Recommandation n° 2020-092, § 2.3; CNIL, délibération SAN-2021-023 du 31 décembre 2021             | [Légifrance](https://www.legifrance.gouv.fr/cnil/id/CNILTEXT000044840062)                                                        |
| Legal notice (mentions légales)            | Art. 1-1, I loi n° 2004-575 (LCEN), in force since 23.05.2024 (formerly art. 6, III); Art. 19 LCEN | [Légifrance](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000049568614)                                                |
| Marketing e-mail                           | Art. L. 34-5 CPCE                                                                                  | [Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042155961)                                               |
| Withdrawal button                          | Art. L. 221-21 and D. 221-5 C. consom. (ordonnance n° 2026-2, décret n° 2026-3), since 19.06.2026  | [Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053303365)                                               |
| Accessibility (European Accessibility Act) | Art. L. 412-13 and D. 412-57 C. consom.                                                            | [Légifrance](https://www.legifrance.gouv.fr/codes/id/LEGISCTA000047284903)                                                       |
| Audience measurement exemption             | Délibération n° 2020-091, §§ 49 to 51; recommandation n° 2020-092, § 5                             | [cnil.fr](https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience)                                          |

What changes with `fr`:

- **Analytics before consent or after closing the banner** is a warning instead of an error. The
  CNIL exempts audience measurement from consent when it serves only the publisher, produces
  anonymous statistics, is not combined with other data and does not follow visitors across
  sites. privalint cannot see that configuration, so the fix lists the conditions. Trackers after
  "reject" and a Google Consent Mode "granted" state before any choice stay errors.
- **`legal-notice-content`** also notes, as info, a legal notice that names no host (hébergeur) or
  no publication director (directeur de la publication), which Art. 1-1, I LCEN asks for.
- **`withdrawal-button`** recognises "renoncer au contrat ici", the label Art. D. 221-5 C. consom.
  prescribes.
- The CNIL's 13 months for cookie lifetimes apply to consent-exempt audience measurement
  (recommandation, § 5); `tracking-cookie-lifetime` uses them as a benchmark.

Légifrance blocks automated reading, so the Légifrance citations were checked by a research pass and
could not be re-read for this page.

## Italy (`it`)

| Topic | Citation | Source |
| --- | --- | --- |
| Cookies and trackers | Art. 122 D.lgs. 196/2003 (Codice privacy) | [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-30;196~art122) |
| Garante guidelines | Garante privacy, Linee guida cookie e altri strumenti di tracciamento, 10.06.2021 | [garanteprivacy.it](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876) |
| Legal notice | Art. 7 D.lgs. 70/2003; Art. 2250 c.c. for companies | [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-04-09;70~art7) |
| VAT number on the site | Art. 35 DPR 633/1972 | [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1972-10-26;633~art35) |
| Marketing e-mail | Art. 130 Codice privacy | [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-30;196~art130) |
| Withdrawal button | Art. 54-bis D.lgs. 206/2005 (Codice del consumo), for contracts from 19.06.2026 | [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-09-06;206~art54bis) |
| Accessibility (European Accessibility Act) | Art. 12 and Annex IV D.lgs. 82/2022 | [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2022-05-27;82~art12) |

What changes with `it`:

- **Analytics before consent or after closing the banner** is a warning instead of an error. The
  Garante treats analytics cookies like technical cookies, which need no consent, when they
  produce aggregate statistics for the one site, a third-party tool masks at least part of the IP
  address, and the data is neither combined with other data nor passed on. privalint cannot see
  that configuration, so the fix lists the conditions.
- **`reject-option`**: the Garante accepts an "X" that closes the banner and keeps the defaults as
  the way to refuse. When `--check-close` found and used such an "X", a banner without a reject
  button is not reported; whether trackers stay off after closing is up to
  `trackers-after-close`. Without the close check, the fix points to it.
- **`impressum-link` drops one level**: Italian law asks for the provider's details to be easily
  and directly accessible, not for a page with a fixed name.
- **`legal-notice-content`** notes, as info, a company legal form (S.r.l., S.p.A. and others)
  without a partita IVA, and reads the Registro delle Imprese and REA as register entries.

## Spain (`es`)

| Topic | Citation | Source |
| --- | --- | --- |
| Cookies and trackers | Art. 22.2 Ley 34/2002 (LSSI) | [BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758) |
| AEPD guide | AEPD, Guía sobre el uso de las cookies, May 2024 | [aepd.es](https://www.aepd.es/guias/guia-cookies.pdf) |
| Legal notice (aviso legal) | Art. 10.1 LSSI | [BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758) |
| Privacy notice | Art. 11 Ley Orgánica 3/2018 (LOPDGDD) | [BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673) |
| Withdrawal button | Not transposed into the TRLGDCU (RDL 1/2007) as of 2026-11-17; Art. 11a Directive 2011/83/EU cited | [BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555) |
| Accessibility (European Accessibility Act) | Ley 11/2023 | [BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2023-11022) |

What changes with `es`:

- **No analytics exemption.** Art. 22.2 LSSI exempts only storage strictly necessary for the
  transmission or for a service the visitor asked for. Analytics before consent stays an error.
- **`withdrawal-button` drops one level** until Spain transposes Art. 11a of the Consumer Rights
  Directive: the directive binds the legislator, not yet the shop.
- **`legal-notice-content`** notes, as info, a company legal form (S.L., S.A. and others) without
  a NIF, and reads the Registro Mercantil as a register entry.

## The Netherlands (`nl`)

| Topic | Citation | Source |
| --- | --- | --- |
| Cookies and trackers | Art. 11.7a Telecommunicatiewet (Tw) | [wetten.overheid.nl](https://wetten.overheid.nl/BWBR0009950/2026-08-15) |
| AP rules for banners | Autoriteit Persoonsgegevens, Vuistregels heldere cookiebanners | [autoriteitpersoonsgegevens.nl](https://www.autoriteitpersoonsgegevens.nl/documenten/vuistregels-heldere-cookiebanners) |
| AP enforcement | Fine of 600,000 euros on AS Watson for Kruidvat.nl, 16.07.2024 | [autoriteitpersoonsgegevens.nl](https://www.autoriteitpersoonsgegevens.nl/actueel/boete-van-600000-euro-voor-tracking-cookies-op-kruidvatnl) |
| Legal notice | Art. 3:15d BW | [wetten.overheid.nl](https://wetten.overheid.nl/BWBR0005291/2025-07-01) |
| Withdrawal button | Art. 6:230oa BW, in force since 25.06.2026 | [wetten.overheid.nl](https://wetten.overheid.nl/BWBR0005289/2026-07-16) |
| Accessibility (European Accessibility Act) | Art. 6:230fb BW | [wetten.overheid.nl](https://wetten.overheid.nl/BWBR0005289/2026-07-16) |

What changes with `nl`:

- **Analytics before consent or after closing the banner** is a warning instead of an error.
  Art. 11.7a lid 3 sub b Tw exempts cookies that measure the quality or effectiveness of the site
  with little or no impact on privacy; the AP reads that as shortened IP addresses, no sharing for
  the vendor's own purposes and a processing agreement. privalint cannot see that configuration,
  so the fix lists the conditions.
- **`impressum-link` drops one level**: Art. 3:15d BW asks for easily, directly and permanently
  accessible details, not for a page with a fixed name. "Bedrijfsgegevens" counts as a label.
- **`withdrawal-button`** recognises "overeenkomst ontbinden" as well as "overeenkomst herroepen".
- **`legal-notice-content`** reads B.V. and N.V. as legal forms and the KvK number as a register
  entry.

## Poland (`pl`)

| Topic | Citation | Source |
| --- | --- | --- |
| Cookies and trackers | art. 399 ustawy Prawo komunikacji elektronicznej (PKE), Dz.U. 2024 poz. 1221, in force since 10.11.2024 | [ELI](https://api.sejm.gov.pl/eli/acts/DU/2024/1221/text.html) |
| Legal notice | art. 5 ustawy o świadczeniu usług drogą elektroniczną (UŚUDE), Dz.U. 2024 poz. 1513 | [ELI](https://api.sejm.gov.pl/eli/acts/DU/2024/1513/text.html) |
| Company details on the website | art. 206 § 1 and 374 § 1 Kodeks spółek handlowych (KSH), Dz.U. 2024 poz. 18 | [ELI](https://api.sejm.gov.pl/eli/acts/DU/2024/18/text.html) |
| Withdrawal button | Not transposed into the ustawa o prawach konsumenta (Dz.U. 2026 poz. 1244) as of 2026-11-17; Art. 11a Directive 2011/83/EU cited | [ELI](https://api.sejm.gov.pl/eli/acts/DU/2026/1244) |
| Accessibility (European Accessibility Act) | ustawa o zapewnianiu spełniania wymagań dostępności, Dz.U. 2024 poz. 731 | [ELI](https://api.sejm.gov.pl/eli/acts/DU/2024/731/text.html) |

What changes with `pl`:

- **No analytics exemption.** art. 399 PKE exempts only storage strictly necessary for the service
  or the transmission. Analytics before consent stays an error.
- **`impressum-link` and `withdrawal-button` drop one level**: UŚUDE asks for the details to be
  easily accessible, not for a page with a fixed name, and the withdrawal button is not yet
  transposed. "Dane firmy" counts as a label; "odstąp od umowy" counts as a withdrawal label.
- **`legal-notice-content`** notes, as info, a sp. z o.o. or S.A. that does not show its KRS
  number, NIP or share capital, which art. 206 § 1 KSH asks of a company website.

No primary UODO or UKE guidance on banners was found; the citations rely on the PKE, the RODO and
the EDPB guidelines.

The section and rule numbers cited inside the Garante guidelines, the AEPD guide (May 2024) and
the AP rules were checked against those documents on 2026-11-17. Two cite the closest section
rather than an explicit statement: the Garante grounds "no trackers after refusal" on §§ 5 and 7.1
(default settings and prior consent), and AEPD § 3.2.1 says inactivity and continued browsing are
no consent without naming the close button. The AP rules were revised on 09.11.2026 and now have
four rules; rules 2 and 3 cover what privalint cites them for. The statutes were read at the
linked sources.

## United Kingdom (`uk`)

| Topic                   | Citation                                                                                               | Source                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Cookies and trackers    | PECR reg. 6 and Sch. A1, as amended by the Data (Use and Access) Act 2025, in force since 05.02.2026   | [legislation.gov.uk](https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1)   |
| Consent definition      | UK GDPR Art. 4(1)(11): the definitions are Art. 4(1) since 05.02.2026                                  | [legislation.gov.uk](https://www.legislation.gov.uk/eur/2016/679/article/4)       |
| Legal notice            | Electronic Commerce (EC Directive) Regulations 2002, reg. 6; SI 2015/17, regs. 24 and 25 for companies | [legislation.gov.uk](https://www.legislation.gov.uk/uksi/2002/2013/regulation/6)  |
| Marketing e-mail        | PECR reg. 22                                                                                           | [legislation.gov.uk](https://www.legislation.gov.uk/uksi/2003/2426/regulation/22) |
| International transfers | UK GDPR Arts. 44A, 45A and 46; Data Protection (Adequacy) (United States of America) Regulations 2023  | [legislation.gov.uk](https://www.legislation.gov.uk/eur/2016/679/chapter/V)       |
| Cancellation            | Consumer Contracts Regulations 2013, regs. 29 and 32                                                   | [legislation.gov.uk](https://www.legislation.gov.uk/uksi/2013/3134/regulation/32) |
| Accessibility           | Equality Act 2010, ss. 20 and 29; a statement is required of public sector bodies only (SI 2018/952)   | [legislation.gov.uk](https://www.legislation.gov.uk/uksi/2018/952/regulation/8)   |

What changes with `uk`:

- **Analytics before consent or after closing the banner** is a warning instead of an error.
  PECR Sch. A1 para. 5 allows statistics collected solely to improve the site, shared only for that
  purpose, with clear information and a free way to object. privalint cannot check these
  conditions, so the fix lists them. Advertising, social media and session-replay tools before
  consent stay errors, and so do trackers after "reject": rejecting is an objection.
- **`impressum-link` and `withdrawal-button` drop one level; `accessibility-statement` stays a hint.** UK law asks
  for the provider's details to be easily accessible, not for a page called "legal notice"; there is
  no counterpart to the EU withdrawal button (the subscription rules of the Digital Markets,
  Competition and Consumers Act 2024 are not in force); and private sites owe reasonable
  adjustments, not a published statement.
- **`third-country-providers`** treats the UK and the EEA as adequate and names the UK-US data bridge,
  the International Data Transfer Agreement and the UK Addendum.
- **`fingerprinting`** cites PECR reg. 6(2)(b), which covers information the device emits; the
  statistics exemption does not (Sch. A1 para. 5(2)).

The ICO guidance on storage and access technologies is cited for "reject as easily as accept". The
ICO site blocks automated reading, so its wording was checked through search excerpts only.
