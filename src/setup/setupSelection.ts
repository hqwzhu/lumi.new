import { SETUP_PROVIDER_CARDS, type SetupProviderId } from './providerCatalog';

export function isSetupProviderConfigured(
  providerId: string,
  providers: Record<string, boolean>,
  configuredProviderIds: string[],
): boolean {
  if (configuredProviderIds.includes(providerId)) return true;
  if (providerId === 'deepseek') return providers.DEEPSEEK_API_KEY === true;
  if (providerId === 'qwen') return providers.DASHSCOPE_API_KEY === true || providers.QWEN_API_KEY === true;
  if (providerId === 'ark') return providers.ARK_API_KEY === true;
  if (providerId === 'kimi') return providers.KIMI_API_KEY === true;
  if (providerId === 'glm') return providers.GLM_API_KEY === true;
  if (providerId === 'openai') return providers.OPENAI_API_KEY === true;
  if (providerId === 'anthropic') return providers.ANTHROPIC_API_KEY === true;
  if (providerId === 'gemini') return providers.GEMINI_API_KEY === true;
  if (providerId === 'relay') return providers.RELAY_API_KEY === true && providers.RELAY_BASE_URL === true;
  return false;
}

export function configuredProviderIdsForStatus(
  providers: Record<string, boolean>,
  configuredProviderIds: string[] = [],
): SetupProviderId[] {
  return SETUP_PROVIDER_CARDS
    .filter(provider => isSetupProviderConfigured(provider.id, providers, configuredProviderIds))
    .map(provider => provider.id);
}
