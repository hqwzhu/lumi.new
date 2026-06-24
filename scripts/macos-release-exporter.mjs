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

function createMacosUninstaller(releaseDir, version, arch) {
  const uninstallerName = `LumiOS-macOS-${version}-${arch}-uninstall.command`;
  const uninstallerPath = path.join(releaseDir, uninstallerName);
  const script = `#!/bin/bash
set -euo pipefail

REMOVE_USER_DATA="\${REMOVE_USER_DATA:-0}"
ASSUME_YES="\${ASSUME_YES:-0}"

for arg in "$@"; do
  case "$arg" in
    --remove-user-data)
      REMOVE_USER_DATA=1
      ;;
    --yes|-y)
      ASSUME_YES=1
      ;;
    --help|-h)
      echo "Usage: ./$(basename "$0") [--remove-user-data] [--yes]"
      echo "By default, user data is kept unless you confirm removal."
      exit 0
      ;;
  esac
done

echo "Lumi OS macOS uninstall helper"

remove_path() {
  local target="$1"
  if [ -e "$target" ] || [ -L "$target" ]; then
    echo "Removing: $target"
    if rm -rf "$target" 2>/dev/null; then
      return 0
    fi
    if command -v sudo >/dev/null 2>&1; then
      sudo rm -rf "$target"
      return 0
    fi
    echo "Permission denied and sudo is not available: $target" >&2
    return 1
  fi
}

APP_CANDIDATES=(
  "/Applications/Lumi OS.app"
  "$HOME/Applications/Lumi OS.app"
)

for app in "\${APP_CANDIDATES[@]}"; do
  remove_path "$app"
done

# User data paths: ~/LumiOS, ~/lumi_skills, ~/Library/Application Support/com.lumiai.os
if [ "$REMOVE_USER_DATA" != "1" ] && [ "$ASSUME_YES" != "1" ] && [ -t 0 ]; then
  read -r -p "Remove local Lumi OS data, API Key settings, and installed skills? [y/N] " answer
  case "$answer" in
    y|Y|yes|YES)
      REMOVE_USER_DATA=1
      ;;
  esac
fi

if [ "$REMOVE_USER_DATA" = "1" ]; then
  DATA_CANDIDATES=(
    "$HOME/LumiOS"
    "$HOME/lumi_skills"
    "$HOME/Library/Application Support/com.lumiai.os"
    "$HOME/Library/Application Support/Lumi OS"
    "$HOME/Library/Logs/Lumi OS"
  )
  for data_path in "\${DATA_CANDIDATES[@]}"; do
    remove_path "$data_path"
  done
else
  echo "Local user data was kept."
fi

echo "Lumi OS uninstall helper finished."
`;

  fs.writeFileSync(uninstallerPath, script, { mode: 0o755 });
  fs.chmodSync(uninstallerPath, 0o755);

  return {
    uninstallerName,
    uninstallerPath,
    uninstallerSize: fs.statSync(uninstallerPath).size,
    uninstallerSha256: getFileSha256(uninstallerPath),
  };
}

