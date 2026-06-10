import { readDB, writeDB } from '../../db_layer';
import { estimateTokenCount } from '../llm/providers';

export interface Conversation {
  id: string;
  userId: string;
  agentId: string;
  title: string;
  status: 'active' | 'paused' | 'closed';
  mode?: string;  // Conversation mode: casual, teaching, brainstorm, executive
  summary: string;
  /** Multi-level summary chain: [oldest, middle, newest]. Max 3 entries. */
  summaryChain?: string[];
  messageCount: number;
  lastActiveAt: string;
  createdAt: string;
  /** Recent topic tags — tracked for cross-session continuity */
  recentTopics?: string[];
  /** ISO timestamp of the last topic change */
  lastTopicChangeAt?: string;
}

export interface MessageRecord {
  id: string;
  userId: string;
  agentId?: string;
  conversationId?: string;
  module?: string;
  message: string;
  response?: string;
  role: string;
  personality?: string;
  mode?: string;
  toolCalls?: string;
  timestamp: string;
}

export function getOrCreateActiveConversation(userId: string, agentId?: string): Conversation {
  const db = readDB();
  if (!db.conversations) db.conversations = [];

  const active = db.conversations.find(
    (c: Conversation) => c.userId === userId && c.agentId === agentId && c.status === 'active'
  );
  if (active) return active;

  const id = 'conv_' + crypto.randomUUID();
  const now = new Date().toISOString();
  const conv: Conversation = {
    id,
    userId,
    agentId: agentId || '',
    title: '',
    status: 'active',
    summary: '',
    messageCount: 0,
    lastActiveAt: now,
    createdAt: now,
  };
  db.conversations.push(conv);
  writeDB(db);
  return conv;
}

export function closeConversation(conversationId: string, summary?: string): Conversation | null {
  const db = readDB();
  if (!db.conversations) return null;
  const conv = db.conversations.find((c: Conversation) => c.id === conversationId);
  if (!conv) return null;
  conv.status = 'closed';
  conv.summary = summary || '';
  conv.lastActiveAt = new Date().toISOString();
  writeDB(db);
  return conv;
}

export function getActiveConversation(userId: string, agentId?: string): Conversation | null {
  const db = readDB();
  if (!db.conversations) return null;
  return db.conversations.find(
    (c: Conversation) => c.userId === userId && (agentId ? c.agentId === agentId : true) && c.status === 'active'
  ) || null;
}

export function setConversationMode(conversationId: string, mode: string): void {
  const db = readDB();
  if (!db.conversations) return;
  const conv = db.conversations.find((c: Conversation) => c.id === conversationId);
  if (!conv) return;
  conv.mode = mode;
  conv.lastActiveAt = new Date().toISOString();
  writeDB(db);
}

export function getUserConversations(userId: string, limit = 20, offset = 0): Conversation[] {
  const db = readDB();
  if (!db.conversations) return [];
  return db.conversations
    .filter((c: Conversation) => c.userId === userId)
    .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
    .slice(offset, offset + limit);
}

export function addMessage(msg: {
  userId: string;
  agentId?: string;
  conversationId?: string;
  role: string;
  content: string;
  response?: string;
  personality?: string;
  mode?: string;
  toolCalls?: any;
}): string {
  const db = readDB();
  const id = 'msg_' + crypto.randomUUID();
  const now = new Date().toISOString();

  const interaction: any = {
    id,
    userId: msg.userId,
    agentId: msg.agentId || '',
    conversationId: msg.conversationId || '',
    module: msg.personality || '',
    message: msg.content,
    response: msg.response || '',
    role: msg.role,
    personality: msg.personality || '',
    mode: msg.mode || '',
    toolCalls: msg.toolCalls ? JSON.stringify(msg.toolCalls) : '',
    timestamp: now,
  };

  if (!db.interactions) db.interactions = [];
  db.interactions.push(interaction);

  // Update conversation messageCount and lastActiveAt
  if (msg.conversationId && db.conversations) {
    const conv = db.conversations.find((c: Conversation) => c.id === msg.conversationId);
    if (conv) {
      conv.messageCount = (conv.messageCount || 0) + 1;
      conv.lastActiveAt = now;
      // Auto-title from first user message
      if (!conv.title && msg.role === 'user' && msg.content?.trim()) {
        conv.title = msg.content.trim().slice(0, 80);
      }
    }
  }

  writeDB(db);
  return id;
}

const DEFAULT_CONTEXT_TOKENS = parseInt(process.env.CONTEXT_TOKEN_BUDGET || '1000000', 10);

export function getMessages(conversationId: string, limit = 1000): MessageRecord[] {
  const db = readDB();
  if (!db.interactions) return [];
  return db.interactions
    .filter((i: any) => i.conversationId === conversationId)
    .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-limit);
}

