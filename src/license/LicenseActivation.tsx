import { AlertTriangle, Check, Clipboard, ExternalLink, KeyRound, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { activateLicense, getLicenseStatus, type LicenseStatus } from './licenseApi';

const GENERATOR_URL = 'https://www.enhe-tech.com.cn/admin/license-generator';

export function LicenseActivation({
  initialStatus,
  initialError,
  onActivated,
}: {
  initialStatus: LicenseStatus | null;
  initialError?: string;
  onActivated: (status: LicenseStatus) => void;
}) {
  const [status, setStatus] = useState<LicenseStatus | null>(initialStatus);
  const [licenseCode, setLicenseCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(initialError || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setError(initialError || '');
  }, [initialError]);

  const refreshStatus = async () => {
    setRefreshing(true);
    setError('');
    try {
      const next = await getLicenseStatus();
      setStatus(next);
      if (!next.requiresActivation) onActivated(next);
    } catch (err: any) {
      setError(err?.message || '无法读取授权状态，请重新打开 Lumi OS 后再试。');
    } finally {
      setRefreshing(false);
    }
  };

  const copyMachineCode = async () => {
    if (!status?.machineCode) return;
    try {
      await navigator.clipboard.writeText(status.machineCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('复制失败，请手动选中机器码后复制。');
    }
  };

  const submit = async () => {
    const trimmed = licenseCode.trim();
    if (!trimmed) {
      setError('请先粘贴授权码。');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await activateLicense(trimmed);
      const next = await getLicenseStatus();
      setStatus(next);
      onActivated(next);
    } catch (err: any) {
      setError(err?.message || '授权失败，请确认授权码完整且属于当前电脑。');
    } finally {
      setBusy(false);
    }
  };

  const machineCode = status?.machineCode || '正在读取机器码...';

  return (
    <div className="relative h-full w-full overflow-y-auto bg-[radial-gradient(circle_at_18%_12%,rgba(255,204,0,0.14),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(0,255,255,0.12),transparent_30%),#05050a] p-4 md:p-8 custom-scrollbar">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center gap-7">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-celestial-saturn/25 bg-celestial-saturn/10 px-4 py-2 text-xs font-black text-celestial-saturn">
            <ShieldCheck size={15} />
            Lumi OS 授权激活
          </div>
          <h1 className="text-3xl font-black text-white md:text-5xl">先激活，再开始配置</h1>
          <p className="max-w-3xl text-sm leading-7 text-white/60">
            当前版本启用一机一授权。复制下面的机器码，在后台授权码生成器里生成授权码，然后粘贴到这里即可进入后续 API 配置向导。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ['1', '复制机器码', '机器码只用于绑定当前电脑。'],
            ['2', '生成授权码', '在后台授权码生成器里粘贴机器码。'],
            ['3', '粘贴并激活', '激活成功后自动进入配置向导。'],
          ].map(item => (
            <div key={item[0]} className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-black text-black">{item[0]}</span>
                <span className="text-sm font-black text-white">{item[1]}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-white/50">{item[2]}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/45 p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Machine Code</div>
              <div className="mt-2 break-all font-mono text-lg font-black text-white md:text-2xl">{machineCode}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyMachineCode}
                disabled={!status?.machineCode}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? <Check size={16} className="text-green-300" /> : <Clipboard size={16} />}
                {copied ? '已复制' : '复制机器码'}
              </button>
              <a
                href={GENERATOR_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-celestial-saturn px-4 py-3 text-sm font-black text-black transition hover:bg-celestial-saturn/90"
              >
                <ExternalLink size={16} />
                打开生成器
              </a>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <label className="text-sm font-black text-white" htmlFor="lumi-license-code">授权码</label>
            <textarea
              id="lumi-license-code"
              value={licenseCode}
              onChange={event => setLicenseCode(event.target.value)}
              placeholder="粘贴以 LUMI1- 开头的授权码"
              spellCheck={false}
              className="min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-celestial-saturn/60 focus:bg-white/10"
            />
            {error && (
              <div className="flex gap-3 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={refreshStatus}
              disabled={refreshing || busy}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              重新读取
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || refreshing}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {busy ? '正在激活...' : '激活并继续'}
            </button>
          </div>
        </div>

        <p className="max-w-4xl text-xs leading-6 text-white/40">
          提示：授权码只绑定当前机器码。重装 Lumi OS 通常不会改变机器码；更换电脑或系统底层硬件标识变化后，需要重新生成授权码。
        </p>
      </div>
    </div>
  );
}
