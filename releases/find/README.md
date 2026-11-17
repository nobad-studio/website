# NOBAD Find release manifest

`releases.json` is the website's release index for NOBAD Find, with the same schema as `releases/vpn/releases.json`.
The build (`scripts/prepare-site.mjs`) fills the download block on `/products/find/` and the NOBAD Find entries on
`/` from it. While `releases` is empty, the site shows "Coming with the first release" and links to GitHub Releases.

- `latest`: the version shown as current (`null` until the first release).
- `releases`: newest first. Every entry points at a real `find-v*` GitHub Release asset of `nobad-studio/Nobad-VPN`.
- Don't edit entries by hand: add them with `python scripts/publish_find_release.py <version> "<summary>"` after the
  release workflow has published the release, and roll back with `--latest <version>`.
- Never change a published entry. Publish a new version instead.
