# Windows Installer MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Windows-first LumiOS installer onboarding flow so an installed user can configure one usable model source, get bilingual API-key guidance, pass diagnostics, and enter the app without editing `.env`.

**Architecture:** Keep the existing Tauri app as the product shell. Add a focused backend setup API, a structured provider catalog, persisted setup state in `~/LumiOS/data/setup.json`, and a new React onboarding flow that replaces the current `localStorage`-based `SetupWizard` gate in `src/entries/desktop.tsx`.

**Tech Stack:** React 19, TypeScript, Vite, Express, Vitest, Tauri v2, NSIS, Node.js backend bundled under `desktop-resources/dist-server`.

---

## Preflight

Before implementation, check repository ownership and working tree safety.

- [ ] **Step 1: Confirm target repository exists and is writable**

Run:

```powershell
gh repo view hqwzhu/lumi.new --json nameWithOwner,defaultBranchRef,viewerPermission
```

Expected if ready:

```text
{"nameWithOwner":"hqwzhu/lumi.new",...,"viewerPermission":"ADMIN"|"MAINTAIN"|"WRITE"}
```

If the repo is missing or permission is not write-capable, stop implementation and ask the user to create/grant access.

- [ ] **Step 2: Confirm only intentional files are changed before starting**

Run:

```powershell
git -C E:\AiProject\lumi-os-clean status --short --branch
```

Expected: existing unrelated changes may remain, but do not revert them. Create implementation commits that include only files touched by this plan.

- [ ] **Step 3: Add destination remote without changing origin**

Run:

```powershell
git -C E:\AiProject\lumi-os-clean remote add hqwzhu https://github.com/hqwzhu/lumi.new.git
git -C E:\AiProject\lumi-os-clean remote -v
```

Expected: both `origin` and `hqwzhu` are listed. If the remote already exists, verify it points to `https://github.com/hqwzhu/lumi.new.git`.

---

## File Structure

Create:

- `server/setup/provider_catalog.ts`: backend provider catalog and provider-to-key mapping.
- `server/setup/setup_state.ts`: setup state read/write/reset helpers using `getDataPath`.
- `server/setup/diagnostics.ts`: diagnostics for data directory, provider availability, local models, and bundled resources.
- `server/routes/setup_routes.ts`: `/api/setup/*` routes.
- `src/setup/providerCatalog.ts`: frontend provider metadata, tutorials, and mode membership.
- `src/setup/setupApi.ts`: typed frontend API client for setup routes.
- `src/setup/SetupOnboarding.tsx`: top-level onboarding flow.
- `src/setup/SetupModeStep.tsx`: mode and model-preference selection.
- `src/setup/ProviderCard.tsx`: API-key card with save/test/help actions.
- `src/setup/ProviderHelpDrawer.tsx`: bilingual tutorial drawer.
- `src/setup/DiagnosticsStep.tsx`: diagnostics and launch step.
- `test/setup_state.test.ts`: setup state persistence tests.
- `test/setup_routes.test.ts`: setup API route tests.
- `src/setup/setupApi.test.ts`: small client/localStorage guard tests if practical.

Modify:

- `server/runtime/routes.ts`: mount setup routes.
- `src/entries/desktop.tsx`: replace `localStorage` setup gate and old `SetupWizard` with `SetupOnboarding`.
- `src/components/Settings.tsx`: add a small action to reset/reopen onboarding, without broad refactor.
- `package.json`: add no new dependencies unless tests require an already-approved existing library. Prefer built-in Vitest and React APIs.

Do not modify:

- Existing unrelated changed files unless a task explicitly requires it.
- `.env` or `.env.example` for this MVP.
- Existing `SetupWizard.tsx` unless removing its import from `desktop.tsx`; leave the file for later cleanup.

---

## Task 1: Setup State Persistence

**Files:**
- Create: `server/setup/setup_state.ts`
- Test: `test/setup_state.test.ts`

- [ ] **Step 1: Write failing tests for setup state**

Create `test/setup_state.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

describe('setup_state', () => {
  let root: string;

  beforeEach(() => {
    root = path.join(os.tmpdir(), `lumi_setup_state_${crypto.randomUUID().slice(0, 8)}`);
    fs.mkdirSync(root, { recursive: true });
    process.env.LUMI_DATA_DIR = root;
  });

  it('returns incomplete state when setup.json is missing', async () => {
    const { loadSetupState } = await import('../server/setup/setup_state');
    expect(loadSetupState()).toEqual({ version: 1, completed: false });
  });

  it('saves and reloads completed setup state', async () => {
    const { saveSetupState, loadSetupState } = await import('../server/setup/setup_state');
    saveSetupState({
      version: 1,
      completed: true,
      completedAt: '2026-06-20T00:00:00.000Z',
      mode: 'practical',
      modelPreference: 'china',
      configuredProviders: ['deepseek'],
      skippedOptionalProviders: ['deepgram'],
    });
    expect(loadSetupState()).toMatchObject({
      version: 1,
      completed: true,
      mode: 'practical',
      modelPreference: 'china',
      configuredProviders: ['deepseek'],
    });
  });

  it('resets setup to incomplete without deleting data directory', async () => {
    const { saveSetupState, resetSetupState, loadSetupState } = await import('../server/setup/setup_state');
    saveSetupState({
      version: 1,
      completed: true,
      completedAt: '2026-06-20T00:00:00.000Z',
      mode: 'essential',
      modelPreference: 'international',
      configuredProviders: ['openai'],
      skippedOptionalProviders: [],
    });
    resetSetupState();
    expect(loadSetupState()).toEqual({ version: 1, completed: false });
    expect(fs.existsSync(path.join(root, 'data'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```powershell
