import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  Smartphone, 
  Monitor, 
  RefreshCcw, 
  ShieldCheck, 
  Zap, 
  MapPin, 
  Move3d,
  Lock,
  Search,
  CheckCircle2
} from 'lucide-react';
import { usePlatform } from '@/hooks/usePlatform';
import { GlassCard } from './SharedUI';

export function DeviceSyncCenter({ t }: { t: any }) {
  const { platform, isElectron, isMobile, sensors, startSensorSync, isSyncing, simulateLocalFileAccess } = usePlatform();
  const [isSearching, setIsSearching] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
  const [pairedDevices, setPairedDevices] = useState<string[]>([]);
  const [fileAccessInfo, setFileAccessInfo] = useState<any>(null);

  const startDiscovery = () => {
    setIsSearching(true);
    setDiscoveredDevices([]);
    
    setTimeout(() => {
      setDiscoveredDevices([
        { id: '1', name: 'MacBook Pro Node', type: 'desktop', signal: 92 },
        { id: '2', name: 'iPhone 15 Sense', type: 'mobile', signal: 78 },
        { id: '3', name: 'Neural Link Collar', type: 'iot', signal: 45 }
      ]);
      setIsSearching(false);
    }, 3000);
  };

  const pairDevice = (id: string) => {
    setPairedDevices(prev => [...prev, id]);
  };

  const handleFileAccess = async () => {
    const info = await simulateLocalFileAccess();
    setFileAccessInfo(info);
  };

  useEffect(() => {
    if (isMobile) {
      const stop = startSensorSync();
      return () => stop && stop();
    }
  }, [isMobile, startSensorSync]);

  return (
    <div className="space-y-8">
      {/* P2P Discovery Section */}
      <GlassCard className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Wifi size={20} className="text-celestial-saturn" />
              Lumi P2P Sync Protocol
            </h3>
            <p className="text-xs text-white/40">Secure device-to-device mesh network discovery.</p>
          </div>
          <button 
            onClick={startDiscovery}
            disabled={isSearching}
            className="px-4 py-2 bg-celestial-saturn/10 border border-celestial-saturn/30 text-celestial-saturn rounded-xl text-xs font-bold hover:bg-celestial-saturn/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSearching ? <RefreshCcw size={14} className="animate-spin" /> : <Search size={14} />}
            {isSearching ? 'Scanning Mesh...' : 'Discover Nodes'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnimatePresence>
            {discoveredDevices.map((device, idx) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-celestial-saturn/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60">
                    {device.type === 'desktop' ? <Monitor size={20} /> : <Smartphone size={20} />}
                  </div>
                  <div className="text-[10px] font-mono text-white/40">{device.signal}% Signal</div>
                </div>
                <h4 className="text-sm font-bold truncate">{device.name}</h4>
                <div className="mt-4">
                  {pairedDevices.includes(device.id) ? (
                    <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold">
                      <CheckCircle2 size={12} />
                      SYNCED
                    </div>
                  ) : (
                    <button 
                      onClick={() => pairDevice(device.id)}
                      className="w-full py-2 bg-white/10 rounded-lg text-[10px] font-bold hover:bg-celestial-saturn hover:text-black transition-all"
                    >
                      ESTABLISH LINK
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {!isSearching && discoveredDevices.length === 0 && (
            <div className="col-span-3 py-12 text-center space-y-2 border-2 border-dashed border-white/5 rounded-3xl">
              <Zap size={32} className="mx-auto text-white/10" />
              <p className="text-sm text-white/20">No active nodes detected in immediate vicinity.</p>
            </div>
          )}
        </div>
      </GlassCard>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Mobile Perception Logic */}
        <GlassCard className="p-8 space-y-6 border-t-2 border-t-celestial-nebula">
          <div className="flex items-center gap-3">
            <Smartphone className="text-celestial-nebula" />
            <div>
              <h3 className="text-lg font-bold">Mobile Sense Terminal</h3>
              <p className="text-xs text-white/40">Real-time perception data stream.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border transition-all ${isSyncing ? 'bg-celestial-nebula/10 border-celestial-nebula/30' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
                <MapPin size={12} />
                <span>Location</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono">{sensors.latitude?.toFixed(4) || '--'}° N</div>
                <div className="text-xs font-mono">{sensors.longitude?.toFixed(4) || '--'}° E</div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${isSyncing ? 'bg-celestial-nebula/10 border-celestial-nebula/30' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
                <Move3d size={12} />
                <span>Motion Core</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono">X: {sensors.acceleration?.x.toFixed(2) || '0.00'}</div>
                <div className="text-xs font-mono">Y: {sensors.acceleration?.y.toFixed(2) || '0.00'}</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-celestial-nebula animate-pulse' : 'bg-white/20'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                {isSyncing ? 'Live Stream Active' : 'Sensors Standby'}
              </span>
            </div>
            {!isSyncing && (
              <button 
                onClick={() => startSensorSync()}
                className="text-[10px] font-bold text-celestial-nebula hover:underline"
              >
                ENABLE SENSE
              </button>
            )}
          </div>
        </GlassCard>

        {/* Desktop IPC Simulation */}
        <GlassCard className="p-8 space-y-6 border-t-2 border-t-celestial-jupiter">
          <div className="flex items-center gap-3">
            <Monitor className="text-celestial-jupiter" />
            <div>
              <h3 className="text-lg font-bold">Node Vault Access</h3>
              <p className="text-xs text-white/40">Local storage and system-level interface.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-6 bg-black/40 rounded-2xl border border-white/10 font-mono text-xs space-y-3">
              <div className="flex items-center gap-2 text-celestial-jupiter">
                <Lock size={12} />
                <span>ENCRYPTED_VAULT_STATUS: LOKED</span>
              </div>
              {fileAccessInfo ? (
                <div className="space-y-1 text-white/60 animate-in fade-in slide-in-from-left-2 transition-all">
                  <div className="text-green-500">{'>>'} ACCESS GRANTED</div>
                  <div>{'>>'} PATH: {fileAccessInfo.path}</div>
                  <div>{'>>'} SIZE: {fileAccessInfo.size}</div>
                  <div>{'>>'} HASH: SHA256-0x9a2f...</div>
                </div>
              ) : (
                <div className="text-white/20 italic">{'>>'} Waiting for authorization...</div>
              )}
            </div>

            <button 
              onClick={handleFileAccess}
              className="w-full py-4 rounded-2xl bg-celestial-jupiter text-black font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Zap size={16} />
              Simulate Secured Local Access
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
