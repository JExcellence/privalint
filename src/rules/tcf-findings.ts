import { type Lang, say, type Text } from '../i18n.js';
import type { Finding, TcfObservation } from '../types.js';

const SUBJECT = 'IAB TCF';

interface TcfFindingInput {
  tcf: TcfObservation;
  ruleId: string;
  pageUrl: string;
  lang: Lang;
  /** What the visitor did, completing "after …" (en) and "obwohl …" (de). */
  action: Text;
}

/**
 * What an IAB TCF consent manager itself reports after the visitor refused. Stored consent ignores
 * the refusal: an error. Legitimate interest alone is a warning, because TCF banners keep the
 * objection in a separate tab, and the law on it is less settled.
 */
export function tcfFindings({ tcf, ruleId, pageUrl, lang, action }: TcfFindingInput): Finding[] {
  const evidence = [
    `TCF purpose consents: ${tcf.purposesOn.join(', ') || '-'}`,
    `TCF vendor consents: ${tcf.vendorConsents}`,
    `TCF legitimate-interest purposes: ${tcf.legitimateInterestsOn.join(', ') || '-'}`,
    `TCF legitimate-interest vendors: ${tcf.vendorLegitimateInterests}`,
  ];
  const base = { ruleId, pageUrl, subject: SUBJECT, evidence };
  if (tcf.purposesOn.length > 0 || tcf.vendorConsents > 0) {
    return [
      {
        ...base,
        severity: 'error',
        message: say(lang, {
          en: `The consent manager still reports consent (IAB TCF) after ${action.en}.`,
          de: `Das Consent-Tool meldet weiterhin Einwilligungen (IAB TCF), obwohl ${action.de}.`,
        }),
        fix: say(lang, {
          en: 'Make sure the consent manager stores the refusal as shown. Consent for TCF purposes and vendors must be off after the visitor refused.',
          de: 'Sicherstellen, dass das Consent-Tool die Ablehnung so speichert, wie sie angezeigt wird. Einwilligungen für TCF-Zwecke und -Anbieter müssen nach einer Ablehnung aus sein.',
        }),
      },
    ];
  }
  if (tcf.legitimateInterestsOn.length > 0 || tcf.vendorLegitimateInterests > 0) {
    const purposes = tcf.legitimateInterestsOn.join(', ') || '-';
    return [
      {
        ...base,
        severity: 'warning',
        message: say(lang, {
          en: `After ${action.en}, the consent manager still processes data on the basis of legitimate interest (IAB TCF, purposes ${purposes}).`,
          de: `Obwohl ${action.de}, verarbeitet das Consent-Tool weiterhin Daten auf Grundlage berechtigten Interesses (IAB TCF, Zwecke ${purposes}).`,
        }),
        fix: say(lang, {
          en: 'Show the objection to legitimate interest on the same layer as the refusal, or switch legitimate interest off together with it. Check whether these purposes may rely on legitimate interest at all.',
          de: 'Den Widerspruch gegen berechtigtes Interesse auf derselben Ebene wie die Ablehnung anbieten oder ihn zusammen mit ihr abschalten. Prüfen, ob diese Zwecke überhaupt auf berechtigtes Interesse gestützt werden dürfen.',
        }),
      },
    ];
  }
  return [];
}
