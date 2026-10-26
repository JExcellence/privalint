import { findCdn } from '../data/third-parties.js';
import type { Finding, Rule } from '../types.js';
import { groupRequestsByVendor } from './third-party-hits.js';

const ID = 'third-party-cdns';

export const thirdPartyCdns: Rule = {
  id: ID,
  title: 'Scripts or styles loaded from a public CDN',
  description:
    "Every request to a public CDN sends the visitor's IP address to its operator. The same " +
    'reasoning that made Google Fonts a problem applies, but there is no court ruling on CDNs ' +
    'specifically, so this is only a hint.',
  references: ['Art. 6(1) GDPR', 'LG München I, 20.01.2022, Az. 3 O 17493/20 (by analogy)'],
  check({ page }) {
    return [...groupRequestsByVendor(page.requests, findCdn)].map(
      ([vendor, evidence]): Finding => ({
        ruleId: ID,
        severity: 'info',
        message: `Files are loaded from ${vendor}.`,
        pageUrl: page.finalUrl,
        subject: vendor,
        evidence,
        fix: 'Install the library with your package manager and bundle it, or copy the files to your own server.',
      }),
    );
  },
};
