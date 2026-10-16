/*
 * Linkrinse Lite content script. Runs in the top frame of every http(s) page.
 * 1. Cleans the address bar once settings load (history.replaceState, no reload).
 * 2. Rewrites a link's href just before a click or middle click follows it.
 * Does nothing on sites the user paused in the popup.
 * Copyright (c) 2026 ПН СКРИПТС ЕООД / PN Scripts. MIT licence.
 */
(function () {
  'use strict';
  const LR = globalThis.LinkRinseLite;
  if (!LR || globalThis.__linkrinseLiteLoaded) return;
  globalThis.__linkrinseLiteLoaded = true;

  let settings = null;
  const paused = function () { return !settings || LR.isPaused(location.hostname, settings.pausedSites); };

  function report() {
    try { chrome.runtime.sendMessage({ type: 'linkrinse-lite:cleaned' }); } catch (e) { /* extension reloaded */ }
  }

  function cleanAddressBar() {
    if (paused() || !settings.cleanAddressBar) return;
    const r = LR.cleanUrl(location.href);
    if (!r.changed) return;
    try {
      history.replaceState(history.state, '', r.url);
      report();
    } catch (e) { /* sandboxed document: leave it */ }
  }

  function onClick(event) {
    if (paused() || !settings.cleanOnClick) return;
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

  // The popup asks which site this tab is on (for "Pause on this site").
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg && msg.type === 'linkrinse-lite:site') sendResponse({ site: LR.siteOf(location.href) });
  });

  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', onClick, true);

  chrome.storage.local.get(null).then(function (stored) {
    settings = LR.settings(stored);
    cleanAddressBar();
  });
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local' || (!changes.cleanOnClick && !changes.cleanAddressBar && !changes.pausedSites)) return;
    chrome.storage.local.get(null).then(function (stored) { settings = LR.settings(stored); });
  });
})();
