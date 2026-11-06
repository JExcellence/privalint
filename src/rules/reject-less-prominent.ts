import { type Lang, say } from '../i18n.js';
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
      reasons.push(say(lang, { en: 'shown as plain text', de: 'als bloßer Text dargestellt' }));
    }
    const rejectArea = reject.width * reject.height;
    const acceptArea = accept.width * accept.height;
    if (rejectArea > 0 && acceptArea > AREA_RATIO * rejectArea) {
      const ratio = Math.round((acceptArea / rejectArea) * 10) / 10;
      reasons.push(
        say(lang, {
          en: `the accept button is ${ratio} times its size`,
          de: `der Zustimmen-Button ist ${ratio}-mal so groß`,
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
          en: `low text contrast (${reject.contrast}:1)`,
          de: `geringer Textkontrast (${reject.contrast}:1)`,
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
        }),
        pageUrl: page.finalUrl,
        evidence: [
          describe(lang, say(lang, { en: 'accept', de: 'Zustimmen' }), acceptLabel, accept),
          describe(lang, say(lang, { en: 'reject', de: 'Ablehnen' }), rejectLabel, reject),
        ],
        fix: say(lang, {
          en: 'Give the reject control the same form, size and contrast as the accept button, for example two buttons of the same style side by side.',
          de: 'Der Ablehnen-Steuerung dieselbe Form, Größe und denselben Kontrast wie dem Zustimmen-Button geben, etwa zwei gleich gestaltete Buttons nebeneinander.',
        }),
      },
    ];
  },
};

function describe(lang: Lang, role: string, label: string, look: ControlLook): string {
  const style =
    look.style === 'button'
      ? say(lang, { en: 'button', de: 'Button' })
      : say(lang, { en: 'plain text', de: 'Text' });
  const contrast =
    look.contrast === undefined
      ? ''
      : say(lang, { en: `, contrast ${look.contrast}:1`, de: `, Kontrast ${look.contrast}:1` });
  return `${role} "${label}": ${style}, ${look.width}×${look.height} px${contrast}`;
}