npm test -- test/setup_state.test.ts
```

Expected: FAIL because `server/setup/setup_state.ts` does not exist.

- [ ] **Step 3: Implement setup state helpers**

Create `server/setup/setup_state.ts`:

```ts
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

function normalizeState(value: unknown): SetupState {
  if (!value || typeof value !== 'object') return DEFAULT_STATE;
  const state = value as Partial<SetupState>;
  return {
    version: 1,
    completed: state.completed === true,
    completedAt: typeof state.completedAt === 'string' ? state.completedAt : undefined,
    mode: state.mode,
    modelPreference: state.modelPreference,
    configuredProviders: Array.isArray(state.configuredProviders) ? state.configuredProviders : undefined,
    skippedOptionalProviders: Array.isArray(state.skippedOptionalProviders) ? state.skippedOptionalProviders : undefined,
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

export function resetSetupState(): SetupState {
  return saveSetupState(DEFAULT_STATE);
}
```

- [ ] **Step 4: Run tests and confirm pass**

Run:

```powershell
npm test -- test/setup_state.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```powershell
git -C E:\AiProject\lumi-os-clean add server/setup/setup_state.ts test/setup_state.test.ts
git -C E:\AiProject\lumi-os-clean commit -m "feat: add setup state persistence"
```

---

## Task 2: Backend Provider Catalog

**Files:**
- Create: `server/setup/provider_catalog.ts`
- Test: `test/setup_routes.test.ts` will use this later.

- [ ] **Step 1: Implement backend provider catalog**

Create `server/setup/provider_catalog.ts`:

```ts
import { getAllKeyNames } from '../config/keys';

export type SetupProviderId =
  | 'deepseek'
  | 'qwen'
  | 'ark'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'kimi'
  | 'glm'
  | 'ollama'
  | 'lmstudio'
  | 'relay';

export interface SetupProvider {
  id: SetupProviderId;
  label: string;
  region: 'china' | 'international' | 'local';
  keyNames: string[];
  llm: boolean;
  local: boolean;
  optional: boolean;
}

export const SETUP_PROVIDERS: SetupProvider[] = [
  { id: 'deepseek', label: 'DeepSeek', region: 'china', keyNames: ['DEEPSEEK_API_KEY'], llm: true, local: false, optional: false },
  { id: 'qwen', label: 'Qwen / DashScope', region: 'china', keyNames: ['DASHSCOPE_API_KEY', 'QWEN_API_KEY'], llm: true, local: false, optional: false },
  { id: 'ark', label: 'Volcengine Ark / Doubao', region: 'china', keyNames: ['ARK_API_KEY'], llm: true, local: false, optional: true },
  { id: 'kimi', label: 'Kimi', region: 'china', keyNames: ['KIMI_API_KEY'], llm: true, local: false, optional: true },
  { id: 'glm', label: 'GLM / Zhipu', region: 'china', keyNames: ['GLM_API_KEY'], llm: true, local: false, optional: true },
  { id: 'openai', label: 'OpenAI', region: 'international', keyNames: ['OPENAI_API_KEY'], llm: true, local: false, optional: false },
  { id: 'anthropic', label: 'Anthropic Claude', region: 'international', keyNames: ['ANTHROPIC_API_KEY'], llm: true, local: false, optional: true },
  { id: 'gemini', label: 'Google Gemini', region: 'international', keyNames: ['GEMINI_API_KEY'], llm: true, local: false, optional: true },
  { id: 'ollama', label: 'Ollama', region: 'local', keyNames: [], llm: true, local: true, optional: false },
  { id: 'lmstudio', label: 'LM Studio', region: 'local', keyNames: [], llm: true, local: true, optional: false },
  { id: 'relay', label: 'OpenAI-compatible Relay', region: 'international', keyNames: ['RELAY_API_KEY', 'RELAY_BASE_URL'], llm: true, local: false, optional: true },
];

const ALLOWED_KEY_NAMES = new Set<string>(getAllKeyNames());

export function getSetupProvider(id: string): SetupProvider | undefined {
  return SETUP_PROVIDERS.find(provider => provider.id === id);
}

export function getPrimaryKeyName(providerId: string): string | null {
  const provider = getSetupProvider(providerId);
  if (!provider || provider.keyNames.length === 0) return null;
  const key = provider.keyNames[0];
  return ALLOWED_KEY_NAMES.has(key) ? key : null;
}

export function isLlmProvider(providerId: string): boolean {
  return getSetupProvider(providerId)?.llm === true;
}
```

- [ ] **Step 2: Typecheck**

Run:

```powershell
npm run lint
```

Expected: PASS or unrelated existing failures only. If failures are from this file, fix before continuing.

- [ ] **Step 3: Commit Task 2**

Run:

```powershell
git -C E:\AiProject\lumi-os-clean add server/setup/provider_catalog.ts
git -C E:\AiProject\lumi-os-clean commit -m "feat: add setup provider catalog"
```

---

## Task 3: Setup Diagnostics

**Files:**
- Create: `server/setup/diagnostics.ts`
- Modify: none yet
- Test: covered in Task 4 routes

- [ ] **Step 1: Implement diagnostics helper**

Create `server/setup/diagnostics.ts`:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run:

```powershell
npm run lint
```

Expected: PASS or unrelated existing failures only.

- [ ] **Step 3: Commit Task 3**

Run:

```powershell
git -C E:\AiProject\lumi-os-clean add server/setup/diagnostics.ts
git -C E:\AiProject\lumi-os-clean commit -m "feat: add setup diagnostics helper"
```

---

## Task 4: Setup Routes

**Files:**
- Create: `server/routes/setup_routes.ts`
- Modify: `server/runtime/routes.ts`
- Test: `test/setup_routes.test.ts`

- [ ] **Step 1: Write failing route tests**

Create `test/setup_routes.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { makeApp } from './helpers';
import { mountSetupRoutes } from '../server/routes/setup_routes';

describe('setup routes', () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;

  beforeEach(async () => {
    ctx = await makeApp();
    mountSetupRoutes(ctx.apiRouter);
  });

  afterEach(() => ctx.cleanup());

  it('returns incomplete setup status by default', async () => {
    const res = await fetch(`${ctx.url}/api/setup/status`);
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.state.completed).toBe(false);
    expect(body.requiresSetup).toBe(true);
  });

  it('rejects unknown provider keys', async () => {
    const res = await fetch(`${ctx.url}/api/setup/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'unknown', apiKey: 'sk-test' }),
    });
    expect(res.status).toBe(400);
  });

  it('saves a known provider key without returning the raw key', async () => {
    const res = await fetch(`${ctx.url}/api/setup/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'deepseek', apiKey: 'sk-deepseek-test' }),
    });
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain('sk-deepseek-test');
    expect(body.providers.DEEPSEEK_API_KEY).toBe(true);
  });

  it('refuses completion without a model source', async () => {
    const res = await fetch(`${ctx.url}/api/setup/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'practical', modelPreference: 'china', configuredProviders: [], skippedOptionalProviders: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('completes setup after a model provider key is saved', async () => {
    await fetch(`${ctx.url}/api/setup/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'deepseek', apiKey: 'sk-deepseek-test' }),
    });
    const res = await fetch(`${ctx.url}/api/setup/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'practical', modelPreference: 'china', configuredProviders: ['deepseek'], skippedOptionalProviders: [] }),
    });
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.state.completed).toBe(true);
  });

  it('reset marks setup incomplete', async () => {
    await fetch(`${ctx.url}/api/setup/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'deepseek', apiKey: 'sk-deepseek-test' }),
    });
    await fetch(`${ctx.url}/api/setup/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'essential', modelPreference: 'china', configuredProviders: ['deepseek'], skippedOptionalProviders: [] }),
    });
    const res = await fetch(`${ctx.url}/api/setup/reset`, { method: 'POST' });
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.state.completed).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```powershell
npm test -- test/setup_routes.test.ts
```

