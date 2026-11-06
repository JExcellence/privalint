import type { BrowserContext, Page } from 'playwright';
import type { FingerprintRead } from './types.js';

/** Calls recorded at most, so a script reading in a loop can't grow the report. */
const MAX_READS = 50;

/**
 * Runs before any page script. Wraps the browser APIs fingerprinting reads its signals from: canvas
 * readback (toDataURL, toBlob, getImageData), the unmasked WebGL vendor and renderer, and audio
 * rendering in an OfflineAudioContext. Each call records the URL of the script that made it, taken
 * from the stack. Drawing alone (a chart) records nothing; only reading the result back does.
 */
function fingerprintProbe(max: number): void {
  const reads: Array<{ api: string; script: string }> = [];
  Object.defineProperty(window, '__privalintFingerprinting', { value: reads });
  const caller = (): string => {
    const stack = new Error().stack ?? '';
    const match = /(https?:\/\/[^\s)]+?):\d+:\d+/.exec(stack);
    return match?.[1] ?? '';
  };
  const wrap = (
    target: object | undefined,
    name: string,
    api: string,
    when: (args: unknown[]) => boolean = () => true,
  ) => {
    const prototype = target as Record<string, unknown> | undefined;
    const original = prototype?.[name];
    if (prototype === undefined || typeof original !== 'function') return;
    prototype[name] = function (this: unknown, ...args: unknown[]) {
      try {
        if (reads.length < max && when(args)) reads.push({ api, script: caller() });
      } catch {
        // Recording must never break the page.
      }
      return (original as (...rest: unknown[]) => unknown).apply(this, args);
    };
  };
  wrap(globalThis.HTMLCanvasElement?.prototype, 'toDataURL', 'canvas');
  wrap(globalThis.HTMLCanvasElement?.prototype, 'toBlob', 'canvas');
  wrap(globalThis.CanvasRenderingContext2D?.prototype, 'getImageData', 'canvas');
  // UNMASKED_VENDOR_WEBGL and UNMASKED_RENDERER_WEBGL of WEBGL_debug_renderer_info.
  const unmasked = (args: unknown[]) => args[0] === 0x9245 || args[0] === 0x9246;
  wrap(globalThis.WebGLRenderingContext?.prototype, 'getParameter', 'webgl', unmasked);
  wrap(globalThis.WebGL2RenderingContext?.prototype, 'getParameter', 'webgl', unmasked);
  wrap(globalThis.OfflineAudioContext?.prototype, 'startRendering', 'audio');
}

export async function installFingerprintProbe(context: BrowserContext): Promise<void> {
  await context.addInitScript(fingerprintProbe, MAX_READS);
}

/** The reads recorded so far, deduplicated by API and script. */
export async function readFingerprinting(page: Page): Promise<FingerprintRead[]> {
  const reads = await page
    .evaluate(
      () =>
        (globalThis as unknown as { __privalintFingerprinting?: FingerprintRead[] })
          .__privalintFingerprinting ?? [],
    )
    .catch(() => [] as FingerprintRead[]);
  const seen = new Map<string, FingerprintRead>();
  for (const read of reads) {
    if (read.script !== '') seen.set(`${read.api} ${read.script}`, read);
  }
  return [...seen.values()];
}
