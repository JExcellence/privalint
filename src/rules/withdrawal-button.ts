import { say } from '../i18n.js';
import type { Rule } from '../types.js';
import { linkMatches, linksChecked } from './links.js';
import { isStartPage, looksLikeShop } from './shop.js';

const ID = 'withdrawal-button';

/**
 * The labels the law names ("Vertrag widerrufen", "withdraw from contract here") and close
 * variants. "Widerrufsbelehrung" and "Widerrufsformular" are information about the right, not the
 * function, and don't match.
 */
const WITHDRAWAL =
  /vertrag\s+(hier\s+)?widerrufen|widerruf\s+(erklären|einreichen|starten)|withdraw\s+(from\s+)?(the\s+|your\s+)?contract|cancel\s+(the\s+|your\s+)?contract\s+here|renoncer\s+au\s+contrat|résilier\s+le\s+contrat|se\s+rétracter|desistir\s+del\s+contrato|recedere\s+dal\s+contratto|overeenkomst\s+herroepen|overeenkomst\s+(?:hier\s+)?ontbinden|odst[aą]p\s+od\s+umowy/i;

export const withdrawalButton: Rule = {
  id: ID,
  title: 'Online shop without a withdrawal function',
  description:
    'Since 19 June 2026, traders who sell online to consumers must offer a clearly labelled ' +
    'withdrawal function ("Vertrag widerrufen", "withdraw from contract here") for as long as ' +
    'the withdrawal period runs. privalint checks the start page of sites that look like a shop ' +
    '(cart or checkout link, shop-system scripts) for such a link or button.',
  references: ['§ 356a BGB', 'Art. 11a Directive 2011/83/EU'],
  check({ page, siteUrl, lang }) {
    if (!isStartPage(page, siteUrl) || !looksLikeShop(page)) return [];
    if (page.links.some(linkMatches(WITHDRAWAL))) return [];
    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: 'This looks like an online shop, but no link to a withdrawal function ("withdraw from contract here") was found on the start page.',
          de: 'Die Seite sieht aus wie ein Onlineshop, aber auf der Startseite wurde kein Link zur Widerrufsfunktion („Vertrag widerrufen“) gefunden.',
          hu: 'Az oldal webáruháznak tűnik, de a kezdőlapon nem található hivatkozás elállási funkcióra („Elállás a szerződéstől”).',
          fr: "Le site ressemble à une boutique en ligne, mais aucun lien vers une fonction de rétractation (« Renoncer au contrat ici ») n'a été trouvé sur la page d'accueil.",
          it: 'Sembra un negozio online, ma nella pagina iniziale non è stato trovato alcun link a una funzione di recesso («recedere dal contratto qui»).',
          es: 'Parece una tienda online, pero en la página de inicio no se encontró ningún enlace a una función de desistimiento («desistir del contrato aquí»).',
          pl: 'Wygląda to na sklep internetowy, ale na stronie startowej nie znaleziono linku do funkcji odstąpienia od umowy („odstąp od umowy tutaj”).',
        }),
        pageUrl: page.finalUrl,
        evidence: [linksChecked(page.links.length, lang)],
        fix: say(lang, {
          en: 'Add a clearly labelled "Withdraw from contract here" link to the footer of every page, leading to a form that asks for the order and ends with a "Confirm withdrawal" button. A cancellation policy page alone is not enough.',
          de: 'Einen gut sichtbaren Link „Vertrag widerrufen“ in den Footer jeder Seite setzen, der zu einem Formular mit den Bestelldaten und der Schaltfläche „Widerruf bestätigen“ führt. Eine Widerrufsbelehrung allein reicht nicht.',
          hu: 'Helyezzen el minden oldal láblécében egy jól látható „Elállás a szerződéstől” hivatkozást, amely a rendelés adatait bekérő űrlapra vezet, és „Elállás megerősítése” gombbal zárul. Az elállási tájékoztató önmagában nem elég.',
          fr: 'Ajoutez dans le pied de chaque page un lien clairement intitulé « Renoncer au contrat ici », menant à un formulaire qui demande la commande et se termine par un bouton « Confirmer la rétractation ». Une page de conditions de rétractation seule ne suffit pas.',
          it: "Aggiungi nel piè di pagina di ogni pagina un link chiaramente etichettato «Recedi dal contratto qui», che porti a un modulo che chieda l'ordine e termini con un pulsante «Conferma recesso». Una sola pagina sulle condizioni di recesso non basta.",
          es: 'Añade en el pie de cada página un enlace claramente titulado «Desistir del contrato aquí», que lleve a un formulario que pida el pedido y termine con un botón «Confirmar desistimiento». Una página con la política de desistimiento por sí sola no basta.',
          pl: 'Dodaj w stopce każdej strony wyraźnie oznaczony link „Odstąp od umowy tutaj”, prowadzący do formularza, który pyta o zamówienie i kończy się przyciskiem „Potwierdź odstąpienie”. Sama strona z informacją o odstąpieniu nie wystarczy.',
        }),
      },
    ];
  },
};
