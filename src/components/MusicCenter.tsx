import { useState, useEffect, useRef } from 'react';

export function MusicCenter({ isOpen }: { isOpen: boolean; onClose: () => void }) {
  const [qrImgSrc, setQrImgSrc] = useState<string | null>(null);
  const [loginDone, setLoginDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/ncm/login/status').then(r => r.json()).then(s => {
      if (s.done) setLoginDone(true);
    }).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startLogin = async () => {
    setLoading(true);
    setQrImgSrc(null);
    try {
      const res = await fetch('/api/ncm/login', { method: 'POST' });
      const data = await res.json();
      if (!data.qrUrl) throw new Error('No QR URL');

      setQrImgSrc(`https://quickchart.io/qr?text=${encodeURIComponent(data.qrUrl)}&size=220`);

      const interval = setInterval(async () => {
        try {
          const sr = await fetch('/api/ncm/login/status');
          const ss = await sr.json();
          if (ss.done) {
            setLoginDone(true);
            setQrImgSrc(null);
            clearInterval(interval);
          }
        } catch {}
      }, 2000);
      pollRef.current = interval;
    } catch (e: any) {
      alert('Failed: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="w-full rounded-2xl bg-white/[0.02] border border-white/5 p-5 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">NetEase Cloud</span>
          {loginDone && (
            <span className="text-[9px] text-emerald-400 font-mono bg-emerald-400/10 px-2 py-0.5 rounded-full">CONNECTED</span>
          )}
        </div>

        <p className="text-[11px] text-white/35 text-center leading-relaxed">
          登录网易云账号后可播放 VIP 歌曲。只需扫码一次。
        </p>

        {qrImgSrc && (
          <img src={qrImgSrc} alt="QR Code" className="w-44 h-44 rounded-xl bg-white" />
        )}

        <button
          onClick={startLogin}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-all disabled:opacity-30"
        >
          {loading ? '获取中...' : loginDone ? '已连接' : '扫码登录网易云'}
        </button>
      </div>

      <div className="w-full rounded-2xl bg-white/[0.01] border border-white/[0.03] p-4 text-center">
        <p className="text-[10px] text-white/15 tracking-wider">更多平台即将接入</p>
      </div>
    </div>
  );
}
