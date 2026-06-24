import fs from 'node:fs';
import path from 'node:path';

export function getWindowsReleaseDir(projectDir) {
  return path.join(projectDir, 'release', 'windows');
}

function readManifest(releaseDir) {
  const manifestPath = path.join(releaseDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Windows release manifest not found: ${manifestPath}`);
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function requireAsset(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required release asset not found: ${filePath}`);
  }
  return filePath;
}

export function createWindowsGitHubReleasePlan(projectDir, options = {}) {
  const releaseDir = getWindowsReleaseDir(projectDir);
  const manifest = readManifest(releaseDir);
  const repo = options.repo ?? 'hqwzhu/lumi.new';
  const version = manifest.version;
  if (!version) {
    throw new Error('Windows release manifest is missing version.');
  }

  const assets = [
    requireAsset(path.join(releaseDir, manifest.packageName)),
    requireAsset(path.join(releaseDir, manifest.installerName)),
    requireAsset(path.join(releaseDir, manifest.uninstallerName)),
    requireAsset(path.join(releaseDir, 'SHA256SUMS.txt')),
    requireAsset(path.join(releaseDir, 'manifest.json')),
    requireAsset(path.join(releaseDir, 'RELEASE_NOTES.md')),
  ];
  const notesPath = requireAsset(path.join(releaseDir, 'RELEASE_NOTES.md'));

  return {
    repo,
    tag: `windows-v${version}`,
    title: `Lumi OS ${version} Windows`,
    notesPath,
    assets,
    manifest,
  };
}
