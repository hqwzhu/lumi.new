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

  const destination = path.join(releaseDir, path.basename(source));
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
- First-launch setup wizard with Essential, Practical, and Full modes.
- China, international, and local model provider recommendations.
- Bilingual API key help for provider setup.
- Local API key storage under the user's LumiOS data directory.
- Ollama and LM Studio local model diagnostics.

## Before Sharing

1. Verify the checksum in \`SHA256SUMS.txt\`.
2. Run the installer on a clean Windows user profile or VM.
3. Confirm first-launch setup reaches the LumiOS desktop after a cloud key or local model is available.
`;
}

export function exportWindowsReleaseKit(projectDir, options = {}) {
  const installer = exportWindowsInstaller(projectDir);
  const releaseDir = getWindowsReleaseDir(projectDir);
  const installerName = path.basename(installer.destination);
  const sha256 = getFileSha256(installer.destination);
  const generatedAt = options.generatedAt ?? new Date();
  const version = getInstallerVersion(installerName);

  const checksumPath = path.join(releaseDir, 'SHA256SUMS.txt');
  const manifestPath = path.join(releaseDir, 'manifest.json');
  const releaseNotesPath = path.join(releaseDir, 'RELEASE_NOTES.md');

  const manifest = {
    appName: 'Lumi OS',
    version,
    platform: 'windows-x64',
    installerName,
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
  if (!fs.existsSync(installerPath)) {
    throw new Error(`Windows release installer not found: ${installerPath}`);
  }

  const size = fs.statSync(installerPath).size;
  const sha256 = getFileSha256(installerPath);
  const ok = size === manifest.size && sha256 === manifest.sha256;

  return {
    ok,
    installerName: manifest.installerName,
    size,
    sha256,
    expectedSha256: manifest.sha256,
  };
}
