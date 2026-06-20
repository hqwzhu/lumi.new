export type SetupMode = 'essential' | 'practical' | 'full';
export type ModelPreference = 'china' | 'international' | 'local';
export type TutorialLanguage = 'zh' | 'en';
export type SetupProviderId =
  | 'deepseek'
  | 'qwen'
  | 'ark'
  | 'kimi'
  | 'glm'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'ollama'
  | 'lmstudio'
  | 'relay';

export interface SetupModeOption {
  id: SetupMode;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  bestFor: string;
  includes: string[];
}

export interface ModelPreferenceOption {
  id: ModelPreference;
  title: string;
  description: string;
}

export interface ProviderTutorial {
  title: string;
  officialUrl: string;
  consoleUrl?: string;
  steps: string[];
  notes: string[];
}

export interface SetupProviderCard {
  id: SetupProviderId;
  label: string;
  shortLabel: string;
  region: ModelPreference;
  local: boolean;
  recommended: boolean;
  optional: boolean;
  keyLabel: string;
  recommendedModel: string;
  capabilities: string[];
  modes: SetupMode[];
  tutorials: Record<TutorialLanguage, ProviderTutorial>;
}

export const SETUP_MODE_OPTIONS: SetupModeOption[] = [
  {
    id: 'essential',
    title: '精简必需版',
    subtitle: '最快启动',
    badge: '3-5 分钟',
    description: '只配置一个主力大模型，完成后即可聊天、调用基础 AI 能力和进入桌面。',
    bestFor: '第一次安装、只想快速用起来、暂时不需要语音和多供应商兜底的用户。',
    includes: ['1 个主力大模型 API Key', '基础连通性检查', '本地数据目录和后端资源检查'],
  },
  {
    id: 'practical',
    title: '实用完整版',
    subtitle: '推荐',
    badge: '8-12 分钟',
    description: '配置主力模型、备用模型和可选本地模型，日常使用更稳定。',
    bestFor: '大多数用户。既想快速上手，又希望复杂任务有备用模型。',
    includes: ['中国或国际主力模型推荐', '备用云模型', 'Ollama / LM Studio 本地模型入口', '一键测试连接'],
  },
  {
    id: 'full',
    title: '全量配置',
    subtitle: '高级',
    badge: '15 分钟以上',
    description: '展示主要中国、国际、本地和中转供应商，适合需要完整能力矩阵的用户。',
    bestFor: '团队部署、重度用户、需要多模型对比或 OpenAI-compatible relay 的场景。',
    includes: ['全部主要模型供应商', '中转/私有网关配置', '本地模型入口', '完整 API Key 教程'],
  },
];

export const MODEL_PREFERENCE_OPTIONS: ModelPreferenceOption[] = [
  {
    id: 'china',
    title: '中国大模型优先',
    description: '推荐 DeepSeek、通义千问、火山方舟等，国内访问更顺手。',
  },
  {
    id: 'international',
    title: '国际大模型优先',
    description: '推荐 OpenAI、Anthropic、Gemini，适合已有国际 API 账号的用户。',
  },
  {
    id: 'local',
    title: '本地模型优先',
    description: '推荐 Ollama 或 LM Studio，适合隐私优先和离线探索。',
  },
];

const localTutorial: Record<TutorialLanguage, ProviderTutorial> = {
  zh: {
    title: '如何准备本地模型',
    officialUrl: 'https://ollama.com/download',
    steps: ['安装 Ollama 或 LM Studio。', '下载一个聊天模型，例如 qwen2.5、deepseek-r1 或 llama 系列。', '保持本地模型服务运行，然后回到 LumiOS 重新体检。'],
    notes: ['本地模型不需要 API Key，但需要电脑性能足够。'],
  },
  en: {
    title: 'How to prepare a local model',
    officialUrl: 'https://ollama.com/download',
    steps: ['Install Ollama or LM Studio.', 'Download a chat model such as qwen2.5, deepseek-r1, or a Llama model.', 'Keep the local model server running, then return to LumiOS and run diagnostics again.'],
    notes: ['Local models do not need an API key, but they require enough local compute.'],
  },
};

