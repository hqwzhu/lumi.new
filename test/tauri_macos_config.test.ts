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
    expect(pkg.scripts['release:macos:unsigned']).toContain('--no-sign');
  });

  it('keeps unsigned macOS CI builds away from empty Apple signing secrets', () => {
    const workflowPath = path.resolve(process.cwd(), '.github', 'workflows', 'ci.yml');
    const workflow = fs.readFileSync(workflowPath, 'utf-8');

    expect(workflow).toContain('Build unsigned macOS release kit');
    expect(workflow).toContain('npm run release:macos:unsigned');
    expect(workflow).toContain('Build signed macOS release kit');
    expect(workflow).not.toContain('APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}\n      APPLE_CERTIFICATE_PASSWORD');
  });
});
