import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'data', 'lumi.db');
const DB_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: sqlite3.Database | null = null;
let memoryDB: any = null;

export async function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) { reject(err); return; }
      db!.run('PRAGMA foreign_keys = ON', async (err) => {
        if (err) { reject(err); return; }
        await migrateSchema();
        await createTables();
        await loadMemoryDB();
        resolve();
      });
    });
  });
}

// Add missing columns to existing tables (safe on old DB)
function migrateSchema(): Promise<void> {
  return new Promise((resolve) => {
    // Add 'phone' column to users if it doesn't exist (old DB lacks it)
    db!.run("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''", () => {});
    // Add 'status' column to agents if it doesn't exist
    db!.run("ALTER TABLE agents ADD COLUMN status TEXT DEFAULT 'active'", () => {});
    // Add 'role' column to interactions if it doesn't exist
    db!.run("ALTER TABLE interactions ADD COLUMN role TEXT DEFAULT ''", () => {});
    // Add 'personality' column to interactions if it doesn't exist
    db!.run("ALTER TABLE interactions ADD COLUMN personality TEXT DEFAULT ''", () => {});
    // Add 'mode' column to interactions if it doesn't exist
    db!.run("ALTER TABLE interactions ADD COLUMN mode TEXT DEFAULT ''", () => {});
    // Add 'toolCalls' column to interactions if it doesn't exist
    db!.run("ALTER TABLE interactions ADD COLUMN toolCalls TEXT DEFAULT ''", () => {});
    // Add 'conversationId' column to interactions if it doesn't exist
    db!.run("ALTER TABLE interactions ADD COLUMN conversationId TEXT DEFAULT ''", () => {});
    // Add agent framework columns
    db!.run("ALTER TABLE agents ADD COLUMN personalityId TEXT DEFAULT 'lumi'", () => {});
    db!.run("ALTER TABLE agents ADD COLUMN modelPreference TEXT DEFAULT ''", () => {});
    db!.run("ALTER TABLE agents ADD COLUMN memoryScope TEXT DEFAULT 'shared'", () => {});
    db!.run("ALTER TABLE agents ADD COLUMN autonomyLevel TEXT DEFAULT 'reactive'", () => {});
    db!.run("ALTER TABLE agents ADD COLUMN runtimeConfig TEXT DEFAULT '{}'", () => {});
    // Add agentId to memories for agent-private memory
    db!.run("ALTER TABLE memories ADD COLUMN agentId TEXT DEFAULT ''", () => {});
    // Add memories table if it doesn't exist
    db!.run(`CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      keywords TEXT NOT NULL DEFAULT '[]',
      confidence REAL NOT NULL DEFAULT 0.5,
      sourceInteractionId TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastRetrievedAt TEXT,
      retrieveCount INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'episodic',
      perspective TEXT NOT NULL DEFAULT 'owner_trait',
      importance REAL NOT NULL DEFAULT 0.3,
      parentId TEXT
    )`, () => {});
    // Migrate: add new columns to existing memories table
    db!.run("ALTER TABLE memories ADD COLUMN tier TEXT NOT NULL DEFAULT 'episodic'", () => {});
    db!.run("ALTER TABLE memories ADD COLUMN perspective TEXT NOT NULL DEFAULT 'owner_trait'", () => {});
    db!.run("ALTER TABLE memories ADD COLUMN importance REAL NOT NULL DEFAULT 0.3", () => {});
    db!.run("ALTER TABLE memories ADD COLUMN parentId TEXT", () => {});
    // Add reminders table if it doesn't exist
    db!.run(`CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      content TEXT NOT NULL,
      dueAt TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      sourceInteractionId TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      firedAt TEXT
    )`, () => {});
    // Give SQLite time for ALTER TABLEs to complete
    setTimeout(resolve, 200);
  });
}

