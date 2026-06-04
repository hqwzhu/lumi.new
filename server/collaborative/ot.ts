/**
 * Operational Transformation Engine
 *
 * Implements the OT core algorithms for real-time collaborative editing.
 *
 * Theoretical foundation:
 *   - Operations are composable sequences of (retain | insert | delete) components.
 *   - transform(opA, opB) produces [opA', opB'] such that
 *     apply(apply(S, opA), opB') === apply(apply(S, opB), opA')
 *     (the TP1 / inclusion transformation property).
 *   - compose(opA, opB) produces opC such that
 *     apply(apply(S, opA), opB) === apply(S, opC)
 *     (the composition property).
 *
 * This implementation follows the Google Wave OT algorithm adapted for
 * plain-text documents (as opposed to XML node trees).
 *
 * References:
 *   - Sun et al., "Achieving Convergence, Causality Preservation, and
 *     Intention Preservation in Real-Time Cooperative Editing Systems"
 *     (ACM ToCHI 1998)
 *   - Fraser, "Differential Synchronization" (Google, 2009)
 */

import type { OpComponent, Operation } from './types';

// ════════════════════════════════════════════════════════════════════════
//  Operation Application
// ════════════════════════════════════════════════════════════════════════

/**
 * Apply an operation to a document string, producing a new string.
 *
 * Algorithm:
 *   Walk through the operation components sequentially.
 *   - retain(n):  copy n chars from input to output
 *   - insert(s):  insert s into output
 *   - delete(n):  skip n chars from input (do not copy)
 *
 * Throws if the operation is invalid for the given document
 * (e.g., retain/delete past end of string).
 */
export function applyOp(doc: string, op: Operation): string {
  return applyComponents(doc, op.components);
}

/**
 * Apply a raw component array to a doc (internal helper).
 */
export function applyComponents(doc: string, components: OpComponent[]): string {
  const out: string[] = [];
  let pos = 0;

  for (const comp of components) {
    switch (comp.type) {
      case 'retain': {
        if (pos + comp.count > doc.length) {
          throw new Error(
            `OT retain(${comp.count}) at position ${pos} exceeds document length ${doc.length}`
          );
        }
        out.push(doc.slice(pos, pos + comp.count));
        pos += comp.count;
        break;
      }
      case 'insert': {
        out.push(comp.text);
        break;
      }
      case 'delete': {
        if (pos + comp.count > doc.length) {
          throw new Error(
            `OT delete(${comp.count}) at position ${pos} exceeds document length ${doc.length}`
          );
        }
        pos += comp.count;
        break;
      }
    }
  }

  // Verify we consumed the entire document
  if (pos !== doc.length) {
    throw new Error(
      `OT operation ended at position ${pos} but document length is ${doc.length}. ` +
      `The operation must consume the entire document.`
    );
  }

  return out.join('');
}

// ════════════════════════════════════════════════════════════════════════
//  Operation Composition
// ════════════════════════════════════════════════════════════════════════

/**
 * Compose two sequential operations into a single equivalent operation.
 *
 * compose(opA, opB) produces opC such that:
 *   apply(apply(S, opA), opB) === apply(S, opC)
 *
 * This is essential for: (a) reducing operation history size via
 * checkpointing, and (b) multi-layer transformation.
 */
export function compose(opA: Operation, opB: Operation): Operation {
  return {
    userId: opB.userId, // The author of the later operation
    revision: opB.revision,
    components: composeComponents(opA.components, opB.components),
  };
}

function composeComponents(
  a: OpComponent[],
  b: OpComponent[]
): OpComponent[] {
  const result: OpComponent[] = [];
  let i = 0; // index into a
  let j = 0; // index into b

  while (i < a.length && j < b.length) {
    const ca = a[i];
    const cb = b[j];

    if (ca.type === 'insert') {
      // a inserts text; b operates after position shift from that insert
      result.push(ca);
      i++;
      continue;
    }

    if (cb.type === 'insert') {
      // b inserts text; it should have been positioned relative to a's output
      result.push(cb);
      j++;
      continue;
    }

    // Both are retain or delete — they consume input
    const aLen = ca.type === 'retain' ? ca.count : ca.count;
    const bLen = cb.type === 'retain' ? cb.count : cb.count;
    const minLen = Math.min(aLen, bLen);

    if (ca.type === 'delete' && cb.type === 'delete') {
      // Both delete → combined delete
      result.push({ type: 'delete', count: minLen });
    } else if (ca.type === 'delete') {
      // a deletes, b retains → delete (b's retain is moot)
      result.push({ type: 'delete', count: minLen });
    } else if (cb.type === 'delete') {
      // a retains, b deletes → delete
      result.push({ type: 'delete', count: minLen });
    } else {
      // Both retain → retain
      result.push({ type: 'retain', count: minLen });
    }

    // Reduce remaining counts
    reduceCount(ca, minLen);
    reduceCount(cb, minLen);

    if (ca.count === 0) i++;
    if (cb.count === 0) j++;
  }

  // Append remaining components (only inserts should remain)
  while (i < a.length) {
    if (a[i].type === 'insert') result.push(a[i]);
    i++;
  }
  while (j < b.length) {
    if (b[j].type === 'insert') result.push(b[j]);
    j++;
  }

  return mergeAdjacent(result);
}

