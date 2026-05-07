/**
 * Workflow recorder — captures tool execution traces for pattern detection.
 * Keeps last 50 workflows in memory; the scheduler periodically checks
 * for repeatable patterns and triggers skill generation.
 */

export interface WorkflowStep {
  name: string;
  args: Record<string, any>;
  resultSummary: string;   // first 200 chars of tool result
}

export interface WorkflowRecord {
  id: string;
  userId: string;
  userIntent: string;       // LLM-summarized intent of the user's request
  toolSequence: WorkflowStep[];
  conversationExcerpt: string; // user's original message (for context)
  timestamp: string;
}

const recentWorkflows: WorkflowRecord[] = [];
const MAX_WORKFLOWS = 50;

function generateId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/** Record a completed tool execution workflow */
export function recordWorkflow(record: Omit<WorkflowRecord, 'id' | 'timestamp'>): WorkflowRecord {
  const entry: WorkflowRecord = {
    id: generateId(),
    ...record,
    timestamp: new Date().toISOString(),
  };
  recentWorkflows.push(entry);
  if (recentWorkflows.length > MAX_WORKFLOWS) {
    recentWorkflows.shift();
  }
  console.log(`[Worklog] Recorded workflow "${record.userIntent.slice(0, 50)}" (${record.toolSequence.length} tools)`);
  return entry;
}

/** Get recent workflows (for pattern detection) */
export function getRecentWorkflows(userId?: string): WorkflowRecord[] {
  if (userId) return recentWorkflows.filter(w => w.userId === userId);
  return [...recentWorkflows];
}

/** Clear all workflows */
export function clearWorkflows(): void {
  recentWorkflows.length = 0;
}

/** Count how many workflows match a given intent (simple keyword overlap for now) */
export function countSimilarWorkflows(intent: string, threshold = 3): WorkflowRecord[] {
  const intentLower = intent.toLowerCase();
  const tokens = intentLower.split(/\s+/).filter(w => w.length > 2);

  const matches = recentWorkflows.filter(w => {
    const wLower = w.userIntent.toLowerCase();
    let hits = 0;
    for (const t of tokens) {
      if (wLower.includes(t)) hits++;
    }
    return hits >= Math.min(2, tokens.length);
  });

  return matches.length >= threshold ? matches : [];
}
