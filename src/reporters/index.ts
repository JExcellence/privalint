import type { ScanResult } from '../types.js';
import { formatJson } from './json.js';
import { formatMarkdown } from './markdown.js';
import { formatSarif } from './sarif.js';
import { formatText } from './text.js';

export const FORMATS = ['text', 'json', 'markdown', 'sarif'] as const;
export type Format = (typeof FORMATS)[number];

export function format(result: ScanResult, kind: Format, options: { color?: boolean } = {}) {
  switch (kind) {
    case 'json':
      return formatJson(result);
    case 'markdown':
      return formatMarkdown(result);
    case 'sarif':
      return formatSarif(result);
    default:
      return formatText(result, options.color);
  }
}

export { formatJson, formatMarkdown, formatSarif, formatText };
