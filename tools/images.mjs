#!/usr/bin/env node
// Store images at the exact sizes each store asks for (rendered by tools/render.mjs).
import { banner, slide, esc } from './brand.mjs';
import { createRequire } from 'node:module';
const LR = createRequire(import.meta.url)('../src/rules.js');
const g = 'LR';
const name = 'Linkrinse Lite';
const tagline = 'Strips utm_*, fbclid, gclid and 35 more trackers from the links you click.';
const chips = ['38 built-in rules', 'Clean on click', 'Clean address bar', 'No network'];
const samples = [
  'https://shop.example/p/42?utm_source=news&color=red&fbclid=IwAR0x',
  'https://youtu.be/dQw4?si=Fx81kq&t=42',
  'https://blog.example/post?gclid=Cj0KCQ&utm_medium=cpc&page=2',
  'https://news.example/a#utm_source=x&section=3'
];
const rows = samples.map((s) => { const r = LR.cleanUrl(s); return `<span style="color:#9b3b2b">${esc(s)}</span>\n<span style="color:#2f7d5b">→ ${esc(r.url)}</span>   <span style="color:#5d6762">(${r.removed.length} removed)</span>\n`; }).join('\n');
const shot1 = slide(1280, 800, { kicker: 'Before and after', title: 'Tracking parameters go before the next site sees them', body: rows });
const shot2 = slide(1280, 800, { kicker: 'The popup', title: 'Two switches, a counter, the full list', body:
`<span style="font-family:system-ui;font-size:26px;font-weight:700">Linkrinse Lite</span>        <span style="color:#2f7d5b">128 links cleaned</span>

<span style="font-size:26px">☑</span>  Clean links when I click them
<span style="font-size:26px">☑</span>  Clean the address bar when a page opens

▸ What is removed
    utm_*  fbclid  gclid  msclkid  mc_eid  _hsenc  igshid …
    si (youtube.com, youtu.be, open.spotify.com)

<span style="color:#5d6762">Works offline. Nothing is sent anywhere.</span>` });
export default [
  { out: 'listing/chrome/screenshot-1-1280x800.png', width: 1280, height: 800, html: shot1 },
  { out: 'listing/chrome/screenshot-2-1280x800.png', width: 1280, height: 800, html: shot2 },
  { out: 'listing/chrome/small-promo-440x280.png', width: 440, height: 280, html: banner(440, 280, { name, tagline: 'Clean links, offline.', chips: chips.slice(0, 2), glyph: g }) },
  { out: 'listing/chrome/marquee-1400x560.png', width: 1400, height: 560, html: banner(1400, 560, { name, tagline, chips, glyph: g }) },
  { out: 'listing/amo/screenshot-1.png', width: 1280, height: 800, html: shot1 },
  { out: 'listing/amo/screenshot-2.png', width: 1280, height: 800, html: shot2 }
];
