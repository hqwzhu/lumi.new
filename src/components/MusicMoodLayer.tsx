import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useMusicPlayer, MusicLyricLine, MusicScene } from '../hooks/useMusicPlayer';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';

function parseLRC(lrc: string): MusicLyricLine[] {
  if (!lrc) return [];
  const lines: MusicLyricLine[] = [];
  for (const line of lrc.split('\n')) {
    const m = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/);
    if (m) {
      const time = parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / (m[3].length === 3 ? 1000 : 100);
      const text = m[4].trim();
      if (text) lines.push({ time, text });
    }
  }
  return lines;
}

function getCurrentLyricIndex(lyrics: MusicLyricLine[], progress: number): number {
  for (let i = lyrics.length - 1; i >= 0; i--) if (progress >= lyrics[i].time) return i;
  return -1;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Emotion → lyric color ──
function emotionLyricColor(scene: MusicScene): string {
  const v = scene.emotion?.valence ?? 0.3;
  const a = scene.emotion?.arousal ?? 0.5;
  // valence drives warm/cool, arousal drives saturation
  if (v > 0.4 && a > 0.5) return '#fbbf24'; // warm excited = gold
  if (v > 0.4) return '#f59e0b';             // warm calm = amber
  if (v < -0.2 && a < 0.3) return '#6366f1';  // sad calm = indigo
  if (v < -0.2) return '#38bdf8';             // sad active = sky
  if (a > 0.7) return '#a78bfa';              // high arousal neutral = violet
  if (a < 0.3) return '#94a3b8';              // low arousal = slate
  return scene.colors.accent;
}

// ── Pixel terrain ──
function PixelTerrain({ scene, isPlaying }: { scene: MusicScene; isPlaying: boolean }) {
  const terrainColors = scene.terrainColors || [scene.colors.primary, scene.colors.secondary, scene.colors.accent, scene.colors.primary + '88'];
  const blocks = useMemo(() => {
    const arr: { x: number; w: number; h: number; c: string }[] = [];
    const count = 50;
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (i / count) * 100,
        w: 2 + Math.random() * 4,
        h: (1 + Math.random() * 6) * 4,
        c: terrainColors[Math.floor(Math.random() * terrainColors.length)],
      });
    }
    return arr;
  }, [terrainColors]);

  // Scene-specific extras
  const isCosmos = scene.scene === 'cosmos' || scene.scene === 'starlight';
  const isForest = scene.scene === 'forest';
  const isOldtown = scene.scene === 'oldtown' || scene.scene === 'memory';
  const isRain = scene.scene === 'rain';
  const isFestival = scene.scene === 'festival' || scene.scene === 'neon';

  const stars = useMemo(() =>
    isCosmos ? Array.from({ length: 40 }, (_, i) => ({ x: Math.random() * 100, y: Math.random() * 60, s: 1 + Math.random() * 2 })) : [], [isCosmos]);

  const buildings = useMemo(() =>
    isOldtown ? Array.from({ length: 8 }, (_, i) => ({ x: 5 + i * 12, w: 6 + Math.random() * 4, h: 20 + Math.random() * 30 })) : [], [isOldtown]);

  const trees = useMemo(() =>
    isForest ? Array.from({ length: 12 }, (_, i) => ({ x: 3 + i * 8.5, h: 15 + Math.random() * 25 })) : [], [isForest]);

  const fireworks = useMemo(() =>
    isFestival ? Array.from({ length: 6 }, (_, i) => ({ x: 10 + Math.random() * 80, y: 5 + Math.random() * 40, delay: i * 1.2 })) : [], [isFestival]);

  const raindrops = useMemo(() =>
    isRain ? Array.from({ length: 30 }, (_, i) => ({ x: Math.random() * 100, delay: Math.random() * 3, dur: 0.6 + Math.random() * 1 })) : [], [isRain]);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none overflow-hidden" style={{ imageRendering: 'pixelated' as any }}>
      {/* Ground blocks */}
      {blocks.map((b, i) => (
        <motion.div key={i} className="absolute bottom-0" style={{ left: `${b.x}%`, width: `${b.w}%`, height: b.h, background: `${b.c}22` }}
          animate={isPlaying ? { height: [b.h, b.h + 2, b.h] } : {}} transition={{ duration: 2 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 2 }} />
      ))}
      {/* Horizon line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `${scene.colors.accent}15` }} />

      {/* Stars / cosmos */}
      {stars.map((s, i) => (
        <motion.div key={`st${i}`} className="absolute rounded-sm" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, background: '#fff' }}
          animate={{ opacity: [0.1, 0.6, 0.1] }} transition={{ duration: 2 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }} />
      ))}

      {/* Buildings / oldtown */}
      {buildings.map((b, i) => (
        <motion.div key={`bd${i}`} className="absolute bottom-0" style={{ left: `${b.x}%`, width: `${b.w}%`, height: `${b.h}px`, background: `${terrainColors[i % terrainColors.length]}18`, border: `1px solid ${terrainColors[i % terrainColors.length]}10` }}
          animate={{ height: [b.h, b.h + 2, b.h] }} transition={{ duration: 3 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 2 }} />
      ))}

      {/* Trees / forest */}
      {trees.map((t, i) => (
        <motion.div key={`tr${i}`} className="absolute bottom-0 flex flex-col items-center" style={{ left: `${t.x}%` }}>
          <div style={{ width: 6, height: t.h, background: `${terrainColors[Math.floor(i / 3)]}18` }} />
          <div style={{ width: 16, height: 12, background: `${terrainColors[i % terrainColors.length]}10`, borderRadius: '2px', marginTop: -4 }} />
        </motion.div>
      ))}

      {/* Fireworks */}
      {fireworks.map((f, i) => (
        <motion.div key={`fw${i}`} className="absolute" style={{ left: `${f.x}%`, top: `${f.y}%` }}>
          <motion.div className="rounded-full" style={{ width: 3, height: 3, background: terrainColors[i % terrainColors.length] }}
            animate={isPlaying ? { scale: [0, 8, 0], opacity: [1, 1, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity, delay: f.delay, ease: 'easeOut' }} />
        </motion.div>
      ))}

      {/* Rain */}
      {raindrops.map((r, i) => (
        <motion.div key={`rn${i}`} className="absolute top-0" style={{ left: `${r.x}%`, width: 1, height: 8, background: `${scene.colors.accent}30` }}
          animate={isPlaying ? { y: [0, 400, 0] } : {}} transition={{ duration: r.dur, repeat: Infinity, delay: r.delay, ease: 'linear' }} />
      ))}
    </div>
  );
}

