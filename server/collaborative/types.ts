/**
 * Collaborative Editing — Type Definitions
 *
 * Implements the core data structures for Operational Transformation (OT)
 * as defined by Ellis & Gibbs (1989) with the TP2 transformation property
 * (convergence under concurrent operations) per Sun & Ellis (1998).
 *
 * Architecture:
 *   Client → (op, version) → Server → transform(serverOps, clientOp) → apply → broadcast
 *   Server → (op, version) → Client → transform(clientPendingOps, serverOp) → apply
 *
 * Reference:
 *   - Ellis & Gibbs, "Concurrency Control in Groupware Systems" (SIGMOD 1989)
 *   - Sun & Ellis, "Operational Transformation in Real-Time Group Editors" (CSCW 1998)
 */

// ── Operation Primitives ────────────────────────────────────────────────

/** A single atomic operation component */
export type OpComponent =
  | { type: 'retain'; count: number }
  | { type: 'insert'; text: string }
  | { type: 'delete'; count: number };

/** An operation is an ordered list of components that transforms a document */
export interface Operation {
  /** Client/author identifier */
  userId: string;
  /** Client-local revision counter at time of creation */
  revision: number;
  /** Ordered sequence of operation components */
  components: OpComponent[];
}

// ── Document Model ──────────────────────────────────────────────────────

/** Document metadata stored in the database */
export interface DocumentMeta {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  /** Comma-separated list of collaborators */
  collaborators: string;
}

/** Full document state — metadata + content + revision */
export interface DocumentState {
  meta: DocumentMeta;
  content: string;
  /** Monotonic server revision counter */
  revision: number;
}

// ── WebSocket Protocol ──────────────────────────────────────────────────

/** Events emitted by the client → server */
export enum ClientEvent {
  /** Join a document editing session */
  JOIN_DOCUMENT = 'doc:join',
  /** Leave a document editing session */
  LEAVE_DOCUMENT = 'doc:leave',
  /** Submit an operation */
  OPERATION = 'doc:op',
  /** Request full document state */
  REQUEST_STATE = 'doc:request-state',
  /** Update cursor position */
  CURSOR_UPDATE = 'doc:cursor',
  /** Request operation history for reconciliation */
  REQUEST_OPS = 'doc:request-ops',
}

/** Events emitted by the server → client */
export enum ServerEvent {
  /** Full document state (on join) */
  DOCUMENT_STATE = 'doc:state',
  /** Acknowledged operation with server revision */
  OP_ACK = 'doc:op:ack',
  /** Broadcast operation from another user */
  OP_BROADCAST = 'doc:op:broadcast',
  /** Cursor position update from another user */
  CURSOR_BROADCAST = 'doc:cursor:broadcast',
  /** User joined the document */
  USER_JOINED = 'doc:user:joined',
  /** User left the document */
  USER_LEFT = 'doc:user:left',
  /** Error notification */
  ERROR = 'doc:error',
  /** Operation history chunk for reconciliation */
  OPS_HISTORY = 'doc:ops-history',
}

// ── Wire Protocol Messages ──────────────────────────────────────────────

export interface OperationMessage {
  userId: string;
  revision: number;
  components: OpComponent[];
  /** The expected server revision this op was based on */
  baseRevision: number;
}

export interface CursorPosition {
  userId: string;
  /** Linear cursor offset in the document */
  offset: number;
  /** Optional selection length (0 = cursor only) */
  selectionLength: number;
  /** ISO timestamp */
  timestamp: string;
}

export interface DocumentErrorMessage {
  code: string;
  message: string;
}
