import type { BrowserContext, Frame, Locator, Page } from 'playwright';
import { classifyLoadError } from './diagnostics.js';
import type {
  ConsentObservation,
  RecordedCookie,
  RecordedRequest,
  SettingsObservation,
} from './types.js';

interface CmpSelectors {
  name: string;
  accept: string;
  reject: string;
  /** Opens the settings layer from the first layer. */
  settings?: string;
  /** Saves the current selection in the settings layer. */
  save?: string;
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
    settings: '#CybotCookiebotDialogBodyLevelButtonCustomize',
    save: '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection',
  },
  {
    name: 'OneTrust',
    accept: '#onetrust-accept-btn-handler',
    reject: '#onetrust-reject-all-handler',
    settings: '#onetrust-pc-btn-handler',
    save: '.save-preference-btn-handler',
  },
  {
    name: 'Usercentrics',
    accept: '[data-testid="uc-accept-all-button"]',
    reject: '[data-testid="uc-deny-all-button"]',
    settings: '[data-testid="uc-more-button"]',
    save: '[data-testid="uc-save-button"]',
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
    settings: '.cmplz-cookiebanner .cmplz-view-preferences',
    save: '.cmplz-cookiebanner .cmplz-save-preferences',
  },
  {
    name: 'CookieYes',
    accept: '.cky-btn-accept',
    reject: '.cky-btn-reject',
    settings: '.cky-btn-customize',
    save: '.cky-btn-preferences',
  },
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
    settings: '#cc-main [data-role="show"]',
    save: '#cc-main [data-role="save"]',
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
  // The five below were read from live banners on 2026-10-28: axeptio.eu, trustarc.com,
  // tradedoubler.com (CookieHub), cookieinformation.com and cookie-script.com.
  { name: 'Axeptio', accept: '#axeptio_btn_acceptAll', reject: '#axeptio_btn_dismiss' },
  {
    name: 'TrustArc',
    accept: '.ta-modal-primary-btn[data-button-key="accept_all"]',
    reject: '.ta-modal-primary-btn[data-button-key="decline_all"]',
  },
  { name: 'CookieHub', accept: '.ch2-allow-all-btn', reject: '.ch2-deny-all-btn' },
  {
    name: 'Cookie Information',
    accept: '[data-testid="coi-banner__accept-all-categories-button"]',
    reject: '[data-testid="coi-banner__decline-all-categories-button"]',
  },
  { name: 'Cookie-Script', accept: '#cookiescript_accept', reject: '#cookiescript_reject' },
];

// Unanchored on purpose: "Alle Cookies akzeptieren" and "Accept all cookies" must both match.
// Labels that also match REJECT_LABEL ("Nur notwendige akzeptieren") are never treated as accept.
const ACCEPT_LABEL =
  /akzeptieren|annehmen|zustimmen|einwilligen|einverstanden|alles? (cookies )?(zulassen|erlauben)|\baccept|\ballow all|\bagree\b|accepter|aceptar|accetta|accepteren|alles toestaan|elfogad/i;

const REJECT_LABEL =
  /ablehnen|verweigern|nur (technisch )?(notwendige|essenzielle|erforderliche)|\breject|\bdecline|\bdeny\b|\brefuse|(only|use) (strictly )?(necessary|essential|required)|refuser|continuer sans accepter|rechazar|rifiuta|weigeren|alleen noodzakelijke|elutasít|csak a (feltétlenül )?szükséges/i;

/** Second option on "pay or OK" banners: accept tracking or take out a subscription. */
const SUBSCRIBE = /abonn|\babo\b|subscri|werbefrei|ohne werbung|ad-free|without ads|\bpur\b/i;

/** A frame without any of these words is not showing a consent banner. */
const CONSENT_CONTEXT =
  /cookie|consent|einwillig|tracking|datenschutz|privacy|süti|hozzájárul|adatvédel/i;

const CLICKABLE = 'button, [role="button"], a, input[type="button"], input[type="submit"]';

/** JavaScript calls that consent managers document for reopening their settings. */
const REOPEN_CALLS = [
  'Cookiebot.renew',
  'UC_UI.showSecondLayer',
  'Didomi.preferences.show',
  'klaro.show',
  'displayPreferenceModal',
  'loadPrivacyManagerModal',
];

