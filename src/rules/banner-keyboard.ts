import { say } from '../i18n.js';
import type { Rule } from '../types.js';

const ID = 'banner-keyboard';

export const bannerKeyboard: Rule = {
  id: ID,
  title: 'The reject button of the consent banner cannot be reached with the keyboard',
  description:
    'Refusing has to be as easy as accepting, and a choice that only works with a mouse is not ' +
    'freely given for keyboard and screen reader users. Before clicking reject, privalint presses ' +
    'Tab up to 60 times and checks whether the reject control gets focus.',
  references: ['Art. 4(11) GDPR', 'Art. 7(3) GDPR', 'EN 301 549 9.2.1.1 (WCAG 2.1 SC 2.1.1)'],
  check({ page, lang }) {
    const consent = page.consent;
    const keyboard = consent?.keyboard;
    if (keyboard === undefined || keyboard.rejectTabs !== undefined) return [];
    const label = consent?.rejectLabel ?? 'reject';
    const { tag, role, tabindex } = keyboard.reject;
    const element = `<${tag}${role === undefined ? '' : ` role="${role}"`}${
      tabindex === undefined ? '' : ` tabindex="${tabindex}"`
    }>`;
    const acceptReached = typeof keyboard.acceptTabs === 'number';
    const evidence = [
      `reject control: ${element} "${label}"`,
      `not focused after ${keyboard.presses} Tab presses`,
    ];
    if (acceptReached)
      evidence.push(`accept control focused after ${keyboard.acceptTabs} Tab presses`);
    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: acceptReached
          ? say(lang, {
              en: `The reject control "${label}" cannot be reached with the Tab key, but the accept control can.`,
              de: `Das Ablehnen-Element „${label}“ ist mit der Tab-Taste nicht erreichbar, das Akzeptieren-Element schon.`,
              hu: `Az elutasító „${label}” elem a Tab billentyűvel nem érhető el, az elfogadó viszont igen.`,
            })
          : say(lang, {
              en: `The reject control "${label}" cannot be reached with the Tab key.`,
              de: `Das Ablehnen-Element „${label}“ ist mit der Tab-Taste nicht erreichbar.`,
              hu: `Az elutasító „${label}” elem a Tab billentyűvel nem érhető el.`,
            }),
        pageUrl: page.finalUrl,
        evidence,
        fix: say(lang, {
          en: 'Make the reject control a <button> (or give it tabindex="0" and handle Enter and Space), and keep it in the tab order of the banner like the accept button.',
          de: 'Das Ablehnen-Element als <button> umsetzen (oder tabindex="0" setzen und Enter und Leertaste behandeln) und es wie den Akzeptieren-Button in der Tab-Reihenfolge des Banners halten.',
          hu: 'Az elutasító elem legyen <button> (vagy kapjon tabindex="0" értéket, és kezelje az Enter és a szóköz billentyűt), és az elfogadó gombhoz hasonlóan szerepeljen a banner tabulátor-sorrendjében.',
        }),
      },
    ];
  },
};