Expected: FAIL because `server/routes/setup_routes.ts` does not exist.

- [ ] **Step 3: Implement setup routes**

Create `server/routes/setup_routes.ts`:

```ts
import { Router } from 'express';
import { loadKeys, saveKeys, getAllKeyNames } from '../config/keys';
import { loadSetupState, completeSetup, resetSetupState, SetupMode, ModelPreference } from '../setup/setup_state';
import { getPrimaryKeyName, getSetupProvider, SETUP_PROVIDERS } from '../setup/provider_catalog';
import { getSetupDiagnostics } from '../setup/diagnostics';

function maskedKeys(): Record<string, boolean> {
  const stored = loadKeys();
  const masked: Record<string, boolean> = {};
  for (const name of getAllKeyNames()) {
    masked[name] = !!(process.env[name] || (stored as any)[name]);
  }
  return masked;
}

function hasAnyModelSource(): boolean {
  const keys = maskedKeys();
  return SETUP_PROVIDERS.some(provider =>
    provider.llm && !provider.local && provider.keyNames.some(name => keys[name])
  );
}

function validMode(value: unknown): value is SetupMode {
  return value === 'essential' || value === 'practical' || value === 'full';
}

function validModelPreference(value: unknown): value is ModelPreference {
  return value === 'china' || value === 'international' || value === 'local';
}

export function mountSetupRoutes(router: Router) {
  router.get('/setup/status', (_req, res) => {
    const state = loadSetupState();
    const diagnostics = getSetupDiagnostics();
    res.json({
      state,
      providers: maskedKeys(),
      diagnostics,
      requiresSetup: !state.completed,
    });
  });

  router.post('/setup/keys', (req, res) => {
    const { providerId, apiKey, baseUrl } = req.body || {};
    const provider = getSetupProvider(String(providerId || ''));
    if (!provider) return res.status(400).json({ error: 'Unknown provider' });
    if (provider.local) return res.status(400).json({ error: 'Local providers do not use API keys' });

    const primaryKey = getPrimaryKeyName(provider.id);
    if (!primaryKey) return res.status(400).json({ error: 'Provider does not support setup key save' });
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const keys: Record<string, string> = { [primaryKey]: apiKey.trim() };
    if (provider.id === 'relay') {
      if (typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
        return res.status(400).json({ error: 'Relay base URL is required' });
      }
      keys.RELAY_BASE_URL = baseUrl.trim();
    }
    saveKeys(keys);
    res.json({ success: true, providers: maskedKeys() });
  });

  router.post('/setup/test-provider', (req, res) => {
    const { providerId, apiKey } = req.body || {};
    const provider = getSetupProvider(String(providerId || ''));
    if (!provider) return res.status(400).json({ ok: false, error: 'Unknown provider' });
    if (provider.local) {
      return res.json({ ok: false, providerId: provider.id, message: 'Use local model detection for this provider.' });
    }
    const keys = maskedKeys();
    const hasKey = provider.keyNames.some(name => keys[name]) || (typeof apiKey === 'string' && apiKey.trim().length > 0);
    if (!hasKey) {
      return res.status(400).json({ ok: false, providerId: provider.id, message: 'No API key configured for this provider.' });
    }
    res.json({ ok: true, providerId: provider.id, message: 'API key is configured. A live provider call can be added after MVP.' });
  });

  router.get('/setup/diagnostics', (_req, res) => {
    res.json(getSetupDiagnostics());
  });

  router.post('/setup/complete', (req, res) => {
    const { mode, modelPreference, configuredProviders, skippedOptionalProviders } = req.body || {};
    if (!validMode(mode)) return res.status(400).json({ error: 'Invalid setup mode' });
    if (!validModelPreference(modelPreference)) return res.status(400).json({ error: 'Invalid model preference' });
    if (!hasAnyModelSource()) {
      return res.status(400).json({ error: 'At least one cloud model provider or local model is required before launch.' });
    }
    const state = completeSetup({
      mode,
      modelPreference,
      configuredProviders: Array.isArray(configuredProviders) ? configuredProviders : [],
      skippedOptionalProviders: Array.isArray(skippedOptionalProviders) ? skippedOptionalProviders : [],
    });
    res.json({ success: true, state });
  });

  router.post('/setup/reset', (_req, res) => {
    res.json({ success: true, state: resetSetupState() });
  });
}
```

