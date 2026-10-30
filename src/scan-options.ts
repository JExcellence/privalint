import type { Lang } from './i18n.js';
import type { Region } from './legal.js';
import type { NetworkAdapter, NetworkLimits } from './network.js';
import type { PageSnapshot, Rule, RuleSettings, ScanProgressEvent } from './types.js';
export interface ScanOptions {
  maxPages?: number | undefined;
  /** Pages captured at the same time. Results are identical to a sequential crawl. Default 1. */
  concurrency?: number | undefined;
  settleMs?: number | undefined;
  /** Navigation/network-idle timeout, distinct from transport and capture deadlines. */
  timeoutMs?: number | undefined;
  locale?: string | undefined;
  lang?: Lang | undefined;
  /** Tool classification profile; does not determine which law applies. */
  region?: Region | undefined;
  rules?: readonly Rule[];
  ruleSettings?: RuleSettings;
  allow?: { vendors: readonly string[] };
  /** Synchronous notification; exceptions propagate after resource cleanup. */
  onProgress?: (event: ScanProgressEvent) => void;
  /** Legacy test helper: third-party requests receive synthetic empty responses. */
  offline?: boolean;
  consentCheck?: boolean | undefined;
  /**
   * Also open the banner's settings layer, switch off every optional category and save, in a
   * second capture of the start page. Off by default: it loads the start page once more.
   */
  settingsCheck?: boolean | undefined;
  headed?: boolean | undefined;
  channel?: string | undefined;
  /**
   * Run Chromium with its sandbox. Off by default like Playwright, because the sandbox
   * often cannot start in containers or on hosts that restrict user namespaces.
   */
  sandbox?: boolean | undefined;
  /** Trusted hook receiving RAW observations. Do not log/expose without redaction. */
  onPage?: (snapshot: PageSnapshot) => void;
  /** Caller-owned transport; scan owns browser, fresh per-page contexts and request signals. */
  networkAdapter?: NetworkAdapter;
  /** Per-page budgets across initial loading and rejection. Requires networkAdapter. */
  networkLimits?: NetworkLimits;
  signal?: AbortSignal;
  /** Entire capture including queue wait and consent; default 60s with an adapter. */
  captureTimeoutMs?: number;
  /** Stored issue details per page; counters are never truncated. Default 100. */
  maxDiagnostics?: number;
  /** Legacy default: throw on start-page navigation failure. Adapter default: report it. */
  failureMode?: 'throw' | 'report';
}

export const DEFAULTS = {
  maxPages: 1,
  concurrency: 1,
  settleMs: 2_000,
  timeoutMs: 30_000,
  locale: 'de-DE',
};
