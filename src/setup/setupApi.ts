import type { ModelPreference, SetupMode } from './providerCatalog';
import { resolveBackendUrl } from '../services/apiBridge';

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

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(resolveBackendUrl(path), {
      credentials: 'include',
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`无法连接 Lumi OS 本地服务，请关闭程序后重新打开再试。原始错误：${message}`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Request failed: ${response.status}`);
  }
  return data as T;
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

export function resetSetup(): Promise<{ success: boolean; state: SetupState }> {
  return requestJson('/api/setup/reset', { method: 'POST' });
}

export function exportSupportBundle(): Promise<unknown> {
  return requestJson('/api/setup/support-bundle');
}
