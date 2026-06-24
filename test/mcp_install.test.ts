import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('MCP skill installation', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lumi-mcp-install-'));
    process.env.LUMI_SKILLS_DIR = path.join(tempRoot, 'skills');
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    delete process.env.LUMI_SKILLS_DIR;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('waits for skill dependencies before reporting install completion', async () => {
    vi.doMock('child_process', async () => {
      const actual = await vi.importActual<typeof import('child_process')>('child_process');
      return {
        ...actual,
        exec: vi.fn((_command: string, options: any, callback: any) => {
          setTimeout(() => {
            fs.mkdirSync(path.join(options.cwd, 'node_modules'), { recursive: true });
            fs.writeFileSync(path.join(options.cwd, 'node_modules', '.installed'), 'ok');
            callback(null, '', '');
          }, 10);
          return { pid: 123, on: vi.fn(), kill: vi.fn() };
        }),
      };
    });

    const sourceDir = path.join(tempRoot, 'source-skill');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'index.ts'), 'export {};');
    fs.writeFileSync(path.join(sourceDir, 'package.json'), JSON.stringify({
      name: 'source-skill',
      version: '1.0.0',
      type: 'module',
      dependencies: { zod: '^3.22.0' },
      lumi: { toolCount: 1 },
    }));

    const { mcpManager } = await import('../server/mcp/client');
    const destDir = await mcpManager.installSkill('source-skill', sourceDir);

    expect(fs.existsSync(path.join(destDir, 'node_modules', '.installed'))).toBe(true);
  });

  it('does not pass relative hide-console NODE_OPTIONS to npm install', async () => {
    const originalNodeOptions = process.env.NODE_OPTIONS;
    process.env.NODE_OPTIONS = '--require ./hide-console.cjs --max-old-space-size=4096';
    const execMock = vi.fn((_command: string, options: any, callback: any) => {
      expect(options.env.NODE_OPTIONS).toBe('--max-old-space-size=4096');
      callback(null, '', '');
      return { pid: 123, on: vi.fn(), kill: vi.fn() };
    });

    vi.doMock('child_process', async () => {
      const actual = await vi.importActual<typeof import('child_process')>('child_process');
      return {
        ...actual,
        exec: execMock,
      };
    });

    const sourceDir = path.join(tempRoot, 'source-skill');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'index.ts'), 'export {};');
    fs.writeFileSync(path.join(sourceDir, 'package.json'), JSON.stringify({
      name: 'source-skill',
      version: '1.0.0',
      type: 'module',
      dependencies: { zod: '^3.22.0' },
      lumi: { toolCount: 1 },
    }));

    try {
      const { mcpManager } = await import('../server/mcp/client');
      await mcpManager.installSkill('source-skill', sourceDir);
      expect(execMock).toHaveBeenCalled();
    } finally {
      if (originalNodeOptions === undefined) {
        delete process.env.NODE_OPTIONS;
      } else {
        process.env.NODE_OPTIONS = originalNodeOptions;
      }
    }
  });

  it('registers run-command-only skills disabled without installing placeholder dependencies', async () => {
    const execMock = vi.fn((_command: string, _options: any, callback: any) => {
      callback(new Error('npm should not run for external run-command-only skills'), '', 'missing package');
      return { pid: 123, on: vi.fn(), kill: vi.fn() };
    });

    vi.doMock('child_process', async () => {
      const actual = await vi.importActual<typeof import('child_process')>('child_process');
      return {
        ...actual,
        exec: execMock,
      };
    });

    const sourceDir = path.join(tempRoot, 'external-skill');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'package.json'), JSON.stringify({
      name: 'external-skill',
      version: '1.0.0',
      type: 'module',
      dependencies: { 'missing-mcp-package': '^999.0.0' },
      lumi: {
        toolCount: 4,
        runCommand: 'python',
        runArgs: ['-m', 'missing_mcp'],
        requiresSetup: true,
        setupNote: 'Install missing_mcp before enabling.',
      },
    }));

    const { mcpManager } = await import('../server/mcp/client');
    await mcpManager.installSkill('external-skill', sourceDir);
    const config = mcpManager.getConfig()['external-skill'];

    expect(execMock).not.toHaveBeenCalled();
    expect(config.enabled).toBe(false);
    expect(config.command).toBe('python');
    expect(config.args).toEqual(['-m', 'missing_mcp']);
    expect(config.requiresSetup).toBe(true);
  });

  it('registers API-key skills disabled until configured', async () => {
    vi.doMock('child_process', async () => {
      const actual = await vi.importActual<typeof import('child_process')>('child_process');
      return {
        ...actual,
        exec: vi.fn((_command: string, _options: any, callback: any) => {
          callback(null, '', '');
          return { pid: 123, on: vi.fn(), kill: vi.fn() };
        }),
      };
    });

    const sourceDir = path.join(tempRoot, 'api-key-skill');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'index.ts'), 'export {};');
    fs.writeFileSync(path.join(sourceDir, 'package.json'), JSON.stringify({
      name: 'api-key-skill',
      version: '1.0.0',
      type: 'module',
      dependencies: { zod: '^3.22.0' },
      lumi: {
        toolCount: 1,
        requiresApiKey: true,
        apiKeyEnv: 'EXAMPLE_API_KEY',
        envKeys: ['EXAMPLE_API_KEY'],
      },
    }));

    const { mcpManager } = await import('../server/mcp/client');
    await mcpManager.installSkill('api-key-skill', sourceDir);
    const config = mcpManager.getConfig()['api-key-skill'];

    expect(config.enabled).toBe(false);
    expect(config.env).toEqual({ EXAMPLE_API_KEY: '${EXAMPLE_API_KEY}' });
    expect(config.requiresApiKey).toBe(true);
    expect(config.apiKeyEnv).toBe('EXAMPLE_API_KEY');
  });

  it('includes stdio stderr when an MCP server exits during startup', async () => {
    const { mcpManager } = await import('../server/mcp/client');
    mcpManager.saveConfig({
      broken: {
        command: process.execPath,
        args: ['-e', 'console.error("startup boom"); process.exit(1);'],
        enabled: true,
        source: 'external',
        transport: 'stdio',
      },
    });

    await expect(mcpManager.restartServer('broken')).rejects.toThrow(/startup boom/);
  });
});
