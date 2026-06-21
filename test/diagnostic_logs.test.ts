import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeApp } from './helpers';
import { appendDiagnosticEvent, getRecentDiagnosticEvents } from '../server/setup/diagnostic_logs';
import { getDataPath } from '../server/config/data_path';
import { mountSetupRoutes } from '../server/routes/setup_routes';

describe('diagnostic logs', () => {
  it('redacts secrets before writing local diagnostic events', () => {
    appendDiagnosticEvent({
      source: 'renderer',
      level: 'error',
      message: 'OpenAI key sk-super-secret failed with api_key=abc123',
      stack: 'Authorization: Bearer xyz',
      context: {
        OPENAI_API_KEY: 'sk-raw-secret',
        normal: 'kept',
      },
    });

    const logPath = getDataPath('diagnostics/lumi-diagnostics.jsonl');
    const body = fs.readFileSync(logPath, 'utf8');

    expect(body).not.toContain('sk-super-secret');
    expect(body).not.toContain('abc123');
    expect(body).not.toContain('Bearer xyz');
    expect(body).not.toContain('sk-raw-secret');
    expect(body).toContain('[REDACTED]');
    expect(body).toContain('"normal":"kept"');
  });

  it('keeps the newest diagnostic events first for support bundles', () => {
    appendDiagnosticEvent({ source: 'server', level: 'info', message: 'first' });
    appendDiagnosticEvent({ source: 'server', level: 'error', message: 'second' });

    const events = getRecentDiagnosticEvents(1);

    expect(events).toHaveLength(1);
    expect(events[0].message).toBe('second');
  });

  it('accepts renderer error reports without echoing secrets', async () => {
    const ctx = await makeApp();
    try {
      mountSetupRoutes(ctx.apiRouter);

      const res = await fetch(`${ctx.url}/api/setup/client-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          message: 'UI failed with sk-client-secret',
          stack: 'api_key=secret-from-stack',
          context: { route: '/settings' },
        }),
      });

      const body = await res.json() as any;

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      const events = getRecentDiagnosticEvents(5);
      expect(JSON.stringify(events)).not.toContain('sk-client-secret');
      expect(JSON.stringify(events)).not.toContain('secret-from-stack');
      expect(events.some(event => event.source === 'renderer' && event.message.includes('[REDACTED]'))).toBe(true);
    } finally {
      ctx.cleanup();
    }
  });
});
