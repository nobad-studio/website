#!/usr/bin/env python3
"""Add a published NOBAD File Bridge GitHub Release to the website (releases/file-bridge/releases.json).

Run it AFTER the File Bridge release workflow has published the GitHub Release:

    python scripts/publish_file_bridge_release.py 0.5.0 "First release: files side by side, terminals, sync, deployments"

It reads the release from GitHub's public API, and for each download (the Windows installer and the Linux .deb) takes
the size and the SHA-256 that GitHub computed for the uploaded asset, checks it against the published .sha256 file,
and puts the entry first in releases.json. Nothing is copied into the repository. Review the diff, commit and push:
the site rebuilds and shows the new version.

Rollback: `--latest <older version>` points the site back to an earlier release without deleting anything.
"""
from __future__ import annotations

import argparse
import json
import re
import urllib.request
from pathlib import Path

REPO = "nobad-studio/file-bridge"
ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "releases" / "file-bridge" / "releases.json"
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
# download key -> (file name for a version, what it runs on)
DOWNLOADS = {
    # 0.5.0 shipped a zip (it stays listed as published); from 0.5.1 Windows gets an installer.
    "windows": (lambda v: f"NobadFileBridge-Setup-{v}.exe", "Windows 10 / 11 · 64-bit · installer"),
    "linux": (lambda v: f"nobad-file-bridge_{v}_amd64.deb", "Ubuntu 22.04+ / Debian 12+ · 64-bit · .deb"),
}


def get(url: str, raw: bool = False):
    req = urllib.request.Request(url, headers={"User-Agent": "nobad-release-script", "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    return data.decode("utf-8") if raw else json.loads(data)


def mb(n: int) -> str:
    return f"{n / 1_000_000:.1f} MB"


def download_for(rel: dict, name: str, platform: str) -> dict:
    assets = {a["name"]: a for a in rel["assets"]}
    if name not in assets:
        raise SystemExit(f"{name} is not attached to the release")
    a = assets[name]
    digest = (a.get("digest") or "").removeprefix("sha256:")
    published = get(assets[name + ".sha256"]["browser_download_url"], raw=True).split()[0].lower() if name + ".sha256" in assets else ""
    if not re.fullmatch(r"[0-9a-f]{64}", digest or published):
        raise SystemExit(f"couldn't read the SHA-256 of {name} from GitHub")
    if digest and published and digest != published:
        raise SystemExit(f"SHA-256 mismatch for {name}: GitHub says {digest}, the .sha256 file says {published}")
    return {"file": name, "platform": platform, "url": a["browser_download_url"], "sha256": digest or published, "size": mb(a["size"])}


def entry_for(version: str, summary: str, channel: str) -> dict:
    rel = get(f"https://api.github.com/repos/{REPO}/releases/tags/v{version}")
    if rel.get("draft") or (rel.get("prerelease") and channel == "stable"):
        raise SystemExit("that release is a draft or pre-release; use --channel beta or publish it first")
    return {
        "version": version,
        "releaseDate": rel["published_at"][:10],
        "channel": channel,
        "summary": summary,
        "notesUrl": rel["html_url"],
        "downloads": {key: download_for(rel, name(version), platform) for key, (name, platform) in DOWNLOADS.items()},
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("version", nargs="?", help="version that is already published on GitHub Releases, e.g. 0.5.0")
    ap.add_argument("summary", nargs="?", default="", help="one line for the download desk")
    ap.add_argument("--channel", default="stable")
    ap.add_argument("--latest", help="only change which listed version is current (rollback)")
    args = ap.parse_args()

    data = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {
        "schemaVersion": 1, "product": "nobad-file-bridge", "latest": None, "releases": []}
    listed = [r["version"] for r in data["releases"]]
    if args.latest:
        if args.latest not in listed:
            raise SystemExit(f"{args.latest} isn't in releases.json ({', '.join(listed)})")
        data["latest"] = args.latest
    else:
        if not args.version or not SEMVER.match(args.version):
            raise SystemExit("give a version like 0.5.0")
        if not args.summary:
            raise SystemExit("give a one-line summary")
        if args.version in listed:
            raise SystemExit(f"{args.version} is already listed; published versions are never changed")
        data["releases"].insert(0, entry_for(args.version, args.summary, args.channel))
        data["latest"] = args.version
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"releases.json: latest = {data['latest']}. Review the diff, then commit and push.")


if __name__ == "__main__":
    main()
