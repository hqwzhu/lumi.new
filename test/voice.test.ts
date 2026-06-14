import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeApp, JWT_SECRET, COOKIE_OPTS } from './helpers';
import voiceRoutes from '../routes/voice';
import { mountAuthRoutes } from '../server/routes/auth';

let url: string;
let cleanup: () => void;
let token: string;

describe('Voice API', () => {
  beforeAll(async () => {
    const app = await makeApp();
    url = app.url;
    cleanup = app.cleanup;
    mountAuthRoutes(app.apiRouter, JWT_SECRET, COOKIE_OPTS);
    app.apiRouter.use('/', voiceRoutes);

    await fetch(`${url}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'voice_tester', password: 'pass123', phone: '13800004444' }),
    });
    const login = await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'voice_tester', password: 'pass123' }),
    });
    token = (await login.json()).token;
  });

  afterAll(() => cleanup?.());

  function headers() {
    return {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`,
    };
  }

  it('requires auth for voice list', async () => {
    const res = await fetch(`${url}/api/voice/voices`, {
      signal: AbortSignal.timeout(5000),
    });
    expect(res.status).toBe(401);
  });

  it('returns voice list for authenticated users', async () => {
    const res = await fetch(`${url}/api/voice/voices`, {
      headers: headers(),
      signal: AbortSignal.timeout(5000),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('cloned');
    expect(body).toHaveProperty('premade');
    expect(Array.isArray(body.cloned)).toBe(true);
    expect(Array.isArray(body.premade)).toBe(true);
  });

  it('returns active provider info', async () => {
    const res = await fetch(`${url}/api/voice/active-provider`, {
      signal: AbortSignal.timeout(5000),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // Response is { pref: {...}, active: { stt: string, tts: string } }
    expect(body).toHaveProperty('pref');
    expect(body).toHaveProperty('active');
    expect(body.active).toHaveProperty('stt');
    expect(body.active).toHaveProperty('tts');
  });

  it('rejects synthesize without body', async () => {
    const res = await fetch(`${url}/api/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(5000),
    });
    expect(res.status).toBe(400);
  });
});
