import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { createMacosGitHubReleasePlan } from '../scripts/macos-github-release-plan.mjs';

const tempDirs: string[] = [];

function makeProject() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumi-macos-github-release-'));
  tempDirs.push(projectDir);
  const releaseDir = path.join(projectDir, 'release', 'macos');
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.writeFileSync(path.join(releaseDir, 'LumiOS-macOS-3.0.4-arm64.zip'), 'zip');
  fs.writeFileSync(path.join(releaseDir, 'LumiOS-macOS-3.0.4-arm64.dmg'), 'dmg');
  fs.writeFileSync(path.join(releaseDir, 'LumiOS-macOS-3.0.4-arm64.app.tar.gz'), 'app');
  fs.writeFileSync(path.join(releaseDir, 'SHA256SUMS.txt'), 'sha');
  fs.writeFileSync(path.join(releaseDir, 'RELEASE_NOTES.md'), '# notes');
  fs.writeFileSync(
    path.join(releaseDir, 'manifest.json'),
    JSON.stringify(
      {
        appName: 'Lumi OS',
        version: '3.0.4',
        platform: 'macos-arm64',
        arch: 'arm64',
        dmgName: 'LumiOS-macOS-3.0.4-arm64.dmg',
        appArchiveName: 'LumiOS-macOS-3.0.4-arm64.app.tar.gz',
        packageName: 'LumiOS-macOS-3.0.4-arm64.zip',
      },
      null,
      2,
    ),
  );
  return projectDir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('macOS GitHub release plan', () => {
  test('creates a macOS release plan from the release manifest', () => {
    const projectDir = makeProject();
    const plan = createMacosGitHubReleasePlan(projectDir, { repo: 'hqwzhu/lumi.new' });

    expect(plan).toMatchObject({
      repo: 'hqwzhu/lumi.new',
      tag: 'macos-v3.0.4-arm64',
      title: 'Lumi OS 3.0.4 macOS arm64',
      notesPath: path.join(projectDir, 'release', 'macos', 'RELEASE_NOTES.md'),
    });
    expect(plan.assets.map((asset) => path.basename(asset))).toEqual([
      'LumiOS-macOS-3.0.4-arm64.zip',
      'LumiOS-macOS-3.0.4-arm64.dmg',
      'LumiOS-macOS-3.0.4-arm64.app.tar.gz',
      'SHA256SUMS.txt',
      'manifest.json',
      'RELEASE_NOTES.md',
    ]);
  });

  test('fails clearly when a required macOS release asset is missing', () => {
    const projectDir = makeProject();
    fs.rmSync(path.join(projectDir, 'release', 'macos', 'LumiOS-macOS-3.0.4-arm64.dmg'));

    expect(() => createMacosGitHubReleasePlan(projectDir, { repo: 'hqwzhu/lumi.new' })).toThrow(
      /Required macOS release asset not found/,
    );
  });
});
