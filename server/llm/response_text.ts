export function cleanAssistantTextForDisplay(text: string | null | undefined): string | null {
  if (typeof text !== 'string') return null;

  let cleaned = text
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<reasoning\b[^>]*>[\s\S]*?<\/reasoning>/gi, '')
    .trim();

  const finalMarker = cleaned.match(/(?:最终答案|最终回答|结论|Final answer|Final|Answer)\s*[:：]\s*/i);
  if (finalMarker?.index !== undefined) {
    cleaned = cleaned.slice(finalMarker.index + finalMarker[0].length).trim();
  } else {
    cleaned = cleaned
      .replace(/^\s*(?:思考过程|推理过程|Reasoning|Thought process|Thinking)\s*[:：][\s\S]*?(?:\r?\n){2,}/i, '')
      .trim();
  }

  return cleaned.length > 0 ? cleaned : null;
}

export function cleanTextForSpeech(text: string | null | undefined): string {
  return cleanAssistantTextForDisplay(text) || '';
}

export class StreamingAssistantTextFilter {
  private buffer = '';
  private hiddenTag: string | null = null;
  private finalMarkerProcessed = false;

  push(chunk: string): string {
    if (!chunk) return '';

    this.buffer += chunk;
    let output = '';

    while (this.buffer.length > 0) {
      if (this.hiddenTag) {
        const close = new RegExp(`<\\/${this.hiddenTag}\\s*>`, 'i');
        const closeMatch = this.buffer.match(close);
        if (!closeMatch || closeMatch.index === undefined) {
          this.buffer = this.buffer.slice(Math.max(0, this.buffer.length - 32));
          return output;
        }
        this.buffer = this.buffer.slice(closeMatch.index + closeMatch[0].length);
        this.hiddenTag = null;
        continue;
      }

      const openMatch = this.buffer.match(/<(think|thinking|reasoning)\b[^>]*>/i);
      if (!openMatch || openMatch.index === undefined) {
        const safeLength = this.trailingSafeLength(this.buffer);
        if (safeLength <= 0) return output;
        output += this.buffer.slice(0, safeLength);
        this.buffer = this.buffer.slice(safeLength);
        continue;
      }

      if (openMatch.index > 0) {
        output += this.buffer.slice(0, openMatch.index);
      }
      this.hiddenTag = openMatch[1].toLowerCase();
      this.buffer = this.buffer.slice(openMatch.index + openMatch[0].length);
    }

    return this.applyFinalAnswerMarker(output);
  }

  flush(): string {
    const tail = this.hiddenTag ? '' : this.buffer;
    this.buffer = '';
    this.hiddenTag = null;
    return this.applyFinalAnswerMarker(tail);
  }

  private trailingSafeLength(text: string): number {
    const lower = text.toLowerCase();
    const candidates = ['<think', '<thinking', '<reasoning'];
    let keep = 0;
    for (const candidate of candidates) {
      const max = Math.min(candidate.length - 1, lower.length);
      for (let len = 1; len <= max; len++) {
        if (lower.endsWith(candidate.slice(0, len))) {
          keep = Math.max(keep, len);
        }
      }
    }
    return text.length - keep;
  }

  private applyFinalAnswerMarker(text: string): string {
    if (!text || this.finalMarkerProcessed) return text;
    const marker = text.match(/(?:最终答案|最终回答|结论|Final answer|Final|Answer)\s*[:：]\s*/i);
    if (!marker || marker.index === undefined) return text;
    this.finalMarkerProcessed = true;
    return text.slice(marker.index + marker[0].length);
  }
}
