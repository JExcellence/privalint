import type { Finding, Rule, RuleSettings } from './types.js';

export function validateRuleSettings(settings: RuleSettings, rules: readonly Rule[]): void {
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
    throw new TypeError('Rule settings must be an object.');
  }
  for (const [id, value] of Object.entries(settings)) {
    if (
      !rules.some((rule) => rule.id === id) ||
      !['off', 'error', 'warning', 'info'].includes(value)
    ) {
      throw new TypeError('Invalid rule setting; use a known rule ID and off/error/warning/info.');
    }
  }
}

/** Inherited properties such as constructor must never become severity overrides. */
export function ruleSetting(
  settings: RuleSettings | undefined,
  ruleId: string,
): RuleSettings[string] | undefined {
  return settings !== undefined && Object.hasOwn(settings, ruleId) ? settings[ruleId] : undefined;
}

/** Apply local policy after region classification. Allowed vendors stay visible as info. */
export function applyPolicy(
  findings: readonly Finding[],
  settings: RuleSettings = {},
  allowedVendors: readonly string[] = [],
): Finding[] {
  return findings
    .filter((finding) => ruleSetting(settings, finding.ruleId) !== 'off')
    .map((finding) => {
      const setting = ruleSetting(settings, finding.ruleId);
      const allowed = finding.subject !== undefined && allowedVendors.includes(finding.subject);
      const severity = allowed
        ? 'info'
        : setting === undefined || setting === 'off'
          ? finding.severity
          : setting;
      return {
        ...finding,
        severity,
        ...(allowed || setting !== undefined
          ? { policy: { allowed, originalSeverity: finding.severity } }
          : {}),
      };
    });
}
