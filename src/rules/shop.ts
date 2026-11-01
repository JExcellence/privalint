import type { PageSnapshot } from '../types.js';
import { linkMatches } from './links.js';

/** Cart and checkout links in the languages privalint knows. */
const CART =
  /warenkorb|\bkasse\b|\bcart\b|\bbasket\b|\bcheckout\b|panier|carrito|carrello|winkelwagen|kosár|pénztár/i;

/** Scripts of shop systems that only shops load. */
const SHOP_SYSTEM =
  /cdn\.shopify\.com|\/woocommerce\/|\/shopware\/|\/bundles\/storefront\/|\/skin\/frontend\//i;

/**
 * True when the page belongs to an online shop selling to consumers: it links a cart or checkout,
 * or loads a shop system's scripts. Shops carry duties that other sites don't, such as the
 * withdrawal function and accessibility information.
 */
export function looksLikeShop(page: PageSnapshot): boolean {
  return (
    page.links.some(linkMatches(CART)) ||
    page.requests.some((request) => SHOP_SYSTEM.test(request.url))
  );
}

/** The start page: these duties are about the site, checked once where every visitor arrives. */
export function isStartPage(page: PageSnapshot, siteUrl: URL): boolean {
  try {
    const url = new URL(page.finalUrl);
    return url.origin === siteUrl.origin && url.pathname === siteUrl.pathname;
  } catch {
    return false;
  }
}
