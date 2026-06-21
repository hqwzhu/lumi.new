import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWindowsGitHubReleasePlan } from './github-release-plan.mjs';

function releaseAssetUrl(repo, tag, assetName) {
  return `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(assetName)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createDownloadHtml(metadata) {
  const installerUrl = escapeHtml(metadata.downloads.installer);
  const packageUrl = escapeHtml(metadata.downloads.package);
  const notesUrl = escapeHtml(metadata.downloads.releaseNotes);
  const checksumUrl = escapeHtml(metadata.downloads.checksums);
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lumi OS ${escapeHtml(metadata.version)} Windows Download</title>
    <meta name="description" content="Download Lumi OS for Windows. Includes installer, release notes, and SHA256 checksum." />
    <style>
      :root {
        color-scheme: dark;
        --bg: #090a0c;
        --panel: #14171c;
        --line: #262b33;
        --text: #f3f6fb;
        --muted: #a8b1bf;
        --accent: #77d7c8;
        --accent-2: #f4c95d;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, "Noto Sans SC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.55;
      }
      main {
        width: min(1040px, calc(100% - 32px));
        margin: 0 auto;
        padding: 48px 0;
      }
      header {
        display: grid;
        gap: 24px;
        padding: 28px 0 36px;
        border-bottom: 1px solid var(--line);
      }
      h1 {
        margin: 0;
        font-size: clamp(34px, 5vw, 64px);
        line-height: 1;
        letter-spacing: 0;
      }
      p { color: var(--muted); margin: 0; }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      a.button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        border-radius: 8px;
        padding: 0 18px;
        color: #06110f;
        background: var(--accent);
        font-weight: 800;
        text-decoration: none;
      }
      a.secondary {
        color: var(--text);
        background: #1d222a;
        border: 1px solid var(--line);
      }
      section {
        padding: 28px 0;
        border-bottom: 1px solid var(--line);
      }
      h2 {
        margin: 0 0 12px;
        font-size: 22px;
        letter-spacing: 0;
      }
      dl {
        display: grid;
        grid-template-columns: minmax(120px, 180px) 1fr;
        gap: 10px 16px;
        margin: 0;
      }
      dt { color: var(--muted); }
      dd { margin: 0; overflow-wrap: anywhere; }
      code {
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 6px;
        padding: 2px 6px;
        font-family: "JetBrains Mono", Consolas, monospace;
        font-size: 0.92em;
      }
      ol { margin: 0; padding-left: 22px; color: var(--muted); }
      li + li { margin-top: 8px; }
      .notice {
        border: 1px solid color-mix(in srgb, var(--accent-2), transparent 68%);
        background: color-mix(in srgb, var(--accent-2), transparent 90%);
        color: #f8e7ad;
        border-radius: 8px;
        padding: 14px 16px;
      }
      @media (max-width: 640px) {
        main { width: min(100% - 24px, 1040px); padding-top: 28px; }
        dl { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Lumi OS ${escapeHtml(metadata.version)}</h1>
          <p>Windows 10 / Windows 11 installer for the Windows-first MVP release.</p>
        </div>
        <div class="actions">
          <a class="button" href="${installerUrl}">Download Windows Installer</a>
          <a class="button secondary" href="${packageUrl}">Download Release Package</a>
          <a class="button secondary" href="${notesUrl}">Release Notes</a>
        </div>
      </header>
      <section>
        <h2>Install / 安装</h2>
        <ol>
          <li>Download <code>${escapeHtml(metadata.installerName)}</code>.</li>
          <li>Run the installer and follow the prompts.</li>
          <li>Launch Lumi OS from the Start Menu or desktop shortcut.</li>
          <li>Complete the first-launch setup wizard and configure at least one model source.</li>
        </ol>
      </section>
      <section>
        <h2>Release Details</h2>
        <dl>
          <dt>Platform</dt><dd>${escapeHtml(metadata.platform)}</dd>
          <dt>Version</dt><dd>${escapeHtml(metadata.version)}</dd>
          <dt>Installer</dt><dd><code>${escapeHtml(metadata.installerName)}</code></dd>
          <dt>Package</dt><dd><code>${escapeHtml(metadata.packageName)}</code></dd>
          <dt>SHA256</dt><dd><code>${escapeHtml(metadata.sha256)}</code></dd>
          <dt>Checksums</dt><dd><a href="${checksumUrl}">${checksumUrl}</a></dd>
        </dl>
      </section>
      <section>
        <h2>Security Note</h2>
        <p class="notice">Until code signing is added, Windows SmartScreen may show a warning. Only continue when the installer came from this official GitHub release channel.</p>
      </section>
    </main>
  </body>
</html>
`;
}

export function generateWindowsDownloadPage(projectDir, options = {}) {
  const repo = options.repo ?? 'hqwzhu/lumi.new';
  const plan = createWindowsGitHubReleasePlan(projectDir, { repo });
  const manifest = plan.manifest;
  const tag = options.tag ?? plan.tag;
  const outDir = path.join(projectDir, 'public', 'downloads');
  const metadata = {
    appName: manifest.appName ?? 'Lumi OS',
    version: manifest.version,
    platform: manifest.platform,
    repo,
    tag,
    generatedAt: (options.generatedAt ?? new Date()).toISOString(),
    installerName: manifest.installerName,
    packageName: manifest.packageName,
    sha256: manifest.sha256,
    size: manifest.size,
    downloads: {
      installer: releaseAssetUrl(repo, tag, manifest.installerName),
      package: releaseAssetUrl(repo, tag, manifest.packageName),
      checksums: releaseAssetUrl(repo, tag, 'SHA256SUMS.txt'),
      manifest: releaseAssetUrl(repo, tag, 'manifest.json'),
      releaseNotes: releaseAssetUrl(repo, tag, 'RELEASE_NOTES.md'),
    },
  };
  const jsonPath = path.join(outDir, 'windows.json');
  const htmlPath = path.join(outDir, 'windows.html');
  writeJson(jsonPath, metadata);
  fs.writeFileSync(htmlPath, createDownloadHtml(metadata));
  return { htmlPath, jsonPath, metadata };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const modulePath = fileURLToPath(import.meta.url);
if (invokedPath === modulePath) {
  const scriptDir = path.dirname(modulePath);
  const projectDir = path.resolve(scriptDir, '..');
  const repoArg = process.argv.find(arg => arg.startsWith('--repo='));
  const tagArg = process.argv.find(arg => arg.startsWith('--tag='));
  const result = generateWindowsDownloadPage(projectDir, {
    repo: repoArg ? repoArg.slice('--repo='.length) : undefined,
    tag: tagArg ? tagArg.slice('--tag='.length) : undefined,
  });
  console.log('Windows download page generated:');
  console.log(`  ${result.htmlPath}`);
  console.log(`  ${result.jsonPath}`);
}
