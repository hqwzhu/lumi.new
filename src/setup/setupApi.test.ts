import { afterEach, describe, expect, it, vi } from 'vitest';
import { completeSetup, getSetupStatus, saveSetupKey, testSetupProvider, updateSetupPreferences } from './setupApi';
import { SETUP_PROVIDER_CARDS, providersFor } from './providerCatalog';
import { getBackendOrigin, installApiBridge, isLocalBackendPreviewRuntime, isTauriRuntime } from '../services/apiBridge';

describe('setup API client', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads setup status from the backend', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:3000', protocol: 'http:', hostname: 'localhost' },
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ state: { version: 1, completed: false }, providers: {}, requiresSetup: true }),
    } as Response);

    const status = await getSetupStatus();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/setup/status', expect.objectContaining({ credentials: 'include' }));
    expect(status.requiresSetup).toBe(true);
  });

  it('saves provider keys through the setup backend without using localStorage', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:3000', protocol: 'http:', hostname: 'localhost' },
    });
    const localStorageSet = vi.fn();
    vi.stubGlobal('localStorage', { setItem: localStorageSet });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, providers: { DEEPSEEK_API_KEY: true } }),
    } as Response);

    const result = await saveSetupKey({ providerId: 'deepseek', apiKey: 'sk-test-secret' });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/setup/keys', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ providerId: 'deepseek', apiKey: 'sk-test-secret', baseUrl: undefined }),
    }));
    expect(result.providers.DEEPSEEK_API_KEY).toBe(true);
    expect(localStorageSet).not.toHaveBeenCalled();
  });

  it('routes setup key saves to the bundled backend in Tauri custom-protocol pages', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'tauri://localhost', protocol: 'tauri:', hostname: 'localhost' },
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, providers: { DEEPSEEK_API_KEY: true } }),
    } as Response);

    await saveSetupKey({ providerId: 'deepseek', apiKey: 'sk-test-secret' });

    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:3000/api/setup/keys', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));
  });

  it('throws a user-readable message when the local setup service is unreachable', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'tauri://localhost', protocol: 'tauri:', hostname: 'localhost' },
    });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(saveSetupKey({ providerId: 'deepseek', apiKey: 'sk-test-secret' }))
      .rejects.toThrow('无法连接 Lumi OS 本地服务');
  });

  it('retries setup requests while the bundled backend is still starting', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      location: { origin: 'tauri://localhost', protocol: 'tauri:', hostname: 'localhost' },
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, providers: { DEEPSEEK_API_KEY: true } }),
      } as Response);

    const request = saveSetupKey({ providerId: 'deepseek', apiKey: 'sk-test-secret' });
    await vi.advanceTimersByTimeAsync(300);

    await expect(request).resolves.toMatchObject({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('posts provider tests and setup completion to setup routes', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:3000', protocol: 'http:', hostname: 'localhost' },
    });
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

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:3000/api/setup/test-provider', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost:3000/api/setup/complete', expect.objectContaining({ method: 'POST' }));
  });

  it('updates setup preferences without reopening first-run onboarding', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:3000', protocol: 'http:', hostname: 'localhost' },
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, state: { version: 1, completed: true, mode: 'full' }, requiresSetup: false }),
    } as Response);

    await expect(updateSetupPreferences({
      mode: 'full',
      modelPreference: 'international',
      configuredProviders: ['openai'],
      skippedOptionalProviders: [],
    })).resolves.toMatchObject({ state: { mode: 'full' }, requiresSetup: false });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/setup/preferences', expect.objectContaining({
      method: 'PATCH',
      credentials: 'include',
    }));
  });
});

describe('desktop API bridge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('detects Tauri custom protocol pages without relying only on Tauri globals', () => {
    vi.stubGlobal('window', {
      location: { origin: 'tauri://localhost', protocol: 'tauri:', hostname: 'localhost' },
    });

    expect(isTauriRuntime()).toBe(true);
    expect(getBackendOrigin()).toBe('http://127.0.0.1:3000');
  });

  it('keeps browser development requests on the current origin', () => {
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:3000', protocol: 'http:', hostname: 'localhost' },
    });

    expect(isTauriRuntime()).toBe(false);
    expect(isLocalBackendPreviewRuntime()).toBe(false);
    expect(getBackendOrigin()).toBe('http://localhost:3000');
  });

  it('routes localhost preview ports to the fixed bundled backend', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:53995', protocol: 'http:', hostname: 'localhost', port: '53995' },
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, providers: { DEEPSEEK_API_KEY: true } }),
    } as Response);

    expect(isTauriRuntime()).toBe(false);
    expect(isLocalBackendPreviewRuntime()).toBe(true);
    expect(getBackendOrigin()).toBe('http://127.0.0.1:3000');

    await saveSetupKey({ providerId: 'deepseek', apiKey: 'sk-test-secret' });
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:3000/api/setup/keys', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));
  });

  it('rewrites relative API requests to the bundled backend in Tauri', async () => {
    const nativeFetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('window', {
      location: { origin: 'http://tauri.localhost', protocol: 'http:', hostname: 'tauri.localhost' },
      fetch: nativeFetch,
      localStorage: { getItem: vi.fn(() => null) },
    });

    installApiBridge();
    await (window.fetch as typeof fetch)('/api/setup/status');

    expect(nativeFetch).toHaveBeenCalledWith('http://127.0.0.1:3000/api/setup/status', expect.objectContaining({
      credentials: 'include',
    }));
  });

  it('rewrites relative API requests from localhost preview ports', async () => {
    const nativeFetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:64164', protocol: 'http:', hostname: 'localhost', port: '64164' },
      fetch: nativeFetch,
      localStorage: { getItem: vi.fn(() => null) },
    });

    installApiBridge();
    await (window.fetch as typeof fetch)('/api/setup/status');

    expect(nativeFetch).toHaveBeenCalledWith('http://127.0.0.1:3000/api/setup/status', expect.objectContaining({
      credentials: 'include',
    }));
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
