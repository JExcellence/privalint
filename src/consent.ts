import type { BrowserContext, Locator, Page } from 'playwright';
import { classifyLoadError } from './diagnostics.js';
import type { ConsentObservation, RecordedCookie, RecordedRequest } from './types.js';

interface CmpSelectors {
  name: string;
  accept: string;
  reject: string;
}

/**
 * Button selectors of common consent managers. Best effort: vendors change
 * their markup, so the label heuristic below is the fallback for everything
 * that isn't listed or no longer matches.
 */
const KNOWN_CMPS: readonly CmpSelectors[] = [
  {
    name: 'Cookiebot',
    accept:
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, #CybotCookiebotDialogBodyButtonAccept',
    reject: '#CybotCookiebotDialogBodyButtonDecline',
  },
  {
    name: 'OneTrust',
    accept: '#onetrust-accept-btn-handler',
    reject: '#onetrust-reject-all-handler',
  },
  {
    name: 'Usercentrics',
    accept: '[data-testid="uc-accept-all-button"]',
    reject: '[data-testid="uc-deny-all-button"]',
  },
  {
    name: 'Borlabs Cookie',
    accept: '#BorlabsCookieBox [data-cookie-accept-all]',
    reject: '#BorlabsCookieBox [data-cookie-refuse]',
  },
  {
    name: 'Complianz',
    accept: '.cmplz-cookiebanner .cmplz-accept',
    reject: '.cmplz-cookiebanner .cmplz-deny',
  },
  { name: 'CookieYes', accept: '.cky-btn-accept', reject: '.cky-btn-reject' },
  {
    name: 'Didomi',
    accept: '#didomi-notice-agree-button',
    reject: '#didomi-notice-disagree-button',
  },
  { name: 'consentmanager', accept: '.cmpboxbtnyes', reject: '.cmpboxbtnno' },
  { name: 'iubenda', accept: '.iubenda-cs-accept-btn', reject: '.iubenda-cs-reject-btn' },
  { name: 'Klaro', accept: '.klaro .cm-btn-success', reject: '.klaro .cm-btn-decline' },
  {
    name: 'CookieConsent',
    accept: '#cc-main [data-role="all"]',
    reject: '#cc-main [data-role="necessary"]',
  },
  {
    name: 'CookieFirst',
    accept:
      '[data-cookiefirst-action="accept"], :is(#cookiefirst-root, .cookiefirst-root) [data-testid="actionButton-accept"]',
    reject:
      '[data-cookiefirst-action="reject"], :is(#cookiefirst-root, .cookiefirst-root) [data-testid="actionButton-reject"]',
  },
  {
    name: 'Osano',
    accept: '.osano-cm-accept-all',
    // osano.com serves `osano-cm-denyAll`; the dashed form is kept for older loader versions.
    reject: '.osano-cm-denyAll, .osano-cm-deny-all',
  },
  {
    name: 'Termly',
    accept: '[data-tid="banner-accept"], [class*="termly-styles-module-acceptButton-"]',
    reject: '[data-tid="banner-decline"]',
  },
  {
    name: 'Sourcepoint',
    accept: 'button.sp_choice_type_11',
    reject: 'button.sp_choice_type_13',
  },
];

// Unanchored on purpose: "Alle Cookies akzeptieren" and "Accept all cookies" must both match.
// Labels that also match REJECT_LABEL ("Nur notwendige akzeptieren") are never treated as accept.
const ACCEPT_LABEL =
  /akzeptieren|annehmen|zustimmen|einwilligen|einverstanden|alles? (cookies )?(zulassen|erlauben)|\baccept|\ballow all|\bagree\b|accepter|aceptar|accetta|accepteren|alles toestaan/i;

const REJECT_LABEL =
  /ablehnen|verweigern|nur (technisch )?(notwendige|essenzielle|erforderliche)|\breject|\bdecline|\bdeny\b|\brefuse|(only|use) (strictly )?(necessary|essential|required)|refuser|continuer sans accepter|rechazar|rifiuta|weigeren|alleen noodzakelijke/i;

