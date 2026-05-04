const LOCAL_BACKEND_ORIGIN = 'http://127.0.0.1:3000';

declare global {
  interface Window {
    __LUMI_API_BRIDGE_INSTALLED__?: boolean;
  }
}

export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  return !!(win.__TAURI_INTERNALS__ || win.__TAURI_IPC__ || win.__TAURI__);
}

export function getBackendOrigin(): string {
  if (typeof window === 'undefined') return LOCAL_BACKEND_ORIGIN;
  return isTauriRuntime() ? LOCAL_BACKEND_ORIGIN : window.location.origin;
}

export function getSocketOrigin(): string {
  return getBackendOrigin();
}

function shouldProxy(pathname: string): boolean {
  return pathname.startsWith('/api/') || pathname === '/api' || pathname.startsWith('/mcp/');
}

export function resolveBackendUrl(input: string | URL): string {
  const raw = String(input);
  if (!isTauriRuntime()) return raw;

  if (raw.startsWith('/')) {
    return shouldProxy(raw) ? `${LOCAL_BACKEND_ORIGIN}${raw}` : raw;
  }

  try {
    const url = new URL(raw);
    if (typeof window !== 'undefined' && url.origin === window.location.origin && shouldProxy(url.pathname)) {
      url.protocol = 'http:';
      url.host = '127.0.0.1:3000';
      return url.toString();
    }
  } catch {
    return raw;
  }

  return raw;
}

function resolveFetchInput(input: RequestInfo | URL): RequestInfo | URL {
  if (!isTauriRuntime()) return input;

  if (typeof input === 'string' || input instanceof URL) {
    return resolveBackendUrl(input);
  }

  const proxiedUrl = resolveBackendUrl(input.url);
  if (proxiedUrl !== input.url) {
    return new Request(proxiedUrl, input);
  }

  return input;
}

export function installApiBridge(): void {
  if (typeof window === 'undefined' || window.__LUMI_API_BRIDGE_INSTALLED__) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const resolved = resolveFetchInput(input);
    // When proxying to backend cross-origin, include credentials so
    // cookies (JWT token) are sent. In web mode this is same-origin
    // and credentials are included by default.
    const patched: RequestInit = { ...init, credentials: 'include' };
    return nativeFetch(resolved, patched);
  };

  window.__LUMI_API_BRIDGE_INSTALLED__ = true;
}
