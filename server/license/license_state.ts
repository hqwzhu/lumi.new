import fs from 'fs';
import path from 'path';
import { getDataPath } from '../config/data_path';
import type { LicensePayload } from './license_code';

export interface LicenseState {
  version: 1;
  activated: boolean;
  activatedAt?: string;
  machineCode?: string;
  licenseCode?: string;
  payload?: LicensePayload;
}

const DEFAULT_STATE: LicenseState = { version: 1, activated: false };

function licenseFile(): string {
  return getDataPath('license.json');
}

function normalizeState(value: unknown): LicenseState {
  if (!value || typeof value !== 'object') return DEFAULT_STATE;
  const state = value as Partial<LicenseState>;
  return {
    version: 1,
    activated: state.activated === true,
    activatedAt: typeof state.activatedAt === 'string' ? state.activatedAt : undefined,
    machineCode: typeof state.machineCode === 'string' ? state.machineCode : undefined,
    licenseCode: typeof state.licenseCode === 'string' ? state.licenseCode : undefined,
    payload: state.payload && typeof state.payload === 'object' ? state.payload as LicensePayload : undefined,
  };
}

export function loadLicenseState(): LicenseState {
  try {
    const file = licenseFile();
    if (!fs.existsSync(file)) return DEFAULT_STATE;
    return normalizeState(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveLicenseState(state: LicenseState): LicenseState {
  const file = licenseFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const normalized = normalizeState(state);
  fs.writeFileSync(file, JSON.stringify(normalized, null, 2));
  return normalized;
}

export function activateLicense(input: {
  machineCode: string;
  licenseCode: string;
  payload: LicensePayload;
}): LicenseState {
  return saveLicenseState({
    version: 1,
    activated: true,
    activatedAt: new Date().toISOString(),
    machineCode: input.machineCode,
    licenseCode: input.licenseCode,
    payload: input.payload,
  });
}

export function resetLicenseState(): LicenseState {
  return saveLicenseState(DEFAULT_STATE);
}
