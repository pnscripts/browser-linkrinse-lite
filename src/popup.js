/* Linkrinse Lite popup. Copyright (c) 2026 ПН СКРИПТС ЕООД / PN Scripts. MIT licence. */
'use strict';
const LR = globalThis.LinkRinseLite;
const keys = ['cleanOnClick', 'cleanAddressBar'];

function countText(n) { return n === 1 ? '1 link cleaned' : n + ' links cleaned'; }

function pauseRow(s) {
  // The content script of the current tab names its site, so no tabs or activeTab permission is needed.
  // Browser pages (no content script) simply get no pause switch.
  chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
    if (!tabs || !tabs[0] || typeof tabs[0].id !== 'number') return null;
    return chrome.tabs.sendMessage(tabs[0].id, { type: 'linkrinse-lite:site' });
  }).then(function (reply) {
    const site = reply && typeof reply.site === 'string' ? reply.site : null;
    if (!site) return;
    const box = document.getElementById('pauseSite');
    document.getElementById('site').textContent = site;
    box.checked = LR.isPaused(site, s.pausedSites);
    document.getElementById('pauseRow').hidden = false;
    box.addEventListener('change', function () {
      chrome.storage.local.get('pausedSites').then(function (cur) {
        chrome.storage.local.set({ pausedSites: LR.togglePaused(cur.pausedSites, site, box.checked) });
      });
    });
  }).catch(function () { /* no content script on this tab */ });
}

chrome.storage.local.get(null).then(function (stored) {
  const s = LR.settings(stored);
  pauseRow(s);
  document.getElementById('count').textContent = countText(s.cleanedCount);
  for (const key of keys) {
    const box = document.getElementById(key);
    box.checked = s[key];
    box.addEventListener('change', function () { chrome.storage.local.set({ [key]: box.checked }); });
  }
});

const list = document.getElementById('rules');
for (const r of LR.RULES) {
  const li = document.createElement('li');
  li.textContent = r.hosts ? r.name + ' (' + r.hosts.join(', ') + ')' : r.name;
  list.appendChild(li);
}
