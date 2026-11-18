import { decimal, huArticle, type Lang, say } from '../i18n.js';
import type { ControlLook, Rule } from '../types.js';

const ID = 'reject-less-prominent';

/** Accept counts as more prominent when it covers more than this many times the reject area. */
const AREA_RATIO = 2;
/** Below 3:1 text is hard to read; 4.5:1 is the WCAG minimum for normal text. */
const LOW_CONTRAST = 3;
const READABLE_CONTRAST = 4.5;

export const rejectLessProminent: Rule = {
  id: ID,
  title: 'The reject control is harder to see than the accept button',
  description:
    'Rejecting must be as easy as accepting. The EDPB cookie banner taskforce lists reject ' +
    'controls shown as a text link next to an accept button, or with very low contrast, as ' +
    'deceptive. privalint measures both first-layer controls: plain text or button, rendered ' +
    'size and text contrast. The thresholds are privalint’s own, so this is a hint, not a verdict.',
  references: [
    'EDPB Cookie Banner Taskforce report, 17.01.2023',
    'EDPB Guidelines 03/2022 on deceptive design patterns',
    'Art. 4(11) GDPR',
  ],
  check({ page, lang }) {
    const consent = page.consent;
    const controls = consent?.bannerControls;
    if (controls === undefined) return [];
    const { accept, reject } = controls;
    const reasons: string[] = [];
    if (reject.style === 'text' && accept.style === 'button') {
      reasons.push(
        say(lang, {
          en: 'shown as plain text',
          de: 'als bloßer Text dargestellt',
          hu: 'egyszerű szövegként jelenik meg',
          fr: 'affichée en texte simple',
          it: 'mostrato come semplice testo',
          es: 'mostrado como texto simple',
          pl: 'wyświetlany jako zwykły tekst',
        }),
      );
    }
    const rejectArea = reject.width * reject.height;
    const acceptArea = accept.width * accept.height;
    if (rejectArea > 0 && acceptArea > AREA_RATIO * rejectArea) {
      const ratio = Math.round((acceptArea / rejectArea) * 10) / 10;
      reasons.push(
        say(lang, {
          en: `the accept button is ${decimal(ratio, lang)} times its size`,
          de: `der Zustimmen-Button ist ${decimal(ratio, lang)}-mal so groß`,
          hu: `az elfogadás gomb sokkal nagyobb (területarány ${decimal(ratio, lang)}:1)`,
          fr: `le bouton d'acceptation est ${decimal(ratio, lang)} fois plus grand`,
          it: `il pulsante di accettazione è ${decimal(ratio, lang)} volte più grande`,
          es: `el botón de aceptar es ${decimal(ratio, lang)} veces más grande`,
          pl: `przycisk akceptacji jest ${decimal(ratio, lang)} razy większy`,
        }),
      );
    }
    if (
      reject.contrast !== undefined &&
      accept.contrast !== undefined &&
      reject.contrast < LOW_CONTRAST &&
      accept.contrast >= READABLE_CONTRAST
    ) {
      reasons.push(
        say(lang, {
          en: `low text contrast (${decimal(reject.contrast, lang)}:1)`,
          de: `geringer Textkontrast (${decimal(reject.contrast, lang)}:1)`,
          hu: `alacsony szövegkontraszt (${decimal(reject.contrast, lang)}:1)`,
          fr: `faible contraste du texte (${decimal(reject.contrast, lang)}:1)`,
          it: `basso contrasto del testo (${decimal(reject.contrast, lang)}:1)`,
          es: `bajo contraste del texto (${decimal(reject.contrast, lang)}:1)`,
          pl: `niski kontrast tekstu (${decimal(reject.contrast, lang)}:1)`,
        }),
      );
    }
    if (reasons.length === 0) return [];

    const acceptLabel = consent?.acceptLabel ?? '';
    const rejectLabel = consent?.rejectLabel ?? '';
    return [
      {
        ruleId: ID,
        severity: 'info',
        message: say(lang, {
          en: `The reject control "${rejectLabel}" is less prominent than "${acceptLabel}": ${reasons.join('; ')}.`,
          de: `Die Ablehnen-Steuerung „${rejectLabel}“ fällt weniger auf als „${acceptLabel}“: ${reasons.join('; ')}.`,
          hu: `${huArticle(rejectLabel, true)} „${rejectLabel}” elutasítási lehetőség kevésbé feltűnő, mint ${huArticle(acceptLabel)} „${acceptLabel}”: ${reasons.join('; ')}.`,
          fr: `La commande de refus « ${rejectLabel} » est moins visible que « ${acceptLabel} » : ${reasons.join(' ; ')}.`,
          it: `Il comando di rifiuto «${rejectLabel}» è meno visibile di «${acceptLabel}»: ${reasons.join('; ')}.`,
          es: `El control de rechazo «${rejectLabel}» es menos visible que «${acceptLabel}»: ${reasons.join('; ')}.`,
          pl: `Element odrzucenia „${rejectLabel}” jest mniej widoczny niż „${acceptLabel}”: ${reasons.join('; ')}.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          describe(
            lang,
            say(lang, {
              en: 'accept',
              de: 'Zustimmen',
              hu: 'elfogadás',
              fr: 'accepter',
              it: 'accetta',
              es: 'aceptar',
              pl: 'akceptuj',
            }),
            acceptLabel,
            accept,
          ),
          describe(
            lang,
            say(lang, {
              en: 'reject',
              de: 'Ablehnen',
              hu: 'elutasítás',
              fr: 'refuser',
              it: 'rifiuta',
              es: 'rechazar',
              pl: 'odrzuć',
            }),
            rejectLabel,
            reject,
          ),
        ],
        fix: say(lang, {
          en: 'Give the reject control the same form, size and contrast as the accept button, for example two buttons of the same style side by side.',
          de: 'Der Ablehnen-Steuerung dieselbe Form, Größe und denselben Kontrast wie dem Zustimmen-Button geben, etwa zwei gleich gestaltete Buttons nebeneinander.',
          hu: 'Adjon az elutasítási lehetőségnek ugyanolyan formát, méretet és kontrasztot, mint az elfogadás gombnak, például két egyforma stílusú gombot egymás mellett.',
          fr: "Donnez à la commande de refus la même forme, la même taille et le même contraste que le bouton d'acceptation, par exemple deux boutons de même style côte à côte.",
          it: 'Dai al comando di rifiuto la stessa forma, dimensione e contrasto del pulsante di accettazione, ad esempio due pulsanti dello stesso stile affiancati.',
          es: 'Da al control de rechazo la misma forma, tamaño y contraste que al botón de aceptar, por ejemplo dos botones del mismo estilo uno al lado del otro.',
          pl: 'Nadaj elementowi odrzucenia taką samą formę, wielkość i kontrast jak przyciskowi akceptacji, na przykład dwa przyciski w tym samym stylu obok siebie.',
        }),
      },
    ];
  },
};

function describe(lang: Lang, role: string, label: string, look: ControlLook): string {
  const style =
    look.style === 'button'
      ? say(lang, {
          en: 'button',
          de: 'Button',
          hu: 'gomb',
          fr: 'bouton',
          it: 'pulsante',
          es: 'botón',
          pl: 'przycisk',
        })
      : say(lang, {
          en: 'plain text',
          de: 'Text',
          hu: 'szöveg',
          fr: 'texte simple',
          it: 'testo semplice',
          es: 'texto simple',
          pl: 'zwykły tekst',
        });
  const contrast =
    look.contrast === undefined
      ? ''
      : say(lang, {
          en: `, contrast ${decimal(look.contrast, lang)}:1`,
          de: `, Kontrast ${decimal(look.contrast, lang)}:1`,
          hu: `, kontraszt ${decimal(look.contrast, lang)}:1`,
          fr: `, contraste ${decimal(look.contrast, lang)}:1`,
          it: `, contrasto ${decimal(look.contrast, lang)}:1`,
          es: `, contraste ${decimal(look.contrast, lang)}:1`,
          pl: `, kontrast ${decimal(look.contrast, lang)}:1`,
        });
  return `${role} "${label}": ${style}, ${look.width}×${look.height} px${contrast}`;
}
