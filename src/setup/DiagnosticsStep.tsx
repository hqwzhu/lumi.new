import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Play, RotateCw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ModelPreference, SetupMode } from './providerCatalog';
import { completeSetup, getSetupDiagnostics, type SetupDiagnostics } from './setupApi';

function StatusIcon({ status }: { status: 'ok' | 'warning' | 'error' }) {
  if (status === 'ok') return <CheckCircle2 size={19} className="text-green-400" />;
  if (status === 'warning') return <AlertTriangle size={19} className="text-amber-300" />;
  return <XCircle size={19} className="text-red-400" />;
}

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

  const runDiagnostics = async () => {
    setBusy(true);
    setError('');
    try {
      setDiagnostics(await getSetupDiagnostics());
    } catch (err: any) {
      setError(err?.message || '体检失败，请稍后重试。');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      await completeSetup({
        mode,
        modelPreference,
        configuredProviders,
        skippedOptionalProviders: [],
      });
      onComplete();
    } catch (err: any) {
      setError(err?.message || '还不能进入 LumiOS，请先配置至少一个可用的大模型来源。');
    } finally {
      setBusy(false);
    }
  };

  const canLaunch = diagnostics?.hasModelSource === true;

  return (
    <div className="w-full max-w-4xl space-y-7">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-black text-white">启动前体检</h1>
        <p className="mx-auto max-w-2xl text-sm leading-6 text-white/55">
          LumiOS 会检查本地数据目录、后端资源和模型来源。没有红色错误，并且至少有一个模型来源后即可进入程序。
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
        {busy && !diagnostics ? (
          <div className="flex min-h-44 items-center justify-center gap-3 text-white/60">
            <Loader2 size={22} className="animate-spin" />
            正在检查安装状态...
          </div>
        ) : (
          <div className="space-y-3">
            {diagnostics?.items.map(item => (
              <div key={item.id} className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <StatusIcon status={item.status} />
                <div>
                  <div className="text-sm font-black text-white">{item.label}</div>
                  <div className="mt-1 text-sm leading-6 text-white/55">{item.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {diagnostics && !canLaunch && (
          <div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50/80">
            还没有检测到模型来源。请返回上一步保存一个云模型 API Key，或确认本地 Ollama / LM Studio 已运行。
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            {error}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
        >
          <ArrowLeft size={16} />
          返回配置
        </button>
        <button
          type="button"
          onClick={runDiagnostics}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:opacity-40"
        >
          <RotateCw size={16} className={busy ? 'animate-spin' : ''} />
          重新体检
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={busy || !canLaunch}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play size={16} />
          正式进入 LumiOS
        </button>
      </div>
    </div>
  );
}
