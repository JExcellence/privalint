import { type Browser, chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { installPageRuntime } from '../src/page-runtime.js';

/** What a function compiled by esbuild with keepNames looks like once Playwright sends it. */
const KEPT_NAMES = '(() => { const read = __name(() => 42, "read"); return read(); })()';

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser.close();
});

describe('installPageRuntime', () => {
  it('lets functions compiled with esbuild keepNames run in the page', async () => {
    const context = await browser.newContext();
    try {
      const bare = await context.newPage();
      await bare.setContent('<p>before</p>');
      await expect(bare.evaluate(KEPT_NAMES)).rejects.toThrow(/__name/);

      await installPageRuntime(context);
      const page = await context.newPage();
      await page.setContent('<iframe srcdoc="<p>frame</p>"></iframe>');
      expect(await page.evaluate(KEPT_NAMES)).toBe(42);
      const frame = page.frames()[1];
      await frame?.waitForLoadState();
      expect(await frame?.evaluate(KEPT_NAMES)).toBe(42);
    } finally {
      await context.close();
    }
  });

  it("leaves the page's own __name alone", async () => {
    const context = await browser.newContext();
    try {
      await installPageRuntime(context);
      const page = await context.newPage();
      await page.setContent('<script>window.__name = () => "site";</script>');
      expect(await page.evaluate('__name()')).toBe('site');
    } finally {
      await context.close();
    }
  });
});