/**
 * Floating buttons and footer links that reopen the settings after a choice was made. Best
 * effort like KNOWN_CMPS; the label heuristic below catches self-built links.
 */
const REOPEN_CONTROLS = [
  ...REOPEN_CALLS.flatMap((call) => [`a[href*="${call}"]`, `[onclick*="${call}"]`]),
  '#CookiebotWidget',
  '.ot-sdk-show-settings, #ot-sdk-btn-floating',
  '[data-testid="uc-privacy-button"]',
  '.cmplz-manage-consent',
  '.cky-btn-revisit',
  '.iubenda-cs-preferences-link',
  '[data-cc="show-preferencesModal"], [data-cc="c-settings"]',
  '.osano-cm-widget',
  '.termly-display-preferences',
].join(', ');

// Word boundaries keep nav links like "Consent management platform" from matching.
const SETTINGS_LABEL =
  /(cookie|consent|datenschutz|privatsphäre|privacy|tracking)[-\s]?(einstellungen|settings|preferences|präferenzen|optionen|options)\b|(einwilligung|zustimmung|consent)(en)?\s+(widerrufen|ändern|verwalten|anpassen|bearbeiten|withdraw|manage|change)\b|cookies?\s+(verwalten|anpassen|ändern|manage)\b|manage\s+(cookies|consent|privacy)\b|withdraw\s+(my\s+)?consent\b|paramètres des cookies|gérer (les )?cookies|süti[-\s]?beállítás|adatvédelmi beállítás|hozzájárulás (visszavonása|módosítása|kezelése)/i;

/** Opens the second layer from the first: "Einstellungen", "Customize", "More options". */
const OPEN_SETTINGS_LABEL =
  /einstellungen|anpassen|individuell|optionen|details|customi[sz]e|settings|preferences|options|paramètres|personnaliser|configurar|preferenze|impostazioni|instellingen|voorkeuren|beállítás|testreszab|további lehetőségek|részletek/i;

/** Saves the selection in the second layer. "Alle akzeptieren" never counts, see isAcceptAll. */
const SAVE_LABEL =
  /speichern|bestätigen|übernehmen|auswahl (akzeptieren|erlauben|zulassen)|\bsave\b|confirm|(accept|allow) selection|enregistrer|guardar|salva|opslaan|mentés|megerősít|kiválasztottak (engedélyezése|elfogadása)/i;

