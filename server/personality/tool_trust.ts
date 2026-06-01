/**
 * Tool trust learning — tracks per-user tool approval patterns.
 * After N consecutive approvals, a tool is auto-demoted from requireConfirmation.
 * After M consecutive denials, it's promoted back.
 */
import { readDB, writeDB } from '../../db_layer';

const TRUST_THRESHOLD = 5;       // consecutive approves before demotion
const DISTRUST_THRESHOLD = 2;    // consecutive denials before re-promotion

interface ToolTrustRecord {
  toolName: string;
  approves: number;   // consecutive approves (reset on denial)
  denies: number;     // consecutive denies (reset on approve)
  lastSeen: string;   // ISO timestamp
}

let cache: Map<string, ToolTrustRecord[]> | null = null;

function loadTrust(userId: string): ToolTrustRecord[] {
  if (!cache) cache = new Map();
  if (cache.has(userId)) return cache.get(userId)!;

  try {
    const db = readDB();
    const setting = (db.settings || []).find((s: any) => s.key === `tool_trust_${userId}`);
    if (setting) {
      const records = JSON.parse(setting.value) as ToolTrustRecord[];
      cache.set(userId, records);
      return records;
    }
  } catch {}
  const empty: ToolTrustRecord[] = [];
  cache.set(userId, empty);
  return empty;
}

function saveTrust(userId: string, records: ToolTrustRecord[]): void {
  cache?.set(userId, records);
  try {
    const db = readDB();
    if (!db.settings) db.settings = [];
    const idx = db.settings.findIndex((s: any) => s.key === `tool_trust_${userId}`);
    if (idx >= 0) {
      db.settings[idx].value = JSON.stringify(records);
    } else {
      db.settings.push({ key: `tool_trust_${userId}`, value: JSON.stringify(records) });
    }
    writeDB(db);
  } catch {}
}

function findOrCreate(records: ToolTrustRecord[], toolName: string): ToolTrustRecord {
  const existing = records.find(r => r.toolName === toolName);
  if (existing) return existing;
  const record: ToolTrustRecord = { toolName, approves: 0, denies: 0, lastSeen: new Date().toISOString() };
  records.push(record);
  return record;
}

/**
 * Called when a user allows a confirm-level tool.
 * Returns true if the tool should now be permanently auto-approved.
 */
export function recordToolApprove(userId: string, toolName: string): boolean {
  const records = loadTrust(userId);
  const record = findOrCreate(records, toolName);
  record.approves++;
  record.denies = 0;
  record.lastSeen = new Date().toISOString();
  saveTrust(userId, records);

  if (record.approves >= TRUST_THRESHOLD) {
    // Clear the record so it doesn't keep growing
    record.approves = 0;
    saveTrust(userId, records);
    return true; // signal: promote this tool
  }
  return false;
}

/**
 * Called when a user denies a confirm-level tool.
 * Returns true if trust was lost and the tool should be re-promoted to confirm.
 */
export function recordToolDeny(userId: string, toolName: string): boolean {
  const records = loadTrust(userId);
  const record = findOrCreate(records, toolName);
  record.denies++;
  record.approves = 0;
  record.lastSeen = new Date().toISOString();
  saveTrust(userId, records);

  if (record.denies >= DISTRUST_THRESHOLD) {
    record.denies = 0;
    saveTrust(userId, records);
    return true; // signal: demote this tool back to confirm
  }
  return false;
}

/**
 * Get the current trusted tools list for this user
 * (tools that have reached the trust threshold at some point but haven't been revoked)
 */
export function getTrustedTools(userId: string): string[] {
  const records = loadTrust(userId);
  // Tools with 0 approves and 0 denies that WERE previously trusted
  // are indicated by reset-to-zero after hitting threshold
  return records
    .filter(r => r.approves === 0 && r.denies === 0 && r.lastSeen)
    .map(r => r.toolName);
}
