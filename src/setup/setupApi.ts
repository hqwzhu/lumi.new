import type { ModelPreference, SetupMode } from './providerCatalog';
import { resolveBackendUrl } from '../services/apiBridge';

const RETRY_DELAYS_MS = [300, 700, 1200];

export interface SetupState {
  version?: 1;
  completed: boolean;
  completedAt?: string;
  mode?: SetupMode;
  modelPreference?: ModelPreference;
  configuredProviders?: string[];
  skippedOptionalProviders?: string[];
}

export interface DiagnosticItem {
  id: string;
  label: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

export interface SetupDiagnostics {
  ok: boolean;
  hasModelSource: boolean;
  items: DiagnosticItem[];
}

export interface SetupStatus {
  state: SetupState;
  providers: Record<string, boolean>;
  diagnostics?: SetupDiagnostics;
  requiresSetup: boolean;
}

export interface SaveSetupKeyInput {
  providerId: string;
  apiKey: string;
  baseUrl?: string;
}

export interface CompleteSetupInput {
  mode: SetupMode;
  modelPreference: ModelPreference;
  configuredProviders: string[];
  skippedOptionalProviders: string[];
}

export interface TestProviderResult {
  ok: boolean;
  providerId: string;
  message: string;
  error?: string;
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
  return new Error(`无法连接 Lumi OS 本地服务。请先关闭 Lumi OS 后重新打开；如果仍然失败，请确认安装包为 3.0.2 或更新版本。原始错误：${message}`);
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

export function getSetupStatus(): Promise<SetupStatus> {
  return requestJson<SetupStatus>('/api/setup/status');
}

export function saveSetupKey(input: SaveSetupKeyInput): Promise<{ success: boolean; providers: Record<string, boolean> }> {
  return requestJson('/api/setup/keys', {
    method: 'POST',
    body: JSON.stringify({
      providerId: input.providerId,
      apiKey: input.apiKey,
      baseUrl: input.baseUrl,
    }),
  });
}

export function testSetupProvider(providerId: string, apiKey?: string): Promise<TestProviderResult> {
  return requestJson<TestProviderResult>('/api/setup/test-provider', {
    method: 'POST',
    body: JSON.stringify({ providerId, apiKey }),
  });
}

export function getSetupDiagnostics(): Promise<SetupDiagnostics> {
  return requestJson<SetupDiagnostics>('/api/setup/diagnostics');
}

export function completeSetup(input: CompleteSetupInput): Promise<{ success: boolean; state: SetupState }> {
  return requestJson('/api/setup/complete', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateSetupPreferences(input: CompleteSetupInput): Promise<{ success: boolean; state: SetupState; requiresSetup: boolean }> {
  return requestJson('/api/setup/preferences', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function resetSetup(): Promise<{ success: boolean; state: SetupState }> {
  return requestJson('/api/setup/reset', { method: 'POST' });
}

export function exportSupportBundle(): Promise<unknown> {
  return requestJson('/api/setup/support-bundle');
}
