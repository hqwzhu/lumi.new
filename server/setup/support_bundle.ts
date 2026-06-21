import fs from 'fs';
import path from 'path';
import { getDataRoot } from '../config/data_path';
import { getAllKeyNames, loadKeys } from '../config/keys';
import { loadSetupState } from './setup_state';
import { getSetupDiagnostics, type SetupDiagnostics } from './diagnostics';
import { getDiagnosticLogFilePath, getRecentDiagnosticEvents, type DiagnosticEvent } from './diagnostic_logs';

export interface SetupSupportBundle {
  generatedAt: string;
  appName: string;
  platform: NodeJS.Platform;
  nodeVersion: string;
  cwd: string;
  dataRoot: string;
  setupState: ReturnType<typeof loadSetupState>;
  configuredKeys: Record<string, boolean>;
  diagnostics: SetupDiagnostics;
  diagnosticLogPath: string;
  recentDiagnosticEvents: DiagnosticEvent[];
  releaseManifest?: unknown;
}

function configuredKeys(): Record<string, boolean> {
  const stored = loadKeys() as Record<string, string | undefined>;
  const result: Record<string, boolean> = {};
  for (const name of getAllKeyNames()) {
    result[name] = !!(process.env[name] || stored[name]);
  }
  return result;
}

function loadReleaseManifest(): unknown | undefined {
  const candidates = [
    path.join(process.cwd(), 'release', 'windows', 'manifest.json'),
    path.join(process.cwd(), '..', 'release', 'windows', 'manifest.json'),
  ];

  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      }
    } catch {
      return { error: 'Release manifest exists but could not be parsed.' };
    }
  }
  return undefined;
}

export async function getSetupSupportBundle(): Promise<SetupSupportBundle> {
  return {
    generatedAt: new Date().toISOString(),
    appName: 'Lumi OS',
    platform: process.platform,
    nodeVersion: process.version,
    cwd: process.cwd(),
    dataRoot: getDataRoot(),
    setupState: loadSetupState(),
    configuredKeys: configuredKeys(),
    diagnostics: await getSetupDiagnostics(),
    diagnosticLogPath: getDiagnosticLogFilePath(),
    recentDiagnosticEvents: getRecentDiagnosticEvents(50),
    releaseManifest: loadReleaseManifest(),
  };
}
