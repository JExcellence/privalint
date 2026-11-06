import type { BrowserContext, Frame, Locator, Page } from 'playwright';
import { classifyLoadError } from './diagnostics.js';
import { newStorageKeys, readStorageKeys } from './storage.js';
import type {
  AcceptObservation,
  CloseObservation,
  ConsentObservation,
  ControlLook,
  KeyboardReach,
  PageLink,
  RecordedCookie,
  RecordedRequest,
  SettingsObservation,
  TcfObservation,
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
    // data-testid is the v2 banner; #usercentrics-cmp-ui with data-action-type is the v3 banner
    // seen on dkb.de on 2026-10-31.
    name: 'Usercentrics',
    accept:
      '[data-testid="uc-accept-all-button"], #usercentrics-cmp-ui [data-action-type="accept"]',
    reject: '[data-testid="uc-deny-all-button"], #usercentrics-cmp-ui [data-action-type="deny"]',
    settings: '[data-testid="uc-more-button"], #usercentrics-cmp-ui [data-action-type="more"]',
    save: '[data-testid="uc-save-button"], #usercentrics-cmp-ui [data-action-type="save"]',
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
    // The Drupal module eu_cookie_compliance. The accept button was seen on mavcsoport.hu on
    // 2026-11-06; that site shows no decline button, so the reject selector is unchecked and the
    // label fallback still applies.
    name: 'EU Cookie Compliance',
    accept: '.eu-cookie-compliance-banner .agree-button',
    reject: '.eu-cookie-compliance-banner .decline-button',
  },
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
// "Acceptable Use Policy" is a footer link, not consent.
const ACCEPT_LABEL =
  /akzeptieren|annehmen|zustimmen|einwilligen|einverstanden|alles? (cookies )?(zulassen|erlauben)|\baccept(?!able)|\ballow all|\bagree\b|accepter|aceptar|accetta|accepteren|alles toestaan|elfogad/i;

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
  // Complianz documents cmplz-show-banner for a custom link: complianz.io/add-a-link-to-show-the-cookie-banner/
  '.cmplz-manage-consent, .cmplz-show-banner',
  '.cky-btn-revisit',
  '.iubenda-cs-preferences-link',
  '[data-cc="show-preferencesModal"], [data-cc="c-settings"]',
  '.osano-cm-widget',
  '.termly-display-preferences',
].join(', ');

// Word boundaries keep nav links like "Consent management platform" from matching.
const SETTINGS_LABEL =
  /(cookie|consent|datenschutz|privatsphäre|privacy|tracking)[-\s]?(einstellungen|settings|preferences|präferenzen|optionen|options|beállítások)\b|(einwilligung|zustimmung|consent)(en)?\s+(widerrufen|ändern|verwalten|anpassen|bearbeiten|withdraw|manage|change)\b|cookies?\s+(verwalten|anpassen|ändern|manage)\b|manage\s+(cookies|consent|privacy)\b|withdraw\s+(my\s+)?consent\b|paramètres des cookies|gérer (les )?cookies|süti[-\s]?beállítás|adatvédelmi beállítás|hozzájárulás (visszavonása|módosítása|kezelése)/i;

/** Opens the second layer from the first: "Einstellungen", "Customize", "More options". */
const OPEN_SETTINGS_LABEL =
  /einstellungen|anpassen|individuell|optionen|details|customi[sz]e|settings|preferences|options|paramètres|personnaliser|configurar|preferenze|impostazioni|instellingen|voorkeuren|beállítás|testreszab|további lehetőségek|részletek/i;

/** Saves the selection in the second layer. "Alle akzeptieren" never counts, see isAcceptAll. */
const SAVE_LABEL =
  /speichern|bestätigen|übernehmen|auswahl (akzeptieren|erlauben|zulassen)|\bsave\b|confirm|(accept|allow) selection|enregistrer|guardar|salva|opslaan|mentés|megerősít|kiválasztott|elfogadom a fenti/i;

// No \b around the Hungarian words: \b only knows ASCII letters, so it fails next to "ö".
const ALL_WORD = /\b(alle|alles|all|tout|tous|todo|todas|tutti|tutto)\b|összes|minden|mindet/i;

/**
 * The narrowest choice when a banner offers consent levels as radio buttons instead of switches,
 * such as "Legszűkebb szint: Alap működés" on otpbank.hu (2026-11-01).
 */
const NARROWEST_LEVEL =
  /notwendig|essenziell|erforderlich|nur technisch|necessary|essential|strictly|nécessaires|necesarias|necessari|noodzakelijk|legszűkebb|alap működés|csak (a )?(feltétlenül )?szükséges/i;

/** A tab or section for purposes processed on the basis of legitimate interest (TCF banners). */
const LEGITIMATE_INTEREST_TAB =
  /berechtigte[nsr]?\s+interesse|legitimate\s+interest|intérêt\s+légitime|interés\s+legítimo|legittimo\s+interesse|gerechtvaardigd\s+belang|jogos\s+érdek/i;

/**
 * Objecting to every legitimate-interest purpose at once. Only objection wording counts: a plain
 * "Alle ablehnen" could be the first layer's reject button, which closes the banner.
 */
