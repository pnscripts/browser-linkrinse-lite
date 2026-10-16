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
  assert.deepStrictEqual(LR.settings(), { cleanOnClick: true, cleanAddressBar: true, cleanedCount: 0, pausedSites: [] });
  assert.deepStrictEqual(LR.settings({ cleanOnClick: false, cleanedCount: '7' }), { cleanOnClick: false, cleanAddressBar: true, cleanedCount: 7, pausedSites: [] });
});

// URLs that aggressive cleaners break (ClearURLs reviews 2026: Google sign-in error 400, Google AI
// Overview, Reddit search, Amazon review sorting, Gmail, Twitch). Linkrinse Lite must leave them alone.
const MUST_NOT_CHANGE = [
  'https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Fmail.google.com%2Fmail%2F&service=mail&flowName=GlifWebSignIn&flowEntry=ServiceLogin&ifkv=AXH0vVs&ddm=1',
  'https://accounts.google.com/o/oauth2/v2/auth?client_id=123.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fapp.example%2Fcallback&response_type=code&scope=openid%20email&state=af0ifjsldkj&nonce=n-0S6',
  'https://www.google.com/search?q=weather+sofia&sca_esv=a1b2&ei=XyZ&ved=0ahUKEwj&uact=5&oq=weather&gs_lp=Egxnd3&sclient=gws-wiz-serp&udm=50',
  'https://www.amazon.com/product-reviews/B0ABCDEF12/ref=cm_cr_arp_d_viewopt_srt?ie=UTF8&reviewerType=all_reviews&sortBy=recent&pageNumber=1&filterByStar=five_star',
  'https://www.reddit.com/search/?q=firefox&type=link&sort=new&t=week',
  'https://mail.google.com/mail/u/0/#inbox/FMfcgzQXJWDsKmQ',
  'https://www.twitch.tv/videos/123456789?t=1h2m3s&filter=archives&sort=time',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL1234&index=2',
  'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=x&response_type=code&redirect_uri=https%3A%2F%2Fapp.example&scope=openid&state=12345',
  'https://github.com/login/oauth/authorize?client_id=abc&redirect_uri=https%3A%2F%2Fapp.example%2Fcb&state=xyz&scope=repo'
];

test('never touches sign-in, search, sort or app parameters', () => {
  for (const url of MUST_NOT_CHANGE) {
    const r = LR.cleanUrl(url);
    assert.strictEqual(r.changed, false, url + ' lost ' + r.removed.join(','));
    assert.strictEqual(r.url, url);
  }
  // Tracking tags next to them still go, and only they do.
  assert.strictEqual(LR.cleanUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&si=AbC&utm_source=x').url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s');
  assert.strictEqual(LR.cleanUrl('https://www.amazon.com/dp/B0ABCDEF12?th=1&psc=1&gclid=EAIa').url, 'https://www.amazon.com/dp/B0ABCDEF12?th=1&psc=1');
});

test('paused sites: the site and its subdomains, www ignored', () => {
  assert.strictEqual(LR.siteOf('https://www.Amazon.de/dp/1?x=1'), 'amazon.de');
  assert.strictEqual(LR.siteOf('https://shop.example.co.uk/'), 'shop.example.co.uk');
  assert.strictEqual(LR.siteOf('about:blank'), null);
  assert.strictEqual(LR.siteOf('not a url'), null);
  const paused = LR.togglePaused([], 'amazon.de', true);
  assert.deepStrictEqual(paused, ['amazon.de']);
  assert.ok(LR.isPaused('www.amazon.de', paused));
  assert.ok(LR.isPaused('smile.amazon.de', paused));
  assert.ok(!LR.isPaused('amazon.com', paused));
  assert.ok(!LR.isPaused('notamazon.de', paused));
  assert.deepStrictEqual(LR.togglePaused(['b.example', 'a.example', 'b.example', 3, ''], 'c.example', true), ['a.example', 'b.example', 'c.example']);
  assert.deepStrictEqual(LR.togglePaused(paused, 'amazon.de', false), []);
  assert.ok(!LR.isPaused('amazon.de', 'not-a-list'));
});

test('settings: pausedSites defaults to an empty list and drops junk', () => {
  assert.deepStrictEqual(LR.settings({}).pausedSites, []);
  assert.deepStrictEqual(LR.settings({ pausedSites: ['a.example', 7, null, ''] }).pausedSites, ['a.example']);
  assert.deepStrictEqual(LR.settings({ pausedSites: 'x' }).pausedSites, []);
});
