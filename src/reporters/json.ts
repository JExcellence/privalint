import { withSummaryOnly } from '../rule-summary.js';
import type { ScanResult } from '../types.js';

export interface JsonOptions {
  /** `summary` leaves out the per-page rule evaluations; the per-rule summary stays. */
  evaluations?: 'full' | 'summary';
}

export const formatJson = (result: ScanResult, options: JsonOptions = {}): string =>
  `${JSON.stringify(options.evaluations === 'summary' ? withSummaryOnly(result) : result, null, 2)}
`;