- [ ] **Step 4: Mount routes**

Modify `server/runtime/routes.ts`:

```ts
import { mountSetupRoutes } from "../routes/setup_routes";
```

Inside `mountAllRoutes`, after `mountSystemRoutes(apiRouter, jwtSecret, io);`, add:

```ts
  mountSetupRoutes(apiRouter);
```

- [ ] **Step 5: Run route tests**

Run:

```powershell
npm test -- test/setup_routes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run existing key/system tests**

Run:

```powershell
npm test -- test/keys.test.ts test/settings.test.ts
```

Expected: PASS. If tests fail due to changed setup key behavior, fix route code without breaking existing `/api/settings/keys`.

- [ ] **Step 7: Commit Task 4**

Run:

```powershell
git -C E:\AiProject\lumi-os-clean add server/routes/setup_routes.ts server/runtime/routes.ts test/setup_routes.test.ts
git -C E:\AiProject\lumi-os-clean commit -m "feat: add setup API routes"
```

---

## Task 5: Frontend Provider Catalog And API Client

**Files:**
- Create: `src/setup/providerCatalog.ts`
- Create: `src/setup/setupApi.ts`
- Test: optional `src/setup/setupApi.test.ts`

- [ ] **Step 1: Create frontend provider catalog**

Create `src/setup/providerCatalog.ts`:

```ts
export type SetupMode = 'essential' | 'practical' | 'full';
export type ModelPreference = 'china' | 'international' | 'local';
export type TutorialLanguage = 'zh' | 'en';

export interface ProviderTutorial {
  title: string;
  steps: string[];
  officialUrl: string;
  consoleUrl?: string;
}

export interface SetupProviderCard {
  id: string;
  label: string;
  region: ModelPreference;
  keyLabel: string;
  recommendedModel: string;
  capabilities: string[];
  modes: SetupMode[];
  optional: boolean;
  local: boolean;
  tutorials: Record<TutorialLanguage, ProviderTutorial>;
}

export const SETUP_PROVIDERS: SetupProviderCard[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    region: 'china',
    keyLabel: 'DEEPSEEK_API_KEY',
    recommendedModel: 'DeepSeek Chat / Reasoner',
    capabilities: ['基础聊天', '复杂推理', '中国大陆访问友好'],
    modes: ['essential', 'practical', 'full'],
    optional: false,
    local: false,
    tutorials: {
      zh: {
        title: '如何获取 DeepSeek API Key',
        officialUrl: 'https://api-docs.deepseek.com/',
        consoleUrl: 'https://platform.deepseek.com/api_keys',
        steps: ['打开 DeepSeek 开放平台。', '登录或注册账号。', '进入 API Keys 页面。', '创建新的 API Key。', '复制 Key 并粘贴到 LumiOS。', '点击测试连接。'],
      },
      en: {
        title: 'How to get a DeepSeek API key',
        officialUrl: 'https://api-docs.deepseek.com/',
        consoleUrl: 'https://platform.deepseek.com/api_keys',
        steps: ['Open the DeepSeek platform.', 'Sign in or create an account.', 'Go to API Keys.', 'Create a new API key.', 'Paste it into LumiOS.', 'Click Test connection.'],
      },
    },
  },
  {
    id: 'qwen',
    label: 'Qwen / DashScope',
    region: 'china',
    keyLabel: 'DASHSCOPE_API_KEY',
    recommendedModel: 'Qwen Plus / Qwen Max',
    capabilities: ['基础聊天', '中文能力', '语音服务可复用 DashScope'],
    modes: ['essential', 'practical', 'full'],
    optional: false,
    local: false,
    tutorials: {
      zh: {
        title: '如何获取通义千问 DashScope API Key',
        officialUrl: 'https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen',
        consoleUrl: 'https://bailian.console.aliyun.com/',
        steps: ['打开阿里云百炼控制台。', '登录阿里云账号。', '开通模型服务。', '进入 API Key 管理。', '创建并复制 API Key。', '粘贴到 LumiOS 并测试连接。'],
      },
      en: {
        title: 'How to get a Qwen / DashScope API key',
        officialUrl: 'https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen',
        consoleUrl: 'https://bailian.console.aliyun.com/',
        steps: ['Open Alibaba Cloud Model Studio.', 'Sign in.', 'Enable model service.', 'Open API Key management.', 'Create and copy an API key.', 'Paste it into LumiOS and test.'],
      },
    },
  },
  {
    id: 'openai',
    label: 'OpenAI',
    region: 'international',
    keyLabel: 'OPENAI_API_KEY',
    recommendedModel: 'GPT family',
    capabilities: ['高质量通用能力', '国际用户推荐', '生态兼容性好'],
    modes: ['essential', 'practical', 'full'],
    optional: false,
    local: false,
    tutorials: {
      zh: {
        title: '如何获取 OpenAI API Key',
        officialUrl: 'https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key',
        consoleUrl: 'https://platform.openai.com/api-keys',
        steps: ['打开 OpenAI Platform。', '登录账号。', '进入 API keys 页面。', '创建新的 project API key。', '复制 Key。', '粘贴到 LumiOS 并测试连接。'],
      },
      en: {
        title: 'How to get an OpenAI API key',
        officialUrl: 'https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key',
        consoleUrl: 'https://platform.openai.com/api-keys',
        steps: ['Open OpenAI Platform.', 'Sign in.', 'Go to API keys.', 'Create a new project API key.', 'Copy the key.', 'Paste it into LumiOS and test.'],
      },
    },
  },
];
```

Then add remaining providers in the same file with this exact minimum metadata:

- `ark`: official URL `https://www.volcengine.com/docs/82379/1541594`, modes `['practical','full']`.
- `anthropic`: official URL `https://docs.anthropic.com/en/docs/get-started`, modes `['practical','full']`.
- `gemini`: official URL `https://ai.google.dev/gemini-api/docs/api-key`, modes `['practical','full']`.
- `ollama`: local provider, no API key, modes `['essential','practical','full']`.
- `lmstudio`: local provider, no API key, modes `['practical','full']`.
- `relay`: key plus base URL, modes `['full']`.

