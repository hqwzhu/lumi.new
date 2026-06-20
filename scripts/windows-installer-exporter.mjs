import fs from 'node:fs';
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
