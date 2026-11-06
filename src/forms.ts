import type { Page } from 'playwright';
import { PRIVACY_POLICY } from './rules/privacy-policy-link.js';
import type { FormObservation } from './types.js';

const MAX_FORMS = 20;

/**
 * Visible forms that collect personal data (an email, phone or password field), and whether a link
 * to the privacy policy sits in the form or right around it. Search forms don't count. Only the
 * structure is read, never what is typed in.
 */
export async function readForms(page: Page): Promise<FormObservation[]> {
  return page
    .evaluate(
      ([source, max]) => {
        const privacy = new RegExp(source, 'i');
        const mentionsPrivacy = (root: Element) =>
          [...root.querySelectorAll('a[href]')].some((a) => {
            let path = '';
            try {
              path = decodeURIComponent(new URL((a as HTMLAnchorElement).href).pathname);
            } catch {
              // A broken href has no path to match; the text still counts.
            }
            return privacy.test(a.textContent ?? '') || privacy.test(path);
          });
        const labelOf = (box: HTMLInputElement) =>
          (
            [...(box.labels ?? [])].map((label) => label.textContent).join(' ') ||
            box.getAttribute('aria-label') ||
            box.closest('label, p, li, div')?.textContent ||
            ''
          )
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120);
        const result: {
          kind: 'login' | 'contact';
          privacyNearby: boolean;
          checkedBoxes?: string[];
          httpAction?: string;
        }[] = [];
        for (const form of [...document.forms].slice(0, max)) {
          const search =
            form.getAttribute('role') === 'search' ||
            form.querySelector('input[type="search"]') !== null ||
            /search|suche|keres/i.test(form.getAttribute('action') ?? '');
          const login = form.querySelector('input[type="password"]') !== null;
          const contact =
            form.querySelector('input[type="email"], input[type="tel"], input[name*="mail" i]') !==
            null;
          if (search || !(login || contact) || form.getClientRects().length === 0) continue;
          // The form and its surroundings, as long as they are small enough not to be the page.
          let around: Element = form;
          for (const parent of [form.parentElement, form.parentElement?.parentElement]) {
            if (parent && parent !== document.body && (parent.textContent ?? '').length < 3_000) {
              around = parent;
            }
          }
          const checkedBoxes = [
            ...form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
          ]
            .filter((box) => box.checked)
            .map(labelOf)
            .filter(Boolean)
            .slice(0, 5);
          const targets = [
            form.action,
            ...[...form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('[formaction]')].map(
              (button) => button.formAction,
            ),
          ];
          const httpAction = targets.find((target) => /^http:/i.test(target));
          result.push({
            kind: login ? 'login' : 'contact',
            privacyNearby: mentionsPrivacy(around),
            ...(checkedBoxes.length > 0 ? { checkedBoxes } : {}),
            ...(httpAction === undefined ? {} : { httpAction }),
          });
        }
        return result;
      },
      [PRIVACY_POLICY.source, MAX_FORMS] as const,
    )
    .catch(() => []);
}
