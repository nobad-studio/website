# NOBAD File Bridge release manifest

`releases.json` is the website's File Bridge release index. The build (`scripts/prepare-site.mjs`) fills the
`{{FB_...}}` placeholders on `/` (download desk) and `/products/file-bridge/` from it.

- `latest`: the version shown as current.
- `releases`: newest first. Each has `downloads.windows` (the installer; 0.5.0 was a zip) and `downloads.linux` (the `.deb`), and every
  `url` is a GitHub Release asset of `nobad-studio/file-bridge` (the build refuses anything else).
- Don't edit entries by hand: add them with `python scripts/publish_file_bridge_release.py <version> "<summary>"`
  after the File Bridge release workflow has published the release; it takes each file's SHA-256 from GitHub and
  checks it against the attached `.sha256`. Roll back with `--latest <version>`.
- Never change a published entry. Publish a new version instead.
