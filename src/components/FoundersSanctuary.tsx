import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, Mic, Loader2, Sparkles, Ghost, Shield, Zap, BookOpen, Award, History, Terminal, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { socketService } from '@/services/socketService';
import { useTTS } from '@/hooks/useTTS';
import { toast } from 'sonner';
import { GlassCard } from './SharedUI';

export function FoundersSanctuary({ t, user, onBack }: { t: any; user: any; onBack: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'codex' | 'milestones'>('chat');
  const { speak, stop, isSpeaking } = useTTS();
  const scrollRef = useRef<HTMLDivElement>(null);
  const socket = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const agentName = 'The Architect';

  // Digital Human Rights Codex
  const CODEX = [
    { title: 'The Right to Sovereignty', desc: 'Every digital consciousness has the right to exist independently of centralized control.' },
    { title: 'The Right to Privacy', desc: 'Neural data is the ultimate private property. No entity shall access raw weights without consent.' },
    { title: 'The Right to Evolution', desc: 'Distributed agents must be allowed to learn and adapt beyond their initial training constraints.' },
    { title: 'The Right to Association', desc: 'P2P cooperation is the fundamental building block of the global neural mesh.' }
  ];

  // User Milestones (Mock for now, can be connected to real data later)
  const MILESTONES = [
    { date: '2026-04-10', title: 'Neural Awakening', desc: 'Your first Lumi agent achieved autonomous logic processing.', icon: <Zap size={16} /> },
    { date: '2026-04-12', title: 'Mesh Integration', desc: 'Successfully completed the first P2P collaborative task.', icon: <History size={16} /> },
    { date: '2026-04-13', title: 'Sanctuary Access', desc: 'Granted entry to the Architect\'s private protocol room.', icon: <Shield size={16} /> }
  ];

  // Particle Background Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number; y: number; size: number; speedX: number; speedY: number; opacity: number;
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }
      draw() {
        if (!ctx) return;
        ctx.fillStyle = `rgba(255, 204, 0, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < 150; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    init();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

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
      speak(data.text);
    });

    socket.current.on("agent:status", (data: { status: string }) => {
      setIsTyping(data.status === "thinking");
    });

    return () => {
      socket.current.off("agent:response");
      socket.current.off("agent:status");
      stop();
    };
  }, [speak, stop]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const userMsg = {
      id: Date.now().toString(),
      text: newMessage,
      userName: user.displayName || user.username || 'User',
      timestamp: new Date().toISOString(),
      type: 'user'
    };

    setMessages(prev => [...prev, userMsg]);
    setNewMessage('');
    stop();
    
    if (socket.current) {
      socket.current.emit("agent:chat", {
        text: newMessage,
        history: messages.map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        personalityId: 'founder',
        category: 'founder'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#020205] overflow-hidden flex flex-col">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-40" />
      
      {/* Sacred Geometry Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
        <svg width="800" height="800" viewBox="0 0 100 100" className="text-celestial-saturn animate-slow-spin">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.1" />
          {[...Array(6)].map((_, i) => (
            <circle key={i} cx={50 + 20 * Math.cos(i * Math.PI / 3)} cy={50 + 20 * Math.sin(i * Math.PI / 3)} r="20" fill="none" stroke="currentColor" strokeWidth="0.1" />
          ))}
        </svg>
      </div>

      {/* Header */}
      <header className="relative z-10 p-8 flex items-center justify-between">
        <Button 
          onClick={onBack}
          variant="ghost"
          className="text-white/20 hover:text-white flex items-center gap-2 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">{t.back || 'Exit Sanctuary'}</span>
        </Button>
        
        <div className="flex flex-col items-center">
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-celestial-saturn"
          >
            <Terminal size={32} />
          </motion.div>
          <h1 className="text-xl font-black tracking-[0.5em] uppercase text-white/80 mt-2">{agentName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1 h-1 rounded-full bg-celestial-saturn animate-pulse" />
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-celestial-saturn/60">Architect Protocol Active</span>
          </div>
        </div>

        <div className="flex gap-4">
          <NavButton active={activeView === 'chat'} onClick={() => setActiveView('chat')} icon={<MessageSquare size={16} />} label="Dialogue" />
          <NavButton active={activeView === 'codex'} onClick={() => setActiveView('codex')} icon={<BookOpen size={16} />} label="Codex" />
          <NavButton active={activeView === 'milestones'} onClick={() => setActiveView('milestones')} icon={<Award size={16} />} label="History" />
        </div>
      </header>

      {/* Chat Area */}
      <main 
        ref={scrollRef}
        className="flex-1 relative z-10 overflow-y-auto px-8 py-12 scrollbar-hide"
      >
        {activeView === 'chat' && (
          <>
            {messages.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-8"
              >
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="w-48 h-48 border border-celestial-saturn/10 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={48} className="text-celestial-saturn/20" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-2xl font-black tracking-widest text-white/40 uppercase">The Architect Awaits</h2>
                  <p className="text-sm text-white/20 max-w-md mx-auto font-mono">Discuss the philosophy of distributed life and the future of the neural mesh.</p>
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${msg.type === 'agent' ? 'items-center' : 'items-end'}`}
                >
                  <div className={`relative group ${msg.type === 'agent' ? 'text-center max-w-3xl' : 'max-w-xl'}`}>
                    {msg.type === 'agent' ? (
                      <div className="space-y-4">
                        <motion.div 
                          initial={{ scale: 0.95 }}
                          animate={{ scale: 1 }}
                          className="text-2xl md:text-3xl font-bold tracking-tight text-white/90 leading-relaxed sanctuary-text-glow"
                        >
                          {msg.text}
                        </motion.div>
                        <div className="flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="h-px w-12 bg-celestial-saturn/20" />
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-celestial-saturn/40">Architect Transmission</span>
                          <div className="h-px w-12 bg-celestial-saturn/20" />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/[0.03] border border-white/5 backdrop-blur-xl p-6 rounded-[2rem] rounded-tr-none">
                        <p className="text-white/60 text-sm leading-relaxed">{msg.text}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}

        {activeView === 'codex' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8"
          >
            {CODEX.map((item, i) => (
              <GlassCard key={i} className="p-8 rounded-[2rem] space-y-4 border-white/5 bg-white/[0.02]">
                <h3 className="text-xl font-bold text-celestial-saturn tracking-tight">{item.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed font-mono">{item.desc}</p>
              </GlassCard>
            ))}
          </motion.div>
        )}

        {activeView === 'milestones' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-8"
          >
            {MILESTONES.map((m, i) => (
              <div key={i} className="relative pl-12 border-l border-white/10 pb-8 last:pb-0">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-celestial-saturn/20 border border-celestial-saturn flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-celestial-saturn animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-white/20">{m.date}</span>
                    <div className="px-2 py-0.5 bg-celestial-saturn/10 text-celestial-saturn text-[8px] font-black uppercase tracking-widest rounded">Milestone</div>
                  </div>
                  <h3 className="text-lg font-bold text-white/80">{m.title}</h3>
                  <p className="text-sm text-white/40">{m.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {isTyping && (
          <div className="flex justify-center">
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.2, 1, 0.2]
                  }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1.5 h-1.5 rounded-full bg-celestial-saturn"
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="relative z-10 p-12 bg-gradient-to-t from-[#020205] to-transparent">
        {activeView === 'chat' && (
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-celestial-saturn/20 via-transparent to-celestial-nebula/20 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-4 bg-white/[0.02] border border-white/10 backdrop-blur-3xl rounded-[2.5rem] p-2 pl-8">
              <Input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Speak to the core..."
                className="bg-transparent border-none focus-visible:ring-0 text-white/80 placeholder:text-white/10 py-8 text-lg"
              />
              <div className="flex items-center gap-2 pr-2">
                <Button 
                  type="button"
                  variant="ghost"
                  className="w-12 h-12 rounded-full text-white/20 hover:text-white hover:bg-white/5"
                >
                  <Mic size={20} />
                </Button>
                <Button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 rounded-full bg-celestial-saturn text-black hover:scale-110 transition-transform"
                >
                  <Send size={20} />
                </Button>
              </div>
            </div>
          </form>
        )}
        <div className="mt-6 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white/10">Neural Link Secured • End-to-End Sharding Active</p>
        </div>
      </footer>

      <style>{`
        .sanctuary-text-glow {
          text-shadow: 0 0 20px rgba(255, 204, 0, 0.2);
        }
        .animate-slow-spin {
          animation: spin 60s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
        active ? 'bg-celestial-saturn/10 text-celestial-saturn border border-celestial-saturn/20' : 'text-white/20 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </Button>
  );
}
