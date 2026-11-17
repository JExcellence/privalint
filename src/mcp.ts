import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod';
import { LANGS } from './i18n.js';
import { legalReferences, REGIONS } from './legal.js';
import { ruleDocsUrl, VERSION } from './meta.js';
import { formatJson, formatMarkdown } from './reporters/index.js';
import { defaultRules } from './rules/index.js';
import { scan as runScan, type ScanOptions } from './scanner.js';
import type { ScanResult } from './types.js';
import { readTarget } from './url.js';

/** Pages one tool call may crawl: a scan takes seconds per page and the client waits for all. */
export const MAX_MCP_PAGES = 20;
/** Pages loaded at the same time in one call. */
const MCP_CONCURRENCY = 3;

export interface McpServerOptions {
  /** Replaces the browser scan, for tests. */
  scan?: (target: string, options: ScanOptions) => Promise<ScanResult>;
}

const scanInput = {
  url: z
    .string()
    .min(1)
    .describe('The website to scan, such as https://example.com. https:// is added when missing.'),
  maxPages: z
    .number()
    .int()
    .min(1)
    .max(MAX_MCP_PAGES)
    .optional()
    .describe(
      `Pages of the same site to crawl, 1 to ${MAX_MCP_PAGES} (default 1, the start page).`,
    ),
  lang: z.enum(LANGS).optional().describe('Language of findings and fixes (default en).'),
  region: z
    .enum(REGIONS)
    .optional()
    .describe('Whose law to cite and which severity profile to use (default de).'),
  checkSettings: z
    .boolean()
    .optional()
    .describe(
      'Also switch off every category in the banner settings, save and check what still loads.',
    ),
  checkClose: z
    .boolean()
    .optional()
    .describe(
      'Also close the banner with its close button and check whether that counts as consent.',
    ),
  checkAccept: z
    .boolean()
    .optional()
    .describe(
      'Also accept, so the privacy policy check covers services that run only with consent.',
    ),
  gpc: z
    .boolean()
    .optional()
    .describe('Also load the start page with Global Privacy Control and compare.'),
  sitemap: z
    .boolean()
    .optional()
    .describe('Choose the pages after the start page from sitemap.xml instead of following links.'),
  device: z
    .string()
    .optional()
    .describe('A Playwright device such as "iPhone 15", to check the mobile banner.'),
  report: z
    .enum(['markdown', 'json'])
    .optional()
    .describe(
      'markdown (default): findings, evidence, fixes and legal basis. json: the full report without per-page rule results.',
    ),
};

const rulesInput = {
  region: z
    .enum(REGIONS)
    .optional()
    .describe('Region whose legal references are listed with each rule (default de).'),
};

/** The privalint tools on an MCP server, not yet connected to a transport. */
export function createMcpServer(options: McpServerOptions = {}): McpServer {
  const scan = options.scan ?? runScan;
  const server = new McpServer({ name: 'privalint', version: VERSION });

  server.registerTool(
    'scan_site',
    {
      title: 'Scan a website for privacy problems',
      description:
        'Loads a live website in a real browser (Chromium) and checks it for GDPR and ePrivacy ' +
        'problems: trackers before consent or after "reject", consent banner design, Google ' +
        'Fonts, embeds, missing Impressum and privacy policy links, forms without a privacy ' +
        'notice. Clicks "reject" on the consent banner. Takes about 10 to 60 seconds per page. ' +
        'Findings are technical observations, not legal advice. Pages that could not be read are ' +
        'reported as incomplete coverage, never as clean.',
      inputSchema: scanInput,
      annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: true },
    },
    async (args, extra): Promise<CallToolResult> => {
      // Credentials would be sent to the site and appear in the report the assistant reads.
      const target = readTarget(args.url, { credentials: false });
      if (target === undefined)
        return failure('Not a valid HTTP(S) URL, or it contains a user name or password.');
      const maxPages = args.maxPages ?? 1;
      const progressToken = extra._meta?.progressToken;
      let progress = 0;
      try {
        const result = await scan(target.href, {
          maxPages,
          // The client waits for the whole crawl; the report is the same as with one at a time.
          concurrency: Math.min(maxPages, MCP_CONCURRENCY),
          lang: args.lang ?? 'en',
          region: args.region ?? 'de',
          settingsCheck: args.checkSettings === true,
          closeCheck: args.checkClose === true,
          acceptCheck: args.checkAccept === true,
          gpc: args.gpc === true,
          sitemap: args.sitemap === true,
          ...(args.device === undefined ? {} : { device: args.device }),
          signal: extra.signal,
          onProgress: (event) => {
            // Progress keeps clients that reset their timeout on progress from giving up.
            if (progressToken === undefined) return;
            progress += 1;
            extra
              .sendNotification({
                method: 'notifications/progress',
                params: {
                  progressToken,
                  progress,
                  message: event.pageUrl ? `${event.stage} ${event.pageUrl}` : event.stage,
                },
              })
              .catch(() => undefined);
          },
        });
        const text =
          args.report === 'json'
            ? formatJson(result, { evaluations: 'summary' })
            : formatMarkdown(result);
        return { content: [{ type: 'text', text }] };
      } catch (error) {
        return failure(scanError(error));
      }
    },
  );

  server.registerTool(
    'list_rules',
    {
      title: 'List privalint rules',
      description:
        'Lists the checks privalint runs, with what each one looks for, its legal references ' +
        'for the region and a link to its documentation.',
      inputSchema: rulesInput,
      annotations: { readOnlyHint: true, openWorldHint: false, idempotentHint: true },
    },
    async (args): Promise<CallToolResult> => {
      const region = args.region ?? 'de';
      const rules = defaultRules.map((rule) => ({
        id: rule.id,
        title: rule.title,
        description: rule.description,
        references: legalReferences(rule.id, region) ?? rule.references,
        docs: ruleDocsUrl(rule.id),
      }));
      return { content: [{ type: 'text', text: JSON.stringify({ region, rules }, null, 2) }] };
    },
  );

  return server;
}

/** Serves the privalint tools over stdio until the client closes the connection. */
export async function serveMcp(): Promise<void> {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
}

function failure(text: string): CallToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

function scanError(error: unknown): string {
  // The scanner names the install command when Chromium is missing.
  return `The scan failed: ${error instanceof Error ? error.message : String(error)}`;
}