/**
 * Get messages trimmed to a token budget rather than a fixed count.
 * Always keeps the last `keepRecent` messages (default 4).
 * Trims oldest messages first from the middle.
 */
export function getMessagesByTokenBudget(
  conversationId: string,
  maxTokens: number = DEFAULT_CONTEXT_TOKENS,
  keepRecent: number = 4,
): MessageRecord[] {
  const all = getMessages(conversationId, 2000);
  if (all.length <= keepRecent) return all;

  const keep = all.slice(-keepRecent); // always keep most recent
  const rest = all.slice(0, -keepRecent);

  let budget = maxTokens;
  // Count tokens for the kept portion first
  for (const m of keep) {
    budget -= estimateTokenCount(m.message + (m.response || ''));
  }

  // Walk backwards through rest, taking messages that fit
  const selected: MessageRecord[] = [];
  for (let i = rest.length - 1; i >= 0; i--) {
    const cost = estimateTokenCount(rest[i].message + (rest[i].response || ''));
    if (budget - cost > 0) {
      selected.unshift(rest[i]);
      budget -= cost;
    } else {
      break; // no more budget for older messages
    }
  }

  return [...selected, ...keep];
}

export function getMessagesForAgent(userId: string, agentId: string, limit = 500): MessageRecord[] {
  const conv = getActiveConversation(userId, agentId);
  if (!conv) return [];
  return getMessages(conv.id, limit);
}

/** Messages threshold for auto-summarization */
const AUTO_SUMMARY_THRESHOLD = 20;

/**
 * Check if a conversation needs auto-summarization.
 * Returns the conversation and older messages if threshold exceeded.
 */
export function checkAutoSummary(
  conversationId: string,
): { needed: boolean; conversation: Conversation | null; recentMessages: MessageRecord[] } {
  const db = readDB();
  if (!db.conversations) return { needed: false, conversation: null, recentMessages: [] };
  const conv = db.conversations.find((c: Conversation) => c.id === conversationId);
  if (!conv || conv.messageCount < AUTO_SUMMARY_THRESHOLD) {
    return { needed: false, conversation: conv || null, recentMessages: [] };
  }
  // Only summarize if last summary was more than 20 messages ago (avoid re-summarizing every message)
  const recentMessages = getMessages(conversationId, 40);
  return { needed: true, conversation: conv, recentMessages };
}

/**
 * Store a conversation summary. Maintains a multi-level chain (max 3).
 * Newest summary becomes conv.summary; older ones move into summaryChain.
 */
export function setConversationSummary(conversationId: string, summary: string): void {
  const db = readDB();
  if (!db.conversations) return;
  const conv = db.conversations.find((c: Conversation) => c.id === conversationId);
  if (!conv) return;

  // Push current summary into chain before overwriting
  if (conv.summary && conv.summary !== summary) {
    if (!conv.summaryChain) conv.summaryChain = [];
    conv.summaryChain.push(conv.summary);
    // Keep max 2 in chain (plus current summary = 3 total layers)
    if (conv.summaryChain.length > 2) {
      // Merge oldest two into one to keep chain bounded
      conv.summaryChain = [conv.summaryChain.slice(0, 2).join(' | ')];
    }
  }

  conv.summary = summary;
  writeDB(db);
}

/**
 * Get full conversation context: recent summary + older layers.
 * Returns formatted string suitable for system prompt injection.
 */
export function getConversationSummary(conversationId: string): string | null {
  const db = readDB();
  if (!db.conversations) return null;
  const conv = db.conversations.find((c: Conversation) => c.id === conversationId);
  if (!conv || !conv.summary) return null;

  const parts: string[] = [conv.summary];
  if (conv.summaryChain && conv.summaryChain.length > 0) {
    parts.push('Earlier: ' + conv.summaryChain.join(' | '));
  }
  return parts.join('\n');
}

/**
 * Track a topic for a conversation. Appends to recentTopics, keeping max 8 entries.
 * If the same topic was already recent, it moves to the end (most recent).
 */
export function trackTopic(conversationId: string, topic: string): void {
  const db = readDB();
  if (!db.conversations) return;
  const conv = db.conversations.find((c: Conversation) => c.id === conversationId);
  if (!conv) return;

  if (!conv.recentTopics) conv.recentTopics = [];
  // Remove if already exists — re-insert at end so it's "most recent"
  const idx = conv.recentTopics.indexOf(topic);
  if (idx >= 0) conv.recentTopics.splice(idx, 1);
  conv.recentTopics.push(topic);
  // Keep max 8
  if (conv.recentTopics.length > 8) conv.recentTopics.shift();
  conv.lastTopicChangeAt = new Date().toISOString();
  writeDB(db);
}