function createTables(): Promise<void> {
  return new Promise((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        balance REAL DEFAULT 0,
        phone TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        config TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        userId TEXT,
        status TEXT DEFAULT 'active',
        personalityId TEXT DEFAULT 'lumi',
        modelPreference TEXT DEFAULT '',
        memoryScope TEXT DEFAULT 'shared',
        autonomyLevel TEXT DEFAULT 'reactive',
        runtimeConfig TEXT DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        agentId TEXT,
        module TEXT,
        message TEXT NOT NULL,
        response TEXT,
        role TEXT DEFAULT '',
        personality TEXT DEFAULT '',
        mode TEXT DEFAULT '',
        toolCalls TEXT DEFAULT '',
        conversationId TEXT DEFAULT '',
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS marketplace_skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        author TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS founder_vision (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        content TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        agentId TEXT,
        title TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        summary TEXT DEFAULT '',
        messageCount INTEGER DEFAULT 0,
        lastActiveAt TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `;

    db!.exec(sql, (err) => {
      if (err) { reject(err); return; }
      insertInitialData().then(resolve).catch(reject);
    });
  });
}

async function insertInitialData(): Promise<void> {
  const tables = ['users', 'agents', 'interactions', 'marketplace_skills', 'skills', 'founder_vision'];
  const counts: { [table: string]: number } = {};

  for (const table of tables) {
    const count = await query<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM ${table}`);
    counts[table] = count[0]?.cnt ?? 0;
  }

  if (counts.users === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const now = new Date().toISOString();
    await run(
      `INSERT INTO users (uid, username, password, role, balance, phone, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['admin-uid', 'admin', hashedPassword, 'admin', 1000, '', now]
    );
  }

  if (counts.marketplace_skills === 0) {
    const defaultSkills = [
      ['skill-1', '财务报表分析 LoRA', 'LumiNode_01', 50, '针对企业财务报表的深度微调权重，支持自动化对账与异常检测。', 'Finance'],
      ['skill-2', '创意剧本创作 LoRA', 'CreativeMind', 30, '专注于科幻与悬疑风格的剧本创作，具备极强的逻辑连贯性。', 'Creative'],
      ['skill-3', '医疗辅助诊断 LoRA', 'HealthGuard', 100, '基于公开医疗数据集微调，辅助识别常见病症与用药建议。', 'Medical']
    ];
    for (const skill of defaultSkills) {
      await run(`INSERT INTO marketplace_skills (id, name, author, price, description, category) VALUES (?, ?, ?, ?, ?, ?)`, skill);
    }
  }

  if (counts.skills === 0) {
    const coreSkills = [
      ['vision', 'Vision Core', 'Advanced image recognition and spatial awareness.'],
      ['logic', 'Logic Engine', 'Complex reasoning and mathematical problem solving.'],
      ['empathy', 'Empathy Module', 'Emotional intelligence and nuanced conversation.']
    ];
    for (const skill of coreSkills) {
      await run(`INSERT INTO skills (id, name, description) VALUES (?, ?, ?)`, skill);
    }
  }

  if (counts.founder_vision === 0) {
    await run(
      `INSERT INTO founder_vision (id, content, updatedAt) VALUES (?, ?, ?)`,
      [1, 'LumiAI 旨在构建一个去中心化的智能协议。我们追求空间存在感、边缘计算与数据主权。通过分布式节点，每一个用户都能拥有真正属于自己的、可进化的数字生命。', new Date().toISOString()]
    );
  }
}

// Load database and map old column names to field names server.ts expects
async function loadMemoryDB(): Promise<void> {
  const users = await query<any>('SELECT * FROM users');
  const agentsRaw = await query<any>('SELECT * FROM agents');
  const interactionsRaw = await query<any>('SELECT * FROM interactions');
  const marketplaceSkills = await query<any>('SELECT * FROM marketplace_skills');
  const skills = await query<any>('SELECT * FROM skills');
  const founderVisionRow = await query<any>('SELECT content FROM founder_vision WHERE id = 1');
  const founderVision = founderVisionRow[0]?.content || '';

  // Load memories
  const memoriesRaw = await query<any>('SELECT * FROM memories');
  const memories = memoriesRaw.map((m: any) => ({
    ...m,
    keywords: m.keywords ? JSON.parse(m.keywords) : [],
  }));

  // Load reminders
  const remindersRaw = await query<any>('SELECT * FROM reminders');

  // Load conversations
  const conversationsRaw = await query<any>('SELECT * FROM conversations');

  // Map old column names to the field names that server.ts expects
  const agents = agentsRaw.map((a: any) => ({
    ...a,
    ownerUid: a.userId || a.ownerUid,
    data: a.config || a.data || '{}',
    personalityId: a.personalityId || 'lumi',
    modelPreference: a.modelPreference || '',
    memoryScope: a.memoryScope || 'shared',
    autonomyLevel: a.autonomyLevel || 'reactive',
    runtimeConfig: a.runtimeConfig || '{}',
  }));

  const interactions = interactionsRaw.map((i: any) => ({
    ...i,
    content: i.message || i.content || '',
    role: i.role || '',
    personality: i.personality || i.module || '',
    mode: i.mode || '',
    toolCalls: i.toolCalls ? JSON.parse(i.toolCalls) : undefined,
    conversationId: i.conversationId || '',
  }));

  memoryDB = {
    users,
    agents,
    interactions,
    marketplaceSkills,
    skills,
    founderVision,
    memories: memories || [],
    reminders: remindersRaw || [],
    conversations: conversationsRaw || [],
  };
}

function run(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db!.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db!.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export function readDB(): any {
  if (!memoryDB) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return memoryDB;
}

// Write lock to prevent concurrent SQLite transactions
let writeLock: Promise<void> = Promise.resolve();

export function writeDB(data: any): void {
  if (!db) {
    throw new Error('Database not initialized.');
  }
  memoryDB = data;
  // Chain writes so only one transaction runs at a time. Keep the chain alive,
  // but never hide persistence failures.
  const ready = writeLock.catch((err) => {
    console.error('[DB] Previous write failed:', err);
  });
  writeLock = ready
    .then(() => persistMemoryDB())
    .catch((err) => {
      console.error('[DB] Failed to persist database:', err);
    });
}

async function persistMemoryDB(): Promise<void> {
  const tables = ['interactions', 'agents', 'users', 'marketplace_skills', 'skills', 'founder_vision', 'memories', 'reminders', 'conversations'];

  await run('BEGIN TRANSACTION');
  try {
    for (const table of tables) {
      await run(`DELETE FROM ${table}`);
    }

    for (const user of memoryDB.users) {
      await run(
        `INSERT INTO users (uid, username, password, role, balance, phone, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user.uid, user.username, user.password, user.role, user.balance, user.phone || '', user.createdAt]
      );
    }

    for (const agent of memoryDB.agents) {
      await run(
        `INSERT INTO agents (id, name, category, config, createdAt, userId, status, personalityId, modelPreference, memoryScope, autonomyLevel, runtimeConfig) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          agent.id, agent.name, agent.category,
          agent.data || agent.config || '{}',
          agent.createdAt,
          agent.ownerUid || agent.userId || null,
          agent.status || 'active',
          agent.personalityId || 'lumi',
          agent.modelPreference || '',
          agent.memoryScope || 'shared',
          agent.autonomyLevel || 'reactive',
          agent.runtimeConfig || '{}',
        ]
      );
    }

    for (const interaction of memoryDB.interactions) {
      await run(
        `INSERT INTO interactions (id, userId, agentId, module, message, response, role, personality, mode, toolCalls, conversationId, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          interaction.id,
          interaction.userId || 'unknown',
          interaction.agentId || null,
          interaction.personality || interaction.module || null,
          interaction.content || interaction.message || '',
          interaction.response || '',
          interaction.role || '',
          interaction.personality || '',
          interaction.mode || '',
          interaction.toolCalls ? JSON.stringify(interaction.toolCalls) : '',
          interaction.conversationId || '',
          interaction.timestamp
        ]
      );
    }

    for (const memory of memoryDB.memories || []) {
      await run(
        `INSERT INTO memories (id, userId, type, content, keywords, confidence, sourceInteractionId, createdAt, updatedAt, lastRetrievedAt, retrieveCount, tier, perspective, importance, parentId, agentId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          memory.id,
          memory.userId,
          memory.type,
          memory.content,
          JSON.stringify(memory.keywords || []),
          memory.confidence || 0.5,
          memory.sourceInteractionId || '',
          memory.createdAt,
          memory.updatedAt,
          memory.lastRetrievedAt,
          memory.retrieveCount || 0,
          memory.tier || 'episodic',
          memory.perspective || 'owner_trait',
          memory.importance ?? 0.3,
          memory.parentId || null,
          memory.agentId || '',
        ]
      );
    }

    for (const reminder of memoryDB.reminders || []) {
      await run(
        `INSERT INTO reminders (id, userId, content, dueAt, status, sourceInteractionId, createdAt, firedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reminder.id,
          reminder.userId,
          reminder.content,
          reminder.dueAt || null,
          reminder.status || 'pending',
          reminder.sourceInteractionId || '',
          reminder.createdAt,
          reminder.firedAt || null,
        ]
      );
    }

    for (const conv of memoryDB.conversations || []) {
      await run(
        `INSERT INTO conversations (id, userId, agentId, title, status, summary, messageCount, lastActiveAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          conv.id,
          conv.userId,
          conv.agentId || '',
          conv.title || '',
          conv.status || 'active',
          conv.summary || '',
          conv.messageCount || 0,
          conv.lastActiveAt,
          conv.createdAt,
        ]
      );
    }

    for (const skill of memoryDB.marketplaceSkills) {
      await run(
        `INSERT INTO marketplace_skills (id, name, author, price, description, category) VALUES (?, ?, ?, ?, ?, ?)`,
        [skill.id, skill.name, skill.author, skill.price, skill.description, skill.category]
      );
    }

    for (const skill of memoryDB.skills) {
      await run(
        `INSERT INTO skills (id, name, description) VALUES (?, ?, ?)`,
        [skill.id, skill.name, skill.description]
      );
    }

    if (memoryDB.founderVision) {
      await run(
        `INSERT OR REPLACE INTO founder_vision (id, content, updatedAt) VALUES (?, ?, ?)`,
        [1, memoryDB.founderVision, new Date().toISOString()]
      );
    }

    await run('COMMIT');
  } catch (err) {
    await run('ROLLBACK');
    throw err;
  }
}

let initStarted = false;
export function ensureDatabaseInitialized(): Promise<void> {
  if (!initStarted) {
    initStarted = true;
    return initDatabase();
  }
  return Promise.resolve();
}

export async function querySQL<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return query<T>(sql, params);
}

export async function runSQL(sql: string, params: any[] = []): Promise<void> {
  return run(sql, params);
}
