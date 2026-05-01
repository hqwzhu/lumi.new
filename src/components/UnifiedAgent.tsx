import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, Cpu, Globe, Zap, Loader2, User as UserIcon, Settings, Eye, Camera, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { LocalAgentSphere } from './LocalAgentSphere';
import { socketService } from '@/services/socketService';
import { useTTS } from '@/hooks/useTTS';
import { useModuleData } from '@/hooks/useModuleData';
import { GlassCard } from './SharedUI';

export function UnifiedAgent({ t, user, onEnterSanctuary }: { t: any; user: any; onEnterSanctuary?: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [personality, setPersonality] = useState('lumi');
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [visionData, setVisionData] = useState<string[]>([]);
  const [founderVision, setFounderVision] = useState('');
  const [isFounderEditing, setIsFounderEditing] = useState(false);
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const { speak, stop, isSpeaking } = useTTS();
  const { data: agents } = useModuleData<any[]>('/api/modules/agents');
  const agentConfig = agents?.[0];
  const scrollRef = useRef<HTMLDivElement>(null);
  const socket = useRef<any>(null);

  const [isPrivateMode, setIsPrivateMode] = useState(false);

  useEffect(() => {
    socket.current = socketService.connect();

    socket.current.on("agent:response", (data: { text: string; agentName: string }) => {
      const agentMsg = {
        id: Date.now().toString(),
        text: data.text,
        userName: data.agentName,
        timestamp: new Date().toISOString(),
        type: 'agent'
      };
      setMessages(prev => [...prev, agentMsg]);
      
      // Only speak if the last input was voice
      setIsVoiceInput(prev => {
        if (prev) {
          speak(data.text);
        }
        return prev;
      });
    });

    socket.current.on("agent:status", (data: { status: string }) => {
      setIsTyping(data.status === "thinking");
    });

    socket.current.on("agent:error", (data: { message: string }) => {
      console.error("Socket Agent Error:", data.message);
      setIsTyping(false);
    });

    return () => {
      // We don't necessarily want to disconnect the global socket service here
      // but we should remove listeners if needed.
      socket.current.off("agent:response");
      socket.current.off("agent:status");
      socket.current.off("agent:error");
    };
  }, [speak]);

  const fetchInteractions = async () => {
    try {
      const res = await fetch('/api/interactions');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map((i: any) => ({
          id: i.id,
          text: i.content,
          userName: i.role === 'user' ? (user?.displayName || 'User') : (agentConfig?.name || 'Lumi'),
          timestamp: i.timestamp,
          type: i.role === 'user' ? 'user' : 'agent'
        })));
      }
    } catch (error) {
      console.error('Error fetching interactions:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInteractions();
      fetchFounderVision();
    } else {
      setMessages([]);
    }
  }, [user]);

  const fetchFounderVision = async () => {
    try {
      const res = await fetch('/api/founder/vision');
      if (res.ok) {
        const data = await res.json();
        setFounderVision(data.vision);
      }
    } catch (err) {
      console.error('Error fetching founder vision:', err);
    }
  };

  const updateFounderVision = async () => {
    try {
      const res = await fetch('/api/founder/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vision: founderVision })
      });
      if (res.ok) {
        setIsFounderEditing(false);
      }
    } catch (err) {
      console.error('Error updating founder vision:', err);
    }
  };

  const toggleVision = () => {
    setIsVisionActive(!isVisionActive);
    if (!isVisionActive) {
      // Simulate object recognition
      setVisionData(['Coffee Cup', 'MacBook Pro', 'Neural Ring', 'Project Blueprint']);
    } else {
      setVisionData([]);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, text?: string, isVoice: boolean = false) => {
    if (e) e.preventDefault();
    const messageText = text || newMessage;
    if (!messageText.trim() || !user) return;

    setIsVoiceInput(isVoice);
    
    // If typing, stop any ongoing speech
    if (!isVoice) {
      stop();
    }

    const userMsg = {
      id: Date.now().toString(),
      text: messageText,
      userName: user.displayName || user.username || 'Anonymous',
      timestamp: new Date().toISOString(),
      type: 'user'
    };

    setMessages(prev => [...prev, userMsg]);
    setNewMessage('');
    
    if (socket.current) {
      socket.current.emit("agent:chat", {
        text: messageText,
        history: messages.map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        personalityId: personality
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Top Row: Holographic Module & Founder Vision */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Holographic Module (Carrier Dock & Sensing) */}
        <GlassCard className="p-8 rounded-[2.5rem] space-y-6" hoverEffect={false}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tighter flex items-center gap-2">
              <Cpu size={20} className={isPrivateMode ? "text-celestial-saturn" : "text-celestial-glow animate-pulse"} />
              {isPrivateMode ? 'Physical Isolation' : 'Neural Carrier'}
            </h3>
            <div className="flex gap-2">
              <Button 
                onClick={toggleVision}
                className={`rounded-full px-3 h-7 text-[9px] font-bold uppercase tracking-widest ${
                  isVisionActive ? 'bg-celestial-saturn text-black' : 'bg-white/5 text-white/40'
                }`}
              >
                Sensors
              </Button>
              <Button 
                onClick={() => setIsPrivateMode(!isPrivateMode)}
                className={`rounded-full px-3 h-7 text-[9px] font-bold uppercase tracking-widest ${
                  isPrivateMode ? 'bg-celestial-saturn text-black' : 'bg-white/5 text-white/40'
                }`}
              >
                {isPrivateMode ? 'Online' : 'Kill-Switch'}
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full status-pulse ${isPrivateMode ? 'bg-celestial-saturn' : 'bg-celestial-glow'}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                  {isPrivateMode ? 'Local NPU Active' : 'Mesh Synced'}
                </span>
              </div>
              <span className="text-[9px] font-mono text-white/20">v2.0-Alpha</span>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {isVisionActive ? (
                visionData.map((obj, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-medium flex items-center gap-2"
                  >
                    <div className="w-1 h-1 rounded-full bg-celestial-saturn" />
                    {obj}
                  </motion.div>
                ))
              ) : (
                <p className="text-[10px] text-white/20 italic">Edge sensors on standby...</p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Right: Founder's Vision */}
        <GlassCard className="p-8 rounded-[2.5rem] space-y-6" hoverEffect={false}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tighter flex items-center gap-2">
              <Zap size={20} className="text-celestial-mars" />
              {t.founderVision || "Founder's Vision"}
            </h3>
            {user?.role === 'admin' && (
              <Button 
                onClick={() => isFounderEditing ? updateFounderVision() : setIsFounderEditing(true)}
                className="rounded-full px-4 h-8 text-[10px] font-bold uppercase tracking-widest bg-white/5 text-white/40 hover:bg-white/10"
              >
                {isFounderEditing ? t.updateVision : 'Edit Vision'}
              </Button>
            )}
          </div>
          
          {isFounderEditing ? (
            <textarea
              value={founderVision}
              onChange={(e) => setFounderVision(e.target.value)}
              className="w-full h-24 bg-black/20 border border-white/10 rounded-2xl p-4 text-sm text-white/80 focus:outline-none focus:border-celestial-saturn/50 resize-none font-mono"
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-white/60 leading-relaxed italic">
                "{founderVision || "LumiAI 旨在构建一个去中心化的智能协议..."}"
              </p>
              <Button 
                onClick={onEnterSanctuary}
                className="w-full py-6 rounded-2xl bg-celestial-saturn/10 border border-celestial-saturn/30 text-celestial-saturn font-bold hover:bg-celestial-saturn hover:text-black transition-all flex items-center justify-center gap-2 group"
              >
                <Sparkles size={18} className="group-hover:animate-spin" />
                {t.enterSanctuary || 'Enter Founder Sanctuary'}
              </Button>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Top Section: Voice & Visual Agent */}
      <section className="relative">
        <div className="text-center space-y-4 mb-8">
          <h2 className="text-4xl font-bold tracking-tighter glow-text">
            {agentConfig?.name || t.holographicEntrance}
          </h2>
          <p className="text-white/40 max-w-xl mx-auto italic">
            "{t.holographicEntranceDesc}"
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
          <div className="w-full lg:w-1/2">
            <LocalAgentSphere t={t} onMessage={(text) => handleSendMessage(undefined, text, true)} />
          </div>

          {/* Message Board (Simplified Chat) */}
          <div className="w-full lg:w-1/2 flex flex-col h-[500px] glass rounded-[2.5rem] border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-celestial-mars animate-ping' : 'bg-celestial-saturn animate-pulse'}`} />
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">实时交互 / Real-time Node</span>
                {isSpeaking && (
                  <Button 
                    onClick={stop}
                    className="h-6 px-2 text-[8px] bg-red-500/20 text-red-500 hover:bg-red-500/40 rounded-full border border-red-500/20"
                  >
                    停止播报 / STOP
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[10px] text-white/40 font-mono uppercase">
                  {t.founderMode || 'Founder Mode'}
                </div>
              </div>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide"
            >
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                  <MessageSquare size={48} />
                  <p className="text-sm">尚未有交互记录<br/>开始与您的本地智能体对话</p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${msg.type === 'agent' ? 'items-start' : 'items-end'}`}
                  >
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                      msg.type === 'agent' 
                        ? 'bg-celestial-saturn/10 text-celestial-saturn border border-celestial-saturn/20 rounded-tl-none' 
                        : 'bg-white/5 text-white/80 border border-white/10 rounded-tr-none'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] uppercase tracking-tighter opacity-30 mt-1 px-2">
                      {msg.userName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isTyping && (
                <div className="flex gap-1 items-center text-celestial-saturn/40 text-[10px]">
                  <Loader2 size={12} className="animate-spin" />
                  Agent is thinking...
                </div>
              )}
            </div>

            <div className="p-4 bg-white/5 border-t border-white/5">
              <form onSubmit={handleSendMessage} className="relative flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="输入指令或留言..."
                  className="bg-black/20 border-white/10 rounded-xl focus-visible:ring-celestial-saturn/50"
                />
                <Button 
                  type="submit" 
                  disabled={isTyping}
                  className="bg-celestial-saturn text-black rounded-xl px-4 hover:scale-105 transition-transform"
                >
                  <Send size={18} />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Stats / Info Row */}
      <div className="grid md:grid-cols-3 gap-6">
        <StatCard icon={<Cpu size={24} />} label="算力状态" value="98.4% Optimized" color="text-celestial-saturn" />
        <StatCard icon={<Globe size={24} />} label="节点同步" value="Global Mesh Active" color="text-celestial-mars" />
        <StatCard icon={<Zap size={24} />} label="响应延迟" value="< 12ms Local" color="text-celestial-glow" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <GlassCard className="p-6 rounded-3xl flex items-center gap-4" hoverEffect={false}>
      <div className={`p-3 rounded-2xl bg-white/5 ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
    </GlassCard>
  );
}