export const SETUP_PROVIDER_CARDS: SetupProviderCard[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    shortLabel: 'DeepSeek',
    region: 'china',
    local: false,
    recommended: true,
    optional: false,
    keyLabel: 'DEEPSEEK_API_KEY',
    recommendedModel: '推荐：deepseek-chat / deepseek-reasoner',
    capabilities: ['中文友好', '推理', '性价比高'],
    modes: ['essential', 'practical', 'full'],
    tutorials: {
      zh: {
        title: '如何获取 DeepSeek API Key',
        officialUrl: 'https://api-docs.deepseek.com/',
        consoleUrl: 'https://platform.deepseek.com/api_keys',
        steps: ['打开 DeepSeek 开放平台并登录。', '进入 API Keys 页面。', '点击创建新的 API Key。', '复制 Key，粘贴到 LumiOS 的 DeepSeek 输入框。'],
        notes: ['保存后 LumiOS 只会显示是否已配置，不会在界面回显完整 Key。'],
      },
      en: {
        title: 'How to get a DeepSeek API key',
        officialUrl: 'https://api-docs.deepseek.com/',
        consoleUrl: 'https://platform.deepseek.com/api_keys',
        steps: ['Open the DeepSeek platform and sign in.', 'Go to the API Keys page.', 'Create a new API key.', 'Copy the key and paste it into the DeepSeek field in LumiOS.'],
        notes: ['After saving, LumiOS only shows whether the key is configured. It does not display the full key again.'],
      },
    },
  },
  {
    id: 'qwen',
    label: 'Qwen / 通义千问',
    shortLabel: 'Qwen',
    region: 'china',
    local: false,
    recommended: true,
    optional: false,
    keyLabel: 'DASHSCOPE_API_KEY',
    recommendedModel: '推荐：qwen-plus / qwen-max',
    capabilities: ['中文强', '多模态生态', '国内稳定'],
    modes: ['essential', 'practical', 'full'],
    tutorials: {
      zh: {
        title: '如何获取通义千问 DashScope API Key',
        officialUrl: 'https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen',
        consoleUrl: 'https://bailian.console.aliyun.com/',
        steps: ['打开阿里云百炼控制台并登录。', '开通模型服务并完成必要的账号认证。', '进入 API Key 管理页面。', '创建并复制 DashScope API Key，粘贴到 LumiOS。'],
        notes: ['如果你已有 QWEN_API_KEY，也可以后续在设置里继续维护。'],
      },
      en: {
        title: 'How to get a Qwen DashScope API key',
        officialUrl: 'https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen',
        consoleUrl: 'https://bailian.console.aliyun.com/',
        steps: ['Open Alibaba Cloud Model Studio and sign in.', 'Enable the model service and complete required account checks.', 'Go to API key management.', 'Create and copy a DashScope API key, then paste it into LumiOS.'],
        notes: ['If you already use QWEN_API_KEY, you can continue managing it later in Settings.'],
      },
    },
  },
  {
    id: 'ark',
    label: 'Volcengine Ark / 豆包',
    shortLabel: 'Ark',
    region: 'china',
    local: false,
    recommended: false,
    optional: true,
    keyLabel: 'ARK_API_KEY',
    recommendedModel: '推荐：Doubao / Ark endpoint',
    capabilities: ['国内服务', '企业场景', '备用模型'],
    modes: ['practical', 'full'],
    tutorials: {
      zh: {
        title: '如何获取火山方舟 API Key',
        officialUrl: 'https://www.volcengine.com/docs/82379/1541594',
        consoleUrl: 'https://console.volcengine.com/ark/',
        steps: ['登录火山引擎控制台。', '进入火山方舟模型服务。', '创建或选择推理接入点。', '在 API Key 管理处创建 Key，并粘贴到 LumiOS。'],
        notes: ['火山方舟通常还需要在模型服务中配置可用 endpoint。'],
      },
      en: {
        title: 'How to get a Volcengine Ark API key',
        officialUrl: 'https://www.volcengine.com/docs/82379/1541594',
        consoleUrl: 'https://console.volcengine.com/ark/',
        steps: ['Sign in to the Volcengine console.', 'Open the Ark model service.', 'Create or choose an inference endpoint.', 'Create an API key and paste it into LumiOS.'],
        notes: ['Ark deployments may also require an enabled model endpoint.'],
      },
    },
  },
  {
    id: 'kimi',
    label: 'Kimi',
    shortLabel: 'Kimi',
    region: 'china',
    local: false,
    recommended: false,
    optional: true,
    keyLabel: 'KIMI_API_KEY',
    recommendedModel: '推荐：moonshot-v1',
    capabilities: ['长文本', '中文友好', '备用模型'],
    modes: ['full'],
    tutorials: {
      zh: {
        title: '如何获取 Kimi API Key',
        officialUrl: 'https://platform.moonshot.cn/docs',
        consoleUrl: 'https://platform.moonshot.cn/console/api-keys',
        steps: ['打开 Moonshot AI 开放平台并登录。', '完成账号认证或充值要求。', '进入 API Key 管理。', '创建 Key 后复制到 LumiOS。'],
        notes: ['Kimi 适合长文本阅读和中文任务兜底。'],
      },
      en: {
        title: 'How to get a Kimi API key',
        officialUrl: 'https://platform.moonshot.cn/docs',
        consoleUrl: 'https://platform.moonshot.cn/console/api-keys',
        steps: ['Open the Moonshot AI platform and sign in.', 'Complete required account verification or billing setup.', 'Go to API key management.', 'Create a key and paste it into LumiOS.'],
        notes: ['Kimi is useful as a fallback for long-context and Chinese-language tasks.'],
      },
    },
  },
  {
    id: 'glm',
    label: 'GLM / 智谱',
    shortLabel: 'GLM',
    region: 'china',
    local: false,
    recommended: false,
    optional: true,
    keyLabel: 'GLM_API_KEY',
    recommendedModel: '推荐：glm-4-plus / glm-4-air',
    capabilities: ['中文生态', '工具调用', '备用模型'],
    modes: ['full'],
    tutorials: {
      zh: {
        title: '如何获取智谱 GLM API Key',
        officialUrl: 'https://docs.bigmodel.cn/',
        consoleUrl: 'https://bigmodel.cn/usercenter/proj-mgmt/apikeys',
        steps: ['登录智谱开放平台。', '进入用户中心的 API Keys 页面。', '创建新的项目 Key。', '复制 Key，粘贴到 LumiOS。'],
        notes: ['不同 GLM 模型可能有不同开通和额度规则。'],
      },
      en: {
        title: 'How to get a GLM API key',
        officialUrl: 'https://docs.bigmodel.cn/',
        consoleUrl: 'https://bigmodel.cn/usercenter/proj-mgmt/apikeys',
        steps: ['Sign in to the Zhipu AI platform.', 'Open API Keys in the user center.', 'Create a new project key.', 'Copy the key and paste it into LumiOS.'],
        notes: ['Different GLM models may have different access and quota rules.'],
      },
    },
  },
  {
    id: 'openai',
    label: 'OpenAI',
    shortLabel: 'OpenAI',
    region: 'international',
    local: false,
    recommended: true,
    optional: false,
    keyLabel: 'OPENAI_API_KEY',
    recommendedModel: '推荐：GPT-4.1 / GPT-4o 系列',
    capabilities: ['国际生态', '工具调用', '通用能力强'],
    modes: ['essential', 'practical', 'full'],
    tutorials: {
      zh: {
        title: '如何获取 OpenAI API Key',
        officialUrl: 'https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key',
        consoleUrl: 'https://platform.openai.com/api-keys',
        steps: ['打开 OpenAI Platform 并登录。', '确认账号已完成计费设置。', '进入 API keys 页面。', '创建新的 secret key，复制后粘贴到 LumiOS。'],
        notes: ['请区分 ChatGPT 订阅和 API 额度，它们通常是分开的。'],
      },
      en: {
        title: 'How to get an OpenAI API key',
        officialUrl: 'https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key',
        consoleUrl: 'https://platform.openai.com/api-keys',
        steps: ['Open OpenAI Platform and sign in.', 'Make sure billing is set up for the API account.', 'Go to the API keys page.', 'Create a new secret key, copy it, and paste it into LumiOS.'],
        notes: ['ChatGPT subscriptions and API credits are usually separate.'],
      },
    },
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    shortLabel: 'Claude',
    region: 'international',
    local: false,
    recommended: true,
    optional: true,
    keyLabel: 'ANTHROPIC_API_KEY',
    recommendedModel: '推荐：Claude Sonnet',
    capabilities: ['长上下文', '代码', '写作'],
    modes: ['practical', 'full'],
    tutorials: {
      zh: {
        title: '如何获取 Anthropic API Key',
        officialUrl: 'https://docs.anthropic.com/en/docs/get-started',
        consoleUrl: 'https://console.anthropic.com/settings/keys',
        steps: ['打开 Anthropic Console 并登录。', '完成组织和计费设置。', '进入 API Keys。', '创建 Key 并复制到 LumiOS。'],
        notes: ['Claude 适合长文档、代码理解和高质量写作。'],
      },
      en: {
        title: 'How to get an Anthropic API key',
        officialUrl: 'https://docs.anthropic.com/en/docs/get-started',
        consoleUrl: 'https://console.anthropic.com/settings/keys',
        steps: ['Open Anthropic Console and sign in.', 'Complete organization and billing setup.', 'Go to API Keys.', 'Create a key and copy it into LumiOS.'],
        notes: ['Claude is strong for long documents, code understanding, and writing.'],
      },
    },
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    shortLabel: 'Gemini',
    region: 'international',
    local: false,
    recommended: false,
    optional: true,
    keyLabel: 'GEMINI_API_KEY',
    recommendedModel: '推荐：Gemini 1.5 / 2.x',
    capabilities: ['多模态', '长上下文', '备用模型'],
    modes: ['practical', 'full'],
    tutorials: {
      zh: {
        title: '如何获取 Gemini API Key',
        officialUrl: 'https://ai.google.dev/gemini-api/docs/api-key',
        consoleUrl: 'https://aistudio.google.com/app/apikey',
        steps: ['打开 Google AI Studio。', '登录可用的 Google 账号。', '进入 Get API key。', '创建 Key 并复制到 LumiOS。'],
        notes: ['部分地区和账号可能需要额外的 Google Cloud 设置。'],
      },
      en: {
        title: 'How to get a Gemini API key',
        officialUrl: 'https://ai.google.dev/gemini-api/docs/api-key',
        consoleUrl: 'https://aistudio.google.com/app/apikey',
        steps: ['Open Google AI Studio.', 'Sign in with an eligible Google account.', 'Open Get API key.', 'Create a key and copy it into LumiOS.'],
        notes: ['Some regions and accounts may require additional Google Cloud setup.'],
      },
    },
  },
  {
    id: 'relay',
    label: 'OpenAI-compatible Relay',
    shortLabel: 'Relay',
    region: 'international',
    local: false,
    recommended: false,
    optional: true,
    keyLabel: 'RELAY_API_KEY',
    recommendedModel: '推荐：你的私有 / 团队网关',
    capabilities: ['私有网关', '团队部署', '统一账单'],
    modes: ['full'],
    tutorials: {
      zh: {
        title: '如何配置 OpenAI-compatible Relay',
        officialUrl: 'https://platform.openai.com/docs/api-reference/introduction',
        steps: ['确认你的中转服务兼容 OpenAI API 格式。', '准备 Base URL，例如 https://your-domain.example.com/v1。', '准备中转服务发放的 API Key。', '在 LumiOS 同时填写 Base URL 和 Key。'],
        notes: ['Relay 适合公司网关、One API、LiteLLM 或自建代理。'],
      },
      en: {
        title: 'How to configure an OpenAI-compatible relay',
        officialUrl: 'https://platform.openai.com/docs/api-reference/introduction',
        steps: ['Confirm your relay is compatible with the OpenAI API format.', 'Prepare the Base URL, such as https://your-domain.example.com/v1.', 'Prepare the API key issued by your relay.', 'Enter both Base URL and key in LumiOS.'],
        notes: ['Relay works well with company gateways, One API, LiteLLM, or self-hosted proxies.'],
      },
    },
  },
  {
    id: 'ollama',
    label: 'Ollama',
    shortLabel: 'Ollama',
    region: 'local',
    local: true,
    recommended: true,
    optional: false,
    keyLabel: 'No API key required',
    recommendedModel: '推荐：qwen2.5 / deepseek-r1 / llama',
    capabilities: ['本地运行', '隐私优先', '免费探索'],
    modes: ['essential', 'practical', 'full'],
    tutorials: localTutorial,
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    shortLabel: 'LM Studio',
    region: 'local',
    local: true,
    recommended: true,
    optional: false,
    keyLabel: 'No API key required',
    recommendedModel: '推荐：OpenAI-compatible local server',
    capabilities: ['本地运行', '图形界面', 'OpenAI 兼容'],
    modes: ['practical', 'full'],
    tutorials: localTutorial,
  },
];

export function providersFor(mode: SetupMode, preference: ModelPreference): SetupProviderCard[] {
  const byMode = SETUP_PROVIDER_CARDS.filter(provider => provider.modes.includes(mode));
  if (mode === 'full') {
    return sortByPreference(byMode, preference);
  }

  if (preference === 'local') {
    return sortByPreference(byMode, 'local');
  }

  if (mode === 'essential') {
    return sortByPreference(byMode.filter(provider => provider.region === preference || provider.region === 'local'), preference);
  }

  const preferred = byMode.filter(provider => provider.region === preference || provider.region === 'local');
  const fallback = byMode.filter(provider => provider.region !== preference && provider.region !== 'local' && provider.recommended);
  return sortByPreference([...preferred, ...fallback], preference);
}

function sortByPreference(providers: SetupProviderCard[], preference: ModelPreference): SetupProviderCard[] {
  const rank = (provider: SetupProviderCard) => {
    if (provider.region === preference) return 0;
    if (provider.region === 'local') return preference === 'local' ? 0 : 1;
    if (provider.recommended) return 2;
    return 3;
  };
  return [...providers].sort((a, b) => rank(a) - rank(b) || Number(a.optional) - Number(b.optional) || a.label.localeCompare(b.label));
}
