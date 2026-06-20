import { readDB } from '../../db_layer';

export interface LocalModelProviderStatus {
  id: 'ollama' | 'lmstudio';
  label: string;
  baseUrl: string;
  detected: boolean;
  models: string[];
  message: string;
}

export interface LocalModelDetectionResult {
  hasLocalModel: boolean;
  providers: {
    ollama: LocalModelProviderStatus;
    lmstudio: LocalModelProviderStatus;
  };
}

export interface DetectLocalModelSourcesOptions {
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

function readSavedLocalConfig(key: 'ollama_config' | 'lmstudio_config'): any {
  try {
    const db = readDB();
    const setting = (db.settings || []).find((item: any) => item.key === key);
    return setting ? JSON.parse(setting.value) : {};
  } catch {
    return {};
  }
}

function getBaseUrl(key: 'ollama_config' | 'lmstudio_config', envName: string, fallback: string): string {
  const saved = readSavedLocalConfig(key);
  return String(saved.baseUrl || process.env[envName] || fallback).replace(/\/+$/, '');
}

function hasChatModel(name: string): boolean {
  const normalized = name.toLowerCase();
  return !normalized.includes('embed') && !normalized.includes('embedding') && !normalized.includes('whisper');
}

async function detectOllama(fetcher: typeof fetch, timeoutMs: number): Promise<LocalModelProviderStatus> {
  const baseUrl = getBaseUrl('ollama_config', 'OLLAMA_BASE_URL', 'http://localhost:11434');
  try {
    const response = await fetcher(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as any;
    const models = (data.models || []).map((model: any) => String(model.name || '')).filter(Boolean);
    const detected = models.some(hasChatModel);
    return {
      id: 'ollama',
      label: 'Ollama',
      baseUrl,
      detected,
      models,
      message: detected ? `${models.length} Ollama model(s) found.` : 'Ollama is reachable, but no chat model was found.',
    };
  } catch (error: any) {
    return {
      id: 'ollama',
      label: 'Ollama',
      baseUrl,
      detected: false,
      models: [],
      message: `Ollama was not detected at ${baseUrl}.`,
    };
  }
}

async function detectLmStudio(fetcher: typeof fetch, timeoutMs: number): Promise<LocalModelProviderStatus> {
  const baseUrl = getBaseUrl('lmstudio_config', 'LMSTUDIO_BASE_URL', 'http://localhost:1234');
  try {
    const response = await fetcher(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as any;
    const models = (data.data || []).map((model: any) => String(model.id || '')).filter(Boolean);
    const detected = models.length > 0;
    return {
      id: 'lmstudio',
      label: 'LM Studio',
      baseUrl,
      detected,
      models,
      message: detected ? `${models.length} LM Studio model(s) found.` : 'LM Studio is reachable, but no model was loaded.',
    };
  } catch {
    return {
      id: 'lmstudio',
      label: 'LM Studio',
      baseUrl,
      detected: false,
      models: [],
      message: `LM Studio was not detected at ${baseUrl}.`,
    };
  }
}

export async function detectLocalModelSources(options: DetectLocalModelSourcesOptions = {}): Promise<LocalModelDetectionResult> {
  const fetcher = options.fetcher || fetch;
  const timeoutMs = options.timeoutMs ?? 3000;
  const [ollama, lmstudio] = await Promise.all([
    detectOllama(fetcher, timeoutMs),
    detectLmStudio(fetcher, timeoutMs),
  ]);

  return {
    hasLocalModel: ollama.detected || lmstudio.detected,
    providers: { ollama, lmstudio },
  };
}
