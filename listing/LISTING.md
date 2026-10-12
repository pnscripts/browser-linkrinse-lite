# Linkrinse Lite: store listings

Owner steps: sign in, create the listing, upload the file, paste the text below. Nothing has been submitted.

## Firefox Add-ons (addons.mozilla.org): free, ready

- File: `dist/linkrinse-lite-firefox-1.0.0.zip` (run `npm run build`)
- Source code upload: **No** (no minified or generated code)
- Add-on ID: `linkrinse-lite@pnscripts.com`; Firefox 140+ desktop, 142+ Android; data collection declared `none`
- Name: Linkrinse Lite
- Summary (≤ 250): Removes tracking parameters such as utm_*, fbclid and gclid from the links you click and from the address bar. 38 built-in rules, works offline, sends nothing anywhere.
- Categories: Privacy & Security; Tabs? no. Second: "Other"
- Tags: privacy, tracking, utm, links
- Licence: MIT
- Privacy policy: not needed (no data leaves the device); answer "no" to "does this add-on transmit data"
- Support site: https://pnscripts.com/marketplace/browser-linkrinse · support e-mail: office@pnscripts.com
- Screenshots: `listing/amo/screenshot-1.png`, `listing/amo/screenshot-2.png` (1280×800)
- Description: use README "What it does" section (plain text).
- Notes for reviewers: "No build step: the zip is the src/ folder plus a generated manifest. Tests: npm test."

## Chrome Web Store: COMING SOON (US$5 one-time registration = foreign service, VAT art. 97a hold)

- File: `dist/linkrinse-lite-chrome-1.0.0.zip`
- Icon 128×128: inside the zip (`icons/icon-128.png`)
- Screenshots 1280×800: `listing/chrome/screenshot-1-1280x800.png`, `listing/chrome/screenshot-2-1280x800.png`
- Small promo tile 440×280: `listing/chrome/small-promo-440x280.png`
- Marquee 1400×560: `listing/chrome/marquee-1400x560.png`
- Single purpose: "Remove tracking parameters from links and the address bar."
- Permission justification: `storage` keeps the two switches and the counter; host access via content script on http(s) pages rewrites the clicked link and the address bar.
- Data usage: collects nothing; certify the three disclosures.
- Category: Privacy & Security

## npm: free, ready

- Package: `@pnscripts/linkrinse-lite` (needs the free npm organization `pnscripts`, public packages are free)
- `npm publish` from the repo root (publishConfig access public, provenance when published from GitHub Actions)
