/**
 * Feishu Messaging Routes — webhook receiver + send endpoints.
 *
 * Feishu Event Subscription flow:
 *   1. POST /api/feishu/events — receives all subscribed events
 *   2. URL verification: Feishu sends { type: "url_verification", challenge: "..." }
 *      → respond with { challenge: "..." } within 1 second
 *   3. Message events: parse → process via LLM with Lumi personality → reply
 */
import { Router } from 'express';
import { FeishuAdapter } from './feishu';
import type { FeishuConfig } from './feishu';
import type { IncomingMessage, MessageHandler } from './types';
import { getMessagingConfig, updateMessagingConfig } from './config';

export function createMessagingRoutes(
  feishuConfig: FeishuConfig,
  options?: {
    /** Custom message handler. If omitted, uses built-in AI with personality. */
    onMessage?: MessageHandler;
    /** LLM getters for AI reply pipeline */
    llmGetters?: {
      getDeepSeek?: () => any;
      getGemini?: () => any;
      getOpenAI?: () => any;
      getAnthropic?: () => any;
      getQwen?: () => any;
    };
    /** Personality registry — builds Lumi's persona into the system prompt */
    personalityRegistry?: any;
    /** Query user memories for context-aware replies */
    queryMemories?: (opts: { userId: string; query: string; limit: number; minConfidence: number }) => any[];
    /** Load emotional state for a user */
    loadEmotionalState?: (userId: string) => any;
  },
): Router {
  const router = Router();
  const adapter = new FeishuAdapter(feishuConfig);

  // ── POST /feishu/events — main webhook endpoint ──
  router.post('/feishu/events', async (req, res) => {
    try {
      const body = req.body;

      // URL verification challenge (first-time setup)
      if (body.type === 'url_verification' || body.event?.type === 'url_verification') {
        const challenge = body.challenge || body.event?.challenge;
        if (challenge) {
          console.log('[Feishu] URL verification challenge received');
          return res.json({ challenge });
        }
        return res.status(400).json({ error: 'Missing challenge token' });
      }

      // Parse the event into a unified IncomingMessage
      const msg = adapter.parseEvent(body);
      if (!msg) {
        return res.json({ code: 0 });
      }

      console.log(`[Feishu] ${msg.userName} (${msg.chatType}): ${msg.text.slice(0, 80)}`);

      // Process via custom handler or built-in AI with personality
      if (options?.onMessage) {
        const reply = await options.onMessage(msg);
        if (reply) {
          await adapter.sendMessage(msg.chatId, { text: reply.text, platform: 'feishu' });
        }
      } else {
        const replyText = await processWithPersonality(msg, options);
        await adapter.sendMessage(msg.chatId, { text: replyText, platform: 'feishu' });
      }

      res.json({ code: 0 });
    } catch (err: any) {
      console.error('[Feishu] Event error:', err.message);
      // Always return 200 to Feishu to avoid retries
      res.json({ code: -1, msg: err.message });
    }
  });

  // ── POST /feishu/send — manual send (for testing / admin) ──
  router.post('/feishu/send', async (req, res) => {
    try {
      const { chatId, text, card } = req.body;
      if (!chatId) return res.status(400).json({ error: 'chatId required' });
      if (!text && !card) return res.status(400).json({ error: 'text or card required' });

      let messageId: string;
      if (card) {
        messageId = await adapter.sendCard(chatId, card);
      } else {
        messageId = await adapter.sendMessage(chatId, { text, platform: 'feishu' });
      }

      res.json({ success: true, messageId });
    } catch (err: any) {
      console.error('[Feishu] Send error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /feishu/status — health check ──
  router.get('/feishu/status', (_req, res) => {
    const cfg = getMessagingConfig().feishu;
    res.json({
      platform: 'feishu',
      configured: cfg.enabled,
      appId: cfg.appId ? `${cfg.appId.slice(0, 8)}...` : null,
      hasSecret: !!cfg.appSecret,
    });
  });

  // ── GET /feishu/config — full config (masked) ──
  router.get('/feishu/config', (_req, res) => {
    const cfg = getMessagingConfig().feishu;
    res.json({
      appId: cfg.appId,
      appIdMasked: cfg.appId ? `${cfg.appId.slice(0, 8)}...` : '',
      hasSecret: !!cfg.appSecret,
      verificationToken: cfg.verificationToken ? '***' : undefined,
      enabled: cfg.enabled,
    });
  });

  // ── POST /feishu/config — update config ──
  router.post('/feishu/config', async (req, res) => {
    try {
      const { appId, appSecret, verificationToken } = req.body;
      const updated = updateMessagingConfig({ appId, appSecret, verificationToken });
      // Reload adapter with new config
      const newConfig = { appId: updated.feishu.appId, appSecret: updated.feishu.appSecret, verificationToken: updated.feishu.verificationToken };
      Object.assign(feishuConfig, newConfig);
      adapter.reload?.(newConfig);
      res.json({ success: true, configured: updated.feishu.enabled, appId: updated.feishu.appId ? `${updated.feishu.appId.slice(0, 8)}...` : '' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

// ── AI reply pipeline — powered by Lumi personality ──

async function processWithPersonality(
  msg: IncomingMessage,
  options?: {
    llmGetters?: Record<string, () => any>;
    personalityRegistry?: any;
    queryMemories?: (opts: { userId: string; query: string; limit: number; minConfidence: number }) => any[];
    loadEmotionalState?: (userId: string) => any;
  },
): Promise<string> {
  const llm = options?.llmGetters;
  const registry = options?.personalityRegistry;

  // ── Build system prompt from Lumi personality ──
  let systemPrompt = '';
  let personality: any = null;

  if (registry) {
    try {
      const memories = options?.queryMemories
        ? options.queryMemories({ userId: msg.userId, query: msg.text, limit: 5, minConfidence: 0.4 })
        : [];
      const emotionalState = options?.loadEmotionalState ? options.loadEmotionalState(msg.userId) : undefined;

      const result = registry.buildSystemPrompt(
        'lumi',
        { mode: 'chat', sensory: { hasAudio: false, hasVideo: false, hasSpatial: false, hasHaptic: false, hasHolographic: false, activeDeviceTypes: [], deviceCount: 0 } },
        {
          memories: memories.length > 0 ? memories : undefined,
          emotionalState,
        },
      );
      personality = result.config;
      systemPrompt = result.systemPrompt;
    } catch (err: any) {
      console.warn('[Feishu] Personality build failed, using fallback:', err.message);
    }
  }

  if (!systemPrompt) {
    systemPrompt = `你是一个名为 Lumi 的 AI 助手，通过飞书与用户交流。保持回复简洁、有帮助、自然。`;
  }

  // ── Determine model order from personality config ──
  const defaultModel = personality?.defaultModel || 'qwen-plus';
  const fallbackModel = personality?.fallbackModel || 'gemini-2.0-flash';

  // Map model names to provider getters
  const modelProviders = resolveProviderOrder(defaultModel, fallbackModel, llm);

  for (const { getter, model } of modelProviders) {
    try {
      const client = getter();
      if (!client) continue;

      if (model.includes('gemini')) {
        const genAI = client;
        const modelInstance = genAI.getGenerativeModel({ model, systemInstruction: systemPrompt });
        const result = await modelInstance.generateContent({
          contents: [{ role: 'user', parts: [{ text: msg.text }] }],
        });
        const text = result.response.text();
        if (text) return text;
      } else {
        const response = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: msg.text },
          ],
        });
        const text = response.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch (err: any) {
      console.warn(`[Feishu] Model ${model} failed:`, err.message);
    }
  }

  return `收到你的消息："${msg.text.slice(0, 100)}"。当前暂无 AI 回复，请稍后再试。`;
}

function resolveProviderOrder(
  primaryModel: string,
  fallbackModel: string,
  llmGetters?: Record<string, () => any>,
): { getter: () => any; model: string }[] {
  const map: Record<string, { key: string; model: string }> = {
    qwen: { key: 'getQwen', model: primaryModel },
    deepseek: { key: 'getDeepSeek', model: primaryModel },
    gemini: { key: 'getGemini', model: primaryModel },
    openai: { key: 'getOpenAI', model: primaryModel },
    anthropic: { key: 'getAnthropic', model: primaryModel },
    claude: { key: 'getAnthropic', model: primaryModel },
  };

  const ordered: { getter: () => any; model: string }[] = [];
  const seen = new Set<string>();

  // Primary model first
  const primary = Object.entries(map).find(([prefix]) => primaryModel.startsWith(prefix));
  if (primary && llmGetters?.[primary[1].key]) {
    const entry = primary[1];
    ordered.push({ getter: llmGetters[entry.key], model: entry.model });
    seen.add(entry.key);
  }

  // Fallback model second
  const fallback = Object.entries(map).find(([prefix]) => fallbackModel.startsWith(prefix));
  if (fallback && llmGetters?.[fallback[1].key] && !seen.has(fallback[1].key)) {
    const entry = fallback[1];
    ordered.push({ getter: llmGetters[entry.key], model: fallbackModel });
    seen.add(entry.key);
  }

  // Remaining providers as additional fallbacks
  for (const key of ['getQwen', 'getDeepSeek', 'getGemini'] as const) {
    if (!seen.has(key) && llmGetters?.[key]) {
      const model = key === 'getQwen' ? 'qwen-plus' : key === 'getDeepSeek' ? 'deepseek-chat' : 'gemini-2.0-flash';
      ordered.push({ getter: llmGetters[key], model });
      seen.add(key);
    }
  }

  return ordered;
}
