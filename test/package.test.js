'use strict';
// Store rules: no network calls, no remote code, minimal permissions, MIT everywhere.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = path.join(__dirname, '..', 'src');

test('no network APIs or remote code in the extension', () => {
  for (const f of fs.readdirSync(src).filter((f) => f.endsWith('.js'))) {
    const code = fs.readFileSync(path.join(src, f), 'utf8');
    for (const api of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'eval(', 'new Function', 'importScripts(\'http']) {
      assert.ok(!code.includes(api), `${f} uses ${api}`);
    }
  }
  for (const f of fs.readdirSync(src).filter((f) => f.endsWith('.html'))) {
    assert.ok(!/src="https?:/.test(fs.readFileSync(path.join(src, f), 'utf8')), `${f} loads a remote script`);
  }
});

test('every source file carries the MIT notice and the package is MIT', () => {
  for (const f of ['rules.js', 'content.js', 'background.js', 'popup.js']) {
    assert.match(fs.readFileSync(path.join(src, f), 'utf8'), /MIT licence/);
  }
  assert.strictEqual(require('../package.json').license, 'MIT');
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'LICENSE'), 'utf8'), /^MIT License/);
});

test('build manifests ask only for storage and declare no data collection on Firefox', () => {
  const build = fs.readFileSync(path.join(__dirname, '..', 'tools', 'build.mjs'), 'utf8');
  assert.match(build, /permissions: \['storage'\]/);
  assert.match(build, /data_collection_permissions: \{ required: \['none'\] \}/);
});
