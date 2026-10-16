#!/usr/bin/env node
// Copyright (c) 2026 ПН СКРИПТС ЕООД / PN Scripts. MIT licence.
// End-to-end check of Linkrinse Lite in a real, headless Firefox with dist/firefox
// installed as a temporary add-on through web-ext.
// WEB_EXT=/path/to/web-ext FIREFOX=/path/to/firefox node tools/e2e-firefox.mjs
// Ubuntu's Firefox is a snap: it cannot read a profile under /tmp and ignores signals from
// outside its confinement, so the profile goes under ~/snap/firefox/common and Firefox is
// asked to quit through its remote debugging protocol when the check ends.
// The test page reports its own address after load (proves the address bar was
// cleaned) and then clicks a tracking link (proves the click was cleaned).
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hits = [];
let done;
const finished = new Promise((r) => { done = r; });
const server = http.createServer((req, res) => {
  if (req.url !== '/favicon.ico') hits.push(req.url);
  res.setHeader('content-type', 'text/html; charset=utf-8');
  if (req.url.startsWith('/start')) {
    res.end(`<!doctype html><title>t</title><a id="out" href="/target?sku=7&utm_source=ff&fbclid=abc">go</a>
<script>setTimeout(() => fetch('/report?loc=' + encodeURIComponent(location.href)).then(() => document.getElementById('out').click()), 2500)</script>`);
  } else {
    if (req.url.startsWith('/target')) done();
    res.end('ok');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const firefox = process.env.FIREFOX || 'firefox';
const isSnap = fs.existsSync('/snap/bin/firefox') && (firefox === 'firefox' || firefox.startsWith('/snap/') || firefox === '/usr/bin/firefox');
const tmp = isSnap ? path.join(os.homedir(), 'snap', 'firefox', 'common', 'linkrinse-lite-e2e') : os.tmpdir();
fs.mkdirSync(tmp, { recursive: true });

// Quits every Firefox started with a profile under `tmp` (web-ext's own kill does not reach a snap).
async function quitFirefox() {
  for (const pid of fs.readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
    let args;
    try { args = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0'); } catch (e) { continue; }
    const i = args.indexOf('-start-debugger-server');
    if (i < 0 || !args.some((a) => a.startsWith(tmp))) continue;
    await new Promise((resolve) => {
      const sock = net.connect(Number(args[i + 1]), '127.0.0.1');
      let buf = Buffer.alloc(0);
      const send = (o) => { const t = JSON.stringify(o); sock.write(Buffer.byteLength(t) + ':' + t); };
      sock.on('data', (d) => {
        buf = Buffer.concat([buf, d]);
        for (;;) {
          const c = buf.indexOf(58); if (c < 0) return;
          const len = Number(buf.subarray(0, c).toString()); if (buf.length < c + 1 + len) return;
          const m = JSON.parse(buf.subarray(c + 1, c + 1 + len).toString()); buf = buf.subarray(c + 1 + len);
          if (m.applicationType) send({ to: 'root', type: 'getProcess', id: 0 });
          else if (m.processDescriptor) send({ to: m.processDescriptor.actor, type: 'getTarget' });
          else if (m.process) { send({ to: m.process.consoleActor, type: 'evaluateJSAsync', text: 'Services.startup.quit(Ci.nsIAppStartup.eForceQuit)' }); setTimeout(resolve, 1500); }
        }
      });
      sock.on('error', resolve); sock.on('close', resolve); setTimeout(resolve, 8000);
    });
  }
}

const proc = spawn(process.env.WEB_EXT || 'web-ext', [
  'run', '--source-dir', path.join(root, 'dist', 'firefox'), '--no-input', '--no-reload',
  '--firefox', isSnap ? '/snap/bin/firefox' : firefox,
  '--start-url', `${base}/start?id=1&utm_medium=email&gclid=Q`
], { env: { ...process.env, MOZ_HEADLESS: '1', TMPDIR: tmp }, stdio: 'ignore', detached: true });

const timer = setTimeout(() => done('timeout'), 40000);
const outcome = await finished;
clearTimeout(timer);
await quitFirefox();
try { process.kill(-proc.pid, 'SIGTERM'); } catch (e) { proc.kill(); }
server.close();
assert.notEqual(outcome, 'timeout', 'Firefox did not reach the target page: ' + JSON.stringify(hits));
const report = decodeURIComponent(hits.find((h) => h.startsWith('/report')).split('loc=')[1]);
assert.equal(new URL(report).search, '?id=1');
console.log('address bar cleaned:', report);
const target = hits.find((h) => h.startsWith('/target'));
assert.equal(target, '/target?sku=7');
console.log('server received clicked link as:', target);
const version = (await new Promise((r) => { const v = spawn(isSnap ? '/snap/bin/firefox' : firefox, ['--version']); let o = ''; v.stdout.on('data', (d) => { o += d; }); v.on('close', () => r(o.trim())); }));
console.log('FIREFOX E2E OK on', version);
