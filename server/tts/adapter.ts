import { TTSConfig, TTSResult, TTSProvider, VoiceCloneRequest, VoiceListItem } from './types';
import * as gptsovits from './providers/gptsovits';
import * as cosyvoice from './providers/cosyvoice';
import { getKey } from '../config/keys';

export async function synthesizeSpeech(text: string, config: TTSConfig): Promise<TTSResult> {
  switch (config.provider) {
    case 'gptsovits':
      return gptsovits.synthesizeSpeech(text, config.voiceId, config.signal);
    case 'cosyvoice':
      return cosyvoice.synthesizeSpeech(text, config.voiceId, config.signal);
    default:
      throw new Error(`Unknown TTS provider: ${config.provider}`);
  }
}

export async function cloneVoice(request: VoiceCloneRequest, provider: TTSProvider): Promise<string> {
  switch (provider) {
    case 'cosyvoice':
      return cosyvoice.cloneVoice(request.sampleUrls, request.name);
    default:
      throw new Error(`Voice cloning not supported for provider: ${provider}`);
  }
}

export async function designVoice(prompt: string, name: string, provider: TTSProvider = 'cosyvoice'): Promise<string> {
  switch (provider) {
    case 'cosyvoice':
      return cosyvoice.designVoice(prompt, name);
    default:
      throw new Error(`Voice design not supported for provider: ${provider}`);
  }
}

export async function listVoices(provider: TTSProvider): Promise<VoiceListItem[]> {
  switch (provider) {
    case 'cosyvoice':
      return cosyvoice.listVoices();
    case 'gptsovits':
      return gptsovits.listVoices();
    default:
      throw new Error(`Unknown TTS provider: ${provider}`);
  }
}

export function getActiveProvider(): TTSProvider | null {
  const dashscopeKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || getKey('DASHSCOPE_API_KEY') || getKey('QWEN_API_KEY');
  if (dashscopeKey) return 'cosyvoice';
  if (process.env.GPTSOVITS_API_URL || process.env.GPTSOVITS_ENABLED === 'true') return 'gptsovits';
  return 'cosyvoice';
}

/**
 * Map emotional state to a CosyVoice voice preset that matches the mood.
 * Falls back to the user's configured voiceId if no strong emotional match.
 */
export function resolveEmotionVoice(defaultVoiceId: string, emotionalState?: {
  dominantMood?: string;
  arousal?: number;
  valence?: number;
  energy?: number;
}): string {
  if (!emotionalState) return defaultVoiceId;

  const { dominantMood, arousal = 0.5, valence = 0, energy = 0.5 } = emotionalState;

  // Mood → voice character mapping (CosyVoice v3 presets)
  const moodVoiceMap: Record<string, string> = {
    playful: 'longanhuan',       // upbeat female
    excited: 'longxiaochun_v3',   // bright female
    warm: 'longanyun_v3',         // warm male
    curious: 'longcheng_v3',      // smart male
    focused: 'longtian_v3',       // rational male
    contemplative: 'longxing_v3', // gentle female
    tired: 'longwan_v3',          // soft female
    calm: 'longxiaoxia_v3',       // calm female
    sad: 'longanrou_v3',          // tender female
    affectionate: 'longhan_v3',   // affectionate male
  };

  if (dominantMood && moodVoiceMap[dominantMood]) {
    return moodVoiceMap[dominantMood];
  }

  // Fallback: use arousal + valence to pick
  if (arousal > 0.7 && valence > 0.3) return 'longanhuan';   // high energy + positive = upbeat
  if (arousal > 0.7 && valence < -0.2) return 'longxiaochun_v3'; // high energy + negative = intense/bright
  if (arousal < 0.3 && valence > 0.2) return 'longxing_v3';  // low energy + positive = gentle
  if (arousal < 0.3 && valence < -0.2) return 'longwan_v3';  // low energy + negative = soft/melancholy
  if (valence > 0.4) return 'longanyun_v3';                   // positive = warm

  return defaultVoiceId;
}
