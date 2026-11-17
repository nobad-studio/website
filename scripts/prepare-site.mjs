// Builds the static NOBAD website into public/ (served by Cloudflare Workers static assets).
//
// Source of truth: plain HTML in site-pages/ (edit those files directly). Release details are filled in at build
// time from releases/vpn/releases.json and releases/find/releases.json, so the download desk works without JavaScript and can never drift from
// the manifest. The build fails on an unknown {{PLACEHOLDER}}.
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const root = process.cwd();
const output = resolve(root, "public");
const pages = resolve(root, "site-pages");

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function releaseValues(manifest) {
  const releases = Array.isArray(manifest.releases) ? manifest.releases : [];
  const cur = releases.find((r) => r.version === manifest.latest) || releases[0];
  if (!cur) throw new Error("releases.json has no release");
  for (const k of ["version", "releaseDate", "downloadUrl", "notesUrl", "sha256", "size"]) {
    if (!cur[k]) throw new Error(`releases.json: latest release is missing "${k}"`);
  }
  if (!/^https:\/\/github\.com\/AryanGupta-234\/Nobad\/releases\/download\//.test(cur.downloadUrl)) {
    throw new Error("releases.json: downloadUrl must be a GitHub Release asset of this repository");
  }
  if (!/^[0-9a-f]{64}$/.test(cur.sha256)) throw new Error("releases.json: sha256 must be 64 lowercase hex digits");
  const file = cur.downloadUrl.split("/").pop();
  const history = releases.map((r) =>
    `<div class="release-item"><span class="version">${esc(r.version)}</span><span>${esc(r.releaseDate)} · ${esc(r.summary)}</span><span class="muted">${esc(r.channel)}</span></div>`
  ).join("");
  return {
    VPN_VERSION: esc(cur.version),
    VPN_DATE: esc(cur.releaseDate),
    VPN_URL: esc(cur.downloadUrl),
    VPN_NOTES: esc(cur.notesUrl),
    VPN_SHA256: esc(cur.sha256),
    VPN_SIZE: esc(cur.size),
    VPN_FILE: esc(file),
    VPN_SBOM: esc(cur.downloadUrl.replace(/\.exe$/, ".sbom.json")),
    VPN_SUMMARY: esc(cur.summary || "A published release is available. Review its notes and integrity details before installing."),
    VPN_PLATFORM: esc(cur.platform || "Windows"),
    VPN_ARCH: esc(cur.architecture || "x64"),
    VPN_HISTORY: history,
  };
}

// NOBAD Find: releases/find/releases.json has the same schema, but may have no release yet. Then every FIND_*
// placeholder shows the "coming with the first release" state and links to the find-v* GitHub Releases.
const FIND_ALL_RELEASES = "https://github.com/nobad-studio/Nobad-VPN/releases?q=find-v";
const FIND_PLATFORM = "Windows 10 &amp; 11";

