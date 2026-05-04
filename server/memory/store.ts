import { readDB, writeDB } from '../../db_layer';
import { Memory, MemoryQuery, MemoryType } from './types';

function getMemoryStore(): Memory[] {
  const db = readDB();
  if (!db.memories) db.memories = [];
  return db.memories;
}

function saveMemoryStore(memories: Memory[]): void {
  const db = readDB();
  db.memories = memories;
  writeDB(db);
}

function generateId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// Match CJK characters for language-aware tokenization
const CJK_RE = /[一-鿿㐀-䶿]/;

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const lower = text.toLowerCase();
  // Extract CJK character bigrams (overlapping pairs: 名字 → 名字)
  let cjkRun = '';
  for (const ch of lower) {
    if (CJK_RE.test(ch)) {
      cjkRun += ch;
      if (cjkRun.length >= 2) {
        tokens.push(cjkRun.slice(-2));
      }
    } else {
      if (cjkRun.length === 1) tokens.push(cjkRun); // lone CJK char
      cjkRun = '';
    }
  }
  if (cjkRun.length === 1) tokens.push(cjkRun);
  // Also split by whitespace for English/numbers
  const words = lower.split(/[\s,，。！？、；：""''（）\(\)\[\]【】]+/).filter(w => w.length > 1);
  for (const w of words) {
    if (!CJK_RE.test(w)) tokens.push(w);
    else if (w.length > 2) tokens.push(w); // keep full CJK words too
  }
  return [...new Set(tokens)];
}

/** Score query against memory using language-aware token overlap */
function relevanceScore(query: string, memory: Memory): number {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return memory.confidence;

  const contentLower = memory.content.toLowerCase();
  let hits = 0;
  for (const t of qTokens) {
    if (contentLower.includes(t)) { hits += 2; continue; }
    let kwHit = false;
    for (const kw of memory.keywords) {
      if (kw.toLowerCase().includes(t) || t.includes(kw.toLowerCase())) { kwHit = true; break; }
    }
    if (kwHit) hits += 1;
  }
  return (hits / (qTokens.length * 2)) * memory.confidence;
}

export function queryMemories(q: MemoryQuery): Memory[] {
  let memories = getMemoryStore();

  if (q.userId) {
    memories = memories.filter(m => m.userId === q.userId);
  }
  if (q.type) {
    memories = memories.filter(m => m.type === q.type);
  }
  if (q.minConfidence !== undefined) {
    memories = memories.filter(m => m.confidence >= q.minConfidence);
  }

  if (q.query) {
    const scored = memories
      .map(m => ({ m, score: relevanceScore(q.query!, m) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
    memories = scored.map(({ m }) => m);
  } else {
    // Sort by confidence desc, then recency
    memories.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  const limit = q.limit || 10;
  const result = memories.slice(0, limit);

  // Mark as retrieved
  const now = new Date().toISOString();
  const all = getMemoryStore();
  for (const m of result) {
    const stored = all.find(s => s.id === m.id);
    if (stored) {
      stored.lastRetrievedAt = now;
      stored.retrieveCount = (stored.retrieveCount || 0) + 1;
    }
  }
  if (result.length > 0) saveMemoryStore(all);

  return result;
}

// ── Reminders ──

export interface Reminder {
  id: string;
  userId: string;
  content: string;
  dueAt: string | null;
  status: 'pending' | 'fired';
  sourceInteractionId: string;
  createdAt: string;
  firedAt: string | null;
}

function getReminderStore(): Reminder[] {
  const db = readDB();
  if (!db.reminders) db.reminders = [];
  return db.reminders;
}

function saveReminderStore(reminders: Reminder[]): void {
  const db = readDB();
  db.reminders = reminders;
  writeDB(db);
}

export function addReminder(reminder: Omit<Reminder, 'id' | 'createdAt' | 'status' | 'firedAt'>): Reminder {
  const all = getReminderStore();
  const now = new Date().toISOString();
  const newReminder: Reminder = {
    id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    ...reminder,
    status: 'pending',
    createdAt: now,
    firedAt: null,
  };
  all.push(newReminder);
  saveReminderStore(all);
  return newReminder;
}

export function getDueReminders(): Reminder[] {
  const all = getReminderStore();
  const now = new Date().toISOString();
  return all
    .filter(r => r.status === 'pending' && r.dueAt && r.dueAt <= now)
    .slice(0, 10);
}

export function fireReminder(id: string): void {
  const all = getReminderStore();
  const r = all.find(r => r.id === id);
  if (r) {
    r.status = 'fired';
    r.firedAt = new Date().toISOString();
    saveReminderStore(all);
  }
}

// ── Memories ──

export function addMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt' | 'lastRetrievedAt' | 'retrieveCount'>): Memory {
  const all = getMemoryStore();

  // Deduplicate: check if similar memory exists
  const existing = all.find(m =>
    m.userId === memory.userId &&
    m.type === memory.type &&
    contentSimilarity(m.content, memory.content) > 0.7,
  );

  const now = new Date().toISOString();

  if (existing) {
    // Merge: increase confidence, update content if new one has higher confidence
    existing.content = memory.confidence > existing.confidence ? memory.content : existing.content;
    existing.keywords = dedupeKeywords([...existing.keywords, ...memory.keywords]);
    existing.confidence = Math.min(1, existing.confidence + 0.1);
    existing.updatedAt = now;
    saveMemoryStore(all);
    return existing;
  }

  const newMemory: Memory = {
    id: generateId(),
    ...memory,
    createdAt: now,
    updatedAt: now,
    lastRetrievedAt: null,
    retrieveCount: 0,
  };

  all.push(newMemory);
  saveMemoryStore(all);
  return newMemory;
}

export function removeMemory(id: string): boolean {
  const all = getMemoryStore();
  const idx = all.findIndex(m => m.id === id);
  if (idx === -1) return false;
  all.splice(idx, 1);
  saveMemoryStore(all);
  return true;
}

export function decayMemories(userId: string, types: MemoryType[] = ['habit', 'knowledge']): void {
  const all = getMemoryStore();
  let changed = false;
  for (const m of all) {
    if (m.userId === userId && types.includes(m.type) && m.confidence > 0.2) {
      m.confidence = Math.max(0.1, m.confidence - 0.05);
      changed = true;
    }
  }
  if (changed) saveMemoryStore(all);
}

export function formatMemoriesForContext(memories: Memory[]): string {
  if (memories.length === 0) return '';

  const lines: string[] = [];
  const byType: Record<string, Memory[]> = {};
  for (const m of memories) {
    (byType[m.type] ||= []).push(m);
  }

  const labels: Record<string, string> = {
    preference: 'Preferences',
    fact: 'Facts about the user',
    habit: 'User habits',
    knowledge: 'User knowledge',
  };

  for (const [type, mems] of Object.entries(byType)) {
    lines.push(`## ${labels[type] || type}`);
    for (const m of mems) {
      lines.push(`- ${m.content} (confidence: ${m.confidence.toFixed(1)})`);
    }
  }

  return lines.join('\n');
}

// ── Helpers ──

function contentSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let overlap = 0;
  for (const w of tokensA) {
    if (tokensB.has(w)) overlap++;
  }
  return overlap / Math.max(tokensA.size, tokensB.size);
}

function dedupeKeywords(keywords: string[]): string[] {
  return [...new Set(keywords.map(k => k.toLowerCase()))].slice(0, 10);
}
