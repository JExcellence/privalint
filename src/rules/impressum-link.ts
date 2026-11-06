import { say } from '../i18n.js';
import type { PageLink, Rule } from '../types.js';
import { legalLabels } from './legal-labels.js';
import { linkMatches, linksChecked, pathOf } from './links.js';

const ID = 'impressum-link';

/**
 * Link texts and URL slugs used for a legal notice across the EU.
 * Matched against the visible text and the URL path, so `/impressum`
 * behind an icon-only link is still found.
 */
export const LEGAL_NOTICE =
  /impressum|imprint|legal[\s_-]?notice|site[\s_-]?notice|anbieterkennzeichnung|mentions[\s_-]?l[eé]gales|aviso[\s_-]?legal|note[\s_-]?legali|colofon|informacje[\s_-]?prawne|impresszum/i;

/**
 * Labels for a legal page that may hold the provider information or only a disclaimer, such as
 * "Rechtliche Hinweise", "Rechtliches" or "Jogi tudnivalók" (telekom.hu). They can't be told
 * apart by the label, so they are noted, not trusted.
 */
const VAGUE_LEGAL = /rechtliche[\s_-]?hinweise|rechtliches|jogi[\s_-]?tudnival|\blegal\b/i;

const CONTACT = /kontakt|contact|kapcsolat/i;

const CONTACT_SEGMENT = /^(?:kontakt|contact|contact[\s_-]?us|kapcsolat)(?:\.\w+)?$/i;
const LANGUAGE_SEGMENT = /^[a-z]{2}(?:[-_][a-z]{2})?$/i;

/**
 * Links to the site's contact page. A contact page sits at the top of the site, or under a
 * language prefix (`/kontakt`, `/en/contact-us`); a deeper path ending in the word, such as a docs
 * page `/blocks/contact` about a contact form component, isn't one even when it is labelled
 * "Contact". Other links count by their text ("Kontakt" pointing to `/ueber-uns`).
 */
function isContactLink(link: PageLink): boolean {
  const segments = pathOf(link.href).split('/').filter(Boolean);
  const last = segments.at(-1) ?? '';
  if (!CONTACT_SEGMENT.test(last)) return CONTACT.test(link.text);
  return (
    segments.length === 1 || (segments.length === 2 && LANGUAGE_SEGMENT.test(segments[0] ?? ''))
  );
}

export const impressumLink: Rule = {
  id: ID,
  title: 'No link to an Impressum',
  description:
    'Commercial websites in Germany must provide a legal notice that is easy to recognise, ' +
    'directly reachable and always available, which in practice means a link on every page. ' +
    'Disable this rule for purely private sites or sites outside its scope.',
  references: ['§ 5 DDG', 'BGH, 20.07.2006, Az. I ZR 228/03'],
  check({ page, lang, region = 'de' }) {
    if (page.links.some(linkMatches(LEGAL_NOTICE))) {
      return [];
    }
    const { notice } = legalLabels(page.language, region);

    const legal = page.links.find(linkMatches(VAGUE_LEGAL));
    if (legal !== undefined) {
      return [
        {
          ruleId: ID,
          severity: 'info',
          message: say(lang, {
            en: `No link labelled "${notice}", but "${legal.text}" may lead to the provider information.`,
            de: `Kein Link „${notice}“, aber „${legal.text}“ führt möglicherweise zu den Anbieterangaben.`,
          }),
          pageUrl: page.finalUrl,
          evidence: [say(lang, { en: 'legal link: ', de: 'Rechts-Link: ' }) + legal.href],
          fix: say(lang, {
            en: `Check that this page holds the full provider information (name, address, e-mail, register entry). Labelling the link "${notice}" makes it easy to recognise.`,
            de: `Prüfen, ob diese Seite die vollständigen Anbieterangaben enthält (Name, Anschrift, E-Mail, Registereintrag). Die Beschriftung „${notice}“ macht den Link leicht erkennbar.`,
          }),
        },
      ];
    }

    const contact = page.links.find(isContactLink);
    if (contact !== undefined) {
      return [
        {
          ruleId: ID,
          severity: 'info',
          message: say(lang, {
            en: 'No direct Impressum link, only a contact link.',
            de: 'Kein direkter Impressum-Link, nur ein Kontakt-Link.',
          }),
          pageUrl: page.finalUrl,
          evidence: [say(lang, { en: 'contact link: ', de: 'Kontakt-Link: ' }) + contact.href],
          // The two-click ruling is German case law; elsewhere only the safer advice applies.
          fix: say(
            lang,
            region === 'de'
              ? {
                  en: `Two clicks via the contact page can be enough if the legal notice is clearly linked from there (BGH I ZR 228/03), but a direct "${notice}" link next to it is safer.`,
                  de: `Zwei Klicks über die Kontaktseite können reichen, wenn das Impressum dort klar verlinkt ist (BGH I ZR 228/03). Sicherer ist ein direkter Link „${notice}“ daneben.`,
                }
              : {
                  en: `A contact page may not count as directly reachable provider information. Add a direct "${notice}" link next to it.`,
                  de: `Eine Kontaktseite gilt möglicherweise nicht als unmittelbar erreichbare Anbieterkennzeichnung. Einen direkten Link „${notice}“ daneben setzen.`,
                },
          ),
        },
      ];
    }

    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: 'No link to an Impressum or legal notice was found on this page.',
          de: 'Auf dieser Seite wurde kein Link zu einem Impressum gefunden.',
        }),
        pageUrl: page.finalUrl,
        evidence: [linksChecked(page.links.length, lang)],
        fix: say(lang, {
          en: `Add a link labelled "${notice}" to a part of the layout that appears on every page, usually the footer.`,
          de: `Einen Link „${notice}“ in einen Bereich einbauen, der auf jeder Seite erscheint, meist den Footer.`,
        }),
      },
    ];
  },
};
