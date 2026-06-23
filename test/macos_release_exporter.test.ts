import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  exportMacosReleaseKit,
  findLatestMacosBundle,
  getMacosReleaseDir,
  packageMacosRelease,
  validateMacosReleaseKit,
} from '../scripts/macos-release-exporter.mjs';

const tempDirs: string[] = [];

function makeTempProject() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumi-macos-export-'));
  tempDirs.push(projectDir);
  fs.mkdirSync(path.join(projectDir, 'src-tauri', 'target', 'release', 'bundle', 'dmg'), {
    recursive: true,
  });
  fs.mkdirSync(path.join(projectDir, 'src-tauri', 'target', 'release', 'bundle', 'macos'), {
    recursive: true,
  });
  return projectDir;
}

function writeBundle(projectDir: string, dir: 'dmg' | 'macos', name: string, body: string, mtime: Date) {
  const bundlePath = path.join(projectDir, 'src-tauri', 'target', 'release', 'bundle', dir, name);
  fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
  fs.writeFileSync(bundlePath, body);
  fs.utimesSync(bundlePath, mtime, mtime);
  return bundlePath;
}

function writeAppBundle(projectDir: string, name: string, mtime: Date) {
  const appPath = path.join(projectDir, 'src-tauri', 'target', 'release', 'bundle', 'macos', name);
  fs.mkdirSync(path.join(appPath, 'Contents', 'MacOS'), { recursive: true });
  fs.writeFileSync(path.join(appPath, 'Contents', 'Info.plist'), '<plist></plist>');
  fs.writeFileSync(path.join(appPath, 'Contents', 'MacOS', 'lumi-os'), 'binary');
  fs.utimesSync(appPath, mtime, mtime);
  return appPath;
}

