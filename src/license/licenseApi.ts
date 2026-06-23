import { resolveBackendUrl } from '../services/apiBridge';

const RETRY_DELAYS_MS = [300, 700, 1200];

export interface LicensePayload {
  v: 1;
  product: 'lumi-os';
  machineCode: string;
  licenseId: string;
  issuedAt: string;
  expiresAt?: string;
  edition?: string;
}

export interface PublicLicenseState {
  version: 1;
  activated: boolean;
  activatedAt?: string;
  machineCode?: string;
  payload?: LicensePayload;
}

export interface LicenseStatus {
  machineCode: string;
  activated: boolean;
  requiresActivation: boolean;
  state: PublicLicenseState;
}

export interface LicenseActivationResult {
  success: boolean;
  machineCode: string;
  state: PublicLicenseState;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  return /Failed to fetch|NetworkError|Load failed|fetch/i.test(error.message);
}

function formatConnectionError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`无法连接 Lumi OS 本地服务。请重新打开 Lumi OS 后再试。原始错误：${message}`);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(resolveBackendUrl(path), {
        credentials: 'include',
        ...init,
        headers: {
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...(init?.headers || {}),
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Request failed: ${response.status}`);
      }
      return data as T;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      lastError = error;
      if (attempt >= RETRY_DELAYS_MS.length) break;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw formatConnectionError(lastError);
}

export function getLicenseStatus(): Promise<LicenseStatus> {
  return requestJson<LicenseStatus>('/api/license/status');
}

export function activateLicense(licenseCode: string): Promise<LicenseActivationResult> {
  return requestJson<LicenseActivationResult>('/api/license/activate', {
    method: 'POST',
    body: JSON.stringify({ licenseCode }),
  });
}
