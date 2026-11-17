# NOBAD website: instructions for AI coding assistants

This repo is `nobad-studio/website`: the NOBAD website, built by `npm run build` into `public/` (untracked) and
deployed by Cloudflare Workers Builds (Worker `nobad-platform`) from `main`. Read [README.md](README.md) first.

- The apps, their release workflows and the shared AI memory live in
  [`nobad-studio/Nobad-VPN`](https://github.com/nobad-studio/Nobad-VPN) (`AGENTS.md`, `docs/ai/memory.md`). Read its memory for
  website decisions (style, product names, "Built in the open").
- CSP: no inline scripts. Untrusted data (release manifest, network) is always escaped before it reaches HTML.
- `releases/vpn/releases.json` is updated only by `scripts/publish_vpn_release.py` after a CI release, with the
  CI-built installer's SHA-256. Never hand-edit checksums.
- After pushing `main`, check that `https://nobad-platform.nobad-studio.workers.dev/build.json` shows your commit.
- `main` is protected. Never edit rulesets, bypass lists or organization settings: ask the maintainer.
- Look at the site with a local build and headless Edge screenshots; don't guess layouts.
