#!/usr/bin/env node
// End-to-end check in a real Chrome with dist/chrome loaded (DevTools Extensions.loadUnpacked).
// PN_PLAYWRIGHT=/path/to/node_modules/playwright-core node tools/e2e-chrome.mjs
// Checks: address bar cleaned, clicked link cleaned, counter, the toolbar popup's
// "Pause on <site>" switch (real popup via chrome.action.openPopup) and that a paused
// site is left alone. Throwaway profile in build/e2e-profile.
// Copyright (c) 2026 ПН СКРИПТС ЕООД / PN Scripts. MIT licence.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PN_PLAYWRIGHT || 'playwright');
const ext = path.join(root, 'dist', 'chrome');
if (!fs.existsSync(path.join(ext, 'manifest.json'))) throw new Error('run "npm run build" first');

const hits = [];
const server = http.createServer((req, res) => {
  if (req.url !== '/favicon.ico') hits.push(req.url);
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end('<!doctype html><title>t</title><a id="out" href="/target?sku=7&utm_source=e2e&fbclid=abc">go</a>');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
// A real-looking site name for the popup step (resolved to this test server by Chrome itself).
const shop = `http://shop.example:${server.address().port}`;

const profile = path.join(root, 'build', 'e2e-profile');
fs.rmSync(profile, { recursive: true, force: true });
const port = 9300 + Math.floor(Math.random() * 500);
const chromeProc = spawn(process.env.CHROME || '/usr/bin/google-chrome', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--host-resolver-rules=MAP shop.example 127.0.0.1',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, '--enable-unsafe-extension-debugging', 'about:blank'
], { stdio: 'ignore' });
let browser;
for (let i = 0; i < 50 && !browser; i++) {
  try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`); } catch (e) { await new Promise((r) => setTimeout(r, 200)); }
}
const cdp = await browser.newBrowserCDPSession();
const { id } = await cdp.send('Extensions.loadUnpacked', { path: ext });
const ctx = browser.contexts()[0];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  let sw = ctx.serviceWorkers().find((w) => w.url().includes(id));
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { predicate: (w) => w.url().includes(id), timeout: 15000 });
  console.log('extension loaded:', JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'))).version, 'permissions', JSON.stringify(JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'))).permissions));
  await wait(500);

  const page = await ctx.newPage();
  await page.goto(`${base}/start?id=1&utm_medium=email&gclid=Q`);
  await page.waitForFunction(() => location.search === '?id=1', null, { timeout: 5000 });
  console.log('ok address bar cleaned:', page.url());
  await page.click('#out');
  await page.waitForURL(/\/target/);
  assert.equal(hits[hits.length - 1], '/target?sku=7');
  console.log('ok clicked link reached the server as:', hits[hits.length - 1]);
  await wait(300);
  assert.equal(await sw.evaluate(async () => (await chrome.storage.local.get('cleanedCount')).cleanedCount), 2);
  console.log('ok counter: 2');

  // The real toolbar popup on top of the page: it must offer "Pause on 127.0.0.1".
  await page.goto(`${shop}/start?id=2`);
  await page.bringToFront();
  assert.equal(await sw.evaluate(async () => { try { await chrome.action.openPopup(); return 'ok'; } catch (e) { return String(e); } }), 'ok');
  let target;
  for (let i = 0; i < 25 && !target; i++) {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = list.find((t) => t.url.endsWith('/popup.html'));
    if (!target) await wait(200);
  }
  assert.ok(target, 'the popup did not open');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let seq = 0;
  const evalIn = (expression) => new Promise((resolve) => {
    const n = ++seq;
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id === n) resolve(m.result.result.value); };
    ws.send(JSON.stringify({ id: n, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
  });
  let row = '';
  for (let i = 0; i < 25 && !row; i++) { row = await evalIn("document.getElementById('pauseRow').hidden ? '' : document.getElementById('pauseRow').textContent.trim()"); if (!row) await wait(200); }
  assert.equal(row, 'Pause on shop.example');
  console.log('ok popup shows:', row, '| counter:', await evalIn("document.getElementById('count').textContent"));
  // Real popup picture for the store images (tools/images.mjs embeds build/popup.png).
  const size = JSON.parse(await evalIn('JSON.stringify([document.documentElement.scrollWidth, document.documentElement.scrollHeight])'));
  const shot = await new Promise((resolve) => {
    const n = ++seq;
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id === n) resolve(m.result && m.result.data); };
    ws.send(JSON.stringify({ id: n, method: 'Page.captureScreenshot', params: { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: size[0], height: size[1], scale: 2 } } }));
  });
  if (shot) fs.writeFileSync(path.join(root, 'build', 'popup.png'), Buffer.from(shot, 'base64'));
  await evalIn("document.getElementById('pauseSite').click()");
  await wait(300);
  ws.close();
  assert.deepEqual(await sw.evaluate(async () => (await chrome.storage.local.get('pausedSites')).pausedSites), ['shop.example']);
  console.log('ok pause switched on from the popup');

  await page.goto(`${shop}/paused?utm_source=kept`);
  await wait(500);
  assert.match(page.url(), /utm_source=kept/);
  await page.goto(`${shop}/start?id=3`);
  await page.click('#out');
  await page.waitForURL(/\/target/);
  assert.match(hits[hits.length - 1], /utm_source=e2e/);
  console.log('ok paused site left alone (address bar and click)');
  await page.goto(`${base}/other?id=4&utm_source=gone`);
  await page.waitForFunction(() => location.search === '?id=4', null, { timeout: 5000 });
  console.log('ok other sites still cleaned:', page.url());
  console.log('E2E OK');
} finally {
  await browser.close().catch(() => {});
  chromeProc.kill();
  server.close();
}
