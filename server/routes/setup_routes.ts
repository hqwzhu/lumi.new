import { Router } from 'express';
import { loadKeys, saveKeys, getAllKeyNames } from '../config/keys';
import { loadSetupState, completeSetup, resetSetupState, type SetupMode, type ModelPreference } from '../setup/setup_state';
import { getPrimaryKeyName, getSetupProvider, SETUP_PROVIDERS } from '../setup/provider_catalog';
import { getSetupDiagnostics } from '../setup/diagnostics';

function maskedKeys(): Record<string, boolean> {
  const stored = loadKeys();
  const masked: Record<string, boolean> = {};
  for (const name of getAllKeyNames()) {
    masked[name] = !!(process.env[name] || stored[name]);
  }
  return masked;
}

async function hasAnyModelSource(): Promise<boolean> {
  const keys = maskedKeys();
  if (SETUP_PROVIDERS.some(provider =>
    provider.llm && !provider.local && provider.keyNames.some(name => keys[name])
  )) return true;
  const diagnostics = await getSetupDiagnostics();
  return diagnostics.hasModelSource;
}

function validMode(value: unknown): value is SetupMode {
  return value === 'essential' || value === 'practical' || value === 'full';
}

function validModelPreference(value: unknown): value is ModelPreference {
  return value === 'china' || value === 'international' || value === 'local';
}

export function mountSetupRoutes(router: Router) {
  router.get('/setup/status', async (_req, res) => {
    const state = loadSetupState();
    const diagnostics = await getSetupDiagnostics();
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
    const { providerId, apiKey, baseUrl } = req.body || {};
    const provider = getSetupProvider(String(providerId || ''));
    if (!provider) return res.status(400).json({ ok: false, error: 'Unknown provider' });
    if (provider.local) {
      return res.json({ ok: false, providerId: provider.id, providerLabel: provider.label, source: 'local', message: 'Use setup diagnostics to detect this local provider.' });
    }
    const keys = maskedKeys();
    const hasInputKey = typeof apiKey === 'string' && apiKey.trim().length > 0;
    const hasSavedKey = provider.keyNames.some(name => keys[name]);
    const hasKey = hasSavedKey || hasInputKey;
    if (!hasKey) {
      return res.status(400).json({ ok: false, providerId: provider.id, providerLabel: provider.label, source: 'missing', message: 'No API key is configured for this provider.' });
    }
    if (provider.id === 'relay') {
      const hasInputBaseUrl = typeof baseUrl === 'string' && baseUrl.trim().length > 0;
      const hasSavedBaseUrl = keys.RELAY_BASE_URL === true;
      if (!hasInputBaseUrl && !hasSavedBaseUrl) {
        return res.status(400).json({ ok: false, providerId: provider.id, providerLabel: provider.label, source: 'missing', message: 'Relay Base URL is required before testing this provider.' });
      }
    }
    const source = hasSavedKey ? 'saved' : 'input';
    const message = source === 'saved'
      ? `${provider.label} has a saved API key. No live provider call was made during MVP setup.`
      : `${provider.label} API key format is present but not saved yet. Save it before launching LumiOS.`;
    res.json({ ok: true, providerId: provider.id, providerLabel: provider.label, source, message });
  });

  router.get('/setup/diagnostics', async (_req, res) => {
    res.json(await getSetupDiagnostics());
  });

  router.post('/setup/complete', async (req, res) => {
    const { mode, modelPreference, configuredProviders, skippedOptionalProviders } = req.body || {};
    if (!validMode(mode)) return res.status(400).json({ error: 'Invalid setup mode' });
    if (!validModelPreference(modelPreference)) return res.status(400).json({ error: 'Invalid model preference' });
    if (!(await hasAnyModelSource())) {
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
