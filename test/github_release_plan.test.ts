import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { createWindowsGitHubReleasePlan } from '../scripts/github-release-plan.mjs';

const tempDirs: string[] = [];

function makeProject() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumi-github-release-'));
  tempDirs.push(projectDir);
  const releaseDir = path.join(projectDir, 'release', 'windows');
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.writeFileSync(path.join(releaseDir, 'LumiOS-Windows-3.0.0.zip'), 'zip');
  fs.writeFileSync(path.join(releaseDir, 'Lumi OS_3.0.0_x64-setup.exe'), 'exe');
  fs.writeFileSync(path.join(releaseDir, 'SHA256SUMS.txt'), 'sha');
  fs.writeFileSync(path.join(releaseDir, 'RELEASE_NOTES.md'), '# notes');
  fs.writeFileSync(
    path.join(releaseDir, 'manifest.json'),
    JSON.stringify(
      {
        appName: 'Lumi OS',
        version: '3.0.0',
        platform: 'windows-x64',
        installerName: 'Lumi OS_3.0.0_x64-setup.exe',
        packageName: 'LumiOS-Windows-3.0.0.zip',
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

describe('GitHub release plan', () => {
  test('creates a Windows release plan from the release manifest', () => {
    const projectDir = makeProject();
    const plan = createWindowsGitHubReleasePlan(projectDir, { repo: 'hqwzhu/lumi.new' });

    expect(plan).toMatchObject({
      repo: 'hqwzhu/lumi.new',
      tag: 'windows-v3.0.0',
      title: 'Lumi OS 3.0.0 Windows',
      notesPath: path.join(projectDir, 'release', 'windows', 'RELEASE_NOTES.md'),
    });
    expect(plan.assets.map(asset => path.basename(asset))).toEqual([
      'LumiOS-Windows-3.0.0.zip',
      'Lumi OS_3.0.0_x64-setup.exe',
      'SHA256SUMS.txt',
      'manifest.json',
      'RELEASE_NOTES.md',
    ]);
  });

  test('fails clearly when a required release asset is missing', () => {
    const projectDir = makeProject();
    fs.rmSync(path.join(projectDir, 'release', 'windows', 'SHA256SUMS.txt'));

    expect(() => createWindowsGitHubReleasePlan(projectDir, { repo: 'hqwzhu/lumi.new' })).toThrow(
      /Required release asset not found/,
    );
  });
});
