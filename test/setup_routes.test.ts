import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeApp, JWT_SECRET, COOKIE_OPTS, LLM_GETTERS } from './helpers';
import { mountSetupRoutes } from '../server/routes/setup_routes';
import { mountAllRoutes } from '../server/runtime/routes';

vi.mock('../server/setup/local_models', () => ({
  detectLocalModelSources: vi.fn(async () => ({
    hasLocalModel: false,
    providers: {
      ollama: { id: 'ollama', label: 'Ollama', baseUrl: 'http://localhost:11434', detected: false, models: [], message: 'offline' },
      lmstudio: { id: 'lmstudio', label: 'LM Studio', baseUrl: 'http://localhost:1234', detected: false, models: [], message: 'offline' },
    },
  })),
}));

describe('setup routes', () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let detectLocalModelSources: any;

  beforeEach(async () => {
    detectLocalModelSources = (await import('../server/setup/local_models')).detectLocalModelSources as any;
    detectLocalModelSources.mockResolvedValue({
      hasLocalModel: false,
      providers: {
        ollama: { id: 'ollama', label: 'Ollama', baseUrl: 'http://localhost:11434', detected: false, models: [], message: 'offline' },
        lmstudio: { id: 'lmstudio', label: 'LM Studio', baseUrl: 'http://localhost:1234', detected: false, models: [], message: 'offline' },
      },
    });
    ctx = await makeApp();
    mountSetupRoutes(ctx.apiRouter);
  });

  afterEach(() => ctx.cleanup());

  it('returns incomplete setup status by default', async () => {
    const res = await fetch(`${ctx.url}/api/setup/status`);
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.state.completed).toBe(false);
    expect(body.requiresSetup).toBe(true);
  });

  it('rejects unknown provider keys', async () => {
    const res = await fetch(`${ctx.url}/api/setup/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'unknown', apiKey: 'sk-test' }),
    });
    expect(res.status).toBe(400);
  });

  it('saves a known provider key without returning the raw key', async () => {
    const res = await fetch(`${ctx.url}/api/setup/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'deepseek', apiKey: 'sk-deepseek-test' }),
    });
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain('sk-deepseek-test');
    expect(body.providers.DEEPSEEK_API_KEY).toBe(true);
  });

  it('tests a provider using a one-time API key before saving', async () => {
    const res = await fetch(`${ctx.url}/api/setup/test-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'deepseek', apiKey: 'sk-one-time' }),
    });
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.source).toBe('input');
    expect(body.message).toContain('not saved yet');
  });

  it('tests a provider using a saved API key without echoing secrets', async () => {
    await fetch(`${ctx.url}/api/setup/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'openai', apiKey: 'sk-openai-saved' }),
    });
    const res = await fetch(`${ctx.url}/api/setup/test-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'openai' }),
    });
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain('sk-openai-saved');
    expect(body.ok).toBe(true);
    expect(body.source).toBe('saved');
  });

  it('requires relay base URL when testing relay provider', async () => {
    const res = await fetch(`${ctx.url}/api/setup/test-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'relay', apiKey: 'relay-key' }),
    });
    const body = await res.json() as any;

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.message).toContain('Base URL');
  });

  it('refuses completion without a model source', async () => {
    const res = await fetch(`${ctx.url}/api/setup/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'practical', modelPreference: 'china', configuredProviders: [], skippedOptionalProviders: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('completes setup after a model provider key is saved', async () => {
    await fetch(`${ctx.url}/api/setup/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'deepseek', apiKey: 'sk-deepseek-test' }),
    });
    const res = await fetch(`${ctx.url}/api/setup/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'practical', modelPreference: 'china', configuredProviders: ['deepseek'], skippedOptionalProviders: [] }),
    });
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.state.completed).toBe(true);
  });

  it('completes setup when a local model source is detected', async () => {
    detectLocalModelSources.mockResolvedValue({
      hasLocalModel: true,
      providers: {
        ollama: { id: 'ollama', label: 'Ollama', baseUrl: 'http://localhost:11434', detected: true, models: ['qwen2.5:7b'], message: '1 model found' },
        lmstudio: { id: 'lmstudio', label: 'LM Studio', baseUrl: 'http://localhost:1234', detected: false, models: [], message: 'offline' },
      },
    });

    const diagnosticRes = await fetch(`${ctx.url}/api/setup/diagnostics`);
    const diagnostics = await diagnosticRes.json() as any;
    expect(diagnostics.hasModelSource).toBe(true);
    expect(diagnostics.items.some((item: any) => item.id === 'local-models' && item.status === 'ok')).toBe(true);

    const res = await fetch(`${ctx.url}/api/setup/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'essential', modelPreference: 'local', configuredProviders: ['ollama'], skippedOptionalProviders: [] }),
    });
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.state.completed).toBe(true);
  });

  it('reset marks setup incomplete', async () => {
    await fetch(`${ctx.url}/api/setup/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'deepseek', apiKey: 'sk-deepseek-test' }),
    });
    await fetch(`${ctx.url}/api/setup/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'essential', modelPreference: 'china', configuredProviders: ['deepseek'], skippedOptionalProviders: [] }),
    });
    const res = await fetch(`${ctx.url}/api/setup/reset`, { method: 'POST' });
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.state.completed).toBe(false);
  });

  it('exports a support bundle without leaking secrets', async () => {
    await fetch(`${ctx.url}/api/setup/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'deepseek', apiKey: 'sk-super-secret' }),
    });

    const res = await fetch(`${ctx.url}/api/setup/support-bundle`);
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.platform).toBe(process.platform);
    expect(typeof body.dataRoot).toBe('string');
    expect(body.dataRoot.length).toBeGreaterThan(0);
    expect(body.setupState.completed).toBe(false);
    expect(body.configuredKeys.DEEPSEEK_API_KEY).toBe(true);
    expect(body.diagnostics.items.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain('sk-super-secret');
  });

  it('is mounted by the shared route aggregator', async () => {
    const mounted = await makeApp();
    try {
      mountAllRoutes({
        apiRouter: mounted.apiRouter,
        jwtSecret: JWT_SECRET,
        llm: LLM_GETTERS as any,
        getCookieOptions: () => ({ ...COOKIE_OPTS(), httpOnly: true as const }),
        io: {} as any,
      });

      const res = await fetch(`${mounted.url}/api/setup/status`);
      const body = await res.json() as any;

      expect(res.status).toBe(200);
      expect(body.requiresSetup).toBe(true);
    } finally {
      mounted.cleanup();
    }
  });
});
