import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  exportWindowsInstaller,
  findLatestWindowsInstaller,
  getWindowsReleaseDir,
} from '../scripts/windows-installer-exporter.mjs';

const tempDirs: string[] = [];

function makeTempProject() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumi-windows-export-'));
  tempDirs.push(projectDir);
  fs.mkdirSync(path.join(projectDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis'), {
    recursive: true,
  });
  return projectDir;
}

function writeInstaller(projectDir: string, name: string, body: string, mtime: Date) {
  const installerPath = path.join(
    projectDir,
    'src-tauri',
    'target',
    'release',
    'bundle',
    'nsis',
    name,
  );
  fs.writeFileSync(installerPath, body);
  fs.utimesSync(installerPath, mtime, mtime);
  return installerPath;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('windows installer exporter', () => {
  test('finds the newest NSIS setup executable', () => {
    const projectDir = makeTempProject();
    writeInstaller(projectDir, 'Lumi OS_3.0.0_x64-setup.exe', 'old', new Date('2026-06-19T10:00:00Z'));
    const newest = writeInstaller(
      projectDir,
      'Lumi OS_3.0.1_x64-setup.exe',
      'new',
      new Date('2026-06-20T10:00:00Z'),
    );

    expect(findLatestWindowsInstaller(projectDir)).toBe(newest);
  });

  test('copies the latest installer into release/windows', () => {
    const projectDir = makeTempProject();
    writeInstaller(
      projectDir,
      'Lumi OS_3.0.0_x64-setup.exe',
      'installer-binary',
      new Date('2026-06-20T10:00:00Z'),
    );

    const result = exportWindowsInstaller(projectDir);

    expect(result.destination).toBe(
      path.join(getWindowsReleaseDir(projectDir), 'Lumi OS_3.0.0_x64-setup.exe'),
    );
    expect(fs.readFileSync(result.destination, 'utf8')).toBe('installer-binary');
    expect(result.size).toBe('installer-binary'.length);
  });

  test('fails with a clear message when no installer exists', () => {
    const projectDir = makeTempProject();

    expect(() => exportWindowsInstaller(projectDir)).toThrow(/No Windows installer matching/);
  });
});