function createReleaseNotes(manifest) {
  return `# Lumi OS ${manifest.version} macOS Release

## Artifact

- DMG: ${manifest.dmgName}
- App archive: ${manifest.appArchiveName}
- Uninstaller: ${manifest.uninstallerName}
- Platform: ${manifest.platform}
- DMG SHA256: ${manifest.dmgSha256}
- App archive SHA256: ${manifest.appArchiveSha256}
- Uninstaller SHA256: ${manifest.uninstallerSha256}

## What Users Get

- macOS desktop app bundle built with Tauri.
- Bundled Node.js backend runtime and desktop resources.
- One-machine license activation before first-launch setup.
- First-launch setup wizard with Essential, Practical, and Full modes.
- China, international, and local model provider recommendations.
- Bilingual API key help for provider setup.
- Skills are installed disabled when they need setup-only or external runtime configuration, so users can configure them before enabling.

## Signing Status

This build pipeline supports Apple Developer signing and notarization when the required macOS signing secrets are configured in GitHub Actions. Without those secrets, the DMG is suitable for internal testing only and macOS Gatekeeper may require manual approval.

## Install

1. Download \`${manifest.dmgName}\`.
2. Open the DMG and drag Lumi OS into Applications.
3. Launch Lumi OS from Applications.
4. If macOS blocks the app because it is unsigned or not notarized, use this build only for internal testing or configure Apple Developer signing before distributing to normal users.

## Uninstall

1. Quit Lumi OS.
2. Run \`${manifest.uninstallerName}\` from the release package, or delete \`/Applications/Lumi OS.app\` manually.
3. The helper removes the app from \`/Applications\` and \`~/Applications\`.
4. Local setup data, API Key settings, and installed skills are kept by default. Run \`./${manifest.uninstallerName} --remove-user-data\` when a clean test environment is needed.

## First Launch Activation

1. Copy the machine code shown by Lumi OS.
2. Generate an authorization code at the admin license generator.
3. Paste the authorization code into Lumi OS and activate.

## First Launch Setup

1. Choose Essential for the fastest start, Practical for daily use, or Full for all provider options.
2. Configure at least one cloud model API key, or start Ollama / LM Studio with a loaded local chat model.
3. Use the bilingual API key help beside each provider field when you need provider-specific instructions.
4. Run diagnostics and continue when at least one model source is available.

## Troubleshooting

### No model source detected

Save one supported cloud provider API key, or start Ollama / LM Studio with a loaded model and run diagnostics again.

### Relay provider test fails

OpenAI-compatible relay providers require both an API key and a Base URL ending in a compatible API path such as \`/v1\`.

### Skill install reports setup requirements

Some skills require local binaries or provider configuration. Install them from Skill Center, open the skill details, complete the shown setup steps, then enable the skill.

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
  const uninstaller = createMacosUninstaller(releaseDir, version, arch);
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
    uninstallerName: uninstaller.uninstallerName,
    packageName: `LumiOS-macOS-${version}-${arch}.zip`,
    dmgSize,
    appArchiveSize,
    uninstallerSize: uninstaller.uninstallerSize,
    dmgSha256,
    appArchiveSha256,
    uninstallerSha256: uninstaller.uninstallerSha256,
    generatedAt: generatedAt.toISOString(),
  };

  fs.writeFileSync(
    checksumPath,
    [
      `${dmgSha256}  ${dmgName}`,
      `${appArchiveSha256}  ${appArchiveName}`,
      `${uninstaller.uninstallerSha256}  ${uninstaller.uninstallerName}`,
    ].join('\n') + '\n',
  );
  writeJson(manifestPath, manifest);
  fs.writeFileSync(releaseNotesPath, createReleaseNotes(manifest));

  return {
    dmgPath,
    appArchivePath,
    uninstallerPath: uninstaller.uninstallerPath,
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
    path.join(releaseDir, manifest.uninstallerName),
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
  const uninstallerPath = manifest.uninstallerName ? path.join(releaseDir, manifest.uninstallerName) : null;
  const checksumPath = path.join(releaseDir, 'SHA256SUMS.txt');
  const releaseNotesPath = path.join(releaseDir, 'RELEASE_NOTES.md');

  for (const file of [dmgPath, appArchivePath, checksumPath, releaseNotesPath]) {
    if (!fs.existsSync(file)) {
      throw new Error(`Required macOS release file not found: ${file}`);
    }
  }

  const dmgSha256 = getFileSha256(dmgPath);
  const appArchiveSha256 = getFileSha256(appArchivePath);
  const uninstallerExists = !!(uninstallerPath && fs.existsSync(uninstallerPath));
  const uninstallerSha256 = uninstallerExists ? getFileSha256(uninstallerPath) : '';
  const nodeRuntimePath = path.join(projectDir, 'desktop-resources', 'dist-server', 'node');
  const nodeRuntimeFallbackPath = path.join(projectDir, 'desktop-resources', 'dist-server', 'node.exe');
  const resourceChecks = [
    {
      path: nodeRuntimePath,
      ok:
        fs.existsSync(nodeRuntimePath) ||
        (process.platform === 'win32' && fs.existsSync(nodeRuntimeFallbackPath)),
    },
    path.join(projectDir, 'desktop-resources', 'dist-server', 'entry.cjs'),
    path.join(projectDir, 'desktop-resources', 'dist-server', 'server.mjs'),
  ].map((resourcePath) => {
    if (typeof resourcePath !== 'string') return resourcePath;
    return {
      path: resourcePath,
      ok: fs.existsSync(resourcePath),
    };
  });

  const packageName = manifest.packageName ?? `LumiOS-macOS-${manifest.version}-${manifest.arch}.zip`;
  const packagePath = path.join(releaseDir, packageName);
  const packageExists = fs.existsSync(packagePath);

  const ok =
    dmgSha256 === manifest.dmgSha256 &&
    appArchiveSha256 === manifest.appArchiveSha256 &&
    uninstallerExists &&
    uninstallerSha256 === manifest.uninstallerSha256 &&
    fs.statSync(dmgPath).size === manifest.dmgSize &&
    fs.statSync(appArchivePath).size === manifest.appArchiveSize &&
    fs.statSync(uninstallerPath).size === manifest.uninstallerSize &&
    packageExists &&
    resourceChecks.every((check) => check.ok);

  return {
    ok,
    dmgName: manifest.dmgName,
    appArchiveName: manifest.appArchiveName,
    uninstallerName: manifest.uninstallerName,
    uninstallerExists,
    packageName,
    packageExists,
    dmgSha256,
    appArchiveSha256,
    uninstallerSha256,
    expectedDmgSha256: manifest.dmgSha256,
    expectedAppArchiveSha256: manifest.appArchiveSha256,
    expectedUninstallerSha256: manifest.uninstallerSha256,
    resourceChecks,
  };
}
