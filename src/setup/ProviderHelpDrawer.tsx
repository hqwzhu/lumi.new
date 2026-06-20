import { ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import type { SetupProviderCard, TutorialLanguage } from './providerCatalog';

export function ProviderHelpDrawer({
  provider,
  onClose,
}: {
  provider: SetupProviderCard;
  onClose: () => void;
}) {
  const [language, setLanguage] = useState<TutorialLanguage>('zh');
  const tutorial = provider.tutorials[language];

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/75 backdrop-blur-sm">
      <button type="button" aria-label="关闭教程" className="absolute inset-0 cursor-default" onClick={onClose} />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-neutral-950 p-6 shadow-2xl custom-scrollbar">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-celestial-saturn">{provider.label}</div>
            <h2 className="mt-2 text-2xl font-black text-white">{tutorial.title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/50">按照步骤打开官方页面，复制 API Key 后回到 LumiOS 粘贴保存。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 inline-flex rounded-xl border border-white/10 bg-black/40 p-1">
          <button
            type="button"
            onClick={() => setLanguage('zh')}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${language === 'zh' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
          >
            中文
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${language === 'en' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
          >
            English
          </button>
        </div>

        <ol className="mt-7 space-y-4">
          {tutorial.steps.map((step, index) => (
            <li key={`${step}-${index}`} className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-celestial-saturn text-sm font-black text-black">
                {index + 1}
              </span>
              <span className="text-sm leading-6 text-white/70">{step}</span>
            </li>
          ))}
        </ol>

        {tutorial.notes.length > 0 && (
          <div className="mt-6 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4">
            <div className="text-sm font-black text-cyan-100">{language === 'zh' ? '提示' : 'Notes'}</div>
            <ul className="mt-2 space-y-2">
              {tutorial.notes.map(note => (
                <li key={note} className="text-sm leading-6 text-cyan-50/65">{note}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={tutorial.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-white/90"
          >
            官方教程
            <ExternalLink size={15} />
          </a>
          {tutorial.consoleUrl && (
            <a
              href={tutorial.consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
            >
              打开控制台
              <ExternalLink size={15} />
            </a>
          )}
        </div>
      </aside>
    </div>
  );
}
