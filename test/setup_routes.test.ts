import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { makeApp, JWT_SECRET, COOKIE_OPTS, LLM_GETTERS } from './helpers';
import { mountSetupRoutes } from '../server/routes/setup_routes';
import { mountAllRoutes } from '../server/runtime/routes';

describe('setup routes', () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;

  beforeEach(async () => {
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
