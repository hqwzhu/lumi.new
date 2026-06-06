import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeApp } from './helpers';
import voiceRoutes from '../routes/voice';

let url: string;
let cleanup: () => void;

describe('Voice API', () => {
  beforeAll(async () => {
    const app = await makeApp();
    url = app.url;
    cleanup = app.cleanup;
    app.apiRouter.use('/', voiceRoutes);
  });

  afterAll(() => cleanup?.());

  it('returns voice list (no auth required)', async () => {
    const res = await fetch(`${url}/api/voice/voices`, {
      signal: AbortSignal.timeout(5000),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // Response is { cloned: VoiceItem[], premade: VoiceItem[] }
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
