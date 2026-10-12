'use strict';
const test = require('node:test');
const assert = require('node:assert');
const LR = require('../src/rules.js');

test('removes campaign tags and click ids, keeps other parameters', () => {
  const r = LR.cleanUrl('https://shop.example/p/42?utm_source=news&color=red&fbclid=abc&utm_medium=email');
  assert.strictEqual(r.url, 'https://shop.example/p/42?color=red');
  assert.deepStrictEqual(r.removed, ['utm_source', 'fbclid', 'utm_medium']);
  assert.strictEqual(r.changed, true);
});

test('drops the question mark when every parameter goes', () => {
  assert.strictEqual(LR.cleanUrl('https://a.example/?gclid=1&utm_campaign=x').url, 'https://a.example/');
});

test('matching ignores case', () => {
  assert.strictEqual(LR.cleanUrl('https://a.example/?UTM_Source=x&FBCLID=1&q=2').url, 'https://a.example/?q=2');
});

test('site-scoped rules only apply on their sites and subdomains', () => {
  assert.strictEqual(LR.cleanUrl('https://youtu.be/abc?si=xyz&t=10').url, 'https://youtu.be/abc?t=10');
  assert.strictEqual(LR.cleanUrl('https://m.youtube.com/watch?v=1&si=2').url, 'https://m.youtube.com/watch?v=1');
  const other = 'https://example.com/?si=keep';
  assert.strictEqual(LR.cleanUrl(other).url, other);
  assert.strictEqual(LR.cleanUrl('https://notyoutube.com/?si=1').changed, false);
});

test('a query-like fragment is cleaned, a normal anchor is kept', () => {
  assert.strictEqual(LR.cleanUrl('https://a.example/page#utm_source=x&section=2').url, 'https://a.example/page#section=2');
  const anchor = 'https://a.example/page#utm_source';
  assert.strictEqual(LR.cleanUrl(anchor).url, anchor);
});

test('unchanged and non-http input is returned exactly', () => {
  const plain = 'https://a.example/x?q=utm_source';
  assert.deepStrictEqual(LR.cleanUrl(plain), { url: plain, changed: false, removed: [], skipped: null });
  assert.strictEqual(LR.cleanUrl('mailto:a@b.c?utm_source=x').skipped, 'not-http');
  assert.strictEqual(LR.cleanUrl('not a url').skipped, 'invalid');
});

test('encoded and plus-encoded names are decoded before matching', () => {
  assert.strictEqual(LR.cleanUrl('https://a.example/?utm%5Fsource=x&k=1').url, 'https://a.example/?k=1');
});

test('the built-in list has 38 rules and no redirect rules (those are in the full edition)', () => {
  assert.strictEqual(LR.RULES.length, 38);
  assert.ok(LR.RULES.every((r) => /^[A-Za-z0-9_]+\*?$/.test(r.name)));
});

test('settings fill defaults', () => {
  assert.deepStrictEqual(LR.settings(), { cleanOnClick: true, cleanAddressBar: true, cleanedCount: 0 });
  assert.deepStrictEqual(LR.settings({ cleanOnClick: false, cleanedCount: '7' }), { cleanOnClick: false, cleanAddressBar: true, cleanedCount: 7 });
});
