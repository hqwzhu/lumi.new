declare global {
  interface Window {
    __LUMI_API_BRIDGE_INSTALLED__?: boolean;
  }
}

const DESKTOP_BACKEND_ORIGIN = 'http://127.0.0.1:3000';

function isBackendPath(url: string): boolean {
  return url.startsWith('/api/') || url === '/api' || url.startsWith('/mcp/');
}

export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  if (win.__TAURI_INTERNALS__ || win.__TAURI_IPC__ || win.__TAURI__) return true;

  const location = win.location;
  const protocol = String(location?.protocol || '').toLowerCase();
  const hostname = String(location?.hostname || '').toLowerCase();
  return protocol === 'tauri:' || protocol === 'asset:' || protocol === 'file:' || hostname === 'tauri.localhost';
}

export function getBackendOrigin(): string {
  if (typeof window === 'undefined') return DESKTOP_BACKEND_ORIGIN;
  // In Tauri production, WebView2 custom protocol can't reach the backend;
  // always route through the bundled Node.js server.
  if (isTauriRuntime()) return DESKTOP_BACKEND_ORIGIN;
  return window.location.origin;
}

export function getSocketOrigin(): string {
  return getBackendOrigin();
}

export function resolveBackendUrl(path: string): string {
  if (!path.startsWith('/')) return path;
  if (!isBackendPath(path)) return path;
  return `${getBackendOrigin()}${path}`;
}

export function installApiBridge(): void {
  if (typeof window === 'undefined' || window.__LUMI_API_BRIDGE_INSTALLED__) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Never intercept Tauri IPC calls
    if (url.includes('ipc.localhost') || url.includes('tauri://')) {
      return nativeFetch(input, init);
    }

    // In Tauri, API paths need credentials for cross-origin (localhost vs 127.0.0.1)
    // But if same-origin, pass through untouched
    if (url.startsWith('/')) {
      const needsCredentials = isTauriRuntime() && isBackendPath(url);
      if (!needsCredentials) return nativeFetch(input, init);
      const patched: RequestInit = { ...init, credentials: 'include' };

      // WebView2 may not send httpOnly cookies — inject stored auth token as fallback
      try {
        const storedToken = localStorage.getItem('lumi_auth_token');
        if (storedToken) {
          patched.headers = {
            ...(patched.headers as Record<string, string> || {}),
            'Authorization': `Bearer ${storedToken}`,
          };
        }
      } catch {}

      // In Tauri production, rewrite /api/* requests to the bundled Node.js backend
      return nativeFetch(resolveBackendUrl(url), patched);
    }

    return nativeFetch(input, init);
  };

  window.__LUMI_API_BRIDGE_INSTALLED__ = true;
}