// ── Lyric bubble with emotion-driven coloring ──
function LyricBubble({ text, isActive, isPrev, scene, index }: { text: string; isActive: boolean; isPrev: boolean; scene: MusicScene; index: number }) {
  const angle = (index * 1.7 + 0.5) * Math.PI;
  const radius = isActive ? 32 : isPrev ? 38 : 44;
  const x = 50 + Math.cos(angle) * radius;
  const y = 50 + Math.sin(angle) * radius;
  const rotate = Math.cos(angle) * 4;
  const lyricColor = emotionLyricColor(scene);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.7 }}
      animate={{ opacity: isActive ? 1 : isPrev ? 0.2 : 0.06, y: 0, scale: isActive ? 1 : 0.82, rotate }}
      exit={{ opacity: 0, y: -80, scale: 0.5 }}
      transition={{ type: 'spring', stiffness: 60, damping: 16, mass: isActive ? 0.7 : 1.5 }}
      className="absolute pointer-events-none" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <div className="px-5 py-3" style={{ background: isActive ? `${lyricColor}0d` : 'transparent', border: isActive ? `1px solid ${lyricColor}20` : '1px solid transparent', borderRadius: '6px', boxShadow: isActive ? `0 0 30px ${lyricColor}10` : 'none' }}>
        <p className="text-center leading-loose font-mono" style={{
          color: isActive ? lyricColor : '#ffffff10',
          fontSize: isActive ? '1.1rem' : '0.8rem',
          textShadow: isActive ? `0 0 14px ${lyricColor}44` : 'none',
        }}>{text}</p>
      </div>
    </motion.div>
  );
}

