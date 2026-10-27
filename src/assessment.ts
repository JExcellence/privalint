import type { Lang } from './i18n.js';
import { observedRequests } from './observations.js';
import { defaultRules } from './rules/index.js';
import type { Finding, ObservationKind, PageSnapshot, Rule, RuleEvaluation } from './types.js';
import { isFirstParty } from './url.js';

const REQUIREMENTS: Record<string, readonly ObservationKind[]> = {
  'pre-consent-trackers': ['network'],
  'google-fonts': ['network'],
  'third-party-embeds': ['network'],
  'third-party-cdns': ['network'],
  'impressum-link': ['document'],
  'privacy-policy-link': ['document'],
  'reject-option': ['consent'],
  'trackers-after-reject': ['after-reject'],
};

export function assessPage(
  page: PageSnapshot,
  rules: readonly Rule[],
  siteUrl: URL,
  lang: Lang,
  isStart: boolean,
  consentEnabled: boolean,
): { findings: Finding[]; evaluations: RuleEvaluation[] } {
  const findings: Finding[] = [];
  const allRules = new Map([...defaultRules, ...rules].map((rule) => [rule.id, rule]));
  const selected = new Set(rules.map((rule) => rule.id));
  const complete =
    page.capture?.beforeConsentComplete ?? page.capture?.complete ?? page.error === undefined;
  const validPage =
    (page.error === undefined || page.capture?.document === true) &&
    page.status !== null &&
    page.status < 400 &&
    isFirstParty(page.finalUrl, siteUrl);
  const available: Record<ObservationKind, boolean> = {
    document: validPage && complete && (page.capture?.document ?? true),
    network: validPage,
    consent: validPage && page.consent?.bannerFound === true,
    'after-reject': validPage && page.consent?.rejected === true,
  };
  const input: PageSnapshot = {
    ...page,
    requests: observedRequests(page.requests),
    // A preconnect hint is not evidence of an actual connection in an offline adapter context.
    resourceHints: complete ? page.resourceHints : [],
    ...(page.consent?.afterReject === undefined
      ? {}
      : {
          consent: {
            ...page.consent,
            afterReject: {
              ...page.consent.afterReject,
              requests: observedRequests(page.consent.afterReject.requests),
            },
          },
        }),
  };
  const evaluations = [...allRules.values()].map((rule): RuleEvaluation => {
    const requirements = rule.requires ?? REQUIREMENTS[rule.id] ?? ['document'];
    const consentRule = requirements.some((kind) => kind === 'consent' || kind === 'after-reject');
    if (!selected.has(rule.id)) {
      return { ruleId: rule.id, status: 'skipped', reason: 'disabled', partial: false };
    }
    if (consentRule && (!isStart || !consentEnabled)) {
      return {
        ruleId: rule.id,
        status: 'skipped',
        reason: !isStart ? 'not-start-page' : 'consent-disabled',
        partial: false,
      };
    }
    if (!requirements.every((kind) => available[kind])) {
      return {
        ruleId: rule.id,
        status: 'not-evaluable',
        reason: 'missing-observation',
        partial: true,
      };
    }
    findings.push(...rule.check({ page: input, siteUrl, lang }));
    return {
      ruleId: rule.id,
      status: 'executed',
      partial: requirements.includes('after-reject')
        ? page.consent?.afterRejectComplete === false
        : !complete,
    };
  });
  return { findings, evaluations };
}
