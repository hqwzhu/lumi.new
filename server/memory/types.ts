export type MemoryType = 'preference' | 'fact' | 'habit' | 'knowledge';

/** Memory hierarchy tier — determines decay rate and retrieval priority */
export type MemoryTier = 'episodic'       // Raw conversation memories, fast decay
                       | 'internalized'  // Internalized preferences (Lumi's own)
                       | 'growth'        // Growth narratives, LLM-consolidated
                       | 'core_identity';// Core identity, never decays, protected

/** Whose perspective does this memory belong to */
export type MemoryPerspective = 'owner_trait'   // About the owner's traits
                              | 'lumi_self'     // Lumi's self-knowledge
                              | 'shared_memory' // "Our" shared experiences
                              | 'lumi_growth';  // Lumi's growth milestones

export interface Memory {
  id: string;
  userId: string;
  type: MemoryType;
  /** The memory text, e.g. "User prefers concise answers" */
  content: string;
  /** Normalized keywords for retrieval matching */
  keywords: string[];
  /** 0–1 confidence. Repeated confirmations raise it, contradictions lower it. */
  confidence: number;
  /** Interaction ID that produced this memory */
  sourceInteractionId: string;
  createdAt: string;
  updatedAt: string;
  lastRetrievedAt: string | null;
  retrieveCount: number;
  /** Memory hierarchy tier */
  tier: MemoryTier;
  /** Whose perspective */
  perspective: MemoryPerspective;
  /** 0–1 importance — separate from confidence. Core identity has 0.9+ */
  importance: number;
  /** Points to consolidated/derived memory, null if original */
  parentId: string | null;
  /** Agent ID for agent-private memories. Empty string = shared */
  agentId: string;
}

export interface MemoryQuery {
  userId?: string;
  /** Free-text search — matched against keywords and content */
  query?: string;
  type?: MemoryType;
  limit?: number;
  minConfidence?: number;
  tier?: MemoryTier;
  perspective?: MemoryPerspective;
  minImportance?: number;
  /** Only return memories without parentId (unconsolidated originals) */
  unconsolidatedOnly?: boolean;
  /** Filter by agent ID (empty string matches shared memories) */
  agentId?: string;
}

export interface ExtractedMemory {
  type: MemoryType;
  content: string;
  keywords: string[];
  confidence: number;
}
