import type { Lang } from './i18n.js';
import type { Region } from './legal.js';
import { observedRequests } from './observations.js';
import { defaultRules } from './rules/index.js';
import type {
  ConsentObservation,
  Finding,
  ObservationKind,
  PageSnapshot,
  Rule,
  RuleEvaluation,
} from './types.js';
import { isFirstParty } from './url.js';

/**
 * Rules whose clean, complete result shows that nothing needing consent loaded before a
 * choice. Without a banner that is a good outcome, so the banner rules are skipped then.
 */
const CONSENT_TRIGGERS = ['pre-consent-trackers', 'third-party-embeds'];

const REQUIREMENTS: Record<string, readonly ObservationKind[]> = {
  'pre-consent-trackers': ['network'],
  'google-fonts': ['network'],
  'adobe-fonts': ['network'],
  'third-party-embeds': ['network'],
  'third-party-cdns': ['network'],
  'third-country-providers': ['network'],
  'tracking-cookie-lifetime': ['network'],
  'impressum-link': ['document'],
  'legal-notice-content': ['document'],
  'privacy-policy-link': ['document'],
  'reject-option': ['consent'],
  'reject-less-prominent': ['consent'],
  'trackers-after-reject': ['after-reject'],
  'consent-settings-link': ['after-reject'],
  'trackers-after-settings': ['after-settings'],
  'consent-preselected': ['after-settings'],
  'consent-banner-missing': ['network', 'banner-search'],
};

export interface AssessmentContext {
  lang: Lang;
  region: Region;
  isStart: boolean;
  consentEnabled: boolean;
  /** Every rule the scan knows, including custom ones that weren't selected. */
  catalog?: readonly Rule[];
  settingsEnabled?: boolean;
  transportEnabled?: boolean;
}

