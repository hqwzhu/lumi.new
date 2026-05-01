import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  Orbit, 
  MessageSquare, 
  Globe, 
  Settings, 
  User, 
  ShieldCheck, 
  Activity, 
  Zap,
  Battery,
  Wifi,
  Signal,
  LayoutGrid
} from 'lucide-react';

interface MobilePlatformProps {
  t: any;
  user: any;
  onLogin: () => void;
  renderTabContent: (tab: string) => React.ReactNode;
}

export function MobilePlatform({ t, user, onLogin, renderTabContent }: MobilePlatformProps) {
  const [activeScreen, setActiveScreen] = useState<'home' | 'neural' | 'chat' | 'network' | 'profile'>('home');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'home', icon: LayoutGrid, label: 'Core' },
    { id: 'neural', icon: Orbit, label: 'Neural' },
    { id: 'chat', icon: MessageSquare, label: 'Lumi' },
    { id: 'network', icon: Globe, label: 'Mesh' },
    { id: 'profile', icon: User, label: 'Node' },
  ];

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pt-4"
          >
            {/* Quick Status Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-dark p-5 rounded-[2rem] border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Integrity</span>
                  <ShieldCheck size={14} className="text-celestial-saturn" />
                </div>
                <div className="text-2xl font-black text-white tracking-tighter">99.2%</div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[99.2%] bg-celestial-saturn shadow-[0_0_8px_rgba(255,204,0,0.5)]" />
                </div>
              </div>
              <div className="glass-dark p-5 rounded-[2rem] border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Mesh Sync</span>
                  <Activity size={14} className="text-purple-500" />
                </div>
                <div className="text-2xl font-black text-white tracking-tighter">4.8 GB/s</div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ x: ['-100%', '0%'] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="h-full w-full bg-purple-500/50" 
                  />
                </div>
              </div>
            </div>

            {/* Neural Surface Visualization */}
            <div className="glass-dark aspect-square rounded-[3.5rem] border border-white/10 relative overflow-hidden flex items-center justify-center p-8 shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,200,80,0.08)_0%,transparent_75%)]" />
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
              
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="w-full h-full border-2 border-white/5 rounded-full relative"
              >
                {[...Array(6)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                    className="absolute w-2.5 h-2.5 bg-celestial-saturn rounded-full blur-[2px] shadow-[0_0_10px_#ffcc00]" 
                    style={{ 
                      top: '50%', 
                      left: '50%', 
                      transform: `rotate(${i * 60}deg) translateY(-140px) translateX(-50%) translateY(-50%)` 
                    }} 
                  />
                ))}
              </motion.div>
              
              <div className="absolute z-10 text-center">
                <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-2 font-mono">Neural Interface</div>
                <div className="text-5xl font-black text-white tracking-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">CORE</div>
                <div className="mt-4 flex items-center justify-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-celestial-saturn animate-pulse" />
                   <span className="text-[9px] font-bold text-celestial-saturn uppercase tracking-widest">Protocol Verified</span>
                </div>
              </div>
            </div>

            {/* Quick Access Grid */}
            <div className="grid grid-cols-2 gap-4">
               <button className="glass-dark p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition-transform">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/60">
                    <Zap size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Boost P-2P</span>
               </button>
               <button className="glass-dark p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition-transform">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/60">
                    <ShieldCheck size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Encrypt Link</span>
               </button>
            </div>
          </motion.div>
        );
      case 'neural':
        return (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="pt-4 space-y-6"
           >
             <div className="flex justify-between items-end">
                <h2 className="text-3xl font-black tracking-tighter">Neural Stream</h2>
                <span className="text-[10px] font-black text-celestial-saturn uppercase tracking-widest mb-1">Live Telemetry</span>
             </div>
             <div className="space-y-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="glass-dark p-6 rounded-[2rem] border border-white/5 flex items-center gap-6">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${i === 1 ? 'bg-celestial-saturn text-black' : 'bg-white/5 text-white/40'}`}>
                        <Orbit size={20} className={i === 1 ? 'animate-spin-slow' : ''} />
                     </div>
                     <div className="flex-1">
                        <div className="text-sm font-bold text-white mb-1">Node Stream #{1024 + i}</div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${30 + Math.random() * 60}%` }}
                             className="h-full bg-white/20"
                           />
                        </div>
                     </div>
                  </div>
                ))}
             </div>
           </motion.div>
        );
      case 'chat':
        return <div className="h-full pt-4">{renderTabContent('agent-chat')}</div>;
      case 'network':
        return (
          <div className="h-full pt-4 hide-scrollbar">
            <div className="mb-8">
               <h2 className="text-3xl font-black tracking-tighter">Global Mesh</h2>
               <p className="text-xs text-white/30 font-medium">Distributed node architecture visualization</p>
            </div>
            {renderTabContent('ecosystem')}
          </div>
        );
      case 'profile':
        return <div className="h-full pt-4">{renderTabContent('profile')}</div>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#000] text-white flex flex-col font-sans overflow-hidden">
      {/* OS Background Layer */}
      <div className="absolute inset-0 z-0 bg-[#020205]">
        <div className="absolute top-[-15%] left-[-10%] w-[80%] h-[50%] bg-celestial-saturn/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-purple-900/10 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] brightness-50" />
      </div>

      {/* Top Status Header */}
      <div className="pt-14 px-8 pb-6 flex justify-between items-end z-20 relative">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-celestial-saturn animate-pulse shadow-[0_0_10px_#ffcc00]" />
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">System Link OK</span>
          </div>
          <div className="text-3xl font-black tracking-tighter tabular-nums drop-shadow-md">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/5 backdrop-blur-md">
          <Signal size={16} className="text-white/60" />
          <Wifi size={16} className="text-celestial-saturn" />
          <div className="flex items-center gap-1">
             <span className="text-[10px] font-black text-white/60">88%</span>
             <Battery size={16} className="text-green-500" />
          </div>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 overflow-y-auto px-8 pb-40 z-10 custom-scrollbar relative">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </div>

      {/* Fixed Bottom OS Controls */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-50 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="glass-dark border border-white/10 rounded-[3rem] p-2 flex items-center justify-between shadow-2xl backdrop-blur-3xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen(item.id as any)}
                  className={`relative flex flex-col items-center justify-center h-16 w-16 rounded-[2.2rem] transition-all duration-500 ${
                    isActive 
                      ? 'bg-white text-black scale-110 shadow-[0_10px_30px_rgba(255,255,255,0.3)]' 
                      : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 3 : 2} />
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav-bg"
                      className="absolute inset-0 bg-white rounded-[2.2rem] -z-10"
                      transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                    />
                  )}
                  {!isActive && (
                    <span className="text-[7px] font-black uppercase tracking-tighter mt-1">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CRT Post-processing Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[1000] opacity-[0.04] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] overflow-hidden" />
    </div>
  );
}

