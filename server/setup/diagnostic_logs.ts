import fs from 'fs';
import path from 'path';
import { getDataPath } from '../config/data_path';

export type DiagnosticEventLevel = 'info' | 'warning' | 'error' | 'fatal';
export type DiagnosticEventSource = 'renderer' | 'server' | 'tauri' | 'setup';

export interface DiagnosticEventInput {
  source: DiagnosticEventSource;
  level: DiagnosticEventLevel;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export interface DiagnosticEvent extends DiagnosticEventInput {
  timestamp: string;
}

const LOG_RELATIVE_PATH = 'diagnostics/lumi-diagnostics.jsonl';
const MAX_STRING_LENGTH = 2000;

function diagnosticLogPath(): string {
  return getDataPath(LOG_RELATIVE_PATH);
}

function redactString(value: string): string {
  return value
    .replace(/\bsk-[A-Za-z0-9_\-]{8,}\b/g, '[REDACTED]')
    .replace(/\b(api[_-]?key|token|secret|authorization)\s*[:=]\s*["']?[^"'\s,;}]+/gi, '$1=[REDACTED]')
    .replace(/\bBearer\s+[A-Za-z0-9._\-+/=]+/gi, 'Bearer [REDACTED]')
    .slice(0, MAX_STRING_LENGTH);
}

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map(item => redactValue(item));
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 80)) {
      if (/key|token|secret|password|authorization/i.test(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactValue(item);
      }
    }
    return result;
  }
  return value;
}

function normalizeLevel(level: unknown): DiagnosticEventLevel {
  return level === 'info' || level === 'warning' || level === 'fatal' ? level : 'error';
}

function normalizeSource(source: unknown): DiagnosticEventSource {
  return source === 'server' || source === 'tauri' || source === 'setup' ? source : 'renderer';
}

export function appendDiagnosticEvent(input: DiagnosticEventInput): DiagnosticEvent {
  const event: DiagnosticEvent = {
    timestamp: new Date().toISOString(),
    source: normalizeSource(input.source),
    level: normalizeLevel(input.level),
    message: redactString(String(input.message || 'Unknown diagnostic event')),
    stack: input.stack ? redactString(input.stack) : undefined,
    context: redactValue(input.context || {}) as Record<string, unknown>,
  };

  const logPath = diagnosticLogPath();
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(event)}\n`);
  return event;
}

export function getRecentDiagnosticEvents(limit = 50): DiagnosticEvent[] {
  const logPath = diagnosticLogPath();
  if (!fs.existsSync(logPath)) return [];

  const lines = fs.readFileSync(logPath, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  return lines
    .slice(-Math.max(1, limit))
    .reverse()
    .map(line => {
      try {
        return JSON.parse(line) as DiagnosticEvent;
      } catch {
        return {
          timestamp: new Date(0).toISOString(),
          source: 'server',
          level: 'warning',
          message: 'A diagnostic log entry could not be parsed.',
        } satisfies DiagnosticEvent;
      }
    });
}

export function getDiagnosticLogFilePath(): string {
  return diagnosticLogPath();
}
