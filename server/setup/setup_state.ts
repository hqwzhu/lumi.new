import fs from 'fs';
import path from 'path';
import { getDataPath } from '../config/data_path';

export type SetupMode = 'essential' | 'practical' | 'full';
export type ModelPreference = 'china' | 'international' | 'local';

export interface SetupState {
  version: 1;
  completed: boolean;
  completedAt?: string;
  mode?: SetupMode;
  modelPreference?: ModelPreference;
  configuredProviders?: string[];
  skippedOptionalProviders?: string[];
}

const DEFAULT_STATE: SetupState = { version: 1, completed: false };

function setupFile(): string {
  return getDataPath('setup.json');
}

function isSetupMode(value: unknown): value is SetupMode {
  return value === 'essential' || value === 'practical' || value === 'full';
}

function isModelPreference(value: unknown): value is ModelPreference {
  return value === 'china' || value === 'international' || value === 'local';
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeState(value: unknown): SetupState {
  if (!value || typeof value !== 'object') return DEFAULT_STATE;
  const state = value as Partial<SetupState>;
  return {
    version: 1,
    completed: state.completed === true,
    completedAt: typeof state.completedAt === 'string' ? state.completedAt : undefined,
    mode: isSetupMode(state.mode) ? state.mode : undefined,
    modelPreference: isModelPreference(state.modelPreference) ? state.modelPreference : undefined,
    configuredProviders: normalizeStringArray(state.configuredProviders),
    skippedOptionalProviders: normalizeStringArray(state.skippedOptionalProviders),
  };
}

export function loadSetupState(): SetupState {
  try {
    const file = setupFile();
    if (!fs.existsSync(file)) return DEFAULT_STATE;
    return normalizeState(JSON.parse(fs.readFileSync(file, 'utf-8')));
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveSetupState(state: SetupState): SetupState {
  const file = setupFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const normalized = normalizeState(state);
  fs.writeFileSync(file, JSON.stringify(normalized, null, 2));
  return normalized;
}

export function completeSetup(input: Omit<SetupState, 'version' | 'completed' | 'completedAt'>): SetupState {
  return saveSetupState({
    version: 1,
    completed: true,
    completedAt: new Date().toISOString(),
    ...input,
  });
}

export function updateSetupPreferences(input: Omit<SetupState, 'version' | 'completed' | 'completedAt'>): SetupState {
  const current = loadSetupState();
  return saveSetupState({
    ...current,
    version: 1,
    mode: input.mode,
    modelPreference: input.modelPreference,
    configuredProviders: input.configuredProviders,
    skippedOptionalProviders: input.skippedOptionalProviders,
  });
}

export function resetSetupState(): SetupState {
  return saveSetupState(DEFAULT_STATE);
}
