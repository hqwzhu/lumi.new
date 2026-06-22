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
});
