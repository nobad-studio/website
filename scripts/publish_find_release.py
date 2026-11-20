#!/usr/bin/env python3
"""Add a published NOBAD Find GitHub Release to the website (releases/find/releases.json).

Run it AFTER the "NOBAD Find release" workflow has published the GitHub Release (tag find-v<version>):

    python scripts/publish_find_release.py 0.6.0 "First release: private, offline search for your own files"

It reads the release from GitHub's public API, takes the installer's size and the SHA-256 from the release's own
.sha256 file (written by the CI build), checks it against the SHA-256 GitHub computed for the uploaded asset, and puts
the entry first in releases.json. Nothing is typed by hand and nothing is copied into the repository. Then review the
diff, commit and open a pull request: the site rebuilds and shows the new version.

Rollback: `--latest <older version>` points the site back to an earlier release without deleting anything.
"""
from __future__ import annotations

import argparse
import json
import re
import urllib.request
from pathlib import Path

# NOBAD Find has its own repository since 2026-11-20. Releases up to 0.8.5 were published from
# nobad-studio/Nobad-VPN: pass --repo nobad-studio/Nobad-VPN to (re)publish one of those.
REPOS = ("nobad-studio/find", "nobad-studio/Nobad-VPN")
REPO = REPOS[0]
ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "releases" / "find" / "releases.json"
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")


def get(url: str, raw: bool = False):
    req = urllib.request.Request(url, headers={"User-Agent": "nobad-release-script", "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    return data.decode("utf-8") if raw else json.loads(data)


def mb(n: int) -> str:
    return f"{n / 1_000_000:.1f} MB"


def entry_for(version: str, summary: str, channel: str) -> dict:
    rel = get(f"https://api.github.com/repos/{REPO}/releases/tags/find-v{version}")
    if rel.get("draft") or (rel.get("prerelease") and channel == "stable"):
        raise SystemExit("that release is a draft or pre-release; use --channel beta or publish it first")
    assets = {a["name"]: a for a in rel["assets"]}
    exe = f"NobadFind-Setup-{version}.exe"
    if exe not in assets:
        raise SystemExit(f"{exe} is not attached to the release")
    if exe + ".sha256" not in assets:
        raise SystemExit(f"{exe}.sha256 is not attached to the release")
    a = assets[exe]
    url = a["browser_download_url"]
    if url != f"https://github.com/{REPO}/releases/download/find-v{version}/{exe}":
        raise SystemExit(f"unexpected download URL: {url}")
    published = get(assets[exe + ".sha256"]["browser_download_url"], raw=True).split()[0].lower()
    if not re.fullmatch(r"[0-9a-f]{64}", published):
        raise SystemExit("couldn't read the installer's SHA-256 from the release's .sha256 file")
    digest = (a.get("digest") or "").removeprefix("sha256:").lower()
    if digest and digest != published:
        raise SystemExit(f"SHA-256 mismatch: GitHub says {digest}, the .sha256 file says {published}")
    return {
        "version": version,
        "releaseDate": rel["published_at"][:10],
        "channel": channel,
        "platform": "Windows 10 (1809+) / 11",
        "architecture": "x64",
        "summary": summary,
        "downloadUrl": url,
        "notesUrl": rel["html_url"],
        "sha256": published,
        "size": mb(a["size"]),
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("version", nargs="?", help="version that is already published on GitHub Releases, e.g. 0.6.0")
    ap.add_argument("summary", nargs="?", default="", help="one line for the download block")
    ap.add_argument("--channel", default="stable")
    ap.add_argument("--latest", help="only change which listed version is current (rollback)")
    ap.add_argument("--repo", choices=REPOS, default=REPOS[0], help="where the find-v* release is (default: %(default)s)")
    args = ap.parse_args()
    global REPO
    REPO = args.repo

    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    listed = [r["version"] for r in data["releases"]]
    if args.latest:
        if args.latest not in listed:
            raise SystemExit(f"{args.latest} isn't in releases.json ({', '.join(listed) or 'no releases yet'})")
        data["latest"] = args.latest
    else:
        if not args.version or not SEMVER.match(args.version):
            raise SystemExit("give a version like 0.6.0")
        if not args.summary:
            raise SystemExit("give a one-line summary")
        if args.version in listed:
            raise SystemExit(f"{args.version} is already listed; published versions are never changed")
        data["releases"].insert(0, entry_for(args.version, args.summary, args.channel))
        data["latest"] = args.version
    MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"releases/find/releases.json: latest = {data['latest']}. Review the diff, then commit and open a PR.")


if __name__ == "__main__":
    main()
