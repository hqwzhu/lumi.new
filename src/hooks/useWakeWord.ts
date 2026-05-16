import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWakeWordOptions {
  /** Porcupine access key (free at https://picovoice.ai) */
  accessKey?: string;
  /** Keyword to detect — built-in or custom (requires .ppn file at /porcupine/<keyword_lowercase>.ppn). Falls back to "Jarvis" if custom model missing. */
  keyword?: string;
  /** Ref to the startCall function from useVoiceCall */
  startCallRef: React.MutableRefObject<((voiceId?: string, personalityId?: string, agentId?: string) => Promise<void>)>;
  /** Enable/disable wake word */
  enabled?: boolean;
  /** Sensitivity 0-1. Default 0.5 */
  sensitivity?: number;
  /** Voice ID to pass to startCall */
  voiceId?: string;
  /** Personality ID to pass to startCall */
  personalityId?: string;
  /** Agent ID to pass to startCall */
  agentId?: string;
  /** Called when wake word is detected (before startCall) */
  onDetection?: () => void;
  /** If provided and returns true, skip starting a new call (e.g. already in a call) */
  isCallActive?: () => boolean;
  /** Called to interrupt an active call when wake word fires during one */
  onInterrupt?: () => void;
}

interface UseWakeWordReturn {
  isListening: boolean;
  isSupported: boolean;
  lastDetection: string | null;
  error: string | null;
  enable: () => Promise<void>;
  disable: () => void;
}

const PICOVOICE_ACCESS_KEY_STORAGE = 'lumi_picovoice_key';

export function useWakeWord({
  accessKey: propKey,
  keyword = 'Computer',
  startCallRef,
  enabled = false,
  sensitivity = 0.5,
  voiceId,
  personalityId,
  agentId,
  onDetection,
  isCallActive,
  onInterrupt,
}: UseWakeWordOptions): UseWakeWordReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const enabledRef = useRef(enabled);

  enabledRef.current = enabled;

  const accessKey = propKey || localStorage.getItem(PICOVOICE_ACCESS_KEY_STORAGE) || '';

  const disable = useCallback(() => {
    setIsListening(false);
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (engineRef.current) {
      try { engineRef.current.release(); } catch {}
      engineRef.current = null;
    }
  }, []);

  const enable = useCallback(async () => {
    if (!accessKey) {
      // Silently skip — no key configured
      return;
    }

    try {
      setError(null);

      const { Porcupine, BuiltInKeyword } = await import('@picovoice/porcupine-web');

      const keywordMap: Record<string, typeof BuiltInKeyword[keyof typeof BuiltInKeyword]> = {
        'Porcupine': BuiltInKeyword.Porcupine,
        'Computer': BuiltInKeyword.Computer,
        'Hey Google': BuiltInKeyword.HeyGoogle,
        'Alexa': BuiltInKeyword.Alexa,
        'Jarvis': BuiltInKeyword.Jarvis,
      };

      const detectionCallback = (_detection: any) => {
        setLastDetection(new Date().toISOString());
        onDetection?.();
        if (isCallActive?.()) {
          onInterrupt?.();
          return;
        }
        startCallRef.current?.(voiceId, personalityId, agentId);
      };

      let engine: any;
      const builtinKeyword = keywordMap[keyword];

      if (builtinKeyword) {
        engine = await Porcupine.create(
          accessKey,
          { builtin: builtinKeyword, sensitivity },
          detectionCallback,
          { publicPath: '/porcupine_params.pv' },
        );
      } else {
        // Custom keyword — try loading .ppn file, fall back to Jarvis
        const safeName = keyword.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const customPath = `/porcupine/${safeName}.ppn`;
        try {
          engine = await Porcupine.create(
            accessKey,
            { publicPath: customPath, label: keyword, sensitivity },
            detectionCallback,
            { publicPath: '/porcupine_params.pv' },
          );
        } catch {
          console.warn(`[WakeWord] Custom keyword "${keyword}" (${customPath}) not found, falling back to "Jarvis". Place a .ppn file at public/porcupine/${safeName}.ppn`);
          engine = await Porcupine.create(
            accessKey,
            { builtin: BuiltInKeyword.Jarvis, sensitivity },
            detectionCallback,
            { publicPath: '/porcupine_params.pv' },
          );
        }
      }

      engineRef.current = engine;
      setIsSupported(true);

      // Open mic at Porcupine's required sample rate
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: engine.sampleRate });
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(engine.frameLength, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        if (!enabledRef.current) return;
        try {
          const input = event.inputBuffer.getChannelData(0);
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            pcm[i] = Math.max(-32768, Math.min(32767, Math.round(input[i] * 32767)));
          }
          engine.process(pcm);
        } catch { /* ignore processing errors */ }
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      setIsListening(true);
    } catch (err: any) {
      disable();
      const msg = err.message || 'Failed to initialize wake word';
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setError('Microphone permission denied.');
      } else if (msg.includes('Porcupine') || msg.includes('Pv')) {
        setError(msg);
      } else {
        setError(msg);
      }
    }
  }, [accessKey, keyword, sensitivity, voiceId, personalityId, agentId, startCallRef, disable]);

  // Auto-start if enabled
  useEffect(() => {
    if (enabled && accessKey && !isListening) {
      enable();
    } else if (!enabled && isListening) {
      disable();
    }
  }, [enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { disable(); };
  }, [disable]);

  return { isListening, isSupported, lastDetection, error, enable, disable };
}

export function savePicovoiceKey(key: string) {
  localStorage.setItem(PICOVOICE_ACCESS_KEY_STORAGE, key);
}

export function getPicovoiceKey(): string | null {
  return localStorage.getItem(PICOVOICE_ACCESS_KEY_STORAGE);
}