export function assessPage(
  page: PageSnapshot,
  rules: readonly Rule[],
  siteUrl: URL,
  context: AssessmentContext,
): { findings: Finding[]; evaluations: RuleEvaluation[] } {
  const {
    lang,
    region,
    isStart,
    consentEnabled,
    catalog = rules,
    settingsEnabled = false,
    transportEnabled = false,
  } = context;
  const findings: Finding[] = [];
  const allRules = new Map([...defaultRules, ...catalog].map((rule) => [rule.id, rule]));
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
    consent:
      validPage && page.consent?.bannerFound === true && page.consent.acceptLabel !== undefined,
    'after-reject': validPage && page.consent?.rejected === true,
    'after-settings': validPage && page.consent?.settings?.afterSave !== undefined,
    // A failed interaction says nothing about whether a banner was there.
    'banner-search':
      validPage && page.consent !== undefined && page.consent.state !== 'interaction-failed',
    transport: validPage && page.transport !== undefined,
  };
  const input: PageSnapshot = {
    ...page,
    requests: observedRequests(page.requests),
    // A preconnect hint is not evidence of an actual connection in an offline adapter context.
    resourceHints: complete ? page.resourceHints : [],
    ...(page.consent === undefined ? {} : { consent: observedConsent(page.consent) }),
  };
  const requirementsOf = (rule: Rule) => rule.requires ?? REQUIREMENTS[rule.id] ?? ['document'];
  const needsConsent = (rule: Rule) =>
    requirementsOf(rule).some(
      (kind) =>
        kind === 'consent' ||
        kind === 'after-reject' ||
        kind === 'after-settings' ||
        kind === 'banner-search',
    );
  const detectedBy = new Map<string, Finding[]>();
  const evaluate = (rule: Rule, noConsentNeeded: boolean): RuleEvaluation => {
    const requirements = requirementsOf(rule);
    const consentRule = needsConsent(rule);
    if (!selected.has(rule.id)) {
      return {
        ruleId: rule.id,
        status: 'skipped',
        reason: 'disabled',
        partial: false,
        outcome: 'not-evaluable',
        explanation: 'disabled',
        findingCount: 0,
      };
    }
    if (consentRule && (!isStart || !consentEnabled)) {
      return {
        ruleId: rule.id,
        status: 'skipped',
        reason: !isStart ? 'not-start-page' : 'consent-disabled',
        partial: false,
        outcome: 'not-evaluable',
        explanation: !isStart ? 'not-start-page' : 'consent-disabled',
        findingCount: 0,
      };
    }
    if (requirements.includes('after-settings') && !settingsEnabled) {
      return {
        ruleId: rule.id,
        status: 'skipped',
        reason: 'settings-check-disabled',
        partial: false,
        outcome: 'not-evaluable',
        explanation: 'settings-check-disabled',
        findingCount: 0,
      };
    }
    if (requirements.includes('transport') && (!isStart || !transportEnabled)) {
      // Checked on the start page of native scans only, by design: not a gap in coverage.
      const reason = isStart ? 'transport-not-checked' : 'not-start-page';
      return {
        ruleId: rule.id,
        status: 'skipped',
        reason,
        partial: false,
        outcome: 'not-evaluable',
        explanation: reason,
        findingCount: 0,
      };
    }
    if (noConsentNeeded && !requirements.every((kind) => available[kind])) {
      return {
        ruleId: rule.id,
        status: 'skipped',
        reason: 'no-consent-needed',
        partial: false,
        outcome: 'not-evaluable',
        explanation: 'no-consent-needed',
        findingCount: 0,
      };
    }
    if (!requirements.every((kind) => available[kind])) {
      return {
        ruleId: rule.id,
        status: 'not-evaluable',
        reason: 'missing-observation',
        partial: true,
        outcome: 'not-evaluable',
        explanation: requirements.includes('after-settings')
          ? (page.consent?.settings?.reason ?? 'missing-settings-observation')
          : requirements.includes('after-reject')
            ? (page.consent?.reason ?? 'missing-reject-observation')
            : requirements.includes('consent') || requirements.includes('banner-search')
              ? (page.consent?.reason ?? 'missing-consent-observation')
              : 'incomplete-document',
        findingCount: 0,
      };
    }
    const detected = rule.check({ page: input, siteUrl, lang, region });
    detectedBy.set(rule.id, detected);
    const partial = requirements.includes('after-settings')
      ? page.consent?.settings?.afterSaveComplete === false
      : requirements.includes('after-reject')
        ? page.consent?.afterRejectComplete === false
        : !complete;
    return {
      ruleId: rule.id,
      status: 'executed',
      partial,
      outcome:
        detected.length > 0 ? 'finding-detected' : partial ? 'not-evaluable' : 'checked-no-finding',
      explanation:
        detected.length > 0
          ? 'positive-evidence'
          : partial
            ? 'incomplete-observation'
            : 'required-observations-available',
      findingCount: detected.length,
    };
  };

  // Banner rules come last: whether a banner is needed at all depends on the other rules.
  const ordered = [...allRules.values()];
  const results = new Map<string, RuleEvaluation>();
  for (const rule of ordered.filter((rule) => !needsConsent(rule))) {
    results.set(rule.id, evaluate(rule, false));
  }
  const noConsentNeeded =
    isStart &&
    consentEnabled &&
    page.consent?.bannerFound === false &&
    page.consent.state === 'not-detected' &&
    CONSENT_TRIGGERS.every((ruleId) => {
      const evaluation = results.get(ruleId);
      return evaluation?.outcome === 'checked-no-finding' && !evaluation.partial;
    });
  for (const rule of ordered.filter(needsConsent)) {
    results.set(rule.id, evaluate(rule, noConsentNeeded));
  }
  const evaluations = ordered.map((rule) => results.get(rule.id) as RuleEvaluation);
  for (const rule of ordered) {
    findings.push(
      ...(detectedBy.get(rule.id) ?? []).map((finding) => ({
        ...finding,
        ...(page.pageId === undefined ? {} : { pageId: page.pageId }),
      })),
    );
  }
  return {
    findings,
    evaluations: evaluations.map((evaluation) => ({
      ...evaluation,
      ...(page.pageId === undefined ? {} : { pageId: page.pageId }),
    })),
  };
}

/** Keeps only requests that got a response, in both after-choice windows. */
function observedConsent(consent: ConsentObservation): ConsentObservation {
  const { afterReject, settings } = consent;
  return {
    ...consent,
    ...(afterReject === undefined
      ? {}
      : { afterReject: { ...afterReject, requests: observedRequests(afterReject.requests) } }),
    ...(settings?.afterSave === undefined
      ? {}
      : {
          settings: {
            ...settings,
            afterSave: {
              ...settings.afterSave,
              requests: observedRequests(settings.afterSave.requests),
            },
          },
        }),
  };
}
