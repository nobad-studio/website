# NOBAD website

**Software with a point of view.** The website of the NOBAD studio: the home page, a page per product, the download
desks for NOBAD VPN, NOBAD Find and NOBAD File Bridge, support, privacy and the code-signing policy.

Live at **https://nobad-platform.nobad-studio.workers.dev/** (Cloudflare Workers static assets, deployed from `main`).

## Build
```
npm run build        # site-pages/ + releases/{vpn,find,file-bridge}/releases.json -> public/ (generated, not committed)
```
Plain HTML, CSS and JavaScript in `site-pages/`, no framework. `scripts/prepare-site.mjs` copies the pages, fills the
release placeholders from `releases/vpn/releases.json`, `releases/find/releases.json` and
`releases/file-bridge/releases.json`, and writes `/build.json` with the commit it was built from.
Preview locally by serving `public/` (for example `python -m http.server -d public 8080`).

## Publishing a NOBAD VPN release
Releases are built by CI in [`nobad-studio/Nobad-VPN`](https://github.com/nobad-studio/Nobad-VPN) from a `vpn-v*` tag. After
the GitHub Release is published, add it to the download desk here:
```
python scripts/publish_vpn_release.py <version> "<one-line summary>"
npm run build
```
Review the diff, commit and push `main`; Cloudflare deploys it. Check `/build.json` shows your commit.

## Publishing a NOBAD Find release
NOBAD Find is released from `nobad-studio/Nobad-VPN` with a `find-v*` tag (`find-release.yml`). If
`releases/find/releases.json` lists no release, the site shows "Coming with the first release". After the GitHub
Release is published:
```
python scripts/publish_find_release.py <version> "<one-line summary>"
npm run build
```
It takes the installer's size and SHA-256 from the CI release (its `.sha256` file, checked against GitHub's own
digest), never typed by hand. Review the diff and open a pull request.

## Publishing a NOBAD File Bridge release
NOBAD File Bridge is released from [`nobad-studio/file-bridge`](https://github.com/nobad-studio/file-bridge) with a `v*`
tag (`release.yml`: a Windows installer and a Linux .deb). After the GitHub Release is published:
```
python scripts/publish_file_bridge_release.py <version> "<one-line summary>"
npm run build
```
Review the diff and open a pull request.

## Rules
- The site's Content-Security-Policy (`site-pages/_headers`) allows no inline scripts: put JavaScript in
  `site-pages/assets/*.js`.
- Anything from the release manifest or the network goes into the page escaped (`esc()` in `prepare-site.mjs`,
  `escapeHtml()` in `vpn-page.js`).
- Product pages use the shared component system in `site-pages/assets/product.css`, in NOBAD orange. Always the full
  product names ("NOBAD VPN", "NOBAD Find", "NOBAD File Bridge").
- UI text is plain and honest: never claim more than the products measure or do.

Contributing: fork, branch, pull request; sign the [CLA](https://github.com/nobad-studio/.github/blob/main/CLA.md) on
your first PR. The code is [MIT](LICENSE); the NOBAD name and logos are not
([brand policy](https://github.com/nobad-studio/.github/blob/main/TRADEMARKS.md)).
