// Desktop entry — fullscreen transparent Tauri WebView2 OS shell
import { useState, useEffect } from 'react';
import { ProactiveNotifications } from '../components/ProactiveNotifications';
import { LoginModal } from '../core/components/Auth';
import { Toaster } from 'sonner';
import { motion } from 'motion/react';
import { AlertTriangle, RefreshCw, Rocket } from 'lucide-react';
import { installApiBridge } from '../services/apiBridge';
import '@fontsource-variable/geist';
import '../index.css';
import { DesktopUI } from '../components/DesktopUI';
import { LumiEcosystem } from '../components/LumiEcosystem';
import { SkillHall } from '../components/SkillHall';
import { AgentChatPage } from '../components/AgentChatPage';
import { LoginRequired } from '../core/components/Auth';
import { Settings } from '../components/Settings';
import { Profile } from '../components/Profile';
import { Docs } from '../components/Docs';
import { FoundersSanctuary } from '../components/FoundersSanctuary';
import { OrgPortal } from '../components/OrgPortal';
import { useAppShell } from './useAppShell';
import { SetupOnboarding } from '../setup/SetupOnboarding';
import { getSetupStatus, type SetupStatus } from '../setup/setupApi';
import { LicenseActivation } from '../license/LicenseActivation';
import { getLicenseStatus, type LicenseStatus } from '../license/licenseApi';
import { getDesktopStartupView } from './desktopStartup';

installApiBridge();

export function DesktopApp() {
  const shell = useAppShell();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [setupLoading, setSetupLoading] = useState(true);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(true);
  const [licenseError, setLicenseError] = useState('');
  const [setupError, setSetupError] = useState('');

  useEffect(() => { document.body.classList.add('overflow-hidden'); return () => document.body.classList.remove('overflow-hidden'); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [activeTab]);

  useEffect(() => {
    let cancelled = false;
    getLicenseStatus()
      .then(status => {
        if (!cancelled) {
          setLicenseStatus(status);
          setLicenseError('');
        }
      })
      .catch(error => {
        if (!cancelled) {
          setLicenseError(error?.message || '无法读取授权状态。');
          setLicenseStatus(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLicenseLoading(false);
      });
    getSetupStatus()
      .then(status => {
        if (!cancelled) {
          setSetupStatus(status);
          setSetupError('');
        }
      })
      .catch(error => {
        if (!cancelled) {
          setSetupError(error?.message || '无法读取 Lumi OS 初始化配置。');
          setSetupStatus(null);
        }
      })
      .finally(() => {
        if (!cancelled) setSetupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startupView = getDesktopStartupView({
    shellLoading: shell.loading,
    licenseLoading,
    setupLoading,
    licenseStatus,
    setupStatus,
    licenseError,
    setupError,
  });

  if (startupView === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent">
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="flex flex-col items-center gap-4">
          <Rocket size={48} className="text-celestial-saturn" />
          <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-celestial-mars to-celestial-saturn">Lumi OS Booting...</div>
        </motion.div>
      </div>
    );
  }

  if (startupView === 'connection-error') {
    const message = licenseError || setupError || '无法连接 Lumi OS 本地服务，请关闭后重新打开 Lumi OS。';
    return (
      <div className="flex h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_15%,rgba(255,204,0,0.12),transparent_28%),#05050a] p-6 text-white">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-black/45 p-6 shadow-2xl shadow-black/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 shrink-0 text-celestial-saturn" size={22} />
            <div className="space-y-3">
              <h1 className="text-xl font-black">Lumi OS 本地服务未就绪</h1>
              <p className="text-sm leading-6 text-white/60">{message}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-black transition hover:bg-white/90"
              >
                <RefreshCw size={16} />
                重新检测
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = (tab: string) => {
    switch (tab) {
      case 'home': return null;
      case 'ecosystem': return <div className="space-y-24"><LumiEcosystem t={shell.t} onChatAgent={(a: any) => { setSelectedAgent(a); setActiveTab('agent-chat'); }} /><SkillHall t={shell.t} lang={shell.lang} /></div>;
      case 'generate': return !shell.user ? <LoginRequired t={shell.t} onLogin={shell.handleLogin} /> : <SkillHall t={shell.t} lang={shell.lang} initialTab="generate" />;
      case 'agent-chat': return !shell.user ? <LoginRequired t={shell.t} onLogin={shell.handleLogin} /> : <AgentChatPage t={shell.t} user={shell.user} agent={selectedAgent} isOpen={true} onClose={() => setActiveTab('ecosystem')} />;
      case 'docs': return <Docs t={shell.t} />;
      case 'founders': return <FoundersSanctuary t={shell.t} user={shell.user} onBack={() => setActiveTab('home')} />;
      case 'profile': return !shell.user ? <LoginRequired t={shell.t} onLogin={shell.handleLogin} /> : <Profile t={shell.t} />;
      case 'org': return !shell.user ? <LoginRequired t={shell.t} onLogin={shell.handleLogin} /> : <OrgPortal />;
      case 'settings': return !shell.user ? <LoginRequired t={shell.t} onLogin={shell.handleLogin} /> : <Settings t={shell.t} lang={shell.lang} setLang={shell.setLang} />;
      case 'voice': case 'memory': case 'mcp': case 'personality': case 'sync':
        return !shell.user ? <LoginRequired t={shell.t} onLogin={shell.handleLogin} /> : <Settings t={shell.t} lang={shell.lang} setLang={shell.setLang} activeSection={tab} />;
      default: return null;
    }
  };

  return (
    <div className="h-screen w-full bg-transparent overflow-hidden">
      <ProactiveNotifications />
      <Toaster position="top-right" theme="dark" />
      {startupView === 'activation' ? (
        <LicenseActivation
          initialStatus={licenseStatus}
          initialError={licenseError}
          onActivated={(status) => {
            setLicenseStatus(status);
            setLicenseError('');
          }}
        />
      ) : startupView === 'setup' ? (
        <SetupOnboarding
          initialProviders={setupStatus?.providers}
          onFinish={() => setSetupStatus(current => current ? {
            ...current,
            requiresSetup: false,
            state: { ...current.state, completed: true },
          } : current)}
        />
      ) : (
        <>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="h-full w-full">
            <DesktopUI t={shell.t} user={shell.user} lang={shell.lang} setLang={shell.setLang} activeTab={activeTab} setActiveTab={setActiveTab}
              onLogin={shell.handleLogin} renderTabContent={renderTabContent} />
          </motion.div>
          <LoginModal t={shell.t} isOpen={shell.isLoginModalOpen} onClose={() => shell.setIsLoginModalOpen(false)} onLoginSuccess={() => shell.refreshUser()} onGoogleLogin={shell.handleLogin} />
        </>
      )}
    </div>
  );
}
