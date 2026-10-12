/*
 * Linkrinse Lite content script. Runs in the top frame of every http(s) page.
 * 1. Cleans the address bar once settings load (history.replaceState, no reload).
 * 2. Rewrites a link's href just before a click or middle click follows it.
 * Copyright (c) 2026 ПН СКРИПТС ЕООД / PN Scripts. MIT licence.
 */
(function () {
  'use strict';
  const LR = globalThis.LinkRinseLite;
  if (!LR || globalThis.__linkrinseLiteLoaded) return;
  globalThis.__linkrinseLiteLoaded = true;

  let settings = null;

  function report() {
    try { chrome.runtime.sendMessage({ type: 'linkrinse-lite:cleaned' }); } catch (e) { /* extension reloaded */ }
  }

  function cleanAddressBar() {
    if (!settings || !settings.cleanAddressBar) return;
    const r = LR.cleanUrl(location.href);
    if (!r.changed) return;
    try {
      history.replaceState(history.state, '', r.url);
      report();
    } catch (e) { /* sandboxed document: leave it */ }
  }

  function onClick(event) {
    if (!settings || !settings.cleanOnClick) return;
    if (event.type === 'auxclick' && event.button !== 1) return;
    const path = event.composedPath ? event.composedPath() : [event.target];
    let link = null;
    for (const el of path) {
      if (el && el.tagName && (el.tagName === 'A' || el.tagName === 'AREA') && el.hasAttribute('href')) { link = el; break; }
    }
    if (!link) return;
    const r = LR.cleanUrl(link.href);
    if (!r.changed) return;
    link.setAttribute('href', r.url);
    report();
  }

  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', onClick, true);

  chrome.storage.local.get(null).then(function (stored) {
    settings = LR.settings(stored);
    cleanAddressBar();
  });
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local' || (!changes.cleanOnClick && !changes.cleanAddressBar)) return;
    chrome.storage.local.get(null).then(function (stored) { settings = LR.settings(stored); });
  });
})();