Add helpers:

```ts
export function providersFor(mode: SetupMode, preference: ModelPreference): SetupProviderCard[] {
  return SETUP_PROVIDERS.filter(provider =>
    provider.modes.includes(mode) && (provider.region === preference || provider.region === 'local')
  );
}
```

- [ ] **Step 2: Create API client**

Create `src/setup/setupApi.ts`:

```ts
import type { ModelPreference, SetupMode } from './providerCatalog';

export interface SetupStatus {
  state: { completed: boolean; mode?: SetupMode; modelPreference?: ModelPreference };
  providers: Record<string, boolean>;
  requiresSetup: boolean;
  diagnostics?: SetupDiagnostics;
}

export interface SetupDiagnostics {
  ok: boolean;
  hasModelSource: boolean;
  items: Array<{ id: string; label: string; status: 'ok' | 'warning' | 'error'; message: string }>;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((body as any).error || (body as any).message || `Request failed: ${response.status}`);
  }
  return body as T;
}

export async function getSetupStatus(): Promise<SetupStatus> {
  return readJson<SetupStatus>(await fetch('/api/setup/status', { credentials: 'include' }));
}

export async function saveSetupKey(input: { providerId: string; apiKey: string; baseUrl?: string }): Promise<{ success: true; providers: Record<string, boolean> }> {
  return readJson(await fetch('/api/setup/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  }));
}

export async function testSetupProvider(providerId: string, apiKey?: string): Promise<{ ok: boolean; message: string }> {
  return readJson(await fetch('/api/setup/test-provider', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ providerId, apiKey }),
  }));
}

export async function getSetupDiagnostics(): Promise<SetupDiagnostics> {
  return readJson<SetupDiagnostics>(await fetch('/api/setup/diagnostics', { credentials: 'include' }));
}

export async function completeSetup(input: { mode: SetupMode; modelPreference: ModelPreference; configuredProviders: string[]; skippedOptionalProviders: string[] }): Promise<SetupStatus['state']> {
  const result = await readJson<{ state: SetupStatus['state'] }>(await fetch('/api/setup/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  }));
  return result.state;
}

export async function resetSetup(): Promise<SetupStatus['state']> {
  const result = await readJson<{ state: SetupStatus['state'] }>(await fetch('/api/setup/reset', {
    method: 'POST',
    credentials: 'include',
  }));
  return result.state;
}
```

- [ ] **Step 3: Typecheck**

Run:

```powershell
npm run lint
```

Expected: PASS or unrelated existing failures only.

- [ ] **Step 4: Commit Task 5**

Run:

```powershell
git -C E:\AiProject\lumi-os-clean add src/setup/providerCatalog.ts src/setup/setupApi.ts
git -C E:\AiProject\lumi-os-clean commit -m "feat: add setup frontend catalog and API client"
```

---

## Task 6: Onboarding UI Components

**Files:**
- Create: `src/setup/SetupModeStep.tsx`
- Create: `src/setup/ProviderHelpDrawer.tsx`
- Create: `src/setup/ProviderCard.tsx`
- Create: `src/setup/DiagnosticsStep.tsx`
- Create: `src/setup/SetupOnboarding.tsx`

- [ ] **Step 1: Implement mode step**

Create `src/setup/SetupModeStep.tsx`:

