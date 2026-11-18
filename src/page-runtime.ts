import type { BrowserContext } from 'playwright';

/**
 * Runs in every document before the page's own scripts. esbuild with `keepNames`, which tsx and
 * some bundlers turn on, wraps named functions in `__name(fn, "name")`. Playwright sends the source
 * text of a function into the page, where that helper doesn't exist, so each read of the page that
 * declares a named function inside would fail with a ReferenceError and come back empty. A plain
 * string, so the script itself can't be wrapped. The page's own `__name`, if any, is left alone.
 */
const NAME_HELPER = `if (typeof globalThis.__name !== 'function') {
  Object.defineProperty(globalThis, '__name', {
    value: (fn) => fn,
    configurable: true,
    writable: true,
  });
}`;

/** Makes privalint's in-page reads work however privalint itself was compiled. */
export async function installPageRuntime(context: BrowserContext): Promise<void> {
  await context.addInitScript({ content: NAME_HELPER });
}
