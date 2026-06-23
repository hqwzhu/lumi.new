import fs from 'node:fs';
import path from 'node:path';

export function getMacosReleaseDir(projectDir) {
  return path.join(projectDir, 'release', 'macos');
}

function readManifest(releaseDir) {
  const manifestPath = path.join(releaseDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`macOS release manifest not found: ${manifestPath}`);
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function requireAsset(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required macOS release asset not found: ${filePath}`);
  }
  return filePath;
}

export function createMacosGitHubReleasePlan(projectDir, options = {}) {
  const releaseDir = getMacosReleaseDir(projectDir);
  const manifest = readManifest(releaseDir);
  const repo = options.repo ?? 'hqwzhu/lumi.new';
  const version = manifest.version;
  const arch = manifest.arch;
  if (!version) {
    throw new Error('macOS release manifest is missing version.');
  }
  if (!arch) {
    throw new Error('macOS release manifest is missing arch.');
  }

  const packageName = manifest.packageName ?? `LumiOS-macOS-${version}-${arch}.zip`;
  const assets = [
    requireAsset(path.join(releaseDir, packageName)),
    requireAsset(path.join(releaseDir, manifest.dmgName)),
    requireAsset(path.join(releaseDir, manifest.appArchiveName)),
    requireAsset(path.join(releaseDir, 'SHA256SUMS.txt')),
    requireAsset(path.join(releaseDir, 'manifest.json')),
    requireAsset(path.join(releaseDir, 'RELEASE_NOTES.md')),
  ];
  const notesPath = requireAsset(path.join(releaseDir, 'RELEASE_NOTES.md'));

  return {
    repo,
    tag: `macos-v${version}-${arch}`,
    title: `Lumi OS ${version} macOS ${arch}`,
    notesPath,
    assets,
    manifest: {
      ...manifest,
      packageName,
    },
  };
}
