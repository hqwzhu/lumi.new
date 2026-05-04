import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Bell,
  Globe,
  Cpu,
  Lock,
  Eye,
  Database,
  Radio,
  Key,
  BrainCircuit,
  ChevronDown,
  Rocket,
  Music,
  Disc,
  Headphones,
  MessagesSquare,
  Sparkle,
  Zap,
  Camera,
  Mic,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';

import { usePlatform } from '@/hooks/usePlatform';
import { DeviceSyncCenter } from './DeviceSyncCenter';
import { useApp } from '@/contexts/AppContext';
import { VoiceForge } from './VoiceForge';
import { MCPSettings } from './MCPSettings';
import { MemoryExplorer } from './MemoryExplorer';
import { PersonalityEditor } from './PersonalityEditor';
import { PersonalityMarketplace } from './PersonalityMarketplace';

export function Settings({ 
  t, 
  lang,
  setLang,
  theme,
  setTheme,
  activeSection = 'general', 
  onSectionChange 
}: { 
  t: any; 
  lang: 'en' | 'zh';
  setLang: (l: 'en' | 'zh') => void;
  theme?: string;
  setTheme?: (theme: string) => void;
  activeSection?: string; 
  onSectionChange?: (section: string) => void;
}) {
  const { platform, isElectron, isWeb } = usePlatform();
  const { aiConfig, updateAIConfig, personalityId, setPersonalityId } = useApp();
  const [showApiKey, setShowApiKey] = useState(false);
  const [personalities, setPersonalities] = useState<any[]>([]);
  const [providerStatus, setProviderStatus] = useState<Record<string, { available: boolean; model: string }>>({});
  const [observerMode, setObserverModeState] = useState(() => {
    return localStorage.getItem('lumi_observer_mode') === 'true';
  });

  useEffect(() => {
    fetch('/api/personalities')
      .then(r => r.json())
      .then(setPersonalities)
      .catch(() => {});
    fetch('/api/llm/providers')
      .then(r => r.json())
      .then(d => setProviderStatus(d.providers || {}))
      .catch(() => {});
  }, []);

  const handleSectionChange = (section: string) => {
    if (onSectionChange) onSectionChange(section);
  };

  const setObserverMode = (on: boolean) => {
    setObserverModeState(on);
    localStorage.setItem('lumi_observer_mode', String(on));
    if (on) {
      setPersonalityId('observer');
      toast.info('Observer mode activated — Lumi will watch quietly and learn from patterns.');
    } else {
      setPersonalityId('lumi');
      toast.info('Observer mode deactivated — Lumi is back to full interaction.');
    }
  };

  return (
    <div className="flex h-full bg-black/40 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
      {/* Sidebar */}
      <div className="w-64 bg-white/5 border-r border-white/5 p-8 flex flex-col gap-2">
        <h2 className="text-xl font-black uppercase tracking-tighter text-white mb-6">Settings</h2>
        <SidebarItem active={activeSection === 'general'} onClick={() => handleSectionChange('general')} icon={<Globe size={18} />} label={t.general || "General"} />
        <SidebarItem active={activeSection === 'personalization'} onClick={() => handleSectionChange('personalization')} icon={<Sparkle size={18} />} label={t.personalization || "Personalization"} />
        <SidebarItem active={activeSection === 'neural'} onClick={() => handleSectionChange('neural')} icon={<BrainCircuit size={18} />} label={t.neuralEngine || "Neural Engine"} />
        <SidebarItem active={activeSection === 'voice'} onClick={() => handleSectionChange('voice')} icon={<Mic size={18} />} label={t.voiceForge || "Voice Forge"} />
        <SidebarItem active={activeSection === 'api'} onClick={() => handleSectionChange('api')} icon={<Key size={18} />} label="Neural API Matrix" />
        <SidebarItem active={activeSection === 'music'} onClick={() => handleSectionChange('music')} icon={<Music size={18} />} label="Media Services" />
        <SidebarItem active={activeSection === 'sync'} onClick={() => handleSectionChange('sync')} icon={<Radio size={18} />} label="Sync Hub" />
        <SidebarItem active={activeSection === 'security'} onClick={() => handleSectionChange('security')} icon={<Shield size={18} />} label="Security" />
        <SidebarItem active={activeSection === 'hardware'} onClick={() => handleSectionChange('hardware')} icon={<Camera size={18} />} label="Hardware Access" />
        <SidebarItem active={activeSection === 'personality'} onClick={() => handleSectionChange('personality')} icon={<User size={18} />} label="Personality Editor" />
        <SidebarItem active={activeSection === 'market'} onClick={() => handleSectionChange('market')} icon={<Globe size={18} />} label="Personality Market" />
        <SidebarItem active={activeSection === 'memory'} onClick={() => handleSectionChange('memory')} icon={<Database size={18} />} label="Memory Explorer" />
        <SidebarItem active={activeSection === 'mcp'} onClick={() => handleSectionChange('mcp')} icon={<Cpu size={18} />} label="MCP Servers" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
        {activeSection === 'general' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsSection title={t.language} icon={<Globe className="text-blue-400" />}>
               <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-4">{t.selectLanguage}</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                         onClick={() => setLang('en')}
                         className={`p-6 rounded-2xl border text-sm font-bold transition-all flex items-center justify-center gap-3 ${lang === 'en' ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                      >
                         English (US)
                      </button>
                      <button 
                         onClick={() => setLang('zh')}
                         className={`p-6 rounded-2xl border text-sm font-bold transition-all flex items-center justify-center gap-3 ${lang === 'zh' ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                      >
                         中文 (简体)
                      </button>
                    </div>
                  </div>
               </div>
            </SettingsSection>
          </div>
        )}
        {activeSection === 'personalization' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsSection title={t.appearanceThemes || "Appearance & Themes"} icon={<Sparkle size={18} className="text-celestial-saturn" />}>
               <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 space-y-8">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-4">{t.selectMatrixVariant || "Select Global Matrix Variant"}</label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: 'celestial', label: 'Celestial', color: 'from-orange-400 to-red-500' },
                        { id: 'nebula', label: 'Nebula', color: 'from-indigo-500 to-purple-600' },
                        { id: 'cyber', label: 'Cyber', color: 'from-emerald-400 to-teal-600' }
                      ].map(themeItem => (
                        <button 
                          key={themeItem.id}
                          onClick={() => setTheme && setTheme(themeItem.id)}
                          className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all text-center ${
                            theme === themeItem.id ? 'bg-white/10 border-white/20 shadow-lg' : 'border-white/5 hover:bg-white/5'
                          }`}
                        >
                          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${themeItem.color} shadow-lg ${theme === themeItem.id ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-black' : ''}`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${theme === themeItem.id ? 'text-white' : 'text-white/60'}`}>{themeItem.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-4">{t.desktopBackgroundProtocol || "Desktop Background Protocol"}</label>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                          <div className="w-full h-24 bg-black/40 rounded-xl border border-white/5 flex items-center justify-center">
                             <div className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,200,80,0.1)_0%,transparent_70%)]" />
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-xs font-bold text-white/80">Default Neural Map</span>
                             <div className="w-4 h-4 rounded-full bg-celestial-saturn" />
                          </div>
                       </div>
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3 opacity-50">
                          <div className="w-full h-24 bg-black/40 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden">
                             <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-xs font-bold text-white/40">Grid Matrix (Coming Soon)</span>
                             <div className="w-4 h-4 rounded-full border border-white/20" />
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            </SettingsSection>
          </div>
        )}
        {activeSection === 'neural' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsSection title="Agent Framework (Lumi Protocol)" icon={<BrainCircuit className="text-celestial-saturn" />}>
               <div className="space-y-6">
                 {/* Personality Selector */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-white/30 ml-2">Core Personality</label>
                   <div className="relative">
                     <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                     <select
                       value={personalityId}
                       onChange={(e) => setPersonalityId(e.target.value)}
                       className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold appearance-none cursor-pointer focus:border-celestial-saturn/50 outline-none"
                     >
                       {personalities.map((p: any) => (
                         <option key={p.id} value={p.id}>{p.name} — {p.coreMotivation?.slice(0, 60)}...</option>
                       ))}
                     </select>
                     <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                   </div>
                   {personalityId && personalities.length > 0 && (
                     <p className="text-[9px] text-white/30 px-2 mt-1">
                       {(() => { const p = personalities.find(x => x.id === personalityId); return p ? `${p.expressionStyle?.tone || ''} tone — ${p.expressionStyle?.verbosity || ''} verbosity` : ''; })()}
                     </p>
                   )}
                 </div>

                 {/* Observer Mode Toggle */}
                 <div className={`p-6 rounded-2xl border transition-all ${observerMode ? 'bg-celestial-saturn/5 border-celestial-saturn/30' : 'bg-white/5 border-white/5'}`}>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${observerMode ? 'bg-celestial-saturn/20 text-celestial-saturn' : 'bg-white/5 text-white/20'}`}>
                         <Eye size={20} />
                       </div>
                       <div>
                         <div className="text-sm font-bold text-white/90">Observation Mode</div>
                         <div className="text-[10px] text-white/40">Lumi watches quietly, learns from patterns, speaks only with insight.</div>
                       </div>
                     </div>
                     <div
                       onClick={() => setObserverMode(!observerMode)}
                       className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${observerMode ? 'bg-celestial-saturn' : 'bg-white/10'}`}
                     >
                       <div className={`w-3 h-3 rounded-full bg-white transition-transform ${observerMode ? 'translate-x-5' : 'translate-x-0'}`} />
                     </div>
                   </div>
                   {observerMode && (
                     <div className="mt-3 flex items-center gap-2 text-[10px] text-celestial-saturn font-bold uppercase tracking-widest">
                       <div className="w-1.5 h-1.5 rounded-full bg-celestial-saturn animate-pulse" />
                       Actively Observing
                     </div>
                   )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/40 tracking-widest">
                          <span>Neural Engine</span>
                          <span className="text-green-500">Active</span>
                       </div>
                       <div className="text-xs font-bold text-white/80">Autonomous Cognitive Loop</div>
                       <p className="text-[10px] text-white/30">Allows agents to proactively execute tasks based on context awareness.</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/40 tracking-widest">
                          <span>Memory Mesh</span>
                          <span className="text-blue-500">Syncing</span>
                       </div>
                       <div className="text-xs font-bold text-white/80">Persistent Long-term Recall</div>
                       <p className="text-[10px] text-white/30">Enables cross-session memory shared across all identified node devices.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-white/30 ml-2">Primary Reasoning Brain</label>
                      <div className="relative">
                        <select 
                          value={aiConfig.provider}
                          onChange={(e) => updateAIConfig({ provider: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold appearance-none cursor-pointer focus:border-celestial-saturn/50 outline-none"
                        >
                          <option value="gemini">Google Gemini (Native)</option>
                          <option value="openai">OpenAI (Advanced)</option>
                          <option value="deepseek">DeepSeek (Optimization)</option>
                          <option value="anthropic">Anthropic Claude</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" />
                      </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-white/30 ml-2">Neural Model (Version)</label>
                       <input 
                          type="text" 
                          value={aiConfig.model}
                          onChange={(e) => updateAIConfig({ model: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold focus:border-celestial-saturn/50 outline-none font-mono"
                       />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <div className="flex justify-between items-center px-2">
                       <label className="text-[10px] font-black uppercase text-white/30">Proprietary API Key (Encrypted)</label>
                       <button onClick={() => setShowApiKey(!showApiKey)} className="text-[9px] font-bold text-celestial-saturn uppercase tracking-widest">{showApiKey ? 'Hide' : 'Reveal'}</button>
                    </div>
                    <div className="relative">
                       <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                       <input 
                          type={showApiKey ? "text" : "password"}
                          value={aiConfig.apiKey}
                          onChange={(e) => updateAIConfig({ apiKey: e.target.value })}
                          placeholder="Optional: Enter key to bypass proxy rate limits"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm font-mono focus:border-celestial-saturn/50 outline-none"
                       />
                    </div>
                    <p className="text-[9px] text-white/20 px-2">Your key is stored locally and never leaves your secure mesh node.</p>
                 </div>
               </div>
            </SettingsSection>
          </div>
        )}

        {activeSection === 'voice' && (
          <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <VoiceForge t={t} />
          </div>
        )}

        {activeSection === 'api' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsSection title="Neural API Matrix" icon={<Key className="text-celestial-saturn" />}>
              <div className="grid grid-cols-1 gap-6">
                <ApiKeyField icon={<Sparkle size={18} className="text-purple-400" />} label="Anthropic / Claude 3.5 API" placeholder="sk-ant-..." storageKey="lumi_anthropic_key" />
                <ApiKeyField icon={<MessagesSquare size={18} className="text-green-400" />} label="OpenAI / GPT-4o API" placeholder="sk-..." storageKey="lumi_openai_key" />
                <ApiKeyField
                  icon={<BrainCircuit size={18} className="text-blue-400" />}
                  label={`Google Gemini API${providerStatus.gemini?.available ? ` (${providerStatus.gemini.model})` : ''}`}
                  placeholder={providerStatus.gemini?.available ? 'Connected via environment' : 'No key configured'}
                  disabled={providerStatus.gemini?.available}
                  storageKey="lumi_gemini_key"
                />
                <ApiKeyField icon={<Cpu size={18} className="text-orange-400" />} label="DeepSeek / LLM API" placeholder="sk-..." storageKey="lumi_deepseek_key" />
              </div>
            </SettingsSection>
          </div>
        )}

        {activeSection === 'music' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsSection title="Media Integration" icon={<Music className="text-celestial-saturn" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ServiceCard icon={<Disc className="text-[#1DB954]" />} name="Spotify" status="Disconnected" />
                <ServiceCard icon={<Headphones className="text-[#FA243C]" />} name="Apple Music" status="Disconnected" />
                <ServiceCard icon={<Radio className="text-orange-400" />} name="Tidal HiFi" status="Disconnected" />
                <ServiceCard icon={<Zap className="text-yellow-400" />} name="SoundCloud" status="Connected (Lumi Mix)" />
              </div>
            </SettingsSection>
          </div>
        )}

        {activeSection === 'sync' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsSection title="Distributed Intelligence Hub" icon={<Radio className="text-celestial-saturn" />}>
               <DeviceSyncCenter t={t} />
            </SettingsSection>
          </div>
        )}

        {activeSection === 'security' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsSection title="Privacy & Security" icon={<Shield className="text-celestial-mars" />}>
              <SettingsItem label="Local Encryption" desc="Encrypt all Agent data stored on your local disk." active />
              <SettingsItem label="Anonymous Mode" desc="Hide your node ID from the collaborative network." />
              <SettingsItem label="Biometric Lock" desc="Require fingerprint or face ID for Agent generation." />
            </SettingsSection>
            
            {isElectron && (
              <SettingsSection title="Desktop Node Runtime" icon={<Database className="text-celestial-jupiter" />}>
                <div className="p-4 bg-celestial-jupiter/10 rounded-2xl border border-celestial-jupiter/20 space-y-2 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/60">Platform:</span>
                    <span className="font-mono text-celestial-jupiter uppercase">{platform}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/60">Node Status:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="font-bold text-green-500 underline decoration-green-500/20 underline-offset-4">ACTIVE</span>
                    </div>
                  </div>
                </div>
                <SettingsItem label="Hardware Acceleration" desc="Use GPU for neural core inference." active />
                <SettingsItem label="System Tray Mode" desc="Keep Lumi running in the background." active />
              </SettingsSection>
            )}
          </div>
        )}
        {activeSection === 'hardware' && <HardwareSettings t={t} />}
        {activeSection === 'personality' && <PersonalityEditor />}
        {activeSection === 'market' && <PersonalityMarketplace />}
        {activeSection === 'memory' && <MemoryExplorer />}
        {activeSection === 'mcp' && <MCPSettings />}
      </div>
    </div>
  );
}

function HardwareSettings({ t }: { t: any }) {
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [camStatus, setCamStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isRequesting, setIsRequesting] = useState(false);

  const requestPermissions = async (type: 'mic' | 'camera') => {
    setIsRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: type === 'mic', 
        video: type === 'camera' 
      });
      // Immediately stop the stream after getting permission
      stream.getTracks().forEach(track => track.stop());
      
      if (type === 'mic') setMicStatus('granted');
      if (type === 'camera') setCamStatus('granted');
      
      toast.success(`${type === 'mic' ? 'Microphone' : 'Camera'} access synchronized.`);
    } catch (err: any) {
      if (type === 'mic') setMicStatus('denied');
      if (type === 'camera') setCamStatus('denied');
      toast.error(`Sensor link failed: ${err.message}`);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SettingsSection title="Hardware Sensor Network" icon={<Camera className="text-celestial-saturn" />}>
        <p className="text-sm text-white/40 mb-8 max-w-xl">
          LumiAI requires access to your physical sensors for real-world contextual awareness and biometric verification. All data is processed locally on your node.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HardwareCapCard 
            icon={<Mic size={24} />} 
            label="Audio Receptors" 
            desc="Enable neural speech recognition and voice cloning."
            status={micStatus}
            onEnable={() => requestPermissions('mic')}
            disabled={isRequesting}
          />
          <HardwareCapCard 
            icon={<Camera size={24} />} 
            label="Visual Cortex" 
            desc="Enable multimodal vision and gesture control."
            status={camStatus}
            onEnable={() => requestPermissions('camera')}
            disabled={isRequesting}
          />
        </div>

        <div className="mt-12 p-6 glass-dark rounded-[2rem] border border-white/5 space-y-4">
           <div className="flex items-center gap-3">
              <Shield className="text-celestial-saturn" size={20} />
              <h4 className="text-sm font-bold uppercase tracking-tight text-white">Privacy Assurance</h4>
           </div>
           <p className="text-[11px] text-white/30 leading-relaxed italic">
             "Our protocol strictly enforces local-only processing. Your visual and auditory data streams are never transmitted outside your sovereign mesh node without direct user-signed override."
           </p>
        </div>
      </SettingsSection>
    </div>
  );
}

function HardwareCapCard({ icon, label, desc, status, onEnable, disabled }: { 
  icon: React.ReactNode, 
  label: string, 
  desc: string, 
  status: 'prompt' | 'granted' | 'denied',
  onEnable: () => void,
  disabled: boolean
}) {
  return (
    <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 flex flex-col justify-between gap-6 group hover:border-white/10 transition-all">
      <div className="space-y-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
          status === 'granted' ? 'bg-celestial-saturn text-black' : 'bg-white/5 text-white/40'
        }`}>
          {icon}
        </div>
        <div>
          <h4 className="text-lg font-bold text-white">{label}</h4>
          <p className="text-xs text-white/40 leading-relaxed mt-1">{desc}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           {status === 'granted' ? (
             <div className="flex items-center gap-1.5 text-celestial-saturn text-[10px] font-black uppercase tracking-widest">
               <CheckCircle size={12} />
               Linked
             </div>
           ) : status === 'denied' ? (
             <div className="flex items-center gap-1.5 text-red-500 text-[10px] font-black uppercase tracking-widest">
               <AlertCircle size={12} />
               Blocked
             </div>
           ) : (
             <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Awaiting Access</div>
           )}
        </div>
        
        {status !== 'granted' && (
          <Button 
            onClick={onEnable}
            disabled={disabled}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest px-4 h-9 rounded-xl"
          >
            {status === 'denied' ? 'Retry Link' : 'Authorize'}
          </Button>
        )}
      </div>
    </div>
  );
}

function SidebarItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group ${active ? 'bg-white/10 text-white shadow-xl translate-x-2' : 'text-white/40 hover:bg-white/5 hover:text-white/70'}`}
    >
      <div className={`${active ? 'text-celestial-saturn' : 'text-current'} transition-colors`}>{icon}</div>
      <span className="text-xs font-black uppercase tracking-tight">{label}</span>
    </button>
  );
}

function ApiKeyField({ icon, label, placeholder, disabled = false, storageKey }: { icon: React.ReactNode, label: string, placeholder: string, disabled?: boolean, storageKey: string }) {
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(storageKey) || ''; } catch { return ''; }
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!value.trim()) {
      localStorage.removeItem(storageKey);
      toast.success('API key removed');
    } else {
      localStorage.setItem(storageKey, value.trim());
      toast.success('API key saved');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
        <label className="text-[10px] font-black uppercase tracking-widest text-white/50">{label}</label>
        {saved && <CheckCircle size={14} className="text-green-400 ml-auto" />}
      </div>
      <div className="relative">
        <input
          disabled={disabled}
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder={placeholder}
          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pr-24 text-white font-mono text-sm outline-none focus:border-celestial-saturn/50 transition-colors disabled:opacity-50"
        />
        <Button
          onClick={handleSave}
          disabled={disabled}
          className="absolute right-2 top-2 h-10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-lg"
        >
          {value ? 'Save' : 'Clear'}
        </Button>
      </div>
    </div>
  );
}

function ServiceCard({ icon, name, status }: { icon: React.ReactNode, name: string, status: string }) {
  return (
    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-black/40 rounded-2xl group-hover:scale-110 transition-transform">{icon}</div>
        <div>
          <h4 className="font-black uppercase tracking-tight text-white">{name}</h4>
          <p className={`text-[9px] font-black uppercase tracking-widest ${status.includes('Connected') ? 'text-green-500' : 'text-white/20'}`}>{status}</p>
        </div>
      </div>
      <ChevronDown size={16} className="text-white/20 -rotate-90" />
    </div>
  );
}

function SettingsSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="text-xl font-bold uppercase tracking-tighter text-white/90">{title}</h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function SettingsItem({ label, desc, active = false, storageKey, onChange }: { label: string; desc: string; active?: boolean; storageKey?: string; onChange?: (v: boolean) => void }) {
  const [isActive, setIsActive] = useState(() => {
    if (storageKey) {
      try { return localStorage.getItem(storageKey) === 'true'; } catch { return active; }
    }
    return active;
  });

  const toggle = () => {
    const next = !isActive;
    setIsActive(next);
    if (storageKey) {
      localStorage.setItem(storageKey, String(next));
    }
    onChange?.(next);
    toast.info(`${label}: ${next ? 'Enabled' : 'Disabled'}`);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
      <div className="space-y-1">
        <div className="font-bold text-sm text-white/90">{label}</div>
        <div className="text-[10px] text-white/40 uppercase tracking-widest">{desc}</div>
      </div>
      <div onClick={toggle} className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${isActive ? 'bg-celestial-saturn' : 'bg-white/10'}`}>
        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}
