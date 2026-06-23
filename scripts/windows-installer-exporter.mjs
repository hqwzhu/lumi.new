import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

export function getWindowsReleaseDir(projectDir) {
  return path.join(projectDir, 'release', 'windows');
}

export function getNsisBundleDir(projectDir) {
  return path.join(projectDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
}

export function findLatestWindowsInstaller(projectDir) {
  const bundleDir = getNsisBundleDir(projectDir);
  if (!fs.existsSync(bundleDir)) {
    throw new Error(`NSIS bundle directory not found: ${bundleDir}`);
  }

  const installers = fs
    .readdirSync(bundleDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(bundleDir, entry.name))
    .filter((filePath) => filePath.endsWith('_x64-setup.exe'))
    .map((filePath) => ({
      filePath,
      mtimeMs: fs.statSync(filePath).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (installers.length === 0) {
    throw new Error(`No Windows installer matching *_x64-setup.exe found in: ${bundleDir}`);
  }

  return installers[0].filePath;
}

export function exportWindowsInstaller(projectDir) {
  const source = findLatestWindowsInstaller(projectDir);
  const releaseDir = getWindowsReleaseDir(projectDir);
  fs.mkdirSync(releaseDir, { recursive: true });

  const sourceName = path.basename(source);
  const version = getInstallerVersion(sourceName);
  const installerName =
    version === 'unknown' ? sourceName.replace(/\s+/g, '-') : `LumiOS-Windows-${version}-x64-setup.exe`;
  const destination = path.join(releaseDir, installerName);
  fs.copyFileSync(source, destination);

  const sourceStat = fs.statSync(source);
  fs.utimesSync(destination, sourceStat.atime, sourceStat.mtime);

  return {
    source,
    destination,
    size: fs.statSync(destination).size,
  };
}

function getInstallerVersion(installerName) {
  const match = installerName.match(/^Lumi OS_(.+)_x64-setup\.exe$/);
  if (!match) {
    return 'unknown';
  }
  return match[1];
}

function getFileSha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createReleaseNotes(manifest) {
  return `# Lumi OS ${manifest.version} Windows Release

## Artifact

- Installer: ${manifest.installerName}
- Platform: ${manifest.platform}
- Size: ${manifest.size} bytes
- SHA256: ${manifest.sha256}

## What Users Get

- Windows-first NSIS installer.
- One-machine license activation before first-launch setup.
- First-launch setup wizard with Essential, Practical, and Full modes.
- China, international, and local model provider recommendations.
- Bilingual API key help for provider setup.
- Local API key storage under the user's LumiOS data directory.
- Ollama and LM Studio local model diagnostics.

## Before Sharing

1. Verify the checksum in \`SHA256SUMS.txt\`.
2. Run the installer on a clean Windows user profile or VM.
3. Confirm first launch shows the machine code and rejects an invalid authorization code.
4. Generate an authorization code for the displayed machine code, activate, then confirm setup reaches the LumiOS desktop after a cloud key or local model is available.

## Install

1. Run \`${manifest.installerName}\`.
2. Follow the Windows installer prompts.
3. Launch Lumi OS from the Start Menu or desktop shortcut.
4. If Windows SmartScreen appears, choose more info and run anyway only when this installer came from the official release channel.

## First Launch Activation

1. Copy the machine code shown by Lumi OS.
2. Generate an authorization code at the admin license generator.
3. Paste the authorization code into Lumi OS and activate.

## First Launch Setup

1. Choose Essential for the fastest start, Practical for daily use, or Full for all provider options.
2. Configure at least one cloud model API key, or start Ollama / LM Studio with a loaded local chat model.
3. Use the bilingual API key help beside each provider field when you need provider-specific instructions.
4. Run diagnostics and continue when at least one model source is available.

Lumi OS stores local setup data under:

\`\`\`text
%USERPROFILE%\\LumiOS\\data
\`\`\`

## Troubleshooting

### No model source detected

Save one supported cloud provider API key, or start Ollama / LM Studio with a loaded model and run diagnostics again.

### Relay provider test fails

OpenAI-compatible relay providers require both an API key and a Base URL ending in a compatible API path such as \`/v1\`.

### Installer cannot be found after build

Use the exported release kit under \`release\\windows\`. The deeper \`src-tauri\\target\\release\\bundle\\nsis\` directory is only Tauri's internal build output.
`;
}

export function exportWindowsReleaseKit(projectDir, options = {}) {
  const installer = exportWindowsInstaller(projectDir);
  const releaseDir = getWindowsReleaseDir(projectDir);
  const installerName = path.basename(installer.destination);
  const sha256 = getFileSha256(installer.destination);
  const generatedAt = options.generatedAt ?? new Date();
  const version = installerName.match(/^LumiOS-Windows-(.+)-x64-setup\.exe$/)?.[1] ?? getInstallerVersion(installerName);
  const packageName = `LumiOS-Windows-${version}.zip`;

  const checksumPath = path.join(releaseDir, 'SHA256SUMS.txt');
  const manifestPath = path.join(releaseDir, 'manifest.json');
  const releaseNotesPath = path.join(releaseDir, 'RELEASE_NOTES.md');

  const manifest = {
    appName: 'Lumi OS',
    version,
    platform: 'windows-x64',
    installerName,
    packageName,
    size: installer.size,
    sha256,
    generatedAt: generatedAt.toISOString(),
  };

  fs.writeFileSync(checksumPath, `${sha256}  ${installerName}\n`);
  writeJson(manifestPath, manifest);
  fs.writeFileSync(releaseNotesPath, createReleaseNotes(manifest));

  return {
    installerPath: installer.destination,
    checksumPath,
    manifestPath,
    releaseNotesPath,
    manifest,
  };
}

export function validateWindowsReleaseKit(projectDir) {
  const releaseDir = getWindowsReleaseDir(projectDir);
  const manifestPath = path.join(releaseDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Windows release manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const installerPath = path.join(releaseDir, manifest.installerName);
  const packageName = manifest.packageName ?? `LumiOS-Windows-${manifest.version ?? 'unknown'}.zip`;
  const packagePath = path.join(releaseDir, packageName);
  if (!fs.existsSync(installerPath)) {
    throw new Error(`Windows release installer not found: ${installerPath}`);
  }

  const size = fs.statSync(installerPath).size;
  const sha256 = getFileSha256(installerPath);
  const resourceChecks = [
    path.join(projectDir, 'desktop-resources', 'dist-server', 'node.exe'),
    path.join(projectDir, 'desktop-resources', 'dist-server', 'entry.cjs'),
    path.join(projectDir, 'desktop-resources', 'dist-server', 'server.mjs'),
  ].map((resourcePath) => ({
    path: resourcePath,
    ok: fs.existsSync(resourcePath),
  }));

  const packageExists = fs.existsSync(packagePath);
  const ok =
    size === manifest.size &&
    sha256 === manifest.sha256 &&
    packageExists &&
    resourceChecks.every((check) => check.ok);

  return {
    ok,
    installerName: manifest.installerName,
    packageName,
    packageExists,
    size,
    sha256,
    expectedSha256: manifest.sha256,
    resourceChecks,
  };
}
