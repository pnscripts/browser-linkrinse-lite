/*
 * Linkrinse Lite background script (Chrome service worker, Firefox event page).
 * Keeps the cleaned-links counter. Makes no network requests.
 * Copyright (c) 2026 ПН СКРИПТС ЕООД / PN Scripts. MIT licence.
 */
'use strict';
if (typeof importScripts === 'function' && !globalThis.LinkRinseLite) importScripts('rules.js');
const LR = globalThis.LinkRinseLite;

chrome.runtime.onInstalled.addListener(async function () {
  const stored = await chrome.storage.local.get(null);
  const missing = {};
  for (const [k, v] of Object.entries(LR.DEFAULT_SETTINGS)) if (!(k in stored)) missing[k] = v;
  if (Object.keys(missing).length) await chrome.storage.local.set(missing);
});

// Counter updates are queued so two tabs reporting at once never lose a count.
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener(function (msg) {
  if (!msg || msg.type !== 'linkrinse-lite:cleaned') return;
  queue = queue.then(async function () {
    const { cleanedCount = 0 } = await chrome.storage.local.get('cleanedCount');
    await chrome.storage.local.set({ cleanedCount: (Number(cleanedCount) || 0) + 1 });
  }).catch(function () {});
});
