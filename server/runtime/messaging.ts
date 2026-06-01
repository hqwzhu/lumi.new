// Messaging integrations (Feishu, WeCom, etc.)
import { Router } from "express";
import { createMessagingRoutes, createWeComRoutes } from "../messaging";
import { getMessagingConfig } from "../messaging/config";
import { personalityRegistry } from "../personality";
import { queryMemories } from "../memory";
import { loadEmotionalState } from "../personality/state";

export function setupMessaging(
  apiRouter: Router,
  llm: { getDeepSeek: any; getGemini: any; getOpenAI: any; getAnthropic: any; getQwen: any },
) {
  const cfg = getMessagingConfig();
  const llmGetters = { getDeepSeek: llm.getDeepSeek, getGemini: llm.getGemini, getOpenAI: llm.getOpenAI, getAnthropic: llm.getAnthropic, getQwen: llm.getQwen };

  if (cfg.feishu?.appId && cfg.feishu?.appSecret) {
    apiRouter.use("/", createMessagingRoutes(cfg.feishu, {
      llmGetters,
      personalityRegistry,
      queryMemories,
      loadEmotionalState,
    }));
    console.log('[Feishu] Routes mounted at /api/feishu/*');
  } else {
    console.log('[Feishu] Not configured');
  }

  if (cfg.wecom?.corpId && cfg.wecom?.appSecret) {
    apiRouter.use("/", createWeComRoutes(cfg.wecom, {
      llmGetters,
      personalityRegistry,
      queryMemories,
      loadEmotionalState,
    }));
    console.log('[WeCom] Routes mounted at /api/wecom/*');
  } else {
    console.log('[WeCom] Not configured');
  }
}
