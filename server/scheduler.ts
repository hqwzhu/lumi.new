// Proactive agent scheduler - cron-like check-ins
// Each check-in fires a socket event to the UI so the user sees "Lumi checked in"

import { Server as SocketIOServer } from 'socket.io';
import { queryMemories, getDueReminders, fireReminder, runBehavioralAnalysis, decayMemories, getUnconsolidatedEpisodic } from './memory';
import { consolidateEpisodic, selfReflect, ConsolidationContext } from './memory/consolidator';
import { getWeatherBrief, getTimeGreeting } from './services/weather';
import { autoGenerateSkill } from './skills/generator';
import { readDB } from '../db_layer';
import { AgentRuntime, AgentRecord } from './agents/runtime';
import { personalityRegistry } from './personality';

interface ScheduledTask {
  id: string;
  cron: string;
  lastRun: string | null;
  handler: () => Promise<string | null>;
}

type LLMGetters = {
  getDeepSeek: () => any;
  getGemini: () => any;
  getOpenAI?: () => any;
  getAnthropic?: () => any;
  getQwen?: () => any;
};

class Scheduler {
  private tasks: ScheduledTask[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private io: SocketIOServer | null = null;
  private llmGetters: LLMGetters | null = null;

  setIO(io: SocketIOServer) {
    this.io = io;
  }

  setLLMGetters(getters: LLMGetters) {
    this.llmGetters = getters;
  }

  register(task: ScheduledTask) {
    this.tasks.push(task);
    this.scheduleTask(task);
  }

  listTasks() {
    return this.tasks.map(task => ({
      id: task.id,
      cron: task.cron,
      lastRun: task.lastRun,
      active: this.timers.has(task.id),
    }));
  }

  private scheduleTask(task: ScheduledTask) {
    const intervalMs = this.parseInterval(task.cron);
    const timer = setInterval(async () => {
      try {
        const message = await task.handler();
        task.lastRun = new Date().toISOString();
        if (message && this.io) {
          this.io.emit('agent:proactive', {
            taskId: task.id,
            message,
            timestamp: task.lastRun,
          });
        }
      } catch (err: any) {
        console.warn(`[Scheduler] Task "${task.id}" failed:`, err.message);
      }
    }, intervalMs);

    this.timers.set(task.id, timer);
    console.log(`[Scheduler] Registered task "${task.id}" every ${intervalMs / 1000}s`);
  }

  private parseInterval(cron: string): number {
    switch (cron) {
      case 'every_5m': return 5 * 60 * 1000;
      case 'every_1h': return 60 * 60 * 1000;
      case 'every_6h': return 6 * 60 * 60 * 1000;
      case 'daily_9am': return 24 * 60 * 60 * 1000;
      case 'evening_8pm': return 24 * 60 * 60 * 1000;
      case 'every_30m': return 30 * 60 * 1000;
      case 'every_7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  stop() {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }
}

export const scheduler = new Scheduler();

/**
 * Register built-in proactive tasks.
 * Accepts LLM provider getters so consolidation and self-reflection can call the LLM.
 */
export function registerScheduledTasks(
  getDeepSeek: () => any,
  getGemini: () => any,
  getOpenAI?: () => any,
  getAnthropic?: () => any,
  getQwen?: () => any,
) {
  const DEFAULT_USER = 'anonymous';
  const DEFAULT_CTX: ConsolidationContext = {
    userId: DEFAULT_USER,
    provider: 'deepseek',
    model: 'deepseek-chat',
  };

  // Reminder check-in (every 5 min)
  scheduler.register({
    id: 'reminder_check',
    cron: 'every_5m',
    lastRun: null,
    handler: async () => {
      const due = getDueReminders();
      if (due.length > 0) {
        const messages = due.map(r => r.content);
        for (const r of due) fireReminder(r.id);
        return `Reminder: ${messages.join(' | ')}`;
      }
      return null;
    },
  });

  // Memory decay — applies tier-based decay (every 6h)
  scheduler.register({
    id: 'memory_decay',
    cron: 'every_6h',
    lastRun: null,
    handler: async () => {
      decayMemories(DEFAULT_USER);
      const lowConf = queryMemories({ minConfidence: 0, limit: 5 });
      const decayed = lowConf.filter(m => m.confidence < 0.25 && m.confidence > 0.1);
      if (decayed.length > 0) {
        return `Some memories are fading. Would you like me to refresh what I know about you?`;
      }
      return null;
    },
  });

  // Memory consolidation (every 30 min) — triggers when >=10 unconsolidated episodic
  scheduler.register({
    id: 'memory_consolidation',
    cron: 'every_30m',
    lastRun: null,
    handler: async () => {
      const episodic = getUnconsolidatedEpisodic(DEFAULT_USER);
      if (episodic.length < 10) return null;
      const consolidated = await consolidateEpisodic(
        DEFAULT_CTX,
        10,
        getDeepSeek,
        getGemini,
        getOpenAI,
        getAnthropic,
        getQwen,
      );
      if (consolidated) {
        return `I've grown from our conversations: ${consolidated.content.slice(0, 200)}`;
      }
      return null;
    },
  });

  // Morning briefing with weather
  scheduler.register({
    id: 'daily_summary',
    cron: 'daily_9am',
    lastRun: null,
    handler: async () => {
      const greeting = getTimeGreeting();
      const weather = await getWeatherBrief();
      const pending = getDueReminders();
      const recentMemories = queryMemories({ limit: 5 });

      const parts: string[] = [`${greeting}!`];
      if (weather) parts.push(weather);
      if (pending.length > 0) parts.push(`${pending.length} reminder${pending.length > 1 ? 's' : ''} pending: ${pending.map(r => r.content).join(' | ')}`);
      if (recentMemories.length > 0) {
        const tiers = [...new Set(recentMemories.map(m => m.tier))];
        parts.push(`${recentMemories.length} memories across ${tiers.length} tiers`);
      }
      return parts.join(' - ');
    },
  });

  // Evening wrap-up
  scheduler.register({
    id: 'evening_wrapup',
    cron: 'evening_8pm',
    lastRun: null,
    handler: async () => {
      const pending = getDueReminders();
      const recentMemories = queryMemories({ limit: 5 });
      const parts: string[] = [];

      if (pending.length > 0) {
        parts.push(`${pending.length} reminder${pending.length > 1 ? 's' : ''} still pending`);
      }
      if (recentMemories.length > 0) {
        const habits = recentMemories.filter(m => m.type === 'habit');
        if (habits.length > 0) parts.push(`Today I noticed: ${habits[0].content.slice(0, 100)}`);
      }
      if (parts.length === 0) return null;
      return `Evening check-in - ${parts.join(' - ')}`;
    },
  });

  // Behavioral pattern analysis (every 6h, observer mode)
  scheduler.register({
    id: 'behavioral_analysis',
    cron: 'every_6h',
    lastRun: null,
    handler: async () => {
      const count = runBehavioralAnalysis(DEFAULT_USER);
      if (count > 0) {
        return `I've discovered ${count} new behavioral patterns from your interactions. Check Memory Explorer to review.`;
      }
      return null;
    },
  });

  // Self-reflection (every 7 days) — introspective growth narrative
  scheduler.register({
    id: 'self_reflection',
    cron: 'every_7d',
    lastRun: null,
    handler: async () => {
      const reflection = await selfReflect(
        DEFAULT_CTX,
        getDeepSeek,
        getGemini,
        getOpenAI,
        getAnthropic,
        getQwen,
      );
      if (reflection) {
        return `I've been reflecting on our time together: ${reflection.content.slice(0, 200)}`;
      }
      return null;
    },
  });

  // Auto skill generation (every 30 min) — detects repeatable workflows
  scheduler.register({
    id: 'auto_skill_gen',
    cron: 'every_30m',
    lastRun: null,
    handler: async () => {
      const result = await autoGenerateSkill(
        getDeepSeek,
        getGemini,
        getOpenAI,
        getAnthropic,
        getQwen,
      );
      if (result && result.success) {
        return `I've learned a new skill: "${result.skillName}" — now I can handle this type of task more efficiently.`;
      }
      return null;
    },
  });

  // Agent autonomous tick (every 5 min) — agents with scheduled/autonomous levels
  scheduler.register({
    id: 'agent_autonomous_tick',
    cron: 'every_5m',
    lastRun: null,
    handler: async () => {
      const db = readDB();
      const agents: AgentRecord[] = db.agents || [];
      const autonomousAgents = agents.filter(
        (a: AgentRecord) => a.autonomyLevel === 'scheduled' || a.autonomyLevel === 'autonomous',
      );

      if (autonomousAgents.length === 0) return null;

      const messages: string[] = [];

      for (const agentRecord of autonomousAgents) {
        try {
          const personality = personalityRegistry.get(agentRecord.personalityId || 'lumi') || personalityRegistry.getDefault();
          const runtime = new AgentRuntime(agentRecord, personality);
          const userId = agentRecord.ownerUid || agentRecord.userId || DEFAULT_USER;
          runtime.loadState(userId);

          const recentMemories = runtime.queryMemories('recent', 5);
          const result = await runtime.autonomousTick(userId, recentMemories);

          if (result.message) {
            messages.push(`[${agentRecord.name}] ${result.message}`);
          }
        } catch (err: any) {
          // Skip agents that fail to tick
        }
      }

      return messages.length > 0 ? messages.join('\n') : null;
    },
  });
}