function writeDesktopResources(projectDir: string) {
  const distServerDir = path.join(projectDir, 'desktop-resources', 'dist-server');
  fs.mkdirSync(distServerDir, { recursive: true });
  fs.writeFileSync(path.join(distServerDir, 'node'), 'node-binary');
  fs.writeFileSync(path.join(distServerDir, 'entry.cjs'), 'module.exports = {};');
  fs.writeFileSync(path.join(distServerDir, 'server.mjs'), 'export {};');
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('macOS release exporter', () => {
  test('finds the newest DMG bundle', () => {
    const projectDir = makeTempProject();
    writeBundle(projectDir, 'dmg', 'Lumi OS_3.0.0_aarch64.dmg', 'old', new Date('2026-06-19T10:00:00Z'));
    const newest = writeBundle(
      projectDir,
      'dmg',
      'Lumi OS_3.0.1_aarch64.dmg',
      'new',
      new Date('2026-06-20T10:00:00Z'),
    );

    expect(findLatestMacosBundle(projectDir, 'dmg')).toBe(newest);
  });

  test('exports a macOS release kit with checksum, manifest, and notes', () => {
    const projectDir = makeTempProject();
    writeBundle(
      projectDir,
      'dmg',
      'Lumi OS_3.0.0_aarch64.dmg',
      'dmg-binary',
      new Date('2026-06-20T10:00:00Z'),
    );
    writeBundle(
      projectDir,
      'macos',
      'Lumi OS.app.tar.gz',
      'app-archive',
      new Date('2026-06-20T10:00:00Z'),
    );

    const result = exportMacosReleaseKit(projectDir, {
      generatedAt: new Date('2026-06-20T12:00:00Z'),
    });

    expect(path.basename(result.dmgPath)).toBe('LumiOS-macOS-3.0.0-arm64.dmg');
    expect(path.basename(result.appArchivePath)).toBe('LumiOS-macOS-3.0.0-arm64.app.tar.gz');
    expect(fs.readFileSync(result.checksumPath, 'utf8')).toContain('LumiOS-macOS-3.0.0-arm64.dmg');
    expect(fs.readFileSync(result.checksumPath, 'utf8')).toContain('LumiOS-macOS-3.0.0-arm64.app.tar.gz');

    const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf8'));
    expect(manifest).toMatchObject({
      appName: 'Lumi OS',
      version: '3.0.0',
      platform: 'macos-arm64',
      dmgName: 'LumiOS-macOS-3.0.0-arm64.dmg',
      appArchiveName: 'LumiOS-macOS-3.0.0-arm64.app.tar.gz',
      packageName: 'LumiOS-macOS-3.0.0-arm64.zip',
      generatedAt: '2026-06-20T12:00:00.000Z',
    });

    const releaseNotes = fs.readFileSync(result.releaseNotesPath, 'utf8');
    expect(releaseNotes).toContain('Lumi OS 3.0.0 macOS Release');
    expect(releaseNotes).toContain('Apple Developer signing');
    expect(releaseNotes).toContain('LumiOS-macOS-3.0.0-arm64.dmg');
  });

  test('creates an app archive from a macOS .app directory when no archive exists', () => {
    const projectDir = makeTempProject();
    writeBundle(
      projectDir,
      'dmg',
      'Lumi OS_3.0.0_aarch64.dmg',
      'dmg-binary',
      new Date('2026-06-20T10:00:00Z'),
    );
    writeAppBundle(projectDir, 'Lumi OS.app', new Date('2026-06-20T10:00:00Z'));

    const result = exportMacosReleaseKit(projectDir, {
      generatedAt: new Date('2026-06-20T12:00:00Z'),
    });

    expect(path.basename(result.appArchivePath)).toBe('LumiOS-macOS-3.0.0-arm64.app.tar.gz');
    expect(fs.existsSync(result.appArchivePath)).toBe(true);
    expect(fs.statSync(result.appArchivePath).size).toBeGreaterThan(0);
  });

  test('validates an exported release kit checksum and runtime resources', () => {
    const projectDir = makeTempProject();
    writeBundle(projectDir, 'dmg', 'Lumi OS_3.0.0_aarch64.dmg', 'dmg-binary', new Date('2026-06-20T10:00:00Z'));
    writeBundle(projectDir, 'macos', 'Lumi OS.app.tar.gz', 'app-archive', new Date('2026-06-20T10:00:00Z'));
    exportMacosReleaseKit(projectDir, {
      generatedAt: new Date('2026-06-20T12:00:00Z'),
    });
    writeDesktopResources(projectDir);
    packageMacosRelease(projectDir);

    expect(validateMacosReleaseKit(projectDir)).toMatchObject({
      ok: true,
      dmgName: 'LumiOS-macOS-3.0.0-arm64.dmg',
      appArchiveName: 'LumiOS-macOS-3.0.0-arm64.app.tar.gz',
      packageName: 'LumiOS-macOS-3.0.0-arm64.zip',
      packageExists: true,
    });
  });

  test('reports a missing release package during validation', () => {
    const projectDir = makeTempProject();
    writeBundle(projectDir, 'dmg', 'Lumi OS_3.0.0_aarch64.dmg', 'dmg-binary', new Date('2026-06-20T10:00:00Z'));
    writeBundle(projectDir, 'macos', 'Lumi OS.app.tar.gz', 'app-archive', new Date('2026-06-20T10:00:00Z'));
    exportMacosReleaseKit(projectDir, {
      generatedAt: new Date('2026-06-20T12:00:00Z'),
    });
    writeDesktopResources(projectDir);

    expect(validateMacosReleaseKit(projectDir)).toMatchObject({
      ok: false,
      packageName: 'LumiOS-macOS-3.0.0-arm64.zip',
      packageExists: false,
    });
  });

  test('fails clearly when no DMG exists', () => {
    const projectDir = makeTempProject();

    expect(() => exportMacosReleaseKit(projectDir)).toThrow(/No macOS dmg bundle/);
  });
});
