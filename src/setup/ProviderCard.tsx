import { CheckCircle2, HelpCircle, KeyRound, Loader2, PlugZap, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
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
  onConfigured: (providerId: string, providers?: Record<string, boolean>) => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'neutral' | 'ok' | 'error'>('neutral');
  const [helpOpen, setHelpOpen] = useState(false);

  const save = async () => {
    if (provider.local || !apiKey.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await saveSetupKey({
        providerId: provider.id,
        apiKey: apiKey.trim(),
        baseUrl: provider.id === 'relay' ? baseUrl.trim() : undefined,
      });
      setApiKey('');
      onConfigured(provider.id, result.providers);
      setMessage('已保存。LumiOS 只记录配置状态，不在界面回显完整 Key。');
      setMessageTone('ok');
    } catch (error: any) {
      setMessage(error?.message || '保存失败，请检查 Key 后重试。');
      setMessageTone('error');
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await testSetupProvider(provider.id, apiKey.trim() || undefined);
      setMessage(result.message || '连接测试完成。');
      setMessageTone(result.ok ? 'ok' : 'neutral');
    } catch (error: any) {
      setMessage(error?.message || '连接测试失败，请确认 API Key 或本地模型服务。');
      setMessageTone('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-5 transition ${
      configured ? 'border-green-400/40 bg-green-400/10' : 'border-white/10 bg-black/35'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-white">{provider.label}</h3>
            {provider.recommended && <span className="rounded-full bg-celestial-saturn/15 px-2 py-1 text-[11px] font-bold text-celestial-saturn">推荐</span>}
            {configured && <CheckCircle2 size={17} className="text-green-400" />}
          </div>
          <p className="mt-1 text-xs leading-5 text-white/50">{provider.recommendedModel}</p>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-white/10"
        >
          <HelpCircle size={14} />
          如何获取 / How to get
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {provider.capabilities.map(capability => (
          <span key={capability} className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/60">{capability}</span>
        ))}
      </div>

      {provider.local ? (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <ShieldCheck size={17} className="text-green-300" />
            本地模型不需要 API Key
          </div>
          <p className="mt-2 text-sm leading-6 text-white/55">安装并启动 {provider.label} 后，在最后一步重新体检即可识别。MVP 会先检测配置可用性，后续版本再补自动拉取模型。</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {provider.id === 'relay' && (
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-white/60">Base URL</span>
              <input
                value={baseUrl}
                onChange={event => setBaseUrl(event.target.value)}
                placeholder="https://your-relay.example.com/v1"
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/60"
              />
            </label>
          )}
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-white/60">{provider.keyLabel}</span>
            <input
              value={apiKey}
              onChange={event => setApiKey(event.target.value)}
              type="password"
              placeholder={configured ? '已保存。输入新的 Key 可替换' : '粘贴 API Key'}
              className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-white/30 focus:border-celestial-saturn/60"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!provider.local && (
          <button
            type="button"
            onClick={save}
            disabled={busy || !apiKey.trim() || (provider.id === 'relay' && !baseUrl.trim())}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
            保存
          </button>
        )}
        <button
          type="button"
          onClick={test}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />}
          测试连接
        </button>
      </div>

      {message && (
        <p className={`mt-4 rounded-xl border px-3 py-2 text-xs leading-5 ${
          messageTone === 'ok'
            ? 'border-green-400/20 bg-green-400/10 text-green-100'
            : messageTone === 'error'
              ? 'border-red-400/20 bg-red-400/10 text-red-100'
              : 'border-white/10 bg-white/5 text-white/55'
        }`}>
          {message}
        </p>
      )}

      {helpOpen && <ProviderHelpDrawer provider={provider} onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