/** Second option on "pay or OK" banners: accept tracking or take out a subscription. */
const SUBSCRIBE = /abonn|\babo\b|subscri|werbefrei|ohne werbung|ad-free|without ads|\bpur\b/i;

/** A frame without any of these words is not showing a consent banner. */
const CONSENT_CONTEXT = /cookie|consent|einwillig|tracking|datenschutz|privacy/i;

const CLICKABLE = 'button, [role="button"], a, input[type="button"], input[type="submit"]';

export interface ConsentCheckOptions {
  settleMs: number;
  timeoutMs: number;
  signal?: AbortSignal;
  onReject?: () => void;
  onTimeout?: () => void;
}

/**
 * Looks for a consent banner, clicks its reject button if there is one,
 * reloads the page and records what still gets loaded. The page must already
 * be loaded; `requests` is the live array the page's request listener writes to.
 */
export async function observeConsent(
  page: Page,
  context: BrowserContext,
  requests: RecordedRequest[],
  options: ConsentCheckOptions,
): Promise<ConsentObservation> {
  if (options.signal?.aborted) throw new DOMException('Consent check aborted', 'AbortError');
  const banner = await findBanner(page);
  if (banner === undefined) {
    return {
      bannerFound: false,
      rejected: false,
      state: 'not-detected',
      outcome: 'no-banner-detected',
      reason: 'no-supported-banner',
    };
  }

  const observation: ConsentObservation = {
    bannerFound: true,
    rejected: false,
    state: 'reject-unavailable',
    outcome: 'unsupported-banner',
    reason: 'no-supported-reject-control',
    ...(banner.cmp === undefined ? {} : { cmp: banner.cmp }),
    ...(banner.acceptLabel === undefined ? {} : { acceptLabel: banner.acceptLabel }),
    ...(banner.rejectLabel === undefined ? {} : { rejectLabel: banner.rejectLabel }),
    ...(banner.payOrOk ? { payOrOk: true } : {}),
  };
  if (banner.reject === undefined) {
    if (banner.acceptLabel === undefined) observation.reason = 'unsupported-banner-markup';
    return observation;
  }

  try {
    const cookiesBefore = new Set((await context.cookies()).map(cookieKey));
    const firstRequest = requests.length;

    options.onReject?.();
    await banner.reject.click({ timeout: Math.min(5_000, options.timeoutMs) });
    await settle(page, options);
    const response = await page.reload({ waitUntil: 'load', timeout: options.timeoutMs });
    if (response === null || response.status() >= 400) throw new Error('HTTP reload failed');
    await settle(page, options);

    const cookies: RecordedCookie[] = (await context.cookies())
      .filter((cookie) => !cookiesBefore.has(cookieKey(cookie)))
      .map(({ name, domain, path, expires }) => ({ name, domain, path, expires }));

    return {
      ...observation,
      rejected: true,
      state: 'reject-tested',
      outcome: 'reject-succeeded',
      reason: 'reject-clicked-and-reloaded',
      afterReject: { requests: requests.slice(firstRequest), cookies },
    };
  } catch (error) {
    return {
      ...observation,
      state: 'interaction-failed',
      outcome: 'interaction-failed',
      reason: 'browser-interaction-failed',
      error: classifyLoadError(error),
    };
  }
}

interface Banner {
  cmp?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  reject?: Locator;
  payOrOk?: boolean;
}