/**
 * Extract likely topics from a user message using simple keyword extraction.
 * Returns 1-3 topic strings, or empty array if nothing discernible.
 */
export function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const lower = text.toLowerCase();

  // Programming-related topics
  const techPatterns: [RegExp, string][] = [
    [/\b(rust|rustlang|cargo|borrow\s*checker|ownership|lifetime)\b/i, 'Rust'],
    [/\b(python|py|pip|django|flask|fastapi|pytorch|numpy)\b/i, 'Python'],
    [/\b(javascript|js|typescript|ts|react|vue|angular|node\.js|nodejs|npm)\b/i, 'JS/TS开发'],
    [/\b(go|golang|goroutine)\b/i, 'Go'],
    [/\b(java|spring|maven|gradle|kotlin)\b/i, 'Java'],
    [/\b(c\+\+|cpp|cmake|unreal|ue5|ue4)\b/i, 'C++'],
    [/\b(docker|kubernetes|k8s|container|pod)\b/i, '容器/Docker'],
    [/\b(git|github|pr|pull\s*request|commit|branch|merge)\b/i, 'Git'],
    [/\b(database|sql|mysql|postgres|mongodb|redis|db)\b/i, '数据库'],
    [/\b(api|rest|graphql|grpc|endpoint|http)\b/i, 'API开发'],
    [/\b(ai|llm|gpt|model|training|inference|embedding|transformer|deepseek|qwen)\b/i, 'AI/LLM'],
    [/\b(debug|bug|error|crash|fix|修复|调试)\b/i, '调试/Debug'],
    [/\b(test|testing|unit\s*test|测试|coverage)\b/i, '测试'],
    [/\b(deploy|deployment|ci|cd|pipeline|release)\b/i, '部署'],
  ];

  for (const [pattern, label] of techPatterns) {
    if (pattern.test(lower)) {
      topics.push(label);
    }
  }

  // Non-tech topics
  if (/(天气|weather|温度|temperature|下雨|晴天)/i.test(lower)) topics.push('天气');
  if (/(新闻|news|发生|最新)/i.test(lower)) topics.push('时事');
  if (/(音乐|music|song|歌|播放|听)/i.test(lower)) topics.push('音乐');
  if (/(游戏|game|玩|gaming|steam)/i.test(lower)) topics.push('游戏');
  if (/(电影|movie|film|视频|video|看片)/i.test(lower)) topics.push('影视');
  if (/(文件|file|folder|目录|路径|打开|保存)/i.test(lower)) topics.push('文件操作');
  if (/(设置|setting|配置|config|开关|toggle)/i.test(lower)) topics.push('系统设置');
  if (/(桌面|desktop|app|application|应用|程序|软件)/i.test(lower)) topics.push('桌面应用');
  if (/(邮件|email|mail|消息|message)/i.test(lower)) topics.push('通讯');
  if (/(文档|document|doc|ppt|excel|word|写作|write|笔记|note)/i.test(lower)) topics.push('文档/写作');

  // Deduplicate and limit
  return [...new Set(topics)].slice(0, 3);
}

/**
 * Build a topic continuity block for the system prompt.
 * Returns null if no recent topics exist.
 */
export function getTopicContext(conversationId: string): string | null {
  const db = readDB();
  if (!db.conversations) return null;
  const conv = db.conversations.find((c: Conversation) => c.id === conversationId);
  if (!conv?.recentTopics || conv.recentTopics.length === 0) return null;

  const topics = conv.recentTopics.slice(-5);
  const lastChange = conv.lastTopicChangeAt
    ? Math.round((Date.now() - new Date(conv.lastTopicChangeAt).getTime()) / (1000 * 60))
    : null;

  const lines: string[] = [];
  lines.push('\n## Conversation Topics');
  lines.push(`Recent topics discussed: ${topics.join(' → ')}.`);
  if (lastChange !== null && lastChange > 0) {
    lines.push(`Last topic change was ${lastChange} minutes ago.`);
  }
  lines.push('If the user references "that thing we discussed" or returns to a prior topic, check these recent topics for context.');

  return lines.join('\n');
}

export function getUnclosedConversation(userId: string): Conversation | null {
  const db = readDB();
  if (!db.conversations) return null;
  const convs = db.conversations.filter(
    (c: Conversation) => c.userId === userId && c.status === 'active'
  );
  if (convs.length === 0) return null;
  return convs.reduce((a: Conversation, b: Conversation) =>
    new Date(a.lastActiveAt).getTime() > new Date(b.lastActiveAt).getTime() ? a : b
  );
}
