import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export const VERSION = pkg.version;
export const REPOSITORY_URL = 'https://github.com/jexcellence/privalint';

export const ruleDocsUrl = (ruleId: string) =>
  `${REPOSITORY_URL}/blob/main/docs/rules/${ruleId}.md`;
