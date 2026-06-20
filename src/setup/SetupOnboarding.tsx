import { ArrowLeft, ArrowRight, CheckCircle2, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DiagnosticsStep } from './DiagnosticsStep';
import { ProviderCard } from './ProviderCard';
import { SetupModeStep } from './SetupModeStep';
import { providersFor, type ModelPreference, type SetupMode } from './providerCatalog';

type Step = 'mode' | 'providers' | 'diagnostics';

function providerConfigured(providerId: string, providers: Record<string, boolean>, configuredProviderIds: string[]) {
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

export function SetupOnboarding({
  initialProviders,
  onFinish,
}: {
  initialProviders?: Record<string, boolean>;
  onFinish: () => void;
}) {
  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<SetupMode>('practical');
  const [modelPreference, setModelPreference] = useState<ModelPreference>('china');
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>(initialProviders || {});
  const [configuredProviderIds, setConfiguredProviderIds] = useState<string[]>([]);

  const providers = useMemo(() => providersFor(mode, modelPreference), [mode, modelPreference]);
  const configuredVisibleProviders = providers.filter(provider => providerConfigured(provider.id, providerStatus, configuredProviderIds));
  const hasCloudProvider = providers.some(provider => !provider.local && providerConfigured(provider.id, providerStatus, configuredProviderIds));

  const markConfigured = (providerId: string, providersFromServer?: Record<string, boolean>) => {
    if (providersFromServer) setProviderStatus(providersFromServer);
    setConfiguredProviderIds(current => current.includes(providerId) ? current : [...current, providerId]);
  };

  const header = (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {(['mode', 'providers', 'diagnostics'] as Step[]).map((item, index) => {
          const active = step === item;
          const done = ['mode', 'providers', 'diagnostics'].indexOf(step) > index;
          const label = item === 'mode' ? '选择模式' : item === 'providers' ? '配置 API' : '启动体检';
          return (
            <div key={item} className="flex items-center gap-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black ${
                active ? 'border-celestial-saturn bg-celestial-saturn text-black' : done ? 'border-green-400 bg-green-400/15 text-green-200' : 'border-white/10 bg-white/5 text-white/45'
              }`}>
                {done ? <CheckCircle2 size={15} /> : index + 1}
              </span>
              <span className={active ? 'text-sm font-black text-white' : 'text-sm font-bold text-white/45'}>{label}</span>
              {index < 2 && <span className="hidden h-px w-8 bg-white/10 sm:block" />}
            </div>
          );
        })}
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/55">
        <Settings2 size={14} />
        当前：{mode === 'essential' ? '精简必需版' : mode === 'practical' ? '实用完整版' : '全量配置'}
      </div>
    </div>
  );

  return (
    <div className="relative h-full w-full overflow-y-auto bg-[radial-gradient(circle_at_20%_20%,rgba(255,204,0,0.12),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(0,255,255,0.10),transparent_30%),#05050a] p-4 md:p-8 custom-scrollbar">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col justify-center">
        {step !== 'mode' && header}

        {step === 'mode' && (
          <SetupModeStep
            mode={mode}
            preference={modelPreference}
            onModeChange={setMode}
            onPreferenceChange={setModelPreference}
            onNext={() => setStep('providers')}
          />
        )}

        {step === 'providers' && (
          <div className="w-full space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white">配置模型和 API Key</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                  先保存一个你能使用的云模型 API Key。每个输入框右侧都有中英文教程，适合照着一步一步操作。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep('mode')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                <ArrowLeft size={16} />
                重新选择模式
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <div className="text-sm font-black text-white">
                已配置：{configuredVisibleProviders.length > 0 ? configuredVisibleProviders.map(provider => provider.shortLabel).join('、') : '暂无'}
              </div>
              <p className="mt-1 text-xs leading-5 text-white/45">
                实用建议：至少配置一个云模型。中国用户优先 DeepSeek / 通义千问，国际用户优先 OpenAI / Claude，本地模型可作为隐私优先补充。
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {providers.map(provider => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  configured={providerConfigured(provider.id, providerStatus, configuredProviderIds)}
                  onConfigured={markConfigured}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs leading-5 text-white/45">
                API Key 会保存到本机 LumiOS 数据目录，不写入浏览器 localStorage。
              </div>
              <button
                type="button"
                onClick={() => setStep('diagnostics')}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-white/90 active:translate-y-px"
              >
                {hasCloudProvider ? '继续体检' : '我已准备好，去体检'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 'diagnostics' && (
          <DiagnosticsStep
            mode={mode}
            modelPreference={modelPreference}
            configuredProviders={configuredVisibleProviders.map(provider => provider.id)}
            onBack={() => setStep('providers')}
            onComplete={onFinish}
          />
        )}
      </div>
    </div>
  );
}
