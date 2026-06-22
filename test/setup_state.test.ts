import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

describe('setup_state', () => {
  let root: string;

  beforeEach(() => {
    root = path.join(os.tmpdir(), `lumi_setup_state_${crypto.randomUUID().slice(0, 8)}`);
    fs.mkdirSync(root, { recursive: true });
    process.env.LUMI_DATA_DIR = root;
  });

  it('returns incomplete state when setup.json is missing', async () => {
    const { loadSetupState } = await import('../server/setup/setup_state');
    expect(loadSetupState()).toEqual({ version: 1, completed: false });
  });

  it('saves and reloads completed setup state', async () => {
    const { saveSetupState, loadSetupState } = await import('../server/setup/setup_state');
    saveSetupState({
      version: 1,
      completed: true,
      completedAt: '2026-06-20T00:00:00.000Z',
      mode: 'practical',
      modelPreference: 'china',
      configuredProviders: ['deepseek'],
      skippedOptionalProviders: ['deepgram'],
    });
    expect(loadSetupState()).toMatchObject({
      version: 1,
      completed: true,
      mode: 'practical',
      modelPreference: 'china',
      configuredProviders: ['deepseek'],
    });
  });

  it('resets setup to incomplete without deleting data directory', async () => {
    const { saveSetupState, resetSetupState, loadSetupState } = await import('../server/setup/setup_state');
    saveSetupState({
      version: 1,
      completed: true,
      completedAt: '2026-06-20T00:00:00.000Z',
      mode: 'essential',
      modelPreference: 'international',
      configuredProviders: ['openai'],
      skippedOptionalProviders: [],
    });
    resetSetupState();
    expect(loadSetupState()).toEqual({ version: 1, completed: false });
    expect(fs.existsSync(path.join(root, 'data'))).toBe(true);
  });

  it('updates setup preferences without forcing users through first-run setup again', async () => {
    const { saveSetupState, updateSetupPreferences, loadSetupState } = await import('../server/setup/setup_state');
    saveSetupState({
      version: 1,
      completed: true,
      completedAt: '2026-06-20T00:00:00.000Z',
      mode: 'essential',
      modelPreference: 'china',
      configuredProviders: ['deepseek'],
      skippedOptionalProviders: [],
    });

    const updated = updateSetupPreferences({
      mode: 'full',
      modelPreference: 'international',
      configuredProviders: ['deepseek', 'openai'],
      skippedOptionalProviders: ['ollama'],
    });

    expect(updated).toMatchObject({
      completed: true,
      completedAt: '2026-06-20T00:00:00.000Z',
      mode: 'full',
      modelPreference: 'international',
      configuredProviders: ['deepseek', 'openai'],
      skippedOptionalProviders: ['ollama'],
    });
    expect(loadSetupState().completed).toBe(true);
  });
});
