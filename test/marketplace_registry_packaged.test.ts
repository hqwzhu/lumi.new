import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('marketplace registry packaged resource discovery', () => {
  let tempRoot: string;
  let oldCwd: string;
  let previousDataDir: string | undefined;
  let previousHome: string | undefined;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lumi-packaged-registry-'));
    oldCwd = process.cwd();
    previousDataDir = process.env.LUMI_DATA_DIR;
    previousHome = process.env.HOME;
    process.env.LUMI_DATA_DIR = path.join(tempRoot, 'data-root');
    process.env.HOME = path.join(tempRoot, 'home');
    fs.mkdirSync(process.env.HOME, { recursive: true });
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(oldCwd);
    if (previousDataDir === undefined) delete process.env.LUMI_DATA_DIR;
    else process.env.LUMI_DATA_DIR = previousDataDir;
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
    fs.rmSync(tempRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('discovers bundled skills when the packaged cwd is dist-server', async () => {
    const cwd = path.join(tempRoot, 'dist-server');
    const bundled = path.join(cwd, 'server', 'skills', 'bundled', 'packaged-skill');
    fs.mkdirSync(bundled, { recursive: true });
    fs.writeFileSync(path.join(bundled, 'package.json'), JSON.stringify({
      name: 'packaged-skill',
      version: '1.2.3',
      description: 'Packaged resource skill',
      lumi: {
        displayName: 'Packaged Skill',
        category: 'Utility',
        icon: 'Zap',
        toolCount: 2,
      },
    }));
    process.chdir(cwd);

    vi.doMock('../db_layer', () => ({
      readDB: () => ({}),
      writeDB: vi.fn(),
    }));
    const registry = await import('../server/marketplace/registry');
    const skills = registry.getMarketplaceSkills();

    expect(skills.map(skill => skill.id)).toContain('skill-packaged-skill');
    expect(skills.find(skill => skill.id === 'skill-packaged-skill')?.installPath)
      .toBe(path.join(bundled));
  });
});
