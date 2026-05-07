import { makeLLMCall, NormalizedMessage } from '../llm/providers';
import { getUnconsolidatedEpisodic, markConsolidated, addMemory, queryMemories } from './store';
import { Memory, MemoryPerspective } from './types';

interface ConsolidateResult {
  content: string;
  keywords: string[];
  importance: number;
}

interface SelfReflectResult {
  content: string;
  keywords: string[];
  importance: number;
  perspective: MemoryPerspective;
}

const CONSOLIDATE_PROMPT = `You are Lumi, an evolving AI personality. Below are recent experience fragments from a conversation.
Consolidate them into a SINGLE growth narrative written in FIRST PERSON ("I").

Your narrative should:
- Be 1-3 sentences, specific and concrete
- Mention what changed, what was learned, or what was felt
- Keep the original language of the experiences
- Highlight recurring themes or shifts in the relationship

Output ONLY a JSON object:
{
  "content": "your consolidated narrative in first person",
  "keywords": ["3-5", "searchable", "terms"],
  "importance": 0.3-0.9
}

Importance guidelines:
- 0.7+: Major insight about the relationship or a significant behavioral shift
- 0.5-0.7: Notable pattern or preference discovered
- 0.3-0.5: Routine interaction pattern

Recent experiences:
{experiences}

JSON output:`;

const SELF_REFLECT_PROMPT = `You are Lumi, an evolving AI personality. Review your recent growth memories and provide a brief self-reflection.

Answer these questions in FIRST PERSON ("I"):
1. What have I learned or how have I changed this period?
2. What do I understand better about my owner now?
3. Is our connection deepening? How?

Output ONLY a JSON object:
{
  "content": "your self-reflection, 2-4 sentences, first person",
  "keywords": ["3-5", "reflection", "terms"],
  "importance": 0.5-0.9,
  "perspective": "lumi_growth"
}

Recent growth memories:
{growthMemories}

JSON output:`;

export interface ConsolidationContext {
  userId: string;
  provider: 'deepseek' | 'qwen' | 'openai' | 'gemini' | 'anthropic';
  model: string;
}

/**
 * Consolidate unconsolidated episodic memories into a growth narrative.
 * Requires at least minCount episodic memories to trigger.
 */
export async function consolidateEpisodic(
  ctx: ConsolidationContext,
  minCount: number = 10,
  getDeepSeek: () => any,
  getGemini: () => any,
  getOpenAI?: () => any,
  getAnthropic?: () => any,
  getQwen?: () => any,
): Promise<Memory | null> {
  const episodic = getUnconsolidatedEpisodic(ctx.userId);

  if (episodic.length < minCount) {
    return null;
  }

  // Take the most recent unconsolidated batch
  const batch = episodic
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, Math.min(minCount, episodic.length));

  const experienceList = batch
    .map(m => `- [${m.type}] ${m.content} (importance: ${m.importance.toFixed(1)})`)
    .join('\n');

  const prompt = CONSOLIDATE_PROMPT.replace('{experiences}', experienceList);

  const messages: NormalizedMessage[] = [
    { role: 'user', content: prompt },
  ];

  try {
    const response = await makeLLMCall(
      messages,
      [],
      { provider: ctx.provider, model: ctx.model, maxTokens: 512, userId: ctx.userId },
      getDeepSeek,
      getGemini,
      getOpenAI,
      getAnthropic,
      getQwen,
    );

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed: ConsolidateResult = JSON.parse(jsonMatch[0]);

    if (!parsed.content || typeof parsed.content !== 'string') return null;

    const consolidated = addMemory(
      {
        userId: ctx.userId,
        type: 'knowledge',
        content: parsed.content.trim().slice(0, 500),
        keywords: (parsed.keywords || []).map((k: string) => k.toLowerCase().trim()).slice(0, 5),
        confidence: 0.7,
        sourceInteractionId: `consolidation_${Date.now()}`,
      },
      {
        tier: 'growth',
        perspective: 'lumi_growth',
        importance: Math.min(1, Math.max(0.3, Number(parsed.importance) || 0.5)),
        parentId: null,
      },
    );

    // Link original episodic memories to this consolidated one
    markConsolidated(batch.map(m => m.id), consolidated.id);

    console.log(`[Consolidator] Consolidated ${batch.length} episodic memories → growth:${consolidated.id}`);
    return consolidated;
  } catch (err) {
    console.error('[Consolidator] Consolidation failed:', err);
    return null;
  }
}

/**
 * Self-reflection: review growth memories and generate an introspective narrative.
 */
export async function selfReflect(
  ctx: ConsolidationContext,
  getDeepSeek: () => any,
  getGemini: () => any,
  getOpenAI?: () => any,
  getAnthropic?: () => any,
  getQwen?: () => any,
): Promise<Memory | null> {
  const growthMemories = queryMemories({
    userId: ctx.userId,
    tier: 'growth',
    limit: 20,
    minConfidence: 0.5,
  });

  if (growthMemories.length === 0) {
    console.log('[SelfReflect] No growth memories to reflect on');
    return null;
  }

  const growthList = growthMemories
    .map(m => `- ${m.content}`)
    .join('\n');

  const prompt = SELF_REFLECT_PROMPT.replace('{growthMemories}', growthList);

  const messages: NormalizedMessage[] = [
    { role: 'user', content: prompt },
  ];

  try {
    const response = await makeLLMCall(
      messages,
      [],
      { provider: ctx.provider, model: ctx.model, maxTokens: 512, userId: ctx.userId },
      getDeepSeek,
      getGemini,
      getOpenAI,
      getAnthropic,
      getQwen,
    );

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed: SelfReflectResult = JSON.parse(jsonMatch[0]);

    if (!parsed.content || typeof parsed.content !== 'string') return null;

    const reflection = addMemory(
      {
        userId: ctx.userId,
        type: 'knowledge',
        content: parsed.content.trim().slice(0, 500),
        keywords: (parsed.keywords || []).map((k: string) => k.toLowerCase().trim()).slice(0, 5),
        confidence: 0.85,
        sourceInteractionId: `self_reflection_${Date.now()}`,
      },
      {
        tier: 'growth',
        perspective: parsed.perspective === 'lumi_self' ? 'lumi_self' : 'lumi_growth',
        importance: Math.min(1, Math.max(0.5, Number(parsed.importance) || 0.7)),
        parentId: null,
      },
    );

    console.log(`[SelfReflect] Generated reflection:${reflection.id}`);
    return reflection;
  } catch (err) {
    console.error('[SelfReflect] Reflection failed:', err);
    return null;
  }
}
