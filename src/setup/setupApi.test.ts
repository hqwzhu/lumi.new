import { afterEach, describe, expect, it, vi } from 'vitest';
import { completeSetup, getSetupStatus, saveSetupKey, testSetupProvider } from './setupApi';
import { SETUP_PROVIDER_CARDS, providersFor } from './providerCatalog';

describe('setup API client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads setup status from the backend', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ state: { version: 1, completed: false }, providers: {}, requiresSetup: true }),
    } as Response);

    const status = await getSetupStatus();

    expect(fetchMock).toHaveBeenCalledWith('/api/setup/status', expect.objectContaining({ credentials: 'include' }));
    expect(status.requiresSetup).toBe(true);
  });

  it('saves provider keys through the setup backend without using localStorage', async () => {
    const localStorageSet = vi.fn();
    vi.stubGlobal('localStorage', { setItem: localStorageSet });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, providers: { DEEPSEEK_API_KEY: true } }),
    } as Response);

    const result = await saveSetupKey({ providerId: 'deepseek', apiKey: 'sk-test-secret' });

    expect(fetchMock).toHaveBeenCalledWith('/api/setup/keys', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ providerId: 'deepseek', apiKey: 'sk-test-secret', baseUrl: undefined }),
    }));
    expect(result.providers.DEEPSEEK_API_KEY).toBe(true);
    expect(localStorageSet).not.toHaveBeenCalled();
  });

  it('posts provider tests and setup completion to setup routes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, providerId: 'qwen', message: 'ok' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, state: { version: 1, completed: true } }),
      } as Response);

    await expect(testSetupProvider('qwen', 'sk-qwen')).resolves.toMatchObject({ ok: true });
    await expect(completeSetup({
      mode: 'practical',
      modelPreference: 'china',
      configuredProviders: ['qwen'],
      skippedOptionalProviders: [],
    })).resolves.toMatchObject({ state: { completed: true } });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/setup/test-provider', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/setup/complete', expect.objectContaining({ method: 'POST' }));
  });
});

describe('setup provider catalog', () => {
  it('explains the three setup modes in plain user-facing language', () => {
    const modes = ['essential', 'practical', 'full'];

    for (const mode of modes) {
      const providers = providersFor(mode as any, 'china');
      expect(providers.length).toBeGreaterThan(0);
    }

    expect(providersFor('essential', 'china').map(provider => provider.id)).toEqual(['deepseek', 'qwen', 'ollama']);
    expect(providersFor('practical', 'china').some(provider => provider.id === 'ark')).toBe(true);
    expect(providersFor('full', 'international').some(provider => provider.id === 'anthropic')).toBe(true);
  });

  it('includes bilingual API-key tutorials for every cloud provider', () => {
    for (const provider of SETUP_PROVIDER_CARDS.filter(item => !item.local)) {
      expect(provider.tutorials.zh.steps.length).toBeGreaterThan(1);
      expect(provider.tutorials.en.steps.length).toBeGreaterThan(1);
      expect(provider.tutorials.zh.officialUrl).toMatch(/^https:\/\//);
      expect(provider.tutorials.en.officialUrl).toMatch(/^https:\/\//);
    }
  });
});
