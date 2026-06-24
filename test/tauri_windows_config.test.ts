import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Tauri Windows installer config', () => {
  it('embeds the WebView2 bootstrapper for clean Windows installs', () => {
    const configPath = path.resolve(process.cwd(), 'src-tauri', 'tauri.conf.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    expect(config.bundle.windows.webviewInstallMode).toEqual({
      type: 'embedBootstrapper',
    });
  });

  it('preloads hide-console without NODE_OPTIONS so child npm installs do not inherit it', () => {
    const libPath = path.resolve(process.cwd(), 'src-tauri', 'src', 'lib.rs');
    const libSource = fs.readFileSync(libPath, 'utf-8');

    expect(libSource).not.toContain('.env("NODE_OPTIONS"');
    expect(libSource).toContain('node_cmd.arg("--require")');
    expect(libSource).toContain('restart_cmd.arg("--require")');
    expect(libSource).toContain('.env_remove("NODE_OPTIONS")');
  });
});
