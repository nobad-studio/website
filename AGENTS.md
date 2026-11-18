# NOBAD website: instructions for AI coding assistants

This repo is `nobad-studio/website`: the NOBAD website, built by `npm run build` into `public/` (untracked) and
deployed by Cloudflare Workers Builds (Worker `nobad-platform`) from `main`. Read [README.md](README.md) first.

- The apps, their release workflows and the shared AI memory live in
  [`nobad-studio/Nobad-VPN`](https://github.com/nobad-studio/Nobad-VPN) (`AGENTS.md`, `docs/ai/memory.md`). Read its memory for
  website decisions (style, product names, "Built in the open").
- CSP: no inline scripts. Untrusted data (release manifest, network) is always escaped before it reaches HTML.
- `releases/vpn/releases.json` is updated only by `scripts/publish_vpn_release.py` after a CI release, with the
  CI-built installer's SHA-256. Never hand-edit checksums.
- `releases/find/releases.json` (NOBAD Find) and `releases/file-bridge/releases.json` (NOBAD File Bridge) work the
  same way, through `scripts/publish_find_release.py` and `scripts/publish_file_bridge_release.py`.
- After pushing `main`, check that `https://nobad-platform.nobad-studio.workers.dev/build.json` shows your commit.
- `main` is protected. Never edit rulesets, bypass lists or organization settings: ask the maintainer.
- Look at the site with a local build and headless Edge screenshots; don't guess layouts.

## Shared memory (all NOBAD repos)
Decisions, open items and ideas shared by every contributor and AI assistant live in
[`nobad-studio/memory`](https://github.com/nobad-studio/memory). Read its `INDEX.md` first (one line per fact; Claude
Code loads it automatically at session start through `.claude/settings.json`), open a fact only when it matters, and
check who else is working on what with `python tools/mem.py status` there. Record new decisions as a PR to that repo
(its `AGENTS.md`, or the `nobad-memory` skill), never secrets.
