import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, ShoppingBag, User, Star, Tag, Download, CheckCircle } from 'lucide-react';
import { GlassCard, IconBox, LoadingSpinner } from './SharedUI';
import { Button } from './ui/button';
import { useModuleData } from '@/hooks/useModuleData';
import { toast } from 'sonner';

export function SkillMarketplace({ t }: { t: any }) {
  const { data: skills, loading } = useModuleData<any[]>('/api/marketplace/skills');
  const [acquired, setAcquired] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('lumi_acquired_skills') || '[]')); } catch { return new Set(); }
  });
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleAcquire = async (skill: any) => {
    if (acquired.has(skill.id)) return;
    try {
      const res = await fetch('/api/marketplace/skills/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: skill.id, skillName: skill.name }),
      });
      if (res.ok) {
        const next = new Set(acquired);
        next.add(skill.id);
        setAcquired(next);
        localStorage.setItem('lumi_acquired_skills', JSON.stringify([...next]));
        toast.success(`Acquired: ${skill.name}`);
      } else {
        toast.error('Failed to acquire');
      }
    } catch {
      toast.error('Connection error');
    }
  };

  React.useEffect(() => {
    const handleScroll = (e: any) => {
      const category = e.detail;
      if (category === t.marketplace && containerRef.current) {
        const offset = 100;
        const elementPosition = containerRef.current.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    };
    window.addEventListener('scroll-to-eco', handleScroll);
    return () => window.removeEventListener('scroll-to-eco', handleScroll);
  }, [t.marketplace]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-12" ref={containerRef}>
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold tracking-tighter glow-text">
          {t.marketplaceLoRA || "LoRA Marketplace"}
        </h2>
        <p className="text-white/40 max-w-2xl mx-auto">
          {t.marketDesc || "Enhance your Agents with specialized modules and advanced skills. All assets are synchronized to your local core."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {skills?.map((skill) => (
          <SkillCard key={skill.id} skill={skill} t={t} isAcquired={acquired.has(skill.id)} onAcquire={() => handleAcquire(skill)} />
        ))}
      </div>
    </div>
  );
}

function SkillCard({ skill, t, isAcquired, onAcquire }: { skill: any; t: any; isAcquired: boolean; onAcquire: () => void }) {
  return (
    <GlassCard className="p-6 space-y-6 flex flex-col h-full group">
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-2xl bg-celestial-saturn/10 flex items-center justify-center text-celestial-saturn">
          <Zap size={24} />
        </div>
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/40">
          {skill.category}
        </div>
      </div>

      <div className="space-y-2 flex-1">
        <h3 className="text-xl font-bold tracking-tighter group-hover:text-celestial-saturn transition-colors">{skill.name}</h3>
        <p className="text-sm text-white/40 leading-relaxed">{skill.description}</p>
      </div>

      <div className="pt-6 border-t border-white/5 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-white/60">
            <User size={14} />
            {skill.author}
          </div>
          {skill.rating != null && (
            <div className="flex items-center gap-1 text-celestial-saturn">
              <Star size={14} fill="currentColor" />
              {skill.rating}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xl font-bold flex items-center gap-1">
            <Zap size={18} fill="currentColor" className="text-celestial-saturn" />
            {skill.price}
          </div>
          {isAcquired ? (
            <div className="flex items-center gap-1 text-green-500 text-xs font-bold uppercase tracking-widest">
              <CheckCircle size={14} />
              Acquired
            </div>
          ) : (
            <Button
              onClick={onAcquire}
              className="rounded-xl bg-celestial-saturn text-black font-bold h-10 px-6 hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Download size={16} />
              {t.acquire || "Acquire"}
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