// ── Lumi center presence with emotion-driven color ──
function LumiPresence({ scene, isPlaying }: { scene: MusicScene; isPlaying: boolean }) {
  const whispers = useMemo(() => ['我在这里','♪','听','♫','陪伴你','·','嗯','♩'], []);
  const [whisper, setWhisper] = useState('');
  const [visible, setVisible] = useState(false);
  const lumColor = emotionLyricColor(scene);

  useEffect(() => {
    if (!isPlaying) { setVisible(false); return; }
    const show = () => { setWhisper(whispers[Math.floor(Math.random() * whispers.length)]); setVisible(true); setTimeout(() => setVisible(false), 2400); };
    show();
    const timer = setInterval(show, 6000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <motion.div className="rounded-full" style={{ width: 120, height: 120, background: `radial-gradient(circle, ${lumColor}18, transparent 70%)` }}
        animate={isPlaying ? { scale: [0.9, 1.15, 0.9], opacity: [0.25, 0.55, 0.25] } : { scale: 1, opacity: 0.18 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute rounded-full" style={{ width: 60, height: 60, background: `radial-gradient(circle, ${lumColor}25, transparent 70%)` }}
        animate={isPlaying ? { scale: [1, 1.3, 1], opacity: [0.35, 0.75, 0.35] } : { scale: 1, opacity: 0.25 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} />
      <motion.div className="absolute w-[6px] h-[6px] rounded-full" style={{ background: lumColor, boxShadow: `0 0 10px ${lumColor}` }}
        animate={{ opacity: [0.45, 1, 0.45] }} transition={{ duration: 2.5, repeat: Infinity }} />
      <AnimatePresence>
        {visible && (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute text-[11px] font-mono tracking-widest" style={{ color: lumColor + '66', top: 'calc(50% - 10px)' }}>{whisper}</motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Scene ambient FX ──
function SceneFX({ scene }: { scene: MusicScene }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 opacity-[0.018]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)' }} />
      {(['festival','fireworks','neon','arcade'].includes(scene.scene)) && (
        <motion.div className="absolute w-[80vw] h-[80vw] rounded-full blur-[200px]" style={{ background: scene.colors.primary, top: '-20%', left: '-20%', opacity: 0.05 }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.06, 0.03] }} transition={{ duration: 8, repeat: Infinity }} />
      )}
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 75% 65% at 50% 50%, transparent 8%, ${scene.colors.bg}dd 100%)` }} />
    </div>
  );
}

// ── Particles ──
const PARTICLE_SHAPES: Record<string, { size: number; char: string; glow: boolean }> = {
  stars:{size:3,char:'·',glow:true},fireflies:{size:4,char:'○',glow:true},rain:{size:2,char:'│',glow:false},
  hearts:{size:5,char:'♥',glow:true},sparks:{size:4,char:'◇',glow:true},petals:{size:4,char:'❀',glow:false},
  snow:{size:3,char:'·',glow:false},dust:{size:1,char:'·',glow:false},
};

function PixelParticles({ scene, isPlaying }: { scene: MusicScene; isPlaying: boolean }) {
  const shape = PARTICLE_SHAPES[scene.particles] || PARTICLE_SHAPES.stars;
  const items = useMemo(() => Array.from({ length: scene.particles === 'none' ? 0 : 25 }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 5, duration: 7 + Math.random() * 16,
    dy: -(10 + Math.random() * 45),
    color: [scene.colors.primary, scene.colors.secondary, scene.colors.accent][Math.floor(Math.random() * 3)],
  })), [scene]);
  if (!isPlaying || items.length === 0) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map(p => (
        <motion.div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${70 + Math.random() * 30}%`, color: p.color, fontSize: shape.size * 5, opacity: 0, textShadow: shape.glow ? `0 0 8px ${p.color}` : 'none' }}
          animate={{ y: p.dy, opacity: [0, 0.5, 0.2, 0] }} transition={{ duration: p.duration / scene.intensity, delay: p.delay, repeat: Infinity, ease: 'linear' }}>{shape.char}</motion.div>
      ))}
    </div>
  );
}

