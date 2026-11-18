import { huArticle, say } from '../i18n.js';
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
  /impressum|imprint|legal[\s_-]?notice|site[\s_-]?notice|anbieter[\s_-]?(?:kennzeichnung|angaben)|mentions[\s_-]?l[eé]gales|aviso[\s_-]?legal|note[\s_-]?legali|colofon|bedrijfsgegevens|informacje[\s_-]?prawne|dane[\s_-]?firmy|impresszum/i;

/**
 * Labels for a legal page that may hold the provider information or only a disclaimer, such as
 * "Rechtliche Hinweise", "Rechtliches" or "Jogi tudnivalók" (telekom.hu). They can't be told
 * apart by the label, so they are noted, not trusted.
 */
export const VAGUE_LEGAL = /rechtliche[\s_-]?hinweise|rechtliches|jogi[\s_-]?tudnival|\blegal\b/i;

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
            hu: `Nincs „${notice}” feliratú hivatkozás, de ${huArticle(legal.text)} „${legal.text}” hivatkozás a szolgáltató adataihoz vezethet.`,
            fr: `Aucun lien intitulé « ${notice} », mais « ${legal.text} » peut mener aux informations sur l'éditeur.`,
            it: `Nessun link intitolato «${notice}», ma «${legal.text}» potrebbe portare alle informazioni sul fornitore.`,
            es: `No hay ningún enlace titulado «${notice}», pero «${legal.text}» puede llevar a la información del prestador.`,
            pl: `Brak linku o nazwie „${notice}”, ale „${legal.text}” może prowadzić do informacji o usługodawcy.`,
          }),
          pageUrl: page.finalUrl,
          evidence: [
            say(lang, {
              en: 'legal link: ',
              de: 'Rechts-Link: ',
              hu: 'jogi hivatkozás: ',
              fr: 'lien juridique : ',
              it: 'link legale: ',
              es: 'enlace legal: ',
              pl: 'link prawny: ',
            }) + legal.href,
          ],
          fix: say(lang, {
            en: `Check that this page holds the full provider information (name, address, e-mail, register entry). Labelling the link "${notice}" makes it easy to recognise.`,
            de: `Prüfen, ob diese Seite die vollständigen Anbieterangaben enthält (Name, Anschrift, E-Mail, Registereintrag). Die Beschriftung „${notice}“ macht den Link leicht erkennbar.`,
            hu: `Ellenőrizze, hogy ez az oldal tartalmazza-e a szolgáltató összes adatát (név, cím, e-mail, cégjegyzékszám). ${huArticle(notice, true)} „${notice}” felirattal a hivatkozás könnyen felismerhető.`,
            fr: `Vérifiez que cette page contient toutes les informations sur l'éditeur (nom, adresse, e-mail, immatriculation). Intituler le lien « ${notice} » le rend facile à reconnaître.`,
            it: `Verifica che questa pagina contenga tutte le informazioni sul fornitore (nome, indirizzo, e-mail, iscrizione al registro). Intitolare il link «${notice}» lo rende facile da riconoscere.`,
            es: `Comprueba que esta página contiene toda la información del prestador (nombre, dirección, correo electrónico, inscripción registral). Titular el enlace «${notice}» lo hace fácil de reconocer.`,
            pl: `Sprawdź, czy ta strona zawiera pełne informacje o usługodawcy (nazwa, adres, e-mail, wpis do rejestru). Nazwanie linku „${notice}” ułatwia jego rozpoznanie.`,
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
            hu: 'Nincs közvetlen impresszum-hivatkozás, csak kapcsolatfelvételi hivatkozás.',
            fr: 'Pas de lien direct vers les mentions légales, seulement un lien de contact.',
            it: 'Nessun link diretto alle note legali, solo un link ai contatti.',
            es: 'No hay enlace directo al aviso legal, solo un enlace de contacto.',
            pl: 'Brak bezpośredniego linku do noty prawnej, jest tylko link do kontaktu.',
          }),
          pageUrl: page.finalUrl,
          evidence: [
            say(lang, {
              en: 'contact link: ',
              de: 'Kontakt-Link: ',
              hu: 'kapcsolati hivatkozás: ',
              fr: 'lien de contact : ',
              it: 'link ai contatti: ',
              es: 'enlace de contacto: ',
              pl: 'link do kontaktu: ',
            }) + contact.href,
          ],
          // The two-click ruling is German case law; elsewhere only the safer advice applies.
          fix: say(
            lang,
            region === 'de'
              ? {
                  en: `Two clicks via the contact page can be enough if the legal notice is clearly linked from there (BGH I ZR 228/03), but a direct "${notice}" link next to it is safer.`,
                  de: `Zwei Klicks über die Kontaktseite können reichen, wenn das Impressum dort klar verlinkt ist (BGH I ZR 228/03). Sicherer ist ein direkter Link „${notice}“ daneben.`,
                  hu: `Két kattintás a kapcsolati oldalon keresztül elég lehet, ha onnan egyértelműen elérhető az impresszum (BGH I ZR 228/03), de biztonságosabb mellette egy közvetlen „${notice}” hivatkozás.`,
                  fr: `Deux clics via la page de contact peuvent suffire si les mentions légales y sont clairement liées (BGH I ZR 228/03), mais un lien direct « ${notice} » à côté est plus sûr.`,
                  it: `Due clic tramite la pagina dei contatti possono bastare se le note legali vi sono chiaramente collegate (BGH I ZR 228/03), ma un link diretto «${notice}» accanto è più sicuro.`,
                  es: `Dos clics a través de la página de contacto pueden bastar si el aviso legal está claramente enlazado desde ella (BGH I ZR 228/03), pero un enlace directo «${notice}» al lado es más seguro.`,
                  pl: `Dwa kliknięcia przez stronę kontaktową mogą wystarczyć, jeśli nota prawna jest stamtąd wyraźnie podlinkowana (BGH I ZR 228/03), ale bezpośredni link „${notice}” obok jest bezpieczniejszy.`,
                }
              : {
                  en: `A contact page may not count as directly reachable provider information. Add a direct "${notice}" link next to it.`,
                  de: `Eine Kontaktseite gilt möglicherweise nicht als unmittelbar erreichbare Anbieterkennzeichnung. Einen direkten Link „${notice}“ daneben setzen.`,
                  hu: `Egy kapcsolati oldal nem feltétlenül számít közvetlenül elérhető szolgáltatói tájékoztatásnak. Helyezzen el mellette egy közvetlen „${notice}” hivatkozást.`,
                  fr: `Une page de contact peut ne pas compter comme information directement accessible sur l'éditeur. Ajoutez à côté un lien direct « ${notice} ».`,
                  it: `Una pagina dei contatti potrebbe non valere come informazione sul fornitore direttamente raggiungibile. Aggiungi accanto un link diretto «${notice}».`,
                  es: `Puede que una página de contacto no cuente como información del prestador accesible directamente. Añade al lado un enlace directo «${notice}».`,
                  pl: `Strona kontaktowa może nie zostać uznana za bezpośrednio dostępne informacje o usługodawcy. Dodaj obok bezpośredni link „${notice}”.`,
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
          en: 'No link to an Impressum or legal notice was found.',
          de: 'Kein Link zu einem Impressum gefunden.',
          hu: 'Nem található hivatkozás impresszumra vagy jogi nyilatkozatra.',
          fr: "Aucun lien vers des mentions légales n'a été trouvé.",
          it: 'Non è stato trovato alcun link a note legali o Impressum.',
          es: 'No se encontró ningún enlace a un aviso legal o Impressum.',
          pl: 'Nie znaleziono linku do noty prawnej ani Impressum.',
        }),
        pageUrl: page.finalUrl,
        evidence: [linksChecked(page.links.length, lang)],
        fix: say(lang, {
          en: `Add a link labelled "${notice}" to a part of the layout that appears on every page, usually the footer.`,
          de: `Einen Link „${notice}“ in einen Bereich einbauen, der auf jeder Seite erscheint, meist den Footer.`,
          hu: `Helyezzen el egy „${notice}” feliratú hivatkozást az elrendezés olyan részén, amely minden oldalon megjelenik, általában a láblécben.`,
          fr: `Ajoutez un lien intitulé « ${notice} » dans une partie de la mise en page présente sur chaque page, en général le pied de page.`,
          it: `Aggiungi un link intitolato «${notice}» in una parte del layout presente in ogni pagina, di solito il piè di pagina.`,
          es: `Añade un enlace titulado «${notice}» en una parte del diseño que aparezca en todas las páginas, normalmente el pie de página.`,
          pl: `Dodaj link o nazwie „${notice}” w części układu widocznej na każdej stronie, zwykle w stopce.`,
        }),
      },
    ];
  },
};
