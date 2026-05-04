export type MemoryType = 'preference' | 'fact' | 'habit' | 'knowledge';

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
}

export interface MemoryQuery {
  userId?: string;
  /** Free-text search — matched against keywords and content */
  query?: string;
  type?: MemoryType;
  limit?: number;
  minConfidence?: number;
}

export interface ExtractedMemory {
  type: MemoryType;
  content: string;
  keywords: string[];
  confidence: number;
}
