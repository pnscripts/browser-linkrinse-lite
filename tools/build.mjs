#!/usr/bin/env node
// Builds dist/chrome and dist/firefox from src/ plus one manifest each, zips them,
// and packs the npm tarball of the rules engine (dist/npm).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const dist = path.join(root, 'dist');

const common = {
  manifest_version: 3,
  name: 'Linkrinse Lite',
  short_name: 'Linkrinse Lite',
  version,
  description: 'Removes tracking parameters such as utm_* and fbclid from the links you click and from the address bar. Works offline.',
  author: 'PN Scripts',
  homepage_url: 'https://pnscripts.com',
  icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
  action: { default_title: 'Linkrinse Lite', default_popup: 'popup.html', default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' } },
  permissions: ['storage'],
  content_scripts: [{ matches: ['http://*/*', 'https://*/*'], js: ['rules.js', 'content.js'], run_at: 'document_start', all_frames: false }]
};

const targets = {
  chrome: { ...common, minimum_chrome_version: '116', background: { service_worker: 'background.js' } },
  firefox: {
    ...common,
    background: { scripts: ['rules.js', 'background.js'] },
    browser_specific_settings: {
      gecko: { id: 'linkrinse-lite@pnscripts.com', strict_min_version: '140.0', data_collection_permissions: { required: ['none'] } },
      gecko_android: { strict_min_version: '142.0' }
    }
  }
};

const files = ['rules.js', 'content.js', 'background.js', 'popup.html', 'popup.js', 'popup.css',
  'icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png'];

fs.mkdirSync(dist, { recursive: true });
for (const [name, manifest] of Object.entries(targets)) {
  const out = path.join(dist, name);
  fs.rmSync(out, { recursive: true, force: true });
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true });
    fs.copyFileSync(path.join(root, 'src', f), path.join(out, f));
  }
  for (const f of ['LICENSE', 'README.md', 'CHANGELOG.md']) fs.copyFileSync(path.join(root, f), path.join(out, f));
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const zip = path.join(dist, `linkrinse-lite-${name}-${version}.zip`);
  fs.rmSync(zip, { force: true });
  execFileSync('zip', ['-q', '-X', '-r', zip, '.'], { cwd: out });
  console.log('built', path.relative(root, zip), fs.statSync(zip).size, 'bytes');
}
// Source package for AMO reviewers is not needed: nothing is minified or generated.
execFileSync('npm', ['pack', '--pack-destination', dist], { cwd: root, stdio: 'inherit' });
