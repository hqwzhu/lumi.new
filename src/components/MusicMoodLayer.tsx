import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Volume2, X } from 'lucide-react';
import { useMusicPlayer, MusicLyricLine } from '../hooks/useMusicPlayer';
import { useEffect, useMemo, useState } from 'react';

const MOOD_GRADIENTS: Record<string, string> = {
  happy: 'from-amber-500/10 via-rose-400/5 to-transparent',
  warm: 'from-amber-500/10 via-rose-400/5 to-transparent',
  playful: 'from-orange-500/10 via-yellow-400/5 to-transparent',
  excited: 'from-orange-500/10 via-yellow-400/5 to-transparent',
  calm: 'from-slate-600/10 via-blue-400/5 to-transparent',
  peaceful: 'from-slate-600/10 via-blue-400/5 to-transparent',
  contemplative: 'from-slate-600/10 via-blue-400/5 to-transparent',
  sad: 'from-blue-800/10 via-indigo-500/5 to-transparent',
  melancholic: 'from-blue-800/10 via-indigo-500/5 to-transparent',
  tired: 'from-purple-900/10 via-violet-600/5 to-transparent',
  focused: 'from-emerald-700/10 via-teal-500/5 to-transparent',
  curious: 'from-cyan-800/10 via-teal-400/5 to-transparent',
  nostalgic: 'from-cyan-800/10 via-teal-400/5 to-transparent',
};

function parseLRC(lrc: string): MusicLyricLine[] {
  if (!lrc) return [];
  const lines: MusicLyricLine[] = [];
  for (const line of lrc.split('\n')) {
    const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/);
    if (match) {
      const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / (match[3].length === 3 ? 1000 : 100);
      const text = match[4].trim();
      if (text) lines.push({ time, text });
    }
  }
  return lines;
}

function getCurrentLyricIndex(lyrics: MusicLyricLine[], progress: number): number {
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (progress >= lyrics[i].time) return i;
  }
  return -1;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MusicMoodLayer() {
  const {
    visible, isPlaying, track, progress, duration, volume, mood, weather, lumiReason, lyrics,
    play, pause, next, prev, seek, setVolume, hide,
  } = useMusicPlayer();

  const [parsedLyrics, setParsedLyrics] = useState<MusicLyricLine[]>([]);

  useEffect(() => {
    if (lyrics.length > 0) {
      setParsedLyrics(lyrics);
    } else if (typeof (lyrics as any) === 'string') {
      setParsedLyrics(parseLRC(lyrics as any));
    }
  }, [lyrics]);

  const currentLyricIdx = useMemo(
    () => getCurrentLyricIndex(parsedLyrics, progress),
    [parsedLyrics, progress],
  );

  const gradient = MOOD_GRADIENTS[mood] || MOOD_GRADIENTS.peaceful;
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="music-mood"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-auto"
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-b ${gradient}`} />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-3xl" />

        {/* Close button */}
        <button
          onClick={hide}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all z-10"
        >
          <X size={14} />
        </button>

        {/* Mood tag */}
        <div className="absolute top-8 left-0 right-0 flex items-center justify-center gap-2 z-10">
          {weather && <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{weather}</span>}
          {weather && mood && <span className="text-white/20">·</span>}
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{mood}</span>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md px-8">
          {/* Vinyl disc */}
          <motion.div
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="w-40 h-40 rounded-full bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center shadow-2xl"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/5 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white/20" />
            </div>
          </motion.div>

          {/* Track info */}
          <div className="text-center">
            <h2 className="text-xl font-black text-white tracking-tight">
              {track?.name || 'Waiting for Lumi...'}
            </h2>
            <p className="text-sm text-white/45 mt-1">
              {track?.artists?.join(', ') || ''}
              {track?.album ? ` · ${track.album}` : ''}
            </p>
          </div>

          {/* Lyrics */}
          <div className="h-32 overflow-hidden relative w-full">
            <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/80 to-transparent z-10" />
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/80 to-transparent z-10" />
            <div className="flex flex-col items-center gap-2 transition-transform duration-500" style={{ transform: `translateY(${48 - currentLyricIdx * 28}px)` }}>
              {parsedLyrics.map((line, i) => (
                <motion.p
                  key={i}
                  className={`text-sm text-center transition-all duration-300 ${
                    i === currentLyricIdx
                      ? 'text-white font-bold scale-105'
                      : Math.abs(i - currentLyricIdx) <= 1
                        ? 'text-white/30'
                        : 'text-white/10'
                  }`}
                >
                  {line.text}
                </motion.p>
              ))}
              {parsedLyrics.length === 0 && (
                <p className="text-sm text-white/20 italic">...</p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full flex items-center gap-3">
            <span className="text-[10px] font-mono text-white/30 w-10 text-right">{formatTime(progress)}</span>
            <div
              className="flex-1 h-1 bg-white/5 rounded-full cursor-pointer relative group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                seek(pct * duration);
              }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/40 to-white/60 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${progressPercent}%`, marginLeft: '-5px' }}
              />
            </div>
            <span className="text-[10px] font-mono text-white/30 w-10">{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            <button onClick={prev} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <SkipBack size={16} />
            </button>
            <button
              onClick={isPlaying ? pause : play}
              className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
            </button>
            <button onClick={next} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <SkipForward size={16} />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
            <Volume2 size={12} className="text-white/40" />
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 h-0.5 appearance-none bg-white/10 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          {/* Lumi's reason */}
          {lumiReason && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="text-xs text-white/25 italic text-center max-w-xs"
            >
              {lumiReason}
            </motion.p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