const OBJECT_ALL =
  /(allen?|alles)\s+widersprechen|widerspruch\s+(gegen\s+)?alle|object\s+(to\s+)?all|s['’]opposer\s+à\s+tout|oponerse\s+a\s+todo|opporsi\s+a\s+tutt|bezwaar\s+tegen\s+alle|tiltakoz(om|ás)\s+(az?\s+)?(mind|összes)|mindegyik(nek|et)\s+elutasít/i;

/** Words that make an "all" label about the current selection, see isAcceptAll. */
const SELECTION_WORD =
  /auswahl|einstellungen|präferenzen|selection|settings|preferences|choices|sélection|préférences|selección|preferencias|selezione|preferenze|selectie|voorkeuren|kiválaszt|beállítás/i;

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
  const { found: banner, waitedMs } = await waitFor(page, options, () => findBanner(page));
  if (banner === undefined) {
    return {
      bannerFound: false,
      rejected: false,
      state: 'not-detected',
      outcome: 'no-banner-detected',
      reason: 'no-supported-banner',
      bannerWaitMs: waitedMs,
    };
  }

  const observation: ConsentObservation = {
    bannerFound: true,
    rejected: false,
    state: 'reject-unavailable',
    outcome: 'unsupported-banner',
    reason: 'no-supported-reject-control',
    bannerWaitMs: waitedMs,
    ...(banner.cmp === undefined ? {} : { cmp: banner.cmp }),
    ...(banner.acceptLabel === undefined ? {} : { acceptLabel: banner.acceptLabel }),
    ...(banner.rejectLabel === undefined ? {} : { rejectLabel: banner.rejectLabel }),
    ...(banner.payOrOk ? { payOrOk: true } : {}),
    ...(banner.links === undefined ? {} : { bannerLinks: banner.links }),
    ...(banner.text === undefined ? {} : { bannerText: banner.text }),
    ...(banner.blocking === undefined ? {} : { bannerBlocking: banner.blocking }),
    ...(banner.controls === undefined ? {} : { bannerControls: banner.controls }),
  };
  if (banner.reject === undefined) {
    if (banner.acceptLabel === undefined) observation.reason = 'unsupported-banner-markup';
    return observation;
  }
  const keyboard = await probeKeyboard(page, banner.accept, banner.reject).catch(() => undefined);
  if (keyboard !== undefined) observation.keyboard = keyboard;

  try {
    const cookiesBefore = new Set((await context.cookies()).map(cookieKey));
    const storageBefore = await readStorageKeys(page);
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
    const storage = newStorageKeys(storageBefore, await readStorageKeys(page));
    const settingsLabel = await findSettingsControl(page);
    const tcf = await readTcf(page);

    return {
      ...observation,
      rejected: true,
      state: 'reject-tested',
      outcome: 'reject-succeeded',
      reason: 'reject-clicked-and-reloaded',
      afterReject: { requests: requests.slice(firstRequest), cookies, storage },
      settingsControl:
        settingsLabel === undefined ? { found: false } : { found: true, label: settingsLabel },
      ...(tcf === undefined ? {} : { tcf }),
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
 * Closes the banner with its close button ("×", "Schließen", "Close"), reloads the page and records
 * what loads then. Closing is no choice, so anything that needs consent loading afterwards treats
 * it as one. Use a fresh browser context. Returns undefined when there is no banner.
 */
export async function observeClose(
  page: Page,
  context: BrowserContext,
  requests: RecordedRequest[],
  options: ConsentCheckOptions,
): Promise<CloseObservation | undefined> {
  if (options.signal?.aborted) throw new DOMException('Close check aborted', 'AbortError');
  const { found: banner } = await waitFor(page, options, () => findBanner(page));
  if (banner?.accept === undefined) return undefined;
  const closeLabel = await banner.accept.evaluate(markCloseControl).catch(() => undefined);
  if (closeLabel === undefined) return { outcome: 'no-close-control', reason: 'no-close-control' };
  try {
    const cookiesBefore = new Set((await context.cookies()).map(cookieKey));
    const storageBefore = await readStorageKeys(page);
    const firstRequest = requests.length;
    let control: Locator | undefined;
    for (const frame of page.frames()) {
      const candidate = frame.locator(`[${CLOSE_MARK}]`).first();
      if ((await candidate.count()) > 0) {
        control = candidate;
        break;
      }
    }
    if (control === undefined) return { outcome: 'no-close-control', reason: 'no-close-control' };
    options.onReject?.();
    await control.click({ timeout: Math.min(5_000, options.timeoutMs) });
    await settle(page, options);
    const response = await page.reload({ waitUntil: 'load', timeout: options.timeoutMs });
    if (response === null || response.status() >= 400) throw new Error('HTTP reload failed');
    await settle(page, options);
    const cookies: RecordedCookie[] = (await context.cookies())
      .filter((cookie) => !cookiesBefore.has(cookieKey(cookie)))
      .map(({ name, domain, path, expires }) => ({ name, domain, path, expires }));
    const storage = newStorageKeys(storageBefore, await readStorageKeys(page));
    return {
      outcome: 'closed',
      reason: 'banner-closed-and-reloaded',
      closeLabel,
      afterClose: { requests: requests.slice(firstRequest), cookies, storage },
    };
  } catch (error) {
    return {
      outcome: 'interaction-failed',
      reason: 'browser-interaction-failed',
      closeLabel,
      error: classifyLoadError(error),
    };
  }
}

/**
 * Whether a consent banner shows on the loaded page, waiting like the reject path does. For the
 * Global Privacy Control path, which only looks.
 */
export async function bannerShown(page: Page, options: ConsentCheckOptions): Promise<boolean> {
  const { found } = await waitFor(page, options, () => findBanner(page));
  return found !== undefined;
}

/**
 * Clicks the banner's accept button, reloads the page and records what loads then: the services
 * the site runs with consent. Use a fresh browser context, so the stored consent stays in it.
 * Returns undefined when there is no banner with an accept button.
 */
export async function observeAccept(
  page: Page,
  context: BrowserContext,
  requests: RecordedRequest[],
  options: ConsentCheckOptions,
): Promise<AcceptObservation | undefined> {
  if (options.signal?.aborted) throw new DOMException('Accept check aborted', 'AbortError');
  const { found: banner } = await waitFor(page, options, () => findBanner(page));
  if (banner?.accept === undefined) return undefined;
  const label = banner.acceptLabel === undefined ? {} : { acceptLabel: banner.acceptLabel };
  try {
    const cookiesBefore = new Set((await context.cookies()).map(cookieKey));
    const storageBefore = await readStorageKeys(page);
    const firstRequest = requests.length;
    options.onReject?.();
    await banner.accept.click({ timeout: Math.min(5_000, options.timeoutMs) });
    await settle(page, options);
    const response = await page.reload({ waitUntil: 'load', timeout: options.timeoutMs });
    if (response === null || response.status() >= 400) throw new Error('HTTP reload failed');
    await settle(page, options);
    const cookies: RecordedCookie[] = (await context.cookies())
      .filter((cookie) => !cookiesBefore.has(cookieKey(cookie)))
      .map(({ name, domain, path, expires }) => ({ name, domain, path, expires }));
    const storage = newStorageKeys(storageBefore, await readStorageKeys(page));
    return {
      outcome: 'accepted',
      reason: 'accept-clicked-and-reloaded',
      ...label,
      afterAccept: { requests: requests.slice(firstRequest), cookies, storage },
    };
  } catch (error) {
    return {
      outcome: 'interaction-failed',
      reason: 'browser-interaction-failed',
      ...label,
      error: classifyLoadError(error),
    };
  }
}

const CLOSE_MARK = 'data-privalint-close';

const KEYBOARD_MARK = 'data-privalint-key';
/** Tab presses before a control counts as out of keyboard reach. */
const MAX_TABS = 60;

/**
 * Presses Tab up to 60 times, starting where the page put focus when it loaded, and records after
 * how many presses the reject (and accept) control had focus. A control a keyboard user can't
 * reach can only be clicked with a mouse or touch. Runs before the reject click.
 */
async function probeKeyboard(
  page: Page,
  accept: Locator | undefined,
  reject: Locator,
): Promise<KeyboardReach> {
  const look = await reject.evaluate((element, mark) => {
    element.setAttribute(mark, 'reject');
    return {
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute('role'),
      tabindex: element.getAttribute('tabindex'),
    };
  }, KEYBOARD_MARK);
  await accept
    ?.evaluate((element, mark) => element.setAttribute(mark, 'accept'), KEYBOARD_MARK)
    .catch(() => undefined);
  const frames: Frame[] = [];
  for (const frame of page.frames()) {
    const marked = await frame
      .locator(`[${KEYBOARD_MARK}]`)
      .count()
      .catch(() => 0);
    if (marked > 0) frames.push(frame);
  }
  let rejectTabs: number | undefined;
  let acceptTabs: number | undefined;
  let presses = 0;
  try {
    while (
      presses < MAX_TABS &&
      (rejectTabs === undefined || (accept !== undefined && acceptTabs === undefined))
    ) {
      await page.keyboard.press('Tab');
      presses++;
      for (const frame of frames) {
        const focused = await frame.evaluate(focusedMark, KEYBOARD_MARK).catch(() => undefined);
        if (focused === 'reject') rejectTabs ??= presses;
        if (focused === 'accept') acceptTabs ??= presses;
      }
    }
  } finally {
    for (const frame of frames) {
      await frame
        .evaluate((mark) => {
          for (const element of document.querySelectorAll(`[${mark}]`)) {
            element.removeAttribute(mark);
          }
        }, KEYBOARD_MARK)
        .catch(() => undefined);
    }
    // Shadow DOM marks are out of querySelectorAll's reach; remove them through the locators.
    await reject.evaluate((element, mark) => element.removeAttribute(mark), KEYBOARD_MARK);
    await accept
      ?.evaluate((element, mark) => element.removeAttribute(mark), KEYBOARD_MARK)
      .catch(() => undefined);
  }
  return {
    presses,
    ...(rejectTabs === undefined ? {} : { rejectTabs }),
    ...(accept === undefined ? {} : { acceptTabs: acceptTabs ?? null }),
    reject: {
      tag: look.tag,
      ...(look.role === null ? {} : { role: look.role }),
      ...(look.tabindex === null ? {} : { tabindex: look.tabindex }),
    },
  };
}

/**
 * Runs in a frame. The mark of the control that has focus: the focused element itself, an
 * ancestor of it (a button inside the marked container), or the marked element inside a focused
 * button or link (the selector matched a span in it). Follows focus into shadow roots.
 */
function focusedMark(mark: string): string | undefined {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  if (active === null || active === document.body) return undefined;
  for (let node: Element | null = active; node !== null && node !== document.body; ) {
    const value = node.getAttribute(mark);
    if (value !== null) return value;
    const root = node.getRootNode();
    node = node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }
  if (active.matches('button, a[href], [role="button"], [role="link"]')) {
    return active.querySelector(`[${mark}]`)?.getAttribute(mark) ?? undefined;
  }
  return undefined;
}

/**
 * Runs in the page. Finds the banner's close control, marks it with a data attribute so it can be
 * clicked, and returns its label. A close control is a visible control in the banner layer whose
 * whole text is a close sign or word, or whose aria-label or title says "close".
 */
function markCloseControl(accept: Element): string | undefined {
  const parentOf = (node: Element): Element | null => {
    const root = node.getRootNode();
    return node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  };
  let container: Element = accept.parentElement ?? accept;
  for (let node: Element | null = accept; node !== null; node = parentOf(node)) {
    if (node === document.body || node === document.documentElement) break;
    const position = getComputedStyle(node).position;
    if (
      /^(alert)?dialog$/.test(node.getAttribute('role') ?? '') ||
      node.getAttribute('aria-modal') === 'true' ||
      position === 'fixed' ||
      position === 'sticky'
    ) {
      container = node;
    }
  }
  const words =
    'close|schließen|schliessen|bezár|bezárás|fermer|chiudi|cerrar|sluiten|zamknij|dismiss';
  const sign = new RegExp(`^(?:[×✕✖✗xX]|${words})$`, 'i');
  const named = new RegExp(`(?:^|\\s)(?:${words})(?:\\s|$)`, 'i');
  const candidates = [
    ...container.querySelectorAll('button, [role="button"], a, [aria-label], [title]'),
  ].filter((element) => element !== accept && element.getClientRects().length > 0);
  for (const element of candidates) {
    const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    const name = [element.getAttribute('aria-label'), element.getAttribute('title')]
      .filter(Boolean)
      .join(' ')
      .trim();
    // An icon-only control ("×" drawn with CSS or an SVG) is known by its aria-label or title.
    if (sign.test(text) || (text.length <= 2 && named.test(name))) {
      element.setAttribute('data-privalint-close', '1');
      return (text || name).slice(0, 80);
    }
  }
  return undefined;
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
  const { found: entry } = await waitFor(page, options, () => findSettingsEntry(page));
  if (entry === undefined) return undefined;
  if (entry.open === undefined) {
    return { outcome: 'no-settings-control', reason: 'no-settings-control' };
  }
  const timeout = Math.min(5_000, options.timeoutMs);
  // Kept when a later step fails: what was switched on in advance was seen all the same.
  let seen: { openLabel: string; preselected: string[] } | undefined;
  try {
    const openLabel = await label(entry.open);
    await entry.open.click({ timeout });
    // Layers slide or fade in; a short wait is enough, a full settle is not needed here.
    await page.waitForTimeout(Math.min(1_000, options.settleMs));
    let switchedOff = 0;
    const preselected: string[] = [];
    for (const frame of page.frames()) {
      switchedOff += await switchOffOptional(frame, preselected);
      switchedOff += await selectNarrowestLevel(frame, preselected);
    }
    seen = { openLabel, preselected };
    const legitimateInterest = await objectToLegitimateInterest(page, options);
    const save = await findSaveControl(page, entry.cmp);
    if (save === undefined) {
      return {
        outcome: 'no-save-control',
        reason: 'no-save-control',
        openLabel,
        switchedOff,
        preselected,
      };
    }
    const saveLabel = await label(save);
    const cookiesBefore = new Set((await context.cookies()).map(cookieKey));
    const storageBefore = await readStorageKeys(page);
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
    const storage = newStorageKeys(storageBefore, await readStorageKeys(page));
    const tcf = await readTcf(page);
    return {
      outcome: 'saved',
      reason: 'settings-saved-and-reloaded',
      openLabel,
      saveLabel,
      switchedOff,
      preselected,
      ...(legitimateInterest === undefined ? {} : { legitimateInterest }),
      afterSave: { requests: requests.slice(firstRequest), cookies, storage },
      ...(tcf === undefined ? {} : { tcf }),
    };
  } catch (error) {
    return {
      outcome: 'interaction-failed',
      reason: 'browser-interaction-failed',
      ...(seen ?? {}),
      error: classifyLoadError(error),
    };
  }
}

const TCF_TIMEOUT_MS = 2_000;

/**
 * Asks an IAB TCF consent manager what it stored. Every TCF banner answers `getTCData` the same
 * way, so this sees switches in collapsed sections or a "Legitimate interest" tab whether or not
 * privalint found them, and it reads only: nothing on the page is clicked.
 */
async function readTcf(page: Page): Promise<TcfObservation | undefined> {
  const data = await page
    .evaluate(
      (timeoutMs) =>
        new Promise<unknown>((resolve) => {
          const api = (window as { __tcfapi?: unknown }).__tcfapi;
          if (typeof api !== 'function') {
            resolve(undefined);
            return;
          }
          const timer = setTimeout(() => resolve(undefined), timeoutMs);
          try {
            api('getTCData', 2, (tcData: unknown, success: boolean) => {
              clearTimeout(timer);
              resolve(success ? tcData : undefined);
            });
          } catch {
            clearTimeout(timer);
            resolve(undefined);
          }
        }),
      TCF_TIMEOUT_MS,
    )
    .catch(() => undefined);
  return data === undefined || data === null ? undefined : summarizeTcf(data);
}

/** Keeps the ids that are switched on. The page's own data is untrusted, so only numbers pass. */
export function summarizeTcf(data: unknown): TcfObservation {
  const section = (name: string, key: string): Record<string, unknown> => {
    const outer = (data as Record<string, unknown>)[name];
    const inner = typeof outer === 'object' && outer !== null ? Reflect.get(outer, key) : undefined;
    return typeof inner === 'object' && inner !== null ? (inner as Record<string, unknown>) : {};
  };
  const on = (map: Record<string, unknown>) =>
    Object.entries(map)
      .filter(([id, value]) => value === true && /^\d{1,5}$/.test(id))
      .map(([id]) => Number(id))
      .sort((a, b) => a - b);
  return {
    purposesOn: on(section('purpose', 'consents')).slice(0, 50),
    legitimateInterestsOn: on(section('purpose', 'legitimateInterests')).slice(0, 50),
    vendorConsents: on(section('vendor', 'consents')).length,
    vendorLegitimateInterests: on(section('vendor', 'legitimateInterests')).length,
  };
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

/**
 * Undefined without an accept button; `{}` when there is one but nothing opens settings. The
 * settings control closest to the accept button wins, across shadow roots too (see nearestTo).
 */
async function nearestOpenControl(frame: Frame): Promise<SettingsEntry | undefined> {
  const clickable = frame.locator(CLICKABLE);
  const accept = await firstInConsentLayer(
    clickable.filter({ hasText: ACCEPT_LABEL }).filter({ hasNotText: REJECT_LABEL }),
  );
  if (accept === undefined) return undefined;
  const open = await nearestTo(
    accept,
    clickable
      .filter({ hasText: OPEN_SETTINGS_LABEL })
      .filter({ hasNotText: ACCEPT_LABEL })
      .filter({ hasNotText: REJECT_LABEL }),
  );
  return open === undefined ? {} : { open };
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

/**
 * "Alle akzeptieren" saves too, but it is the opposite of what the settings check tests. The
 * verb alone is not enough: "Alle bestätigen", "Confirm all" and "Alle übernehmen" also switch
 * everything on. A label with "all" only counts as saving when it names the selection, as in
 * "Alle Einstellungen speichern", and never when it also accepts.
 */
function isAcceptAll(text: string): boolean {
  if (!ALL_WORD.test(text)) return false;
  return ACCEPT_LABEL.test(text) || !SELECTION_WORD.test(text);
}

/**
 * Switches off every optional consent category shown in the frame and returns how many it
 * changed. Runs after the settings layer opened; the caller saves afterwards.
 */
async function switchOffOptional(frame: Frame, preselected?: string[]): Promise<number> {
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
    // A login form's "remember me" or a newsletter box is not a consent category.
    const inLayer =
      shown && (await handle.evaluate(inConsentLayer, CONSENT_CONTEXT.source).catch(() => false));
    if (inLayer) {
      const name = await handle.evaluate(toggleLabel).catch(() => '');
      // A real click, not `.checked = false`: consent managers listen for click and change events.
      await handle.click({ force: true, timeout: 2_000 }).catch(() => undefined);
      const off = await handle
        .evaluate((element) =>
          element instanceof HTMLInputElement
            ? !element.checked
            : (element as Element).getAttribute('aria-checked') !== 'true',
        )
        .catch(() => false);
      if (off) changed++;
      // The locator only matched switches that were on. One that the visitor can switch off was
      // an optional category chosen in advance; one that stays on is locked, like "necessary".
      if (off && preselected !== undefined && preselected.length < 10) preselected.push(name);
    }
    await handle.dispose();
  }
  return changed;
}

/**
 * The visible name of a consent switch: its label, aria-label or aria-labelledby, or the text of
 * the row around it. Runs in the page.
 */
function toggleLabel(node: Node): string {
  const element = node as HTMLElement;
  const byId = (element.getAttribute('aria-labelledby') ?? '')
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.innerText ?? '')
    .join(' ');
  const labels = element instanceof HTMLInputElement ? [...(element.labels ?? [])] : [];
  const text =
    labels.map((label) => label.innerText).join(' ') ||
    element.getAttribute('aria-label') ||
    byId ||
    element.closest('label')?.innerText ||
    (element.previousElementSibling as HTMLElement | null)?.innerText ||
    element.parentElement?.innerText ||
    '';
  return text.replace(/\s+/g, ' ').trim().slice(0, 80);
}

/**
 * Selects the narrowest level in each radio group of the consent layer and returns how many
 * groups it changed. A group without a radio labelled as necessary-only is left as it is: picking
 * by position could just as well pick "everything".
 */
async function selectNarrowestLevel(frame: Frame, preselected?: string[]): Promise<number> {
  const handles = await frame
    .locator('input[type="radio"]:not(:disabled)')
    .elementHandles()
    .catch(() => []);
  const groups = new Map<
    string,
    { narrowest?: (typeof handles)[number]; checked: boolean; chosen?: string }
  >();
  for (const handle of handles.slice(0, 50)) {
    const radio = await handle
      .evaluate((node) => {
        const input = node as HTMLInputElement;
        const texts = [
          ...[...(input.labels ?? [])].map((label) => label.innerText),
          input.getAttribute('aria-label'),
          input.getAttribute('title'),
        ];
        return { name: input.name, checked: input.checked, text: texts.filter(Boolean).join(' ') };
      })
      .catch(() => undefined);
    const inLayer =
      radio !== undefined &&
      radio.name !== '' &&
      (await handle.evaluate(inConsentLayer, CONSENT_CONTEXT.source).catch(() => false));
    if (inLayer) {
      const group = groups.get(radio.name) ?? { checked: false };
      if (radio.checked) group.chosen = radio.text;
      if (group.narrowest === undefined && NARROWEST_LEVEL.test(radio.text)) {
        group.narrowest = handle;
        group.checked = radio.checked;
      }
      groups.set(radio.name, group);
    }
  }
  let changed = 0;
  for (const { narrowest, checked, chosen } of groups.values()) {
    if (narrowest !== undefined && !checked) {
      // Styled radios hide the input; a forced click still fires the events the banner listens to.
      await narrowest.click({ force: true, timeout: 2_000 }).catch(() => undefined);
      const selected = await narrowest
        .evaluate((node) => (node as HTMLInputElement).checked)
        .catch(() => false);
      if (selected) changed++;
      // A wider level than necessary-only was selected before the visitor chose anything.
      if (selected && chosen !== undefined && preselected !== undefined) {
        preselected.push(chosen.trim());
      }
    }
  }
  await Promise.all(handles.map((handle) => handle.dispose()));
  return changed;
}

/**
 * TCF banners keep legitimate-interest purposes in a tab of their own, switched on by default.
 * Opens that tab inside the consent layer and objects: with an "object to all" button if there is
 * one, otherwise by switching off the toggles the tab shows. Never clicks anything that accepts.
 * Undefined when there is no such tab. The TCF readout after saving shows whether it worked.
 */
async function objectToLegitimateInterest(
  page: Page,
  options: ConsentCheckOptions,
): Promise<SettingsObservation['legitimateInterest']> {
  for (const frame of page.frames()) {
    const tab = await firstInConsentLayer(
      frame
        // Quantcast shows it as a plain button ("JOGOS ÉRDEK" on index.hu, 2026-11-01).
        .locator(`[role="tab"], summary, ${CLICKABLE}`)
        .filter({ hasText: LEGITIMATE_INTEREST_TAB })
        .filter({ hasNotText: ACCEPT_LABEL }),
    );
    if (tab !== undefined) {
      const openLabel = await label(tab);
      await tab.click({ timeout: Math.min(5_000, options.timeoutMs) }).catch(() => undefined);
      await page.waitForTimeout(Math.min(500, options.settleMs));
      const objectAll = await firstInConsentLayer(
        frame
          .locator(CLICKABLE)
          .filter({ hasText: OBJECT_ALL })
          .filter({ hasNotText: ACCEPT_LABEL }),
      );
      if (objectAll !== undefined) {
        const objectAllLabel = await label(objectAll);
        await objectAll.click({ timeout: Math.min(5_000, options.timeoutMs) });
        return { openLabel, objectAllLabel, switchedOff: 0 };
      }
      return { openLabel, switchedOff: await switchOffOptional(frame) };
    }
  }
  return undefined;
}

interface Banner {
  accept?: Locator;
  cmp?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  reject?: Locator;
  payOrOk?: boolean;
  links?: PageLink[];
  blocking?: boolean;
  text?: string;
  controls?: { accept: ControlLook; reject: ControlLook };
}

const MAX_BANNER_LINKS = 30;

/**
 * Runs in the page. The links inside the banner, and whether the banner keeps the visitor from the
 * rest of the page: a modal dialog, an overlay over at least half the viewport, or a page that
 * can't scroll while it is open. A small bar leaves the footer links reachable.
 */
function bannerLayout(accept: Element, max: number) {
  const parentOf = (node: Element): Element | null => {
    const root = node.getRootNode();
    return node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  };
  const isLayer = (node: Element) => {
    const position = getComputedStyle(node).position;
    return (
      /^(alert)?dialog$/.test(node.getAttribute('role') ?? '') ||
      node.getAttribute('aria-modal') === 'true' ||
      position === 'fixed' ||
      position === 'sticky'
    );
  };
  // The outermost layer around the accept button; without one, its direct container.
  let container: Element = accept.parentElement ?? accept;
  for (let node: Element | null = accept; node !== null; node = parentOf(node)) {
    if (node === document.body || node === document.documentElement) break;
    if (isLayer(node)) container = node;
  }
  const box = container.getBoundingClientRect();
  const covered =
    (Math.min(box.width, innerWidth) * Math.min(box.height, innerHeight)) /
    (innerWidth * innerHeight);
  const noScroll = [document.body, document.documentElement].some(
    (node) => getComputedStyle(node).overflow === 'hidden',
  );
  const blocking = container.getAttribute('aria-modal') === 'true' || covered >= 0.5 || noScroll;
  const links = [...container.querySelectorAll('a[href]')].slice(0, max).map((a) => ({
    href: (a as HTMLAnchorElement).href,
    text: [a.textContent, a.getAttribute('aria-label'), a.getAttribute('title')]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200),
  }));
  const text = ((container as HTMLElement).innerText ?? container.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2_000);
  return { links, blocking, text };
}

async function findBanner(page: Page): Promise<Banner | undefined> {
  for (const frame of page.frames()) {
    for (const cmp of KNOWN_CMPS) {
      const accept = await firstVisible(frame.locator(cmp.accept));
      if (accept !== undefined) {
        // An outdated reject selector must not turn into a "no reject" finding: try the labels
        // next to the accept button before concluding that.
        const reject =
          (await firstVisible(frame.locator(cmp.reject))) ??
          (await nearestTo(accept, frame.locator(CLICKABLE).filter({ hasText: REJECT_LABEL })));
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
    const accept = await firstInConsentLayer(
      clickable.filter({ hasText: ACCEPT_LABEL }).filter({ hasNotText: REJECT_LABEL }),
    );
    if (accept !== undefined) {
      const reject = await nearestTo(accept, clickable.filter({ hasText: REJECT_LABEL }));
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
  const banner: Banner = { accept, acceptLabel: await label(accept) };
  const layout = await accept.evaluate(bannerLayout, MAX_BANNER_LINKS).catch(() => undefined);
  if (layout !== undefined) {
    banner.links = layout.links;
    banner.blocking = layout.blocking;
    if (layout.text) banner.text = layout.text;
  }
  if (reject === undefined && (await offersSubscription(accept))) {
    banner.payOrOk = true;
  }
  if (cmp !== undefined) {
    banner.cmp = cmp;
  }
  if (reject !== undefined) {
    banner.reject = reject;
    banner.rejectLabel = await label(reject);
    const acceptLook = await accept.evaluate(controlLook).catch(() => undefined);
    const rejectLook = await reject.evaluate(controlLook).catch(() => undefined);
    if (acceptLook !== undefined && rejectLook !== undefined) {
      banner.controls = { accept: acceptLook, reject: rejectLook };
    }
  }
  return banner;
}

/**
 * Runs in the page. Whether a control looks like a button or like plain text, its size, and the
 * contrast of its text against the first solid background behind it (white if there is none).
 */
function controlLook(element: Element): ControlLook {
  // A canvas converts any CSS colour (oklch(), color(), named) to sRGB; rgb() is parsed directly.
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = (value: string): number[] | undefined => {
    const parts = /^rgba?\(([^)]*)\)$/
      .exec(value.trim())?.[1]
      ?.split(/[\s,/]+/)
      .filter((part) => part !== '')
      .map(Number);
    if (parts !== undefined && parts.length >= 3 && !parts.some(Number.isNaN)) {
      return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
    }
    if (context === null || !CSS.supports('color', value)) return undefined;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (top: number[], bottom: number[]) =>
    [0, 1, 2].map((i) => (top[i] ?? 0) * (top[3] ?? 1) + (bottom[i] ?? 0) * (1 - (top[3] ?? 1)));
  const luminance = (rgb: number[]) => {
    const [r, g, b] = rgb.map((channel) => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  };
  const parentOf = (node: Element): Element | null => {
    const root = node.getRootNode();
    return node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  };

  const style = getComputedStyle(element);
  const own = rgba(style.backgroundColor);
  const bordered = (['Top', 'Right', 'Bottom', 'Left'] as const).some(
    (side) =>
      Number.parseFloat(style[`border${side}Width`]) > 0 &&
      (rgba(style[`border${side}Color`])?.[3] ?? 0) > 0,
  );
  const filled = (own?.[3] ?? 0) > 0 || style.backgroundImage !== 'none';

  // Backgrounds from the control outwards up to the first opaque one, then stacked from the
  // outside in over white: a translucent button on a dark banner stays dark.
  const layers: number[][] = [];
  let measurable = true;
  for (let node: Element | null = element; node !== null; node = parentOf(node)) {
    const nodeStyle = getComputedStyle(node);
    const color = rgba(nodeStyle.backgroundColor);
    if (nodeStyle.backgroundImage !== 'none' || color === undefined) {
      measurable = false;
      break;
    }
    if ((color[3] ?? 0) > 0) layers.push(color);
    if ((color[3] ?? 0) >= 1) break;
  }
  const behind = measurable
    ? layers.reduceRight<number[]>((under, layer) => over(layer, under), [255, 255, 255])
    : undefined;
  const text = rgba(style.color);
  const box = element.getBoundingClientRect();
  const look: ControlLook = {
    style: filled || bordered ? 'button' : 'text',
    width: Math.round(box.width),
    height: Math.round(box.height),
  };
  if (behind !== undefined && text !== undefined) {
    const [light, dark] = [luminance(over(text, behind)), luminance(behind)].sort((a, b) => b - a);
    look.contrast = Math.round((((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)) * 10) / 10;
  }
  return look;
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

/**
 * Runs in the page. True when the element sits in something that looks like a consent layer:
 * a dialog, a fixed or sticky overlay, or a small container that talks about cookies or consent.
 * A shop's "Angebot annehmen" or a login form's "Angemeldet bleiben" box is in none of these.
 * Self-contained, because Playwright sends its source text to the browser.
 */
function inConsentLayer(element: Element, contextSource: string): boolean {
  const context = new RegExp(contextSource, 'i');
  const parentOf = (node: Element): Element | null => {
    const root = node.getRootNode();
    return node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  };
  for (let node: Element | null = element; node !== null; node = parentOf(node)) {
    if (node === document.body || node === document.documentElement) return false;
    const style = getComputedStyle(node);
    const text = (node as HTMLElement).innerText ?? '';
    if (
      /^(alert)?dialog$/.test(node.getAttribute('role') ?? '') ||
      node.getAttribute('aria-modal') === 'true' ||
      style.position === 'fixed' ||
      style.position === 'sticky' ||
      (text.length <= 5_000 && context.test(text))
    )
      return true;
  }
  return false;
}

/**
 * Runs in the page. True for a link to another page, such as "Accept our terms" in a footer menu.
 * A banner's buttons stay on the page; links to "#" or `javascript:` count as buttons.
 */
function leavesPage(element: Element): boolean {
  const href = element.tagName === 'A' ? element.getAttribute('href') : null;
  if (href === null || href === '' || href.startsWith('#') || /^javascript:/i.test(href)) {
    return false;
  }
  const target = new URL(href, location.href);
  return target.pathname + target.search !== location.pathname + location.search;
}

/** First visible match that sits in a consent layer, see inConsentLayer. */
async function firstInConsentLayer(locator: Locator): Promise<Locator | undefined> {
  const count = await locator.count().catch(() => 0);
  for (let i = 0; i < Math.min(count, 10); i++) {
    const candidate = locator.nth(i);
    if (
      (await candidate.isVisible().catch(() => false)) &&
      !(await candidate.evaluate(leavesPage).catch(() => true)) &&
      (await candidate.evaluate(inConsentLayer, CONSENT_CONTEXT.source).catch(() => false))
    ) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * The visible candidate that shares the deepest container with `anchor`, below <body>. A reject
 * button elsewhere on the page shares only <body> with the banner's accept button and never wins.
 */
async function nearestTo(anchor: Locator, candidates: Locator): Promise<Locator | undefined> {
  const handle = await anchor.elementHandle({ timeout: 1_000 }).catch(() => null);
  if (handle === null) return undefined;
  const index = await candidates
    .evaluateAll((elements, anchorElement) => {
      const parentOf = (node: Element): Element | null => {
        const root = node.getRootNode();
        return node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
      };
      // Every container of the anchor, with its depth counted from <html>.
      const chain: Element[] = [];
      for (let node: Element | null = anchorElement; node !== null; node = parentOf(node)) {
        chain.unshift(node);
      }
      let best = -1;
      let bestDepth = -1;
      elements.forEach((element, position) => {
        if (element.getClientRects().length === 0) return;
        let shared: Element | null = element;
        while (shared !== null && !chain.includes(shared)) shared = parentOf(shared);
        const depth = shared === null ? -1 : chain.indexOf(shared);
        const belowBody =
          shared !== null && shared !== document.body && shared !== document.documentElement;
        if (belowBody && depth > bestDepth) {
          best = position;
          bestDepth = depth;
        }
      });
      return best;
    }, handle)
    .catch(() => -1);
  await handle.dispose();
  return index < 0 ? undefined : candidates.nth(index);
}

const BANNER_POLL_MS = 500;

/**
 * Some consent managers render after a geo lookup or a tag-manager rule, after the page settled.
 * Without a result, looks again every half second for up to one more settle period, so a scan
 * with `--settle 0` doesn't wait at all. `waitedMs` is the extra time spent.
 */
async function waitFor<T>(
  page: Page,
  options: ConsentCheckOptions,
  find: () => Promise<T | undefined>,
): Promise<{ found: T | undefined; waitedMs: number }> {
  let found = await find();
  if (found !== undefined) return { found, waitedMs: 0 };
  const started = performance.now();
  let left = options.settleMs;
  while (found === undefined && left > 0 && !options.signal?.aborted) {
    await page.waitForTimeout(Math.min(BANNER_POLL_MS, left));
    found = await find();
    left = options.settleMs - (performance.now() - started);
  }
  return { found, waitedMs: Math.round(performance.now() - started) };
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
