# Changelog

## 1.1.0 (2026-10-16)

- **Pause on this site**: a switch in the popup stops cleaning on the current site and its subdomains. The popup asks the page's own content script for the site, so the extension still asks only for the `storage` permission.
- Tests that sign-in, search and sorting addresses stay untouched (Google and Microsoft sign-in, GitHub OAuth, Google Search, Amazon review sorting, Reddit, Gmail, Twitch, YouTube), and end-to-end checks in real Chrome (incl. the toolbar popup) and Firefox.
- npm: `siteOf`, `isPaused` and `togglePaused` are exported with types.

## 1.0.0 (2026-10-12)

- First release of the Lite edition: the built-in list of 38 tracking parameters, cleaning on click and in the address bar, a counter, and the rules engine as the npm package `@pnscripts/linkrinse-lite`.
