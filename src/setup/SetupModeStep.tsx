import { ArrowRight, CheckCircle2, Gauge, Globe2, HardDrive, Sparkles } from 'lucide-react';
import { MODEL_PREFERENCE_OPTIONS, SETUP_MODE_OPTIONS, type ModelPreference, type SetupMode } from './providerCatalog';

const preferenceIcons: Record<ModelPreference, typeof Globe2> = {
  china: Sparkles,
  international: Globe2,
  local: HardDrive,
};

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
  return (
    <div className="w-full max-w-6xl space-y-7">
      <div className="text-center space-y-3">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-celestial-saturn/20 bg-celestial-saturn/10 px-4 py-2 text-xs font-bold text-celestial-saturn">
          <Gauge size={14} />
          Windows 安装器首次启动
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white">选择一个适合你的配置方式</h1>
        <p className="mx-auto max-w-2xl text-sm md:text-base text-white/55">
          先选复杂度，再选模型偏好。LumiOS 会只展示你当前需要的配置项，后续也可以在设置里补充。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {SETUP_MODE_OPTIONS.map(option => {
          const active = option.id === mode;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onModeChange(option.id)}
              className={`text-left rounded-2xl border p-5 transition-all ${
                active
                  ? 'border-celestial-saturn/60 bg-celestial-saturn/10 shadow-[0_0_32px_rgba(255,204,0,0.12)]'
                  : 'border-white/10 bg-black/35 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-celestial-saturn">{option.subtitle}</div>
                  <h2 className="mt-1 text-xl font-black text-white">{option.title}</h2>
                </div>
                <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">{option.badge}</span>
              </div>
              <p className="mt-4 min-h-12 text-sm leading-6 text-white/60">{option.description}</p>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="text-xs font-bold text-white/80">适合谁</div>
                <p className="mt-1 text-xs leading-5 text-white/50">{option.bestFor}</p>
              </div>
              <div className="mt-4 space-y-2">
                {option.includes.map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-white/55">
                    <CheckCircle2 size={14} className="text-green-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
        <div className="mb-3 text-sm font-black text-white">大模型推荐方向</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MODEL_PREFERENCE_OPTIONS.map(option => {
            const Icon = preferenceIcons[option.id];
            const active = option.id === preference;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onPreferenceChange(option.id)}
                className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                  active ? 'border-cyan-300/50 bg-cyan-400/10' : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <Icon size={20} className={active ? 'text-cyan-300' : 'text-white/45'} />
                <span>
                  <span className="block text-sm font-black text-white">{option.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-white/50">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-white/90 active:translate-y-px"
        >
          下一步，配置 API Key
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
