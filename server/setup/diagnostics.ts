import fs from 'fs';
import path from 'path';
import { getDataPath } from '../config/data_path';
import { loadKeys } from '../config/keys';
import { SETUP_PROVIDERS } from './provider_catalog';

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

function checkProviderKeys(): { item: DiagnosticItem; hasCloudModel: boolean } {
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

export function getSetupDiagnostics(): SetupDiagnostics {
  const items: DiagnosticItem[] = [
    checkDataDirectory(),
    checkBundledBackend(),
  ];
  const providerCheck = checkProviderKeys();
  items.push(providerCheck.item);
  const hasModelSource = providerCheck.hasCloudModel;
  const ok = items.every(item => item.status !== 'error') && hasModelSource;
  return { ok, hasModelSource, items };
}
