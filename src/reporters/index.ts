import type { ScanResult } from '../types.js';
import { formatHtml } from './html.js';
import { formatJson, type JsonOptions } from './json.js';
import { formatMarkdown } from './markdown.js';
import { formatSarif } from './sarif.js';
import { formatText } from './text.js';

export const FORMATS = ['text', 'json', 'markdown', 'sarif', 'html'] as const;
export type Format = (typeof FORMATS)[number];

export function format(
  result: ScanResult,
  kind: Format,
  options: { color?: boolean } & JsonOptions = {},
) {
  switch (kind) {
    case 'json':
      return formatJson(result, options);
    case 'markdown':
      return formatMarkdown(result);
    case 'sarif':
      return formatSarif(result);
    case 'html':
      return formatHtml(result);
    default:
      return formatText(result, options.color);
  }
}

export { formatHtml, formatJson, formatMarkdown, formatSarif, formatText, type JsonOptions };
