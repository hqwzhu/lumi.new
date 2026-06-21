import { afterEach, describe, expect, it, vi } from 'vitest';
import { installClientDiagnostics, reportClientDiagnostic } from './diagnostics';

describe('client diagnostics', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts renderer diagnostic events to the setup diagnostics endpoint', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    reportClientDiagnostic({ level: 'error', message: 'render failed' });

    expect(fetchMock).toHaveBeenCalledWith('/api/setup/client-error', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ level: 'error', message: 'render failed' }),
    }));
  });

  it('installs global browser error listeners', () => {
    const listeners = new Map<string, EventListener>();
    const target = {
      location: { href: 'http://localhost/settings' },
      addEventListener: vi.fn((name: string, listener: EventListener) => {
        listeners.set(name, listener);
      }),
    } as unknown as Window;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    installClientDiagnostics('desktop', target);
    const error = new Error('global crash');
    listeners.get('error')?.({
      error,
      message: error.message,
      filename: 'app.js',
      lineno: 10,
      colno: 2,
    } as ErrorEvent);

    expect(target.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(target.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    expect(fetchMock).toHaveBeenCalledWith('/api/setup/client-error', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('global crash'),
    }));
  });
});
