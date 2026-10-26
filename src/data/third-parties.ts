import { findByUrl, type HostPattern } from '../url.js';

export interface ThirdParty extends HostPattern {
  vendor: string;
}

/**
 * Embedded content that transfers the visitor's IP address (and often sets
 * cookies) as soon as it loads. Trackers are listed separately in trackers.ts.
 */
export const embeds: readonly ThirdParty[] = [
  { vendor: 'YouTube', domains: ['youtube.com', 'youtube-nocookie.com', 'ytimg.com'] },
  { vendor: 'Vimeo', domains: ['player.vimeo.com', 'vimeocdn.com'] },
  {
    vendor: 'Google Maps',
    domains: ['maps.googleapis.com', 'maps.gstatic.com', 'maps.google.com'],
  },
  { vendor: 'Google Maps', domains: ['google.com'], paths: ['/maps/'] },
  { vendor: 'Google reCAPTCHA', domains: ['recaptcha.net'] },
  { vendor: 'Google reCAPTCHA', domains: ['google.com', 'gstatic.com'], paths: ['/recaptcha/'] },
  { vendor: 'Gravatar', domains: ['gravatar.com'] },
  { vendor: 'X (Twitter) embed', domains: ['platform.twitter.com', 'syndication.twitter.com'] },
  { vendor: 'Instagram embed', domains: ['instagram.com', 'cdninstagram.com'] },
  { vendor: 'Facebook plugin', domains: ['facebook.com'], paths: ['/plugins/'] },
  { vendor: 'Spotify embed', domains: ['open.spotify.com'], paths: ['/embed/'] },
  { vendor: 'Disqus', domains: ['disqus.com', 'disquscdn.com'] },
];

/** Public CDNs for scripts, styles and icon fonts. */
export const cdns: readonly ThirdParty[] = [
  { vendor: 'jsDelivr', domains: ['cdn.jsdelivr.net'] },
  { vendor: 'unpkg', domains: ['unpkg.com'] },
  { vendor: 'cdnjs', domains: ['cdnjs.cloudflare.com'] },
  { vendor: 'Google Hosted Libraries', domains: ['ajax.googleapis.com'] },
  { vendor: 'jQuery CDN', domains: ['code.jquery.com'] },
  {
    vendor: 'BootstrapCDN',
    domains: ['stackpath.bootstrapcdn.com', 'maxcdn.bootstrapcdn.com'],
  },
  { vendor: 'Tailwind Play CDN', domains: ['cdn.tailwindcss.com'] },
  {
    vendor: 'Font Awesome CDN',
    domains: ['use.fontawesome.com', 'kit.fontawesome.com', 'ka-f.fontawesome.com'],
  },
];

export const findEmbed = (url: string) => findByUrl(embeds, url);
export const findCdn = (url: string) => findByUrl(cdns, url);