```tsx
import type { ModelPreference, SetupMode } from './providerCatalog';

export function SetupModeStep({
  mode,
  preference,
  onModeChange,
  onPreferenceChange,
  onNext,
}: {
  mode: SetupMode;
  preference: ModelPreference;
  onModeChange: (mode: SetupMode) => void;
  onPreferenceChange: (preference: ModelPreference) => void;
  onNext: () => void;
}) {
  const modes: Array<{ id: SetupMode; title: string; desc: string }> = [
    { id: 'essential', title: '精简必需版', desc: '配置一个主模型，快速开启聊天、记忆和常规工具。' },
    { id: 'practical', title: '实用完整版', desc: '推荐。主模型、备用模型、本地模型检测和语音可选项。' },
    { id: 'full', title: '全量配置中心', desc: '高级用户一次配置 LLM、语音、音乐、图像和 Relay。' },
  ];
  const preferences: Array<{ id: ModelPreference; title: string; desc: string }> = [
    { id: 'china', title: '中国推荐', desc: 'DeepSeek、通义千问、豆包等国内可用服务。' },
    { id: 'international', title: '国际推荐', desc: 'OpenAI、Anthropic、Google Gemini。' },
    { id: 'local', title: '本地模型优先', desc: '优先检测 Ollama 和 LM Studio。' },
  ];

  return (
    <div className="w-full max-w-5xl space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-black text-white">设置 LumiOS</h1>
        <p className="text-white/55">选择一种配置方式。你可以先快速启动，其他能力稍后再打开。</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map(item => (
          <button key={item.id} onClick={() => onModeChange(item.id)} className={`text-left p-5 rounded-2xl border ${mode === item.id ? 'border-celestial-saturn bg-celestial-saturn/15' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
            <div className="text-lg font-black text-white">{item.title}</div>
            <div className="text-sm text-white/55 mt-2 leading-relaxed">{item.desc}</div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {preferences.map(item => (
          <button key={item.id} onClick={() => onPreferenceChange(item.id)} className={`text-left p-4 rounded-xl border ${preference === item.id ? 'border-blue-400 bg-blue-500/15' : 'border-white/10 bg-black/30 hover:bg-white/5'}`}>
            <div className="text-sm font-bold text-white">{item.title}</div>
            <div className="text-xs text-white/45 mt-1">{item.desc}</div>
          </button>
        ))}
      </div>
      <button onClick={onNext} className="w-full h-12 rounded-xl bg-white text-black font-black">下一步</button>
    </div>
  );
}
```

- [ ] **Step 2: Implement provider help drawer**

Create `src/setup/ProviderHelpDrawer.tsx`:

```tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import type { SetupProviderCard, TutorialLanguage } from './providerCatalog';

