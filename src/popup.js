/* Linkrinse Lite popup. Copyright (c) 2026 ПН СКРИПТС ЕООД / PN Scripts. MIT licence. */
'use strict';
const LR = globalThis.LinkRinseLite;
const keys = ['cleanOnClick', 'cleanAddressBar'];

function countText(n) { return n === 1 ? '1 link cleaned' : n + ' links cleaned'; }

chrome.storage.local.get(null).then(function (stored) {
  const s = LR.settings(stored);
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