// No \b around the Hungarian words: \b only knows ASCII letters, so it fails next to "ö".
const ALL_WORD = /\b(alle|alles|all|tout|tous|todo|todas|tutti|tutto)\b|összes|minden|mindet/i;

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
    const settingsLabel = await findSettingsControl(page);

    return {
      ...observation,
      rejected: true,
      state: 'reject-tested',
      outcome: 'reject-succeeded',
      reason: 'reject-clicked-and-reloaded',
      afterReject: { requests: requests.slice(firstRequest), cookies },
      settingsControl:
        settingsLabel === undefined ? { found: false } : { found: true, label: settingsLabel },
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

/**
 * Opens the settings layer of the consent banner, switches off every optional category, saves,
 * reloads the page and records what still gets loaded. Use a fresh browser context: a choice
 * stored by an earlier reject would hide the banner. Returns undefined when there is no banner.
 */
export async function observeSettings(
  page: Page,
  context: BrowserContext,
  requests: RecordedRequest[],
  options: ConsentCheckOptions,
): Promise<SettingsObservation | undefined> {
  if (options.signal?.aborted) throw new DOMException('Settings check aborted', 'AbortError');
  const entry = await findSettingsEntry(page);
  if (entry === undefined) return undefined;
  if (entry.open === undefined) {
    return { outcome: 'no-settings-control', reason: 'no-settings-control' };
  }
  const timeout = Math.min(5_000, options.timeoutMs);
  try {
    const openLabel = await label(entry.open);
    await entry.open.click({ timeout });
    // Layers slide or fade in; a short wait is enough, a full settle is not needed here.
    await page.waitForTimeout(Math.min(1_000, options.settleMs));
    let switchedOff = 0;
    for (const frame of page.frames()) {
      switchedOff += await switchOffOptional(frame);
    }
    const save = await findSaveControl(page, entry.cmp);
    if (save === undefined) {
      return { outcome: 'no-save-control', reason: 'no-save-control', openLabel, switchedOff };
    }
    const saveLabel = await label(save);
    const cookiesBefore = new Set((await context.cookies()).map(cookieKey));
    const firstRequest = requests.length;

    options.onReject?.();
    await save.click({ timeout });
    await settle(page, options);
    const response = await page.reload({ waitUntil: 'load', timeout: options.timeoutMs });
    if (response === null || response.status() >= 400) throw new Error('HTTP reload failed');
    await settle(page, options);

    const cookies: RecordedCookie[] = (await context.cookies())
      .filter((cookie) => !cookiesBefore.has(cookieKey(cookie)))
      .map(({ name, domain, path, expires }) => ({ name, domain, path, expires }));
    return {
      outcome: 'saved',
      reason: 'settings-saved-and-reloaded',
      openLabel,
      saveLabel,
      switchedOff,
      afterSave: { requests: requests.slice(firstRequest), cookies },
    };
  } catch (error) {
    return {
      outcome: 'interaction-failed',
      reason: 'browser-interaction-failed',
      error: classifyLoadError(error),
    };
  }
}

interface SettingsEntry {
  cmp?: CmpSelectors;
  open?: Locator;
}

/**
 * Finds the banner and the control on it that opens the settings layer. Known consent managers go
 * by selector; otherwise the label closest to the banner's accept button wins, so a "Cookie
 * settings" link in the footer is not mistaken for the banner's own.
 */
async function findSettingsEntry(page: Page): Promise<SettingsEntry | undefined> {
  for (const frame of page.frames()) {
    for (const cmp of KNOWN_CMPS) {
      if ((await firstVisible(frame.locator(cmp.accept))) === undefined) continue;
      const open = cmp.settings ? await firstVisible(frame.locator(cmp.settings)) : undefined;
      if (open !== undefined) return { cmp, open };
      // Selector missing or outdated: try the labels in this frame before giving up.
      return { cmp, ...(await nearestOpenControl(frame)) };
    }
  }
  for (const frame of page.frames()) {
    const text = await frame
      .locator('body')
      .innerText({ timeout: 2_000 })
      .catch(() => '');
    if (!CONSENT_CONTEXT.test(text)) continue;
    const found = await nearestOpenControl(frame);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Undefined without an accept button; `{}` when there is one but nothing opens settings. */
async function nearestOpenControl(frame: Frame): Promise<SettingsEntry | undefined> {
  const clickable = frame.locator(CLICKABLE);
  const accept = await firstVisible(
    clickable.filter({ hasText: ACCEPT_LABEL }).filter({ hasNotText: REJECT_LABEL }),
  );
  if (accept === undefined) return undefined;
  const handle = await accept.elementHandle({ timeout: 1_000 }).catch(() => null);
  if (handle === null) return {};
  const index = await clickable
    .evaluateAll(
      (elements, [acceptElement, open, accepting, rejecting]) => {
        const patterns = [open, accepting, rejecting].map((source) => new RegExp(source, 'i'));
        const [isOpen, isAccept, isReject] = patterns as [RegExp, RegExp, RegExp];
        const depth = (node: Node | null) => {
          let levels = 0;
          for (let current = node; current !== null; current = current.parentNode) levels++;
          return levels;
        };
        let best = -1;
        let bestDepth = 0;
        (elements as HTMLElement[]).forEach((element, position) => {
          const name = element.innerText ?? '';
          if (!isOpen.test(name) || isAccept.test(name) || isReject.test(name)) return;
          if (element.getClientRects().length === 0) return;
          // Depth of the deepest element containing both: higher means closer to the banner.
          let shared: Node | null = element;
          while (shared !== null && !shared.contains(acceptElement as Node)) {
            shared = shared.parentNode;
          }
          const sharedDepth = depth(shared);
          if (shared !== document.body && sharedDepth > bestDepth) {
            best = position;
            bestDepth = sharedDepth;
          }
        });
        return best;
      },
      [handle, OPEN_SETTINGS_LABEL.source, ACCEPT_LABEL.source, REJECT_LABEL.source] as const,
    )
    .catch(() => -1);
  await handle.dispose();
  return index < 0 ? {} : { open: clickable.nth(index) };
}

async function findSaveControl(page: Page, cmp?: CmpSelectors): Promise<Locator | undefined> {
  for (const frame of page.frames()) {
    if (cmp?.save !== undefined) {
      const known = await firstVisible(frame.locator(cmp.save));
      if (known !== undefined) return known;
    }
  }
  for (const frame of page.frames()) {
    const candidates = frame
      .locator(CLICKABLE)
      .filter({ hasText: SAVE_LABEL })
      .filter({ hasNotText: REJECT_LABEL });
    const count = Math.min(await candidates.count().catch(() => 0), 10);
    for (let index = 0; index < count; index++) {
      const candidate = candidates.nth(index);
      if (!(await candidate.isVisible().catch(() => false))) continue;
      if (!isAcceptAll(await label(candidate))) return candidate;
    }
  }
  return undefined;
}

/** "Alle akzeptieren" saves too, but it is the opposite of what the settings check tests. */
function isAcceptAll(text: string): boolean {
  return ACCEPT_LABEL.test(text) && ALL_WORD.test(text);
}

/**
 * Switches off every optional consent category shown in the frame and returns how many it
 * changed. Runs after the settings layer opened; the caller saves afterwards.
 */
async function switchOffOptional(frame: Frame): Promise<number> {
  // Disabled controls are the "necessary" category; they stay on.
  const handles = await frame
    .locator(
      'input[type="checkbox"]:checked:not(:disabled), ' +
        '[role="switch"][aria-checked="true"]:not([aria-disabled="true"])',
    )
    .elementHandles()
    .catch(() => []);
  let changed = 0;
  for (const handle of handles.slice(0, 50)) {
    // Styled toggles hide the input itself, so a visible label counts too. Collapsed vendor
    // lists stay as they are: switching off their category covers them.
    const shown = await handle
      .evaluate((node) => {
        const element = node as Element;
        const target = element.closest('label') ?? element;
        return (
          [element, target].some((candidate) => candidate.getClientRects().length > 0) &&
          getComputedStyle(target).visibility !== 'hidden'
        );
      })
      .catch(() => false);
    // A real click, not `.checked = false`: consent managers listen for click and change events.
    if (shown) await handle.click({ force: true, timeout: 2_000 }).catch(() => undefined);
    const off = await handle
      .evaluate((element) =>
        element instanceof HTMLInputElement
          ? !element.checked
          : (element as Element).getAttribute('aria-checked') !== 'true',
      )
      .catch(() => false);
    if (off) changed++;
    await handle.dispose();
  }
  return changed;
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

/**
 * Looks for a visible way back into the consent settings once the banner is gone. Returns the
 * control's label, or undefined if there is none. Icon buttons count by aria-label or title.
 */
async function findSettingsControl(page: Page): Promise<string | undefined> {
  for (const frame of page.frames()) {
    const widget = await firstVisible(frame.locator(REOPEN_CONTROLS));
    if (widget !== undefined) {
      return (await label(widget)) || ((await widget.getAttribute('aria-label')) ?? 'widget');
    }
  }
  for (const frame of page.frames()) {
    const match = await frame
      .locator(CLICKABLE)
      .evaluateAll((elements, source) => {
        const pattern = new RegExp(source, 'i');
        const shown = (element: HTMLElement) =>
          element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
        for (const element of elements as HTMLElement[]) {
          const name = [
            element.innerText,
            element.getAttribute('aria-label'),
            element.getAttribute('title'),
          ].find((text) => text && pattern.test(text));
          if (name && shown(element)) return name.replace(/\s+/g, ' ').trim().slice(0, 80);
        }
        return undefined;
      }, SETTINGS_LABEL.source)
      .catch(() => undefined);
    if (match !== undefined) return match;
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
