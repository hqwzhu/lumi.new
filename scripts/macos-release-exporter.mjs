import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function getMacosReleaseDir(projectDir) {
  return path.join(projectDir, 'release', 'macos');
}

function getBundleDir(projectDir, kind) {
  return path.join(projectDir, 'src-tauri', 'target', 'release', 'bundle', kind);
}

export function findLatestMacosBundle(projectDir, kind) {
  const bundleDir = getBundleDir(projectDir, kind);
  const ext = kind === 'dmg' ? '.dmg' : '.app.tar.gz';
  const label = kind === 'dmg' ? 'dmg' : 'app archive';

  if (!fs.existsSync(bundleDir)) {
    throw new Error(`macOS ${label} bundle directory not found: ${bundleDir}`);
  }

  const bundles = fs
    .readdirSync(bundleDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(bundleDir, entry.name))
    .filter((filePath) => filePath.endsWith(ext))
    .map((filePath) => ({
      filePath,
      mtimeMs: fs.statSync(filePath).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (bundles.length === 0) {
    throw new Error(`No macOS ${label} bundle matching *${ext} found in: ${bundleDir}`);
  }

  return bundles[0].filePath;
}

export function findLatestMacosAppBundle(projectDir) {
  const bundleDir = getBundleDir(projectDir, 'macos');
  if (!fs.existsSync(bundleDir)) {
    throw new Error(`macOS app bundle directory not found: ${bundleDir}`);
  }

  const apps = fs
    .readdirSync(bundleDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(bundleDir, entry.name))
    .filter((filePath) => filePath.endsWith('.app'))
    .map((filePath) => ({
      filePath,
      mtimeMs: fs.statSync(filePath).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (apps.length === 0) {
    throw new Error(`No macOS app bundle matching *.app found in: ${bundleDir}`);
  }

  return apps[0].filePath;
}

function getMacosVersion(fileName) {
  const match = fileName.match(/^Lumi OS_(.+?)_(?:aarch64|x64|universal)\.dmg$/);
  return match?.[1] ?? 'unknown';
}

function getMacosArch(fileName) {
  if (fileName.includes('_aarch64.')) return 'arm64';
  if (fileName.includes('_x64.')) return 'x64';
  if (fileName.includes('_universal.')) return 'universal';
  return process.arch === 'arm64' ? 'arm64' : 'x64';
}

function getFileSha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function copyWithTimes(source, destination) {
  fs.copyFileSync(source, destination);
  const sourceStat = fs.statSync(source);
  fs.utimesSync(destination, sourceStat.atime, sourceStat.mtime);
  return fs.statSync(destination).size;
}

function copyOrCreateAppArchive(projectDir, destination) {
  try {
    const source = findLatestMacosBundle(projectDir, 'macos');
    return copyWithTimes(source, destination);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('No macOS app archive')) {
      throw error;
    }
  }

  const appSource = findLatestMacosAppBundle(projectDir);
  if (fs.existsSync(destination)) fs.rmSync(destination, { force: true });

  if (process.platform === 'win32') {
    execFileSync('tar', ['-czf', destination, '-C', path.dirname(appSource), path.basename(appSource)], {
      stdio: 'inherit',
    });
  } else {
    execFileSync('tar', ['-czf', destination, '-C', path.dirname(appSource), path.basename(appSource)], {
      stdio: 'inherit',
    });
  }

  return fs.statSync(destination).size;
}

function createReleaseNotes(manifest) {
  return `# Lumi OS ${manifest.version} macOS Release

## Artifact

- DMG: ${manifest.dmgName}
- App archive: ${manifest.appArchiveName}
- Platform: ${manifest.platform}
- DMG SHA256: ${manifest.dmgSha256}
- App archive SHA256: ${manifest.appArchiveSha256}

## What Users Get

- macOS desktop app bundle built with Tauri.
- Bundled Node.js backend runtime and desktop resources.
- First-launch setup wizard with Essential, Practical, and Full modes.
- China, international, and local model provider recommendations.
- Bilingual API key help for provider setup.

## Signing Status

This build pipeline supports Apple Developer signing and notarization when the required macOS signing secrets are configured in GitHub Actions. Without those secrets, the DMG is suitable for internal testing only and macOS Gatekeeper may require manual approval.

## Install

1. Download \`${manifest.dmgName}\`.
2. Open the DMG and drag Lumi OS into Applications.
3. Launch Lumi OS from Applications.
4. If macOS blocks the app because it is unsigned or not notarized, use this build only for internal testing or configure Apple Developer signing before distributing to normal users.

## First Launch Setup

1. Choose Essential for the fastest start, Practical for daily use, or Full for all provider options.
2. Configure at least one cloud model API key, or start Ollama / LM Studio with a loaded local chat model.
3. Run diagnostics and continue when at least one model source is available.

Lumi OS stores local setup data under:

\`\`\`text
~/LumiOS/data
\`\`\`
`;
}

export function exportMacosReleaseKit(projectDir, options = {}) {
  const dmgSource = findLatestMacosBundle(projectDir, 'dmg');
  const releaseDir = getMacosReleaseDir(projectDir);
  fs.mkdirSync(releaseDir, { recursive: true });

  const sourceDmgName = path.basename(dmgSource);
  const version = getMacosVersion(sourceDmgName);
  const arch = getMacosArch(sourceDmgName);
  const platform = `macos-${arch}`;
  const dmgName = `LumiOS-macOS-${version}-${arch}.dmg`;
  const appArchiveName = `LumiOS-macOS-${version}-${arch}.app.tar.gz`;
  const dmgPath = path.join(releaseDir, dmgName);
  const appArchivePath = path.join(releaseDir, appArchiveName);

  const dmgSize = copyWithTimes(dmgSource, dmgPath);
  const appArchiveSize = copyOrCreateAppArchive(projectDir, appArchivePath);
  const dmgSha256 = getFileSha256(dmgPath);
  const appArchiveSha256 = getFileSha256(appArchivePath);
  const generatedAt = options.generatedAt ?? new Date();

  const checksumPath = path.join(releaseDir, 'SHA256SUMS.txt');
  const manifestPath = path.join(releaseDir, 'manifest.json');
  const releaseNotesPath = path.join(releaseDir, 'RELEASE_NOTES.md');

  const manifest = {
    appName: 'Lumi OS',
    version,
    platform,
    arch,
    dmgName,
    appArchiveName,
    packageName: `LumiOS-macOS-${version}-${arch}.zip`,
    dmgSize,
    appArchiveSize,
    dmgSha256,
    appArchiveSha256,
    generatedAt: generatedAt.toISOString(),
  };

  fs.writeFileSync(checksumPath, `${dmgSha256}  ${dmgName}\n${appArchiveSha256}  ${appArchiveName}\n`);
  writeJson(manifestPath, manifest);
  fs.writeFileSync(releaseNotesPath, createReleaseNotes(manifest));

  return {
    dmgPath,
    appArchivePath,
    checksumPath,
    manifestPath,
    releaseNotesPath,
    manifest,
  };
}

export function packageMacosRelease(projectDir) {
  const releaseDir = getMacosReleaseDir(projectDir);
  const manifestPath = path.join(releaseDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`macOS release manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const packageName = manifest.packageName ?? `LumiOS-macOS-${manifest.version}-${manifest.arch}.zip`;
  const packagePath = path.join(releaseDir, packageName);
  const files = [
    path.join(releaseDir, manifest.dmgName),
    path.join(releaseDir, manifest.appArchiveName),
    path.join(releaseDir, 'manifest.json'),
    path.join(releaseDir, 'SHA256SUMS.txt'),
    path.join(releaseDir, 'RELEASE_NOTES.md'),
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) {
      throw new Error(`Required macOS release file not found: ${file}`);
    }
  }

  if (fs.existsSync(packagePath)) fs.rmSync(packagePath, { force: true });

  if (process.platform === 'win32') {
    execFileSync('powershell', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `Compress-Archive -LiteralPath ${files.map((file) => `'${file.replace(/'/g, "''")}'`).join(',')} -DestinationPath '${packagePath.replace(/'/g, "''")}' -CompressionLevel Optimal`,
    ], { stdio: 'inherit' });
  } else {
    execFileSync('zip', ['-j', packagePath, ...files], { stdio: 'inherit' });
  }

  return {
    packagePath,
    packageName,
    size: fs.statSync(packagePath).size,
  };
}

export function validateMacosReleaseKit(projectDir) {
  const releaseDir = getMacosReleaseDir(projectDir);
  const manifestPath = path.join(releaseDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`macOS release manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const dmgPath = path.join(releaseDir, manifest.dmgName);
  const appArchivePath = path.join(releaseDir, manifest.appArchiveName);
  const checksumPath = path.join(releaseDir, 'SHA256SUMS.txt');
  const releaseNotesPath = path.join(releaseDir, 'RELEASE_NOTES.md');

  for (const file of [dmgPath, appArchivePath, checksumPath, releaseNotesPath]) {
    if (!fs.existsSync(file)) {
      throw new Error(`Required macOS release file not found: ${file}`);
    }
  }

  const dmgSha256 = getFileSha256(dmgPath);
  const appArchiveSha256 = getFileSha256(appArchivePath);
  const resourceChecks = [
    path.join(projectDir, 'desktop-resources', 'dist-server', 'node'),
    path.join(projectDir, 'desktop-resources', 'dist-server', 'entry.cjs'),
    path.join(projectDir, 'desktop-resources', 'dist-server', 'server.mjs'),
  ].map((resourcePath) => ({
    path: resourcePath,
    ok: fs.existsSync(resourcePath),
  }));

  const packageName = manifest.packageName ?? `LumiOS-macOS-${manifest.version}-${manifest.arch}.zip`;
  const packagePath = path.join(releaseDir, packageName);
  const packageExists = fs.existsSync(packagePath);

  const ok =
    dmgSha256 === manifest.dmgSha256 &&
    appArchiveSha256 === manifest.appArchiveSha256 &&
    fs.statSync(dmgPath).size === manifest.dmgSize &&
    fs.statSync(appArchivePath).size === manifest.appArchiveSize &&
    packageExists &&
    resourceChecks.every((check) => check.ok);

  return {
    ok,
    dmgName: manifest.dmgName,
    appArchiveName: manifest.appArchiveName,
    packageName,
    packageExists,
    dmgSha256,
    appArchiveSha256,
    expectedDmgSha256: manifest.dmgSha256,
    expectedAppArchiveSha256: manifest.appArchiveSha256,
    resourceChecks,
  };
}