function findValues(manifest) {
  const releases = Array.isArray(manifest.releases) ? manifest.releases : [];
  const cur = releases.find((r) => r.version === manifest.latest) || releases[0];
  const all = esc(FIND_ALL_RELEASES);
  if (!cur) {
    return {
      FIND_AVAIL: "first release coming",
      FIND_STATE: "First release coming",
      FIND_ROSTER: "First release coming",
      FIND_KICKER: "First release coming",
      FIND_PLAT_HTML: `<li><b>NOBAD Find</b><span>Windows · first release coming</span><em class="pre">Coming soon</em></li>`,
      FIND_DESK_HTML:
        `<div class="download-name"><strong>NOBAD FIND</strong><small>${FIND_PLATFORM} · Coming with the first release</small></div>` +
        `<div class="download-meta">Not published yet<br>Not code-signed yet</div>` +
        `<a class="download-action" href="/products/find/#download">See status <span>↗</span></a>`,
      FIND_RELEASE_HTML:
        `<div class="p-status-head p-hot"><div><h3>Coming with the first release.</h3><p>The first NOBAD Find installer isn't published yet. When it is, it appears here with its size, its SHA-256 and how to check it.</p></div><span class="p-badge">● Coming soon</span></div>` +
        `<div class="p-status-row"><div><h4>NOBAD Find</h4><p>${FIND_PLATFORM} · no download yet</p></div><div class="p-actions"><a class="p-btn" href="${all}" rel="noopener">GitHub Releases ↗</a></div></div>`,
    };
  }
  for (const k of ["version", "releaseDate", "downloadUrl", "notesUrl", "sha256", "size"]) {
    if (!cur[k]) throw new Error(`releases/find/releases.json: latest release is missing "${k}"`);
  }
  const m = /^https:\/\/github\.com\/nobad-studio\/Nobad-VPN\/releases\/download\/find-v([0-9]+\.[0-9]+\.[0-9]+)\/NobadFind-Setup-([0-9]+\.[0-9]+\.[0-9]+)\.exe$/.exec(cur.downloadUrl);
  if (!m || m[1] !== cur.version || m[2] !== cur.version) {
    throw new Error("releases/find/releases.json: downloadUrl must be this version's NobadFind-Setup .exe on a find-v* GitHub Release");
  }
  if (!/^https:\/\/github\.com\/nobad-studio\/Nobad-VPN\/releases\/tag\/find-v[0-9.]+$/.test(cur.notesUrl)) {
    throw new Error("releases/find/releases.json: notesUrl must be a find-v* GitHub Release page");
  }
  if (!/^[0-9a-f]{64}$/.test(cur.sha256)) throw new Error("releases/find/releases.json: sha256 must be 64 lowercase hex digits");
  const v = esc(cur.version), url = esc(cur.downloadUrl), file = esc(cur.downloadUrl.split("/").pop());
  const meta = [cur.releaseDate, cur.platform || "Windows 10 (1809+) / 11", cur.architecture || "x64"].map(esc).join(" / ");
  const history = releases.map((r) =>
    `<div class="release-item"><span class="version">${esc(r.version)}</span><span>${esc(r.releaseDate)} · ${esc(r.summary)}</span><span class="muted">${esc(r.channel)}</span></div>`
  ).join("");
  return {
    FIND_AVAIL: "available now",
    FIND_STATE: `Available · v${v}`,
    FIND_ROSTER: "Available",
    FIND_KICKER: `v${v} · Free and open source`,
    FIND_PLAT_HTML: `<li><b>NOBAD Find</b><span>v${v} · ${esc(cur.size)} · released ${esc(cur.releaseDate)}</span><em class="ok">Available</em></li>`,
    FIND_DESK_HTML:
      `<div class="download-name"><strong>NOBAD FIND ${v}</strong><small>${FIND_PLATFORM} · ${esc(cur.size)} · Features, download and how to verify on the product page</small></div>` +
      `<div class="download-meta">Released ${esc(cur.releaseDate)}<br>Not code-signed yet</div>` +
      `<a class="download-action" href="/products/find/#download">Get it <span>↗</span></a>`,
    FIND_RELEASE_HTML:
      `<div class="p-status-head p-hot"><div><h3>Build available.</h3><p>${esc(cur.summary || "A published release is available. Review its notes and integrity details before installing.")}</p></div><span class="p-badge">● ${esc(String(cur.channel || "stable").toUpperCase())}</span></div>` +
      `<div class="p-status-row"><div><h4>NOBAD Find ${v}</h4><p>${meta}</p></div><div class="p-actions"><a class="p-btn" href="${url}">Download installer ↗</a><a class="p-btn ghost" href="${esc(cur.notesUrl)}" rel="noopener">Release notes</a><a class="p-btn ghost" href="${all}" rel="noopener">All releases ↗</a></div></div>` +
      `<div class="p-history">${history}</div>` +
      `<div class="p-integrity"><h4>Download integrity</h4><p>SHA-256: ${esc(cur.sha256)} | File size: ${esc(cur.size)}. Verify this digest against the downloaded file.</p>` +
      `<h4>How to verify</h4><p>In PowerShell, in the folder you downloaded to:</p><pre><code>Get-FileHash .\\${file} -Algorithm SHA256</code></pre>` +
      `<p>or in Command Prompt: <code>certutil -hashfile ${file} SHA256</code>. The result must match the SHA-256 above and the <a href="${url}.sha256">.sha256 file</a> on the release.</p>` +
      `<p>To check it was built by NOBAD's release workflow from this version's tag (with the <a href="https://cli.github.com/">GitHub CLI</a>):</p><pre><code>gh attestation verify ${file} -R nobad-studio/Nobad-VPN --signer-workflow nobad-studio/Nobad-VPN/.github/workflows/find-release.yml --source-ref refs/tags/find-v${v} --deny-self-hosted-runners</code></pre>` +
      `<h4>"Windows protected your PC"</h4><p>Because NOBAD Find isn't code-signed yet, SmartScreen may show this for a new download. If the checksum matches, choose <b>More info</b> → <b>Run anyway</b>.</p></div>`,
  };
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// 1. Pages, policy pages, _headers, robots.txt, sitemap.xml, 404.html, favicon.ico, legal.css
await cp(pages, output, { recursive: true });

// 2. Only the public image assets (not READMEs or internal docs)
await mkdir(resolve(output, "assets"), { recursive: true });
for (const name of await readdir(resolve(root, "assets"))) {
  if ([".png", ".svg", ".ico", ".webp"].includes(extname(name).toLowerCase())) {
    await cp(resolve(root, "assets", name), resolve(output, "assets", name));
  }
}

// 3. Release manifest, read by the download desk script as well
const manifestText = await readFile(resolve(root, "releases/vpn/releases.json"), "utf8");
const values = releaseValues(JSON.parse(manifestText));
await mkdir(resolve(output, "releases/vpn"), { recursive: true });
await writeFile(resolve(output, "releases/vpn/releases.json"), manifestText);

// 3b. NOBAD Find's release manifest (may have no release yet)
const findText = await readFile(resolve(root, "releases/find/releases.json"), "utf8");
Object.assign(values, findValues(JSON.parse(findText)));
await mkdir(resolve(output, "releases/find"), { recursive: true });
await writeFile(resolve(output, "releases/find/releases.json"), findText);

// 4. Fill release placeholders in every HTML page
for await (const file of walk(output)) {
  if (extname(file) !== ".html") continue;
  if (!resolve(file).startsWith(output + sep)) throw new Error("Output path escaped public directory");
  let html = await readFile(file, "utf8");
  html = html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, key) => {
    if (!(key in values)) throw new Error(`${file}: unknown placeholder ${m}`);
    return values[key];
  });
  await writeFile(file, html);
  console.log(`Built ${file.slice(output.length + 1).replaceAll("\\", "/")} (${Buffer.byteLength(html).toLocaleString()} bytes)`);
}

// 5. /build.json: which commit this deploy was built from, so a deploy can be checked from outside
let commit = process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA || "";
if (!commit) {
  try {
    const { execFileSync } = await import("node:child_process");
    commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch { commit = "unknown"; }
}
if (!/^[0-9a-f]{7,40}$|^unknown$/.test(commit)) commit = "unknown";
await writeFile(resolve(output, "build.json"), JSON.stringify({ commit, built: new Date().toISOString() }) + "\n");

console.log(`NOBAD static site build complete (NOBAD VPN ${values.VPN_VERSION}; NOBAD Find: ${values.FIND_STATE}).`);
