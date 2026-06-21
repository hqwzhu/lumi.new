import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { generateWindowsDownloadPage } from '../scripts/generate-download-page.mjs';

const tempDirs: string[] = [];
const RELEASE_INSTALLER_NAME = 'LumiOS-Windows-3.0.0-x64-setup.exe';

function makeProject() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumi-download-page-'));
  tempDirs.push(projectDir);
  const releaseDir = path.join(projectDir, 'release', 'windows');
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.writeFileSync(path.join(releaseDir, RELEASE_INSTALLER_NAME), 'installer');
  fs.writeFileSync(path.join(releaseDir, 'LumiOS-Windows-3.0.0.zip'), 'zip');
  fs.writeFileSync(path.join(releaseDir, 'SHA256SUMS.txt'), `abc123  ${RELEASE_INSTALLER_NAME}\n`);
  fs.writeFileSync(path.join(releaseDir, 'RELEASE_NOTES.md'), '# Notes');
  fs.writeFileSync(
    path.join(releaseDir, 'manifest.json'),
    JSON.stringify(
      {
        appName: 'Lumi OS',
        version: '3.0.0',
        platform: 'windows-x64',
        installerName: RELEASE_INSTALLER_NAME,
        packageName: 'LumiOS-Windows-3.0.0.zip',
        size: 9,
        sha256: 'abc123',
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

describe('official download page generator', () => {
  test('generates a static Windows download page and machine-readable metadata', () => {
    const projectDir = makeProject();

    const result = generateWindowsDownloadPage(projectDir, {
      repo: 'hqwzhu/lumi.new',
      tag: 'windows-v3.0.0',
      generatedAt: new Date('2026-06-21T08:00:00Z'),
    });

    expect(path.basename(result.htmlPath)).toBe('windows.html');
    expect(path.basename(result.jsonPath)).toBe('windows.json');

    const metadata = JSON.parse(fs.readFileSync(result.jsonPath, 'utf8'));
    expect(metadata).toMatchObject({
      appName: 'Lumi OS',
      version: '3.0.0',
      platform: 'windows-x64',
      repo: 'hqwzhu/lumi.new',
      tag: 'windows-v3.0.0',
      installerName: RELEASE_INSTALLER_NAME,
      packageName: 'LumiOS-Windows-3.0.0.zip',
      sha256: 'abc123',
    });
    expect(metadata.downloads.installer).toBe(
      'https://github.com/hqwzhu/lumi.new/releases/download/windows-v3.0.0/LumiOS-Windows-3.0.0-x64-setup.exe',
    );
    expect(metadata.downloads.package).toBe(
      'https://github.com/hqwzhu/lumi.new/releases/download/windows-v3.0.0/LumiOS-Windows-3.0.0.zip',
    );

    const html = fs.readFileSync(result.htmlPath, 'utf8');
    expect(html).toContain('Lumi OS 3.0.0');
    expect(html).toContain(metadata.downloads.installer);
    expect(html).toContain('abc123');
    expect(html).toContain('Windows 10 / Windows 11');
  });
});
