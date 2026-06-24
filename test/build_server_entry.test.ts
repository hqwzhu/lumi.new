import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('desktop server entry generation', () => {
  it('clears relative hide-console NODE_OPTIONS before backend code runs', () => {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'build-server.mjs');
    const source = fs.readFileSync(scriptPath, 'utf-8');

    expect(source).toContain('function __lumiStripRelativeHideConsolePreload');
    expect(source).not.toContain('function stripRelativeHideConsolePreload(nodeOptions)');
    expect(source).toContain('delete process.env.NODE_OPTIONS');
    expect(source).toContain('__lumiSanitizeNodeOptionsForDesktopChildren();');
  });
});
