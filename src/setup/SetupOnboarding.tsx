import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DiagnosticsStep } from './DiagnosticsStep';
import { ProviderCard } from './ProviderCard';
import { SetupModeStep } from './SetupModeStep';
import { providersFor, type ModelPreference, type SetupMode } from './providerCatalog';
import type { SetupState } from './setupApi';
import { updateSetupPreferences } from './setupApi';
import { configuredProviderIdsForStatus, isSetupProviderConfigured } from './setupSelection';

type Step = 'mode' | 'providers' | 'diagnostics';
type SetupOnboardingVariant = 'first-run' | 'settings';

const modeLabels: Record<SetupMode, string> = {
  essential: '精简必需版',
  practical: '实用完整版',
  full: '全量配置',
};

const settingsModeOptions: Array<{ id: SetupMode; title: string; desc: string }> = [
  { id: 'essential', title: '精简必需版', desc: '只显示主力模型和本地模型入口，适合最快启动。' },
  { id: 'practical', title: '实用完整版', desc: '增加备用模型和常用能力入口，适合日常稳定使用。' },
  { id: 'full', title: '全量配置', desc: '显示中国、国际、本地和中转配置，适合高级用户。' },
];

export function SetupOnboarding({
  initialProviders,
  initialState,
  variant = 'first-run',
  onFinish,
}: {
  initialProviders?: Record<string, boolean>;
  initialState?: SetupState;
  variant?: SetupOnboardingVariant;
  onFinish: () => void;
}) {
  const isSettings = variant === 'settings';
  const [step, setStep] = useState<Step>(isSettings ? 'providers' : 'mode');
  const [mode, setMode] = useState<SetupMode>(initialState?.mode || 'practical');
  const [modelPreference, setModelPreference] = useState<ModelPreference>(initialState?.modelPreference || 'china');
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>(initialProviders || {});
  const [configuredProviderIds, setConfiguredProviderIds] = useState<string[]>(initialState?.configuredProviders || []);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');

  const providers = useMemo(() => providersFor(mode, modelPreference), [mode, modelPreference]);
  const allConfiguredProviderIds = useMemo(
    () => configuredProviderIdsForStatus(providerStatus, configuredProviderIds),
    [providerStatus, configuredProviderIds],
  );
  const configuredVisibleProviders = providers.filter(provider =>
    isSetupProviderConfigured(provider.id, providerStatus, configuredProviderIds),
  );
  const hasCloudProvider = providers.some(provider =>
    !provider.local && isSetupProviderConfigured(provider.id, providerStatus, configuredProviderIds),
  );

  const markConfigured = (providerId: string, providersFromServer?: Record<string, boolean>) => {
    if (providersFromServer) setProviderStatus(providersFromServer);
    setConfiguredProviderIds(current => current.includes(providerId) ? current : [...current, providerId]);
  };

  const saveSettingsPreferences = async () => {
    setSavingPreferences(true);
    setSettingsMessage('');
    setSettingsError('');
    try {
      await updateSetupPreferences({
        mode,
        modelPreference,
        configuredProviders: allConfiguredProviderIds,
        skippedOptionalProviders: [],
      });
      setSettingsMessage('已保存。你可以继续配置更多 Key，或直接回到 Lumi OS 使用。');
      onFinish();
    } catch (error: any) {
      setSettingsError(error?.message || '保存配置模式失败，请稍后重试。');
    } finally {
      setSavingPreferences(false);
    }
  };

  const stepFlow: Step[] = isSettings ? ['providers', 'diagnostics'] : ['mode', 'providers', 'diagnostics'];

  const header = (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {stepFlow.map((item, index) => {
          const active = step === item;
          const done = stepFlow.indexOf(step) > index;
          const label = item === 'mode' ? '选择模式' : item === 'providers' ? '配置 API' : '启动体检';
          return (
            <div key={item} className="flex items-center gap-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black ${
                active ? 'border-celestial-saturn bg-celestial-saturn text-black' : done ? 'border-green-400 bg-green-400/15 text-green-200' : 'border-white/10 bg-white/5 text-white/45'
              }`}>
                {done ? <CheckCircle2 size={15} /> : index + 1}
              </span>
              <span className={active ? 'text-sm font-black text-white' : 'text-sm font-bold text-white/45'}>{label}</span>
              {index < stepFlow.length - 1 && <span className="hidden h-px w-8 bg-white/10 sm:block" />}
            </div>
          );
        })}
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/55">
        <Settings2 size={14} />
        当前：{modeLabels[mode]}
      </div>
    </div>
  );

  const providerStep = (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">
            {isSettings ? '配置模式 / API Key 管理' : '配置模型和 API Key'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            {isSettings
              ? '可以随时从精简必需版切换到实用完整版或全量配置。已保存的 Key 会保留，切回精简版只会隐藏高级配置，不会删除。'
              : '先保存一个可用的大模型 API Key。每个输入框右侧都有中英文获取教程，适合照着一步一步操作。'}
          </p>
        </div>
        {!isSettings && (
          <button
            type="button"
            onClick={() => setStep('mode')}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
          >
            <ArrowLeft size={16} />
            重新选择模式
          </button>
        )}
      </div>

      {isSettings && (
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-black/35 p-4 md:grid-cols-3">
          {settingsModeOptions.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={`rounded-xl border p-4 text-left transition ${
                mode === option.id ? 'border-celestial-saturn/60 bg-celestial-saturn/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="text-sm font-black text-white">{option.title}</div>
              <p className="mt-2 text-xs leading-5 text-white/50">{option.desc}</p>
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
        <div className="text-sm font-black text-white">
          当前模式已配置：{configuredVisibleProviders.length > 0 ? configuredVisibleProviders.map(provider => provider.shortLabel).join('、') : '暂无'}
        </div>
        <p className="mt-1 text-xs leading-5 text-white/45">
          {isSettings
            ? `全部已保存配置：${allConfiguredProviderIds.length > 0 ? allConfiguredProviderIds.join(', ') : '暂无'}。切换模式只影响这里展示哪些配置项。`
            : '实用建议：至少配置一个云模型。中国用户优先 DeepSeek / 通义千问，国际用户优先 OpenAI / Claude，本地模型可以作为隐私优先补充。'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {providers.map(provider => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            configured={isSetupProviderConfigured(provider.id, providerStatus, configuredProviderIds)}
            onConfigured={markConfigured}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-3xl text-xs leading-5 text-white/45">
          API Key 会保存到本机 Lumi OS 数据目录，不写入浏览器 localStorage。
          {settingsMessage && <span className="ml-2 text-celestial-saturn">{settingsMessage}</span>}
          {settingsError && <span className="ml-2 text-red-300">{settingsError}</span>}
        </div>
        {isSettings ? (
          <button
            type="button"
            onClick={saveSettingsPreferences}
            disabled={savingPreferences}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {savingPreferences ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {savingPreferences ? '保存中...' : '保存配置模式'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep('diagnostics')}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-white/90 active:translate-y-px"
          >
            {hasCloudProvider ? '继续体检' : '我已准备好，去体检'}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={`${isSettings ? 'relative h-full w-full overflow-y-auto bg-transparent p-0 custom-scrollbar' : 'relative h-full w-full overflow-y-auto bg-[radial-gradient(circle_at_20%_20%,rgba(255,204,0,0.12),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(0,255,255,0.10),transparent_30%),#05050a] p-4 md:p-8 custom-scrollbar'}`}>
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

        {step === 'providers' && providerStep}

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
