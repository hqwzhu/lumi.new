import fs from 'fs';
import path from 'path';
import { getDataPath } from '../config/data_path';
import { loadKeys } from '../config/keys';
import { SETUP_PROVIDERS } from './provider_catalog';
import { detectLocalModelSources } from './local_models';

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

function checkDataDirectory(): DiagnosticItem {
  try {
    const probe = getDataPath('.setup-write-test');
    fs.writeFileSync(probe, 'ok');
    fs.rmSync(probe, { force: true });
    return { id: 'data-dir', label: 'Data directory', status: 'ok', message: 'LumiOS can write local configuration data.' };
  } catch (err: any) {
    return { id: 'data-dir', label: 'Data directory', status: 'error', message: `LumiOS cannot write its data directory: ${err.message}` };
  }
}

export function checkProviderKeys(): { item: DiagnosticItem; hasCloudModel: boolean } {
  const keys = loadKeys();
  const cloudProviders = SETUP_PROVIDERS.filter(provider => provider.llm && !provider.local);
  const configured = cloudProviders.filter(provider => provider.keyNames.some(name => !!(keys as any)[name]));
  if (configured.length > 0) {
    return {
      hasCloudModel: true,
      item: {
        id: 'provider-keys',
        label: 'Model provider',
        status: 'ok',
        message: `${configured.length} cloud model provider(s) configured.`,
      },
    };
  }
  return {
    hasCloudModel: false,
    item: {
      id: 'provider-keys',
      label: 'Model provider',
      status: 'warning',
      message: 'No cloud model API key is configured yet.',
    },
  };
}

async function checkLocalModels(): Promise<{ item: DiagnosticItem; hasLocalModel: boolean }> {
  const localModels = await detectLocalModelSources();
  const available = Object.values(localModels.providers).filter(provider => provider.detected);
  if (available.length > 0) {
    return {
      hasLocalModel: true,
      item: {
        id: 'local-models',
        label: 'Local model runtime',
        status: 'ok',
        message: available.map(provider => `${provider.label}: ${provider.models.join(', ') || 'model ready'}`).join('; '),
      },
    };
  }
  return {
    hasLocalModel: false,
    item: {
      id: 'local-models',
      label: 'Local model runtime',
      status: 'warning',
      message: 'No Ollama or LM Studio chat model was detected. This is optional when a cloud model key is configured.',
    },
  };
}

function checkBundledBackend(): DiagnosticItem {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'entry.cjs'),
    path.join(cwd, 'server.mjs'),
    path.join(cwd, 'dist-server', 'entry.cjs'),
    path.join(cwd, 'desktop-resources', 'dist-server', 'entry.cjs'),
  ];
  const found = candidates.some(file => fs.existsSync(file));
  return found
    ? { id: 'bundled-backend', label: 'Bundled backend', status: 'ok', message: 'Backend resources are present.' }
    : { id: 'bundled-backend', label: 'Bundled backend', status: 'warning', message: 'Bundled backend resources were not found in the current working directory.' };
}

export async function getSetupDiagnostics(): Promise<SetupDiagnostics> {
  const items: DiagnosticItem[] = [
    checkDataDirectory(),
    checkBundledBackend(),
  ];
  const providerCheck = checkProviderKeys();
  const localCheck = await checkLocalModels();
  items.push(providerCheck.item);
  items.push(localCheck.item);
  const hasModelSource = providerCheck.hasCloudModel || localCheck.hasLocalModel;
  const ok = items.every(item => item.status !== 'error') && hasModelSource;
  return { ok, hasModelSource, items };
}