async function findBanner(page: Page): Promise<Banner | undefined> {
  for (const frame of page.frames()) {
    for (const cmp of KNOWN_CMPS) {
      const accept = await firstVisible(frame.locator(cmp.accept));
      if (accept !== undefined) {
        const reject = await firstVisible(frame.locator(cmp.reject));
        return describe(accept, reject, cmp.name);
      }
    }
  }

  // Unknown or self-built banners: go by button labels, in every frame.
  for (const frame of page.frames()) {
    const text = await frame
      .locator('body')
      .innerText({ timeout: 2_000 })
      .catch(() => '');
    if (!CONSENT_CONTEXT.test(text)) {
      continue;
    }
    const clickable = frame.locator(CLICKABLE);
    const accept = await firstVisible(
      clickable.filter({ hasText: ACCEPT_LABEL }).filter({ hasNotText: REJECT_LABEL }),
    );
    if (accept !== undefined) {
      const reject = await firstVisible(clickable.filter({ hasText: REJECT_LABEL }));
      const realCookieBanner = await frame
        .locator('script')
        .evaluateAll((elements) =>
          elements.some((element) =>
            /real-cookie-banner|devowl-wp-react-cookie-banner/i.test(
              (element.getAttribute('src') ?? '') + (element.textContent ?? ''),
            ),
          ),
        )
        .catch(() => false);
      const cmp = realCookieBanner ? 'Real Cookie Banner' : undefined;
      return describe(accept, reject, cmp);
    }
  }
  // Recognizable consent UI with unsupported controls is different from no banner detected.
  for (const frame of page.frames()) {
    const candidates = frame.locator(
      '[role="dialog"], [aria-modal="true"], [id*="cookie-banner"], [class*="cookie-banner"]',
    );
    const count = Math.min(await candidates.count().catch(() => 0), 10);
    for (let index = 0; index < count; index++) {
      const candidate = candidates.nth(index);
      if (!(await candidate.isVisible().catch(() => false))) continue;
      const text = await candidate.innerText({ timeout: 500 }).catch(() => '');
      if (
        CONSENT_CONTEXT.test(text) &&
        (await candidate
          .locator(CLICKABLE)
          .count()
          .catch(() => 0)) > 0
      )
        return {};
    }
  }
  return undefined;
}

async function describe(accept: Locator, reject: Locator | undefined, cmp?: string) {
  const banner: Banner = { acceptLabel: await label(accept) };
  if (reject === undefined && (await offersSubscription(accept))) {
    banner.payOrOk = true;
  }
  if (cmp !== undefined) {
    banner.cmp = cmp;
  }
  if (reject !== undefined) {
    banner.reject = reject;
    banner.rejectLabel = await label(reject);
  }
  return banner;
}

/**
 * Walks up from the accept button to the banner's outermost container below
 * <body> and looks for a subscription offer among its buttons and links. The
 * site's own navigation lives outside that container, so its "Abo" link
 * doesn't count.
 */
async function offersSubscription(accept: Locator): Promise<boolean> {
  return accept
    .evaluate((element, source) => {
      const pattern = new RegExp(source, 'i');
      const parentOf = (node: Element): Element | null => {
        const root = node.getRootNode();
        return node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
      };
      let container: Element = element;
      for (let parent = parentOf(container); parent !== null; parent = parentOf(container)) {
        if (parent === document.body || parent === document.documentElement) {
          break;
        }
        container = parent;
      }
      return [...container.querySelectorAll('a, button, [role="button"]')].some((control) =>
        pattern.test((control as HTMLElement).innerText ?? ''),
      );
    }, SUBSCRIBE.source)
    .catch(() => false);
}

async function firstVisible(locator: Locator): Promise<Locator | undefined> {
  const count = await locator.count().catch(() => 0);
  for (let i = 0; i < Math.min(count, 10); i++) {
    const candidate = locator.nth(i);
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }
  return undefined;
}

async function label(locator: Locator): Promise<string> {
  const text = await locator.innerText({ timeout: 1_000 }).catch(() => '');
  const value = text.trim() || ((await locator.getAttribute('value').catch(() => null)) ?? '');
  return value.replace(/\s+/g, ' ').trim().slice(0, 80);
}

async function settle(page: Page, options: ConsentCheckOptions): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: options.timeoutMs }).catch(() => {
    options.onTimeout?.();
  });
  await page.waitForTimeout(options.settleMs);
}

const cookieKey = (cookie: { name: string; domain: string; path: string }) =>
  `${cookie.name}|${cookie.domain}|${cookie.path}`;
