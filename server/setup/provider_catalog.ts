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
