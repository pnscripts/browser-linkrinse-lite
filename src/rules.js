/*
 * Linkrinse Lite rules engine 1.0.0
 * Copyright (c) 2026 ПН СКРИПТС ЕООД / PN Scripts. MIT licence.
 *
 * Pure functions, no browser APIs, no network. Loaded as a classic script by
 * the extension (it defines globalThis.LinkRinseLite) and with require() by
 * Node (tests and the npm package).
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LinkRinseLite = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * The built-in list: a parameter name (a trailing * matches any ending),
   * optionally limited to some sites (subdomains included).
   */
  const RULES = Object.freeze([
    // Campaign tags used by analytics tools and newsletters
    'utm_*',
    // Click identifiers appended by advertising networks
    'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'yclid', 'ttclid',
    'twclid', 'li_fat_id', 'epik', 'rb_clickid', 'irclickid', '_gl',
    // E-mail marketing platforms
    'mc_eid', 'mc_cid', '_hsenc', '_hsmi', '__hssc', '__hstc', '__hsfp', 'hsCtaTracking',
    'mkt_tok', 'vero_id', 'vero_conv', 'oly_anon_id', 'oly_enc_id', '_openstat', 'wickedid',
    // Share identifiers
    'igshid', 'igsh',
    // Rules that only apply on specific sites
    'ref_src @ twitter.com x.com',
    'ref_url @ twitter.com x.com',
    'si @ youtube.com youtu.be open.spotify.com',
    'smid @ nytimes.com',
    'spm @ aliexpress.com'
  ].map(function (line) {
    const parts = line.split('@');
    const name = parts[0].trim();
    const prefix = name.slice(-1) === '*';
    return Object.freeze({
      name: name,
      stem: (prefix ? name.slice(0, -1) : name).toLowerCase(),
      prefix: prefix,
      hosts: parts[1] ? parts[1].trim().split(/\s+/) : null
    });
  }));

  const DEFAULT_SETTINGS = Object.freeze({ cleanOnClick: true, cleanAddressBar: true, cleanedCount: 0, pausedSites: Object.freeze([]) });

  /** The site key a pause applies to: the host without "www.", lower case; null for non-http(s). */
  function siteOf(url) {
    let u;
    try { u = new URL(String(url)); } catch (e) { return null; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.hostname.toLowerCase().replace(/^www\./, '') || null;
  }

  /** Whether a host is paused: listed itself, or a subdomain of a listed site. */
  function isPaused(host, pausedSites) {
    const h = String(host || '').toLowerCase().replace(/^www\./, '');
    return Array.isArray(pausedSites) && pausedSites.some(function (site) { return hostMatches(h, String(site)); });
  }

  /** The paused-sites list with one site switched on or off (sorted, no duplicates). */
  function togglePaused(pausedSites, site, paused) {
    const set = new Set((Array.isArray(pausedSites) ? pausedSites : []).filter(function (x) { return typeof x === 'string' && x; }));
    if (paused) set.add(site); else set.delete(site);
    return Array.from(set).sort();
  }

  // A fragment that looks like "a=1&b=2" is treated like a query string.
  const QUERYLIKE_HASH_RE = /^[A-Za-z0-9_.\-\[\]%]+=[^&#]*(&[A-Za-z0-9_.\-\[\]%]+=[^&#]*)*$/;

  /** True when host is domain or a subdomain of it. */
  function hostMatches(host, domain) {
    host = String(host || '').toLowerCase().replace(/\.$/, '');
    domain = String(domain || '').toLowerCase();
    if (!host || !domain) return false;
    return host === domain || host.slice(-(domain.length + 1)) === '.' + domain;
  }

  /** The built-in rule that removes this parameter on this host, or null. */
  function matchRule(name, host) {
    const lower = String(name).toLowerCase();
    for (const r of RULES) {
      if (r.hosts && !r.hosts.some(function (d) { return hostMatches(host, d); })) continue;
      if (r.prefix ? lower.indexOf(r.stem) === 0 : lower === r.stem) return r;
    }
    return null;
  }

  function decodeName(raw) {
    const s = raw.replace(/\+/g, ' ');
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  /** Filter "a=1&b=2" style text. Keeps the raw text of every kept pair. */
  function filterPairs(text, host, removed) {
    const kept = [];
    for (const part of text.split('&')) {
      if (part === '') continue;
      const eq = part.indexOf('=');
      const name = decodeName(eq === -1 ? part : part.slice(0, eq));
      if (matchRule(name, host)) removed.push(name); else kept.push(part);
    }
    return kept.join('&');
  }

  /**
   * Remove tracking parameters from an http(s) URL.
   * Returns { url, changed, removed: [names], skipped: null | 'not-http' | 'invalid' }.
   * When nothing is removed, url is exactly the input string.
   */
  function cleanUrl(input) {
    const original = String(input == null ? '' : input);
    const result = { url: original, changed: false, removed: [], skipped: null };
    let u;
    try { u = new URL(original); } catch (e) { result.skipped = 'invalid'; return result; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') { result.skipped = 'not-http'; return result; }
    const host = u.hostname.toLowerCase();
    const removed = [];
    let touched = false;
    if (u.search.length > 1) {
      const before = removed.length;
      const q = filterPairs(u.search.slice(1), host, removed);
      if (removed.length > before) { u.search = q ? '?' + q : ''; touched = true; }
    }
    if (u.hash.length > 1 && QUERYLIKE_HASH_RE.test(u.hash.slice(1))) {
      const before = removed.length;
      const h = filterPairs(u.hash.slice(1), host, removed);
      if (removed.length > before) { u.hash = h ? '#' + h : ''; touched = true; }
    }
    if (!touched) return result;
    const out = u.href.replace(/\?(#|$)/, '$1').replace(/#$/, '');
    result.url = out;
    result.changed = out !== original;
    result.removed = removed;
    return result;
  }

  /** Stored settings with defaults filled in. */
  function settings(stored) {
    const s = Object.assign({}, DEFAULT_SETTINGS, stored || {});
    const paused = Array.isArray(s.pausedSites) ? s.pausedSites.filter(function (x) { return typeof x === 'string' && x; }) : [];
    return { cleanOnClick: s.cleanOnClick !== false, cleanAddressBar: s.cleanAddressBar !== false, cleanedCount: Number(s.cleanedCount) || 0, pausedSites: paused };
  }

  return {
    VERSION: '1.1.0',
    RULES: RULES,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    hostMatches: hostMatches,
    matchRule: matchRule,
    cleanUrl: cleanUrl,
    settings: settings,
    siteOf: siteOf,
    isPaused: isPaused,
    togglePaused: togglePaused
  };
});
