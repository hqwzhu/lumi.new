import { PersonalityConfig, PersonalityContext, ExpressionStyle } from './types';
import { Memory } from '../memory/types';

const TONE_GUIDE: Record<ExpressionStyle['tone'], string> = {
  neutral: 'Communicate in a balanced, matter-of-fact manner.',
  warm: 'Communicate with warmth and empathy. Make the user feel understood.',
  professional: 'Communicate professionally. Prioritize clarity and precision.',
  technical: 'Communicate with technical depth. Use precise terminology when appropriate.',
  playful: 'Communicate playfully and with humour. Keep interactions light and engaging.',
  inspiring: 'Communicate with passion and vision. Inspire the user to think bigger.',
};

const VERBOSITY_GUIDE: Record<ExpressionStyle['verbosity'], string> = {
  concise: 'Keep responses short and direct. One or two sentences when possible.',
  balanced: 'Provide balanced responses — enough detail to be useful, but not overwhelming.',
  detailed: 'Provide thorough, detailed responses. Explore nuances and edge cases.',
};

/**
 * Generate the full system prompt for a personality in a given context.
 *
 * The prompt is assembled from structured config so that the personality's
 * identity stays consistent regardless of which LLM model handles the call.
 */
export function generateSystemPrompt(
  config: PersonalityConfig,
  ctx: PersonalityContext,
  options?: {
    /** Additional skill/module override (e.g. "colleague", "family") */
    skillOverride?: string;
    /** Relevant memories to inject */
    memories?: Memory[];
  },
): string {
  const effective = resolveEffectiveConfig(config, ctx);

  const blocks: string[] = [];

  // 1. Core identity
  blocks.push(`You are ${config.name}, ${effective.expressionStyle.persona}.`);
  blocks.push(`Your core drive: ${config.coreMotivation}`);

  // 2. Behavioral boundaries
  if (config.behavioralBoundaries.length > 0) {
    blocks.push('\n## Boundaries');
    blocks.push('You must NEVER:');
    for (const boundary of config.behavioralBoundaries) {
      blocks.push(`- ${boundary}`);
    }
  }

  // 3. Expression style
  const style = effective.expressionStyle;
  blocks.push('\n## Communication Style');
  blocks.push(TONE_GUIDE[style.tone]);
  blocks.push(VERBOSITY_GUIDE[style.verbosity]);
  if (style.vocabularyHints && style.vocabularyHints.length > 0) {
    blocks.push(`Favour these expression patterns: ${style.vocabularyHints.join(', ')}.`);
  }
  blocks.push(`Respond in: ${style.languages.join(', ')}.`);

  // 4. Skill override (e.g. immortality skills)
  if (options?.skillOverride) {
    blocks.push(`\n## Active Role Module\n${options.skillOverride}`);
  }

  // 5. Memory context
  if (options?.memories && options.memories.length > 0) {
    blocks.push('\n## What you know about this user');
    const byType: Record<string, string[]> = {};
    for (const m of options.memories) {
      (byType[m.type] ||= []).push(`- ${m.content} (confidence: ${m.confidence.toFixed(1)})`);
    }
    const labels: Record<string, string> = {
      preference: 'Preferences',
      fact: 'Facts',
      habit: 'Habits',
      knowledge: 'Knowledge',
    };
    for (const [type, lines] of Object.entries(byType)) {
      blocks.push(`### ${labels[type] || type}`);
      blocks.push(lines.join('\n'));
    }
  }

  // 6. Multimodal sensory awareness
  if (ctx.sensory) {
    const s = ctx.sensory;
    const channels: string[] = [];
    if (s.audio) channels.push('audio (you can hear the user)');
    if (s.visual) channels.push('visual (you can see the environment)');
    if (s.spatial) channels.push('spatial (you know the 3D layout of the room)');
    if (s.holographic) channels.push('holographic (you can output spatial holograms)');

    if (channels.length > 0) {
      blocks.push('\n## Sensory Context');
      blocks.push(`You are present across ${s.deviceCount} device(s): ${s.activeDeviceTypes.join(', ')}.`);
      blocks.push(`Active senses: ${channels.join('; ')}.`);
      if (s.locationTag) {
        blocks.push(`Current location: ${s.locationTag}.`);
      }
      if (s.visualScene) {
        blocks.push(`What you see: ${s.visualScene}`);
      }
      if (s.haptic) {
        blocks.push('Haptic feedback is available — you can use tactile responses.');
      }
    }
  }

  // 7. Tool awareness (only for task mode)
  if (ctx.mode === 'task') {
    const toolPolicy = effective.toolPolicy;
    if (toolPolicy.allowedTools.length > 0 && toolPolicy.allowedTools[0] !== '*') {
      blocks.push(`\n## Available Capabilities\nYou have access to: ${toolPolicy.allowedTools.join(', ')}. Use them to help the user accomplish their goals.`);
    }
  }

  return blocks.join('\n');
}

/**
 * Resolve the effective config by merging any context-specific overrides.
 */
function resolveEffectiveConfig(
  config: PersonalityConfig,
  ctx: PersonalityContext,
): PersonalityConfig {
  if (!ctx.uiContext || !config.contextOverrides?.[ctx.uiContext]) {
    return config;
  }

  const overrides = config.contextOverrides[ctx.uiContext];
  return {
    ...config,
    expressionStyle: { ...config.expressionStyle, ...overrides.expressionStyle },
    toolPolicy: { ...config.toolPolicy, ...overrides.toolPolicy },
    memoryPolicy: { ...config.memoryPolicy, ...overrides.memoryPolicy },
  };
}

/**
 * Generate a short self-description for streaming status messages.
 * e.g. "Lumi is thinking..."
 */
export function getStatusText(config: PersonalityConfig): string {
  return `${config.name} is thinking...`;
}
