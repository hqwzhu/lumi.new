import { describe, expect, it } from 'vitest';
import { configuredProviderIdsForStatus, isSetupProviderConfigured } from './setupSelection';

describe('setup provider selection helpers', () => {
  it('detects configured providers from saved setup state and masked backend keys', () => {
    const providers = configuredProviderIdsForStatus(
      {
        DEEPSEEK_API_KEY: true,
        OPENAI_API_KEY: true,
        RELAY_API_KEY: true,
        RELAY_BASE_URL: false,
      },
      ['ollama'],
    );

    expect(providers).toEqual(['deepseek', 'openai', 'ollama']);
    expect(isSetupProviderConfigured('relay', { RELAY_API_KEY: true, RELAY_BASE_URL: false }, [])).toBe(false);
  });
});
