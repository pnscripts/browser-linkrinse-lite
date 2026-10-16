#!/usr/bin/env node
// Store images at the exact sizes each store asks for (rendered by tools/render.mjs).
import { banner, slide, esc } from './brand.mjs';
import { createRequire } from 'node:module';
const LR = createRequire(import.meta.url)('../src/rules.js');
const g = 'LR';
const name = 'Linkrinse Lite';
const tagline = 'Strips utm_*, fbclid, gclid and 35 more trackers from the links you click.';
const chips = ['38 built-in rules', 'Clean on click', 'Pause per site', 'No network'];
const samples = [
  'https://shop.example/p/42?utm_source=news&color=red&fbclid=IwAR0x',
  'https://youtu.be/dQw4?si=Fx81kq&t=42',
  'https://blog.example/post?gclid=Cj0KCQ&utm_medium=cpc&page=2',
  'https://news.example/a#utm_source=x&section=3'
];
const rows = samples.map((s) => { const r = LR.cleanUrl(s); return `<span style="color:#9b3b2b">${esc(s)}</span>\n<span style="color:#2f7d5b">→ ${esc(r.url)}</span>   <span style="color:#5d6762">(${r.removed.length} removed)</span>\n`; }).join('\n');
const shot1 = slide(1280, 800, { kicker: 'Before and after', title: 'Tracking parameters go before the next site sees them', body: rows });
// The real toolbar popup, captured by tools/e2e-chrome.mjs in Chrome (listing/popup-real.png, 2x).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const popup = 'data:image/png;base64,' + fs.readFileSync(path.join(here, '..', 'listing', 'popup-real.png')).toString('base64');
const shot2 = slide(1280, 800, { kicker: 'The popup (real screenshot)', title: 'Two switches, a pause for this site, a counter', body:
`<div style="white-space:normal;display:flex;gap:44px;align-items:center;height:100%"><img src="${popup}" style="width:343px;height:auto;border:1px solid #dfe4e1;border-radius:10px;box-shadow:0 10px 30px rgba(20,40,30,.18)"><div style="font:21px/1.6 system-ui,sans-serif;color:#22302a">Pause Linkrinse Lite on any site with one click: it stops cleaning there and keeps cleaning everywhere else.<br><br>The counter shows how many links were cleaned. The full rule list is one click away.<br><br><span style="color:#5d6762">Works offline. Asks only for the storage permission.</span></div></div>` });
// Real cleanUrl() results for the addresses aggressive cleaners are known to break.
const safe = [
  ['Google sign-in', 'https://accounts.google.com/v3/signin/identifier?continue=…&service=mail&ifkv=AXH0vVs'],
  ['Google Search', 'https://www.google.com/search?q=weather&ei=XyZ&ved=0ahUKEwj&udm=50'],
  ['Amazon review sorting', 'https://www.amazon.com/product-reviews/B0ABCDEF12?sortBy=recent&filterByStar=five_star'],
  ['Reddit search', 'https://www.reddit.com/search/?q=firefox&sort=new&t=week'],
  ['Sign in with Microsoft', 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=x&state=12345']
];
const safeRows = safe.map(([label, url]) => { const r = LR.cleanUrl(url.replace('…', 'https%3A%2F%2Fmail.google.com%2F')); if (r.changed) throw new Error('changed: ' + url); return `<span style="color:#2f7d5b">✓ unchanged</span>  <b style="font-family:system-ui">${esc(label)}</b>\n<span style="color:#5d6762">${esc(url)}</span>\n`; }).join('\n');
const yt = LR.cleanUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&si=AbC');
const shot3 = slide(1280, 800, { kicker: 'Careful by design', title: 'Removes trackers, never sign-in, search or sorting parameters', body:
safeRows + `\n<span style="color:#9b3b2b">youtube.com/watch?v=dQw4w9WgXcQ&t=42s&si=AbC</span>  <span style="color:#2f7d5b">→ ${esc(yt.url.replace('https://www.', ''))}</span>` });
export default [
  { out: 'listing/chrome/screenshot-1-1280x800.png', width: 1280, height: 800, html: shot1 },
  { out: 'listing/chrome/screenshot-2-1280x800.png', width: 1280, height: 800, html: shot2 },
  { out: 'listing/chrome/screenshot-3-1280x800.png', width: 1280, height: 800, html: shot3 },
  { out: 'listing/chrome/small-promo-440x280.png', width: 440, height: 280, html: banner(440, 280, { name, tagline: 'Clean links, offline.', chips: chips.slice(0, 2), glyph: g }) },
  { out: 'listing/chrome/marquee-1400x560.png', width: 1400, height: 560, html: banner(1400, 560, { name, tagline, chips, glyph: g }) },
  { out: 'listing/amo/screenshot-1.png', width: 1280, height: 800, html: shot1 },
  { out: 'listing/amo/screenshot-2.png', width: 1280, height: 800, html: shot2 },
  { out: 'listing/amo/screenshot-3.png', width: 1280, height: 800, html: shot3 }
];