// ── Main ──
export function MusicMoodLayer() {
  const { visible, isPlaying, track, progress, duration, lumiReason, lyrics, scene, play, pause, next, prev, seek, hide } = useMusicPlayer();
  const [parsedLyrics, setParsedLyrics] = useState<MusicLyricLine[]>([]);
  const [showControls, setShowControls] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (lyrics.length > 0) setParsedLyrics(lyrics); else if (typeof (lyrics as any) === 'string') setParsedLyrics(parseLRC(lyrics as any)); }, [lyrics]);

  const resetControlsTimer = useCallback(() => { setShowControls(true); if (idleTimer.current) clearTimeout(idleTimer.current); idleTimer.current = setTimeout(() => setShowControls(false), 4000); }, []);
  useEffect(() => { if (!visible) return; window.addEventListener('mousemove', resetControlsTimer); window.addEventListener('touchstart', resetControlsTimer); resetControlsTimer(); return () => { window.removeEventListener('mousemove', resetControlsTimer); window.removeEventListener('touchstart', resetControlsTimer); if (idleTimer.current) clearTimeout(idleTimer.current); }; }, [visible, resetControlsTimer]);
  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') hide(); if (e.key === ' ') { e.preventDefault(); isPlaying ? pause() : play(); resetControlsTimer(); } }, [hide, isPlaying, pause, play, resetControlsTimer]);
  useEffect(() => { if (visible) { window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); } }, [visible, handleKeyDown]);

  const currentLyricIdx = useMemo(() => getCurrentLyricIndex(parsedLyrics, progress), [parsedLyrics, progress]);
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const visibleBubbles = useMemo(() => { const idx = Math.max(0, currentLyricIdx); const arr: any[] = []; if (idx > 0) arr.push({ ...parsedLyrics[idx - 1], index: idx - 1, isActive: false }); arr.push({ ...parsedLyrics[idx], index: idx, isActive: true }); if (idx + 1 < parsedLyrics.length) arr.push({ ...parsedLyrics[idx + 1], index: idx + 1, isActive: false }); return arr; }, [parsedLyrics, currentLyricIdx]);

  if (!visible || !scene) return null;

  return (
    <AnimatePresence>
      <motion.div key="music-mood" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[9999] pointer-events-auto select-none overflow-hidden" style={{ background: scene.colors.bg }}>
        <SceneFX scene={scene} />
        <PixelParticles scene={scene} isPlaying={isPlaying} />
        <PixelTerrain scene={scene} isPlaying={isPlaying} />
        <LumiPresence scene={scene} isPlaying={isPlaying} />
        <div className="absolute inset-0">
          <AnimatePresence mode="popLayout">
            {visibleBubbles.map((b) => (
              <LyricBubble key={b.index} text={b.text} isActive={b.isActive} isPrev={b.index === currentLyricIdx - 1} scene={scene} index={b.index} />
            ))}
          </AnimatePresence>
          {parsedLyrics.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.p animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 4, repeat: Infinity }} className="font-mono text-2xl" style={{ color: scene.colors.accent + '44' }}>♪</motion.p>
            </div>
          )}
        </div>
        {lumiReason && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1.5 }} className="absolute top-10 left-8 max-w-[260px]">
            <p className="text-[11px] tracking-wide leading-relaxed font-semibold font-mono" style={{ color: scene.colors.accent, textShadow: `0 0 16px ${scene.colors.accent}44` }}>{lumiReason}</p>
          </motion.div>
        )}
        {scene.reason && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 1 }} className="absolute top-10 right-8 px-3 py-1.5 rounded border font-mono text-[9px] max-w-[200px]" style={{ background: scene.colors.accent + '10', borderColor: scene.colors.accent + '30', color: scene.colors.accent + 'aa' }}>{scene.reason}</motion.div>
        )}
        <motion.div key={track?.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bottom-24 right-8 text-right">
          <h3 className="text-[12px] text-white/50 tracking-wide font-mono">{track?.name || ''}</h3>
          <p className="text-[9px] text-white/15 mt-0.5 font-mono">{track?.artists?.join(' · ') || ''}</p>
        </motion.div>
        <AnimatePresence>
          {showControls && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-white/12 w-7 text-right">{formatTime(progress)}</span>
                <div className="w-[200px] h-[3px] cursor-pointer rounded-full" style={{ background: scene.colors.accent + '12' }} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * duration); }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progressPercent}%`, background: scene.colors.accent + '88' }} />
                </div>
                <span className="text-[8px] font-mono text-white/12 w-7">{formatTime(duration)}</span>
              </div>
              <div className="flex items-center gap-10">
                <motion.button onClick={prev} whileTap={{ scale: 0.7 }} className="text-white/18 hover:text-white/50"><SkipBack size={14} strokeWidth={2} /></motion.button>
                <motion.button onClick={isPlaying ? pause : play} whileTap={{ scale: 0.85 }} className="w-9 h-9 flex items-center justify-center rounded-sm" style={{ border: `2px solid ${scene.colors.accent}44`, background: `${scene.colors.accent}08` }}>
                  {isPlaying ? <Pause size={12} style={{ color: scene.colors.accent }} /> : <Play size={12} style={{ color: scene.colors.accent }} className="ml-0.5" />}
                </motion.button>
                <motion.button onClick={next} whileTap={{ scale: 0.7 }} className="text-white/18 hover:text-white/50"><SkipForward size={14} strokeWidth={2} /></motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
