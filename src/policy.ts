import type { Finding, Rule, RuleSettings } from './types.js';

export function validateRuleSettings(settings: RuleSettings, rules: readonly Rule[]): void {
  for (const [id, value] of Object.entries(settings)) {
    if (
      !rules.some((rule) => rule.id === id) ||
      !['off', 'error', 'warning', 'info'].includes(value)
    ) {
      throw new TypeError('Invalid rule setting; use a known rule ID and off/error/warning/info.');
    }
  }
}

/** Apply local policy after region classification. Allowed vendors stay visible as info. */
export function applyPolicy(
  findings: readonly Finding[],
  settings: RuleSettings = {},
  allowedVendors: readonly string[] = [],
): Finding[] {
  return findings
    .filter((finding) => settings[finding.ruleId] !== 'off')
    .map((finding) => {
      const setting = settings[finding.ruleId];
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