export function ProviderHelpDrawer({ provider, onClose }: { provider: SetupProviderCard; onClose: () => void }) {
  const [lang, setLang] = useState<TutorialLanguage>('zh');
  const tutorial = provider.tutorials[lang];
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex justify-end">
      <div className="w-full max-w-lg h-full bg-neutral-950 border-l border-white/10 p-6 overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white">{tutorial.title}</h2>
            <p className="text-sm text-white/45 mt-1">{provider.label}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/60"><X size={18} /></button>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={() => setLang('zh')} className={`px-3 py-2 rounded-lg text-sm ${lang === 'zh' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>中文</button>
          <button onClick={() => setLang('en')} className={`px-3 py-2 rounded-lg text-sm ${lang === 'en' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>English</button>
        </div>
        <ol className="mt-6 space-y-3">
          {tutorial.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm text-white/70">
              <span className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="flex gap-3 mt-8">
          <a href={tutorial.officialUrl} target="_blank" rel="noreferrer" className="px-4 py-3 rounded-xl bg-white text-black text-sm font-bold">打开官方教程</a>
          {tutorial.consoleUrl && <a href={tutorial.consoleUrl} target="_blank" rel="noreferrer" className="px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold">打开控制台</a>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement provider card**

Create `src/setup/ProviderCard.tsx`:

```tsx
import { useState } from 'react';
import { CheckCircle, HelpCircle, Loader2 } from 'lucide-react';
import type { SetupProviderCard } from './providerCatalog';
import { saveSetupKey, testSetupProvider } from './setupApi';
import { ProviderHelpDrawer } from './ProviderHelpDrawer';

export function ProviderCard({
  provider,
  configured,
  onConfigured,
}: {
  provider: SetupProviderCard;
  configured: boolean;
  onConfigured: (providerId: string) => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);

  const save = async () => {
    if (!provider.local && !apiKey.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      await saveSetupKey({ providerId: provider.id, apiKey, baseUrl });
      setApiKey('');
      onConfigured(provider.id);
      setMessage('已保存。');
    } catch (err: any) {
      setMessage(err.message || '保存失败。');
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await testSetupProvider(provider.id, apiKey);
      setMessage(result.message || (result.ok ? '连接测试通过。' : '连接测试未通过。'));
    } catch (err: any) {
      setMessage(err.message || '测试失败。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-white/10 bg-black/35 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-white">{provider.label}</h3>
            {configured && <CheckCircle size={16} className="text-green-400" />}
          </div>
          <p className="text-xs text-white/45 mt-1">{provider.recommendedModel}</p>
        </div>
        <button onClick={() => setHelpOpen(true)} className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200">
          <HelpCircle size={14} /> 如何获取 / How to get
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {provider.capabilities.map(capability => (
          <span key={capability} className="px-2 py-1 rounded-lg bg-white/10 text-white/60 text-xs">{capability}</span>
        ))}
      </div>
      {provider.local ? (
        <div className="text-sm text-white/55">本地模型会在诊断步骤自动检测。</div>
      ) : (
        <div className="space-y-3">
          <input value={apiKey} onChange={event => setApiKey(event.target.value)} type="password" placeholder={configured ? '已保存，输入新 Key 可替换' : provider.keyLabel} className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-sm outline-none focus:border-blue-400" />
          {provider.id === 'relay' && <input value={baseUrl} onChange={event => setBaseUrl(event.target.value)} placeholder="https://your-relay.example.com/v1" className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-sm outline-none focus:border-blue-400" />}
        </div>
      )}
      <div className="flex gap-3">
        {!provider.local && <button disabled={busy || !apiKey.trim()} onClick={save} className="px-4 py-2 rounded-xl bg-white text-black text-sm font-bold disabled:opacity-40">{busy ? <Loader2 size={14} className="animate-spin" /> : '保存'}</button>}
        <button disabled={busy} onClick={test} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-40">测试连接</button>
      </div>
      {message && <p className="text-xs text-white/55">{message}</p>}
      {helpOpen && <ProviderHelpDrawer provider={provider} onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
```

- [ ] **Step 4: Implement diagnostics step**

Create `src/setup/DiagnosticsStep.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { completeSetup, getSetupDiagnostics, type SetupDiagnostics } from './setupApi';
import type { ModelPreference, SetupMode } from './providerCatalog';

export function DiagnosticsStep({
  mode,
  modelPreference,
  configuredProviders,
  onComplete,
  onBack,
}: {
  mode: SetupMode;
  modelPreference: ModelPreference;
  configuredProviders: string[];
  onComplete: () => void;
  onBack: () => void;
}) {
  const [diagnostics, setDiagnostics] = useState<SetupDiagnostics | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      setDiagnostics(await getSetupDiagnostics());
    } catch (err: any) {
      setError(err.message || '诊断失败。');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { run(); }, []);

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      await completeSetup({ mode, modelPreference, configuredProviders, skippedOptionalProviders: [] });
      onComplete();
    } catch (err: any) {
      setError(err.message || '还不能启动，请先配置至少一个模型。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-white">启动前体检</h2>
        <p className="text-white/55">确认 LumiOS 核心服务、数据目录和模型来源可用。</p>
      </div>
      <div className="space-y-3">
        {busy && !diagnostics && <div className="flex items-center justify-center gap-2 text-white/60"><Loader2 className="animate-spin" size={18} /> 正在检查...</div>}
        {diagnostics?.items.map(item => (
          <div key={item.id} className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
            {item.status === 'ok' ? <CheckCircle className="text-green-400" size={18} /> : item.status === 'warning' ? <AlertTriangle className="text-amber-400" size={18} /> : <XCircle className="text-red-400" size={18} />}
            <div>
              <div className="text-sm font-bold text-white">{item.label}</div>
              <div className="text-xs text-white/50 mt-1">{item.message}</div>
            </div>
          </div>
        ))}
      </div>
      {error && <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">{error}</div>}
      <div className="flex gap-3">
        <button onClick={onBack} className="px-4 py-3 rounded-xl bg-white/10 text-white text-sm font-bold">返回配置</button>
        <button onClick={run} className="px-4 py-3 rounded-xl bg-white/10 text-white text-sm font-bold">重新体检</button>
        <button disabled={busy || !diagnostics?.hasModelSource} onClick={finish} className="ml-auto px-5 py-3 rounded-xl bg-white text-black text-sm font-black disabled:opacity-40">进入 LumiOS</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement top-level onboarding**

Create `src/setup/SetupOnboarding.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { SetupModeStep } from './SetupModeStep';
import { ProviderCard } from './ProviderCard';
import { DiagnosticsStep } from './DiagnosticsStep';
import { providersFor, type ModelPreference, type SetupMode } from './providerCatalog';

type Step = 'mode' | 'providers' | 'diagnostics';

export function SetupOnboarding({ initialProviders, onFinish }: { initialProviders?: Record<string, boolean>; onFinish: () => void }) {
  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<SetupMode>('practical');
  const [modelPreference, setModelPreference] = useState<ModelPreference>('china');
  const [configuredProviderIds, setConfiguredProviderIds] = useState<string[]>([]);

  const providers = useMemo(() => providersFor(mode, modelPreference), [mode, modelPreference]);

  const markConfigured = (providerId: string) => {
    setConfiguredProviderIds(prev => prev.includes(providerId) ? prev : [...prev, providerId]);
  };

  if (step === 'mode') {
    return (
      <SetupModeStep
        mode={mode}
        preference={modelPreference}
        onModeChange={setMode}
        onPreferenceChange={setModelPreference}
        onNext={() => setStep('providers')}
      />
    );
  }

  if (step === 'diagnostics') {
    return (
      <DiagnosticsStep
        mode={mode}
        modelPreference={modelPreference}
        configuredProviders={configuredProviderIds}
        onBack={() => setStep('providers')}
        onComplete={onFinish}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">配置模型和服务</h2>
          <p className="text-white/55 mt-1">至少配置一个云端模型，或在下一步使用本地模型检测。</p>
        </div>
        <button onClick={() => setStep('mode')} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm">重新选择模式</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
        {providers.map(provider => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            configured={configuredProviderIds.includes(provider.id) || Object.values(initialProviders || {}).some(Boolean)}
            onConfigured={markConfigured}
          />
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={() => setStep('diagnostics')} className="px-5 py-3 rounded-xl bg-white text-black text-sm font-black">继续体检</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck**

Run:

```powershell
npm run lint
```

Expected: PASS or unrelated existing failures only.

- [ ] **Step 7: Commit Task 6**

Run:

```powershell
git -C E:\AiProject\lumi-os-clean add src/setup
git -C E:\AiProject\lumi-os-clean commit -m "feat: add setup onboarding UI"
```

---

## Task 7: Wire Onboarding Into Desktop Entry

**Files:**
- Modify: `src/entries/desktop.tsx`
- Modify: `src/components/Settings.tsx`

- [ ] **Step 1: Replace localStorage setup gate in desktop entry**

Modify `src/entries/desktop.tsx`:

- Remove:

```ts
import { SetupWizard } from '../components/SetupWizard';
const SETUP_DONE_KEY = 'lumi_setup_complete';
```

- Add:

```ts
import { SetupOnboarding } from '../setup/SetupOnboarding';
import { getSetupStatus, type SetupStatus } from '../setup/setupApi';
```

- Replace:

```ts
const [showSetup, setShowSetup] = useState(() => localStorage.getItem(SETUP_DONE_KEY) !== '1');
```

with:

```ts
const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
const [setupLoading, setSetupLoading] = useState(true);

useEffect(() => {
  let cancelled = false;
  getSetupStatus()
    .then(status => { if (!cancelled) setSetupStatus(status); })
    .catch(() => { if (!cancelled) setSetupStatus({ state: { completed: false }, providers: {}, requiresSetup: true }); })
    .finally(() => { if (!cancelled) setSetupLoading(false); });
  return () => { cancelled = true; };
}, []);

const showSetup = !setupLoading && setupStatus?.requiresSetup;
```

- Before the existing `if (shell.loading)`, add setup loading to boot condition:

```ts
if (shell.loading || setupLoading) {
```

- Replace old setup render:

```tsx
<SetupWizard onFinish={() => { setShowSetup(false); localStorage.setItem(SETUP_DONE_KEY, '1'); }} />
```

with:

```tsx
<SetupOnboarding
  initialProviders={setupStatus?.providers}
  onFinish={() => setSetupStatus(current => current ? { ...current, requiresSetup: false, state: { ...current.state, completed: true } } : current)}
/>
```

- [ ] **Step 2: Add Settings action to reset setup**

In `src/components/Settings.tsx`, import:

```ts
import { resetSetup } from '@/setup/setupApi';
```

In the Security or Desktop Node Runtime section, add a button:

```tsx
<button
  onClick={async () => {
    await resetSetup();
    window.location.reload();
  }}
  className="w-full mt-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-black uppercase tracking-widest"
>
  Reopen Setup Wizard
</button>
```

Keep this edit small. Do not refactor Settings in this task.

- [ ] **Step 3: Typecheck**

Run:

```powershell
npm run lint
```

Expected: PASS or unrelated existing failures only.

- [ ] **Step 4: Build desktop UI**

Run:

```powershell
npm run build:desktop-ui
```

Expected: PASS and `dist/desktop` created.

- [ ] **Step 5: Commit Task 7**

Run:

```powershell
git -C E:\AiProject\lumi-os-clean add src/entries/desktop.tsx src/components/Settings.tsx
git -C E:\AiProject\lumi-os-clean commit -m "feat: show setup onboarding on first launch"
```

---

## Task 8: Package Resource Verification

**Files:**
- Modify: none unless build reveals a packaging bug.

- [ ] **Step 1: Build desktop resources**

Run:

```powershell
npm run build:desktop
```

Expected:

```text
vite build --mode desktop
node scripts/build-server.mjs
node scripts/prepare-desktop-resources.mjs
```

and files exist:

```powershell
Test-Path E:\AiProject\lumi-os-clean\desktop-resources\dist-server\entry.cjs
Test-Path E:\AiProject\lumi-os-clean\desktop-resources\dist-server\server.mjs
```

Both should return `True`.

- [ ] **Step 2: Run desktop dev smoke test**

Run:

```powershell
npm run tauri:dev
```

Expected: LumiOS launches and shows onboarding if `~/LumiOS/data/setup.json` is incomplete. Stop it after verifying.

If this is too disruptive, run `npm run dev` and open `http://127.0.0.1:3000` to verify the UI path in browser.

- [ ] **Step 3: Build Windows installer**

Run:

```powershell
npm run tauri:build
```

Expected: NSIS installer artifact under `src-tauri/target/release/bundle/nsis/`.

If Rust, WebView2, signing, or NSIS fails, record exact error and fix only packaging-related issues.

- [ ] **Step 4: Commit any packaging fixes**

If no code changes were needed, skip commit. If changes were needed, run:

```powershell
git -C E:\AiProject\lumi-os-clean add <changed-files>
git -C E:\AiProject\lumi-os-clean commit -m "fix: package setup onboarding resources"
```

---

## Task 9: Final Verification And Push

**Files:**
- Modify: none

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npm test -- test/setup_state.test.ts test/setup_routes.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full tests**

Run:

```powershell
npm test
```

Expected: PASS. If unrelated pre-existing failures occur, record them with file/test names.

- [ ] **Step 3: Run typecheck**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Run build**

Run:

```powershell
npm run build:desktop
```

Expected: PASS.

- [ ] **Step 5: Verify git status**

Run:

```powershell
git -C E:\AiProject\lumi-os-clean status --short --branch
```

Expected: only pre-existing unrelated changes remain unstaged. All task commits should be committed.

- [ ] **Step 6: Push to user repository**

Run:

```powershell
git -C E:\AiProject\lumi-os-clean push hqwzhu main
```

Expected: push succeeds to `hqwzhu/lumi.new`.

If branch protection blocks direct push, create a branch:

```powershell
git -C E:\AiProject\lumi-os-clean switch -c feat/windows-installer-mvp
git -C E:\AiProject\lumi-os-clean push -u hqwzhu feat/windows-installer-mvp
```

Then open a PR against `hqwzhu/lumi.new`.

---

## Self-Review Checklist

Spec coverage:

- Windows-only installer MVP: covered by Tasks 8 and 9.
- First-run onboarding: covered by Tasks 5, 6, and 7.
- Essential/Practical/Full modes: covered by provider catalog and `SetupModeStep`.
- China/International/Local model recommendations: covered by `providerCatalog.ts`.
- Bilingual API-key help: covered by `ProviderHelpDrawer`.
- Backend setup state and diagnostics: covered by Tasks 1, 3, and 4.
- Secrets not stored in localStorage: covered by `ProviderCard` using React state and backend save.
- Reopen setup from Settings: covered by Task 7.
- Target repo migration/push: covered by Preflight and Task 9.

Placeholder scan:

- Every task has concrete files, commands, expected outcomes, and code skeletons where code is required.

Type consistency:

- `SetupMode` values: `essential | practical | full`.
- `ModelPreference` values: `china | international | local`.
- Setup route prefix: `/api/setup`.
- Setup state file: `setup.json` under `getDataPath`.