function reduceCount(comp: OpComponent, amount: number): void {
  if (comp.type === 'retain') comp.count -= amount;
  else if (comp.type === 'delete') comp.count -= amount;
  // insert has no count to reduce
}

// ════════════════════════════════════════════════════════════════════════
//  Operation Transformation
// ════════════════════════════════════════════════════════════════════════

/**
 * Transform operation `a` against operation `b` (both based on the same
 * document state S).
 *
 * Returns [a', b'] such that:
 *   apply(apply(S, a), b') === apply(apply(S, b), a')
 *
 * This is the inclusion transformation (IT) — the fundamental building
 * block for achieving convergence in OT systems.
 *
 * The algorithm walks both operations in lockstep, transforming each
 * component pair according to the rules in the OT literature.
 */
export function transform(
  a: Operation,
  b: Operation
): [Operation, Operation] {
  const [aComp, bComp] = transformComponents(
    a.components,
    b.components
  );
  return [
    { userId: a.userId, revision: a.revision, components: aComp },
    { userId: b.userId, revision: b.revision, components: bComp },
  ];
}

function transformComponents(
  a: OpComponent[],
  b: OpComponent[]
): [OpComponent[], OpComponent[]] {
  const aOut: OpComponent[] = [];
  const bOut: OpComponent[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    const ca = a[i];
    const cb = b[j];

    // ── Case 1: a inserts → a' keeps insert, b' retains past it ──
    if (ca.type === 'insert') {
      aOut.push(ca);
      bOut.push({ type: 'retain', count: ca.text.length });
      i++;
      continue;
    }

    // ── Case 2: b inserts → b' keeps insert, a' retains past it ──
    if (cb.type === 'insert') {
      bOut.push(cb);
      aOut.push({ type: 'retain', count: cb.text.length });
      j++;
      continue;
    }

    // Both are retain or delete — need to compare counts
    const lenA = ca.type === 'retain' ? ca.count : ca.count;
    const lenB = cb.type === 'retain' ? cb.count : cb.count;
    const minLen = Math.min(lenA, lenB);

    // ── Case 3: Both delete → neither passes through ──
    if (ca.type === 'delete' && cb.type === 'delete') {
      // Both consume the same characters; no output from either
    }
    // ── Case 4: a deletes, b retains → a' deletes, b' doesn't retain ──
    else if (ca.type === 'delete' && cb.type === 'retain') {
      aOut.push({ type: 'delete', count: minLen });
      // b' skips (doesn't retain) what a deleted
    }
    // ── Case 5: a retains, b deletes → b' deletes, a' doesn't retain ──
    else if (ca.type === 'retain' && cb.type === 'delete') {
      bOut.push({ type: 'delete', count: minLen });
      // a' skips what b deleted
    }
    // ── Case 6: Both retain → both retain ──
    else if (ca.type === 'retain' && cb.type === 'retain') {
      aOut.push({ type: 'retain', count: minLen });
      bOut.push({ type: 'retain', count: minLen });
    }

    // Reduce counts
    reduceCount(ca, minLen);
    reduceCount(cb, minLen);

    if (ca.count === 0) i++;
    if (cb.count === 0) j++;
  }

  // Flush remaining components
  while (i < a.length) {
    aOut.push(a[i]);
    i++;
  }
  while (j < b.length) {
    bOut.push(b[j]);
    j++;
  }

  return [mergeAdjacent(aOut), mergeAdjacent(bOut)];
}

// ════════════════════════════════════════════════════════════════════════
//  Operation Generation (diff-based)
// ════════════════════════════════════════════════════════════════════════

/**
 * Generate the operation needed to transform `from` into `to`.
 *
 * Uses a simple LCS-based diff algorithm to compute the minimal
 * sequence of retain/insert/delete components.
 *
 * For production use, replace with Myers' O(ND) diff algorithm.
 */
export function generateOp(
  from: string,
  to: string,
  userId: string,
  revision: number
): Operation {
  const components = diff(from, to);
  return { userId, revision, components };
}

