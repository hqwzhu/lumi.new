import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Tauri macOS release config', () => {
  it('keeps DMG enabled as a desktop bundle target', () => {
    const configPath = path.resolve(process.cwd(), 'src-tauri', 'tauri.conf.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    expect(config.bundle.targets).toContain('dmg');
  });

  it('exposes macOS release scripts for CI packaging', () => {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    expect(pkg.scripts).toMatchObject({
      'export:macos-release': 'node scripts/export-macos-release.mjs',
      'package:macos-release': 'node scripts/package-macos-release.mjs',
      'release:macos:check': 'node scripts/check-macos-release.mjs',
    });
    expect(pkg.scripts['release:macos']).toContain('--bundles dmg,app');
  });
});