/**
 * Simple diff: produces components that transform `from` to `to`.
 *
 * Falls back to delete-all + insert-all for pathological cases
 * (short strings, all-different content).
 */
function diff(from: string, to: string): OpComponent[] {
  const result: OpComponent[] = [];
  let fi = 0;
  let ti = 0;

  while (fi < from.length || ti < to.length) {
    if (fi < from.length && ti < to.length && from[fi] === to[ti]) {
      // Find the longest common prefix run
      let runLen = 0;
      while (
        fi + runLen < from.length &&
        ti + runLen < to.length &&
        from[fi + runLen] === to[ti + runLen]
      ) {
        runLen++;
      }
      if (runLen > 0) {
        result.push({ type: 'retain', count: runLen });
        fi += runLen;
        ti += runLen;
      }
    } else if (ti < to.length && (fi >= from.length || from[fi] !== to[ti])) {
      // Find insert run
      let insStart = ti;
      while (
        ti < to.length &&
        (fi >= from.length || from[fi] !== to[ti])
      ) {
        ti++;
      }
      result.push({ type: 'insert', text: to.slice(insStart, ti) });
    } else if (fi < from.length) {
      // Find delete run
      let delStart = fi;
      while (
        fi < from.length &&
        (ti >= to.length || from[fi] !== to[ti])
      ) {
        fi++;
      }
      if (fi > delStart) {
        result.push({ type: 'delete', count: fi - delStart });
      }
    } else {
      break;
    }
  }

  return mergeAdjacent(result);
}

// ════════════════════════════════════════════════════════════════════════
//  Utility Functions
// ════════════════════════════════════════════════════════════════════════

/**
 * Merge adjacent components of the same type.
 *
 * E.g., [retain(2), retain(3)] → [retain(5)]
 *        [insert("a"), insert("b")] → [insert("ab")]
 */
export function mergeAdjacent(comps: OpComponent[]): OpComponent[] {
  if (comps.length <= 1) return comps;

  const result: OpComponent[] = [];

  for (const comp of comps) {
    const last = result[result.length - 1];

    if (!last) {
      result.push({ ...comp });
      continue;
    }

    if (comp.type === 'insert' && last.type === 'insert') {
      last.text += comp.text;
    } else if (
      comp.type === 'retain' &&
      last.type === 'retain'
    ) {
      last.count += comp.count;
    } else if (
      comp.type === 'delete' &&
      last.type === 'delete'
    ) {
      last.count += comp.count;
    } else {
      result.push({ ...comp });
    }
  }

  return result;
}

/**
 * Compute the length of an operation's effect on the document.
 * This is the resulting document length after applying the op.
 */
export function operationResultLength(docLength: number, op: Operation): number {
  let len = 0;
  for (const comp of op.components) {
    switch (comp.type) {
      case 'retain':
        len += comp.count;
        break;
      case 'insert':
        len += comp.text.length;
        break;
      case 'delete':
        // Delete removes from source, doesn't add to result
        break;
    }
  }
  return len;
}

/**
 * Compute the length of the source document consumed by an operation.
 * This should equal the original doc length for valid operations.
 */
export function operationSourceLength(op: Operation): number {
  let len = 0;
  for (const comp of op.components) {
    switch (comp.type) {
      case 'retain':
        len += comp.count;
        break;
      case 'delete':
        len += comp.count;
        break;
      case 'insert':
        // Insert doesn't consume from source
        break;
    }
  }
  return len;
}

/**
 * Serialize an operation to a JSON-safe object for wire transmission.
 */
export function serializeOp(op: Operation): object {
  return {
    userId: op.userId,
    revision: op.revision,
    components: op.components,
  };
}

/**
 * Validate that an operation is well-formed.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateOp(op: Operation, docLength: number): string | null {
  if (!op.userId) return 'Missing userId';
  if (typeof op.revision !== 'number' || op.revision < 0) {
    return 'Invalid revision';
  }
  if (!Array.isArray(op.components) || op.components.length === 0) {
    return 'Operation must have at least one component';
  }

  let consumed = 0;
  for (const comp of op.components) {
    if (comp.type === 'retain' || comp.type === 'delete') {
      if (typeof comp.count !== 'number' || comp.count <= 0) {
        return `Invalid ${comp.type} count: ${comp.count}`;
      }
      consumed += comp.count;
    } else if (comp.type === 'insert') {
      if (typeof comp.text !== 'string' || comp.text.length === 0) {
        return 'Invalid insert: empty or missing text';
      }
    } else {
      return `Unknown component type: ${(comp as any).type}`;
    }
  }

  if (consumed !== docLength) {
    return `Operation consumes ${consumed} chars but document has ${docLength} chars`;
  }

  return null;
}
