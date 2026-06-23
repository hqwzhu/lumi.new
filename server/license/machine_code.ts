import crypto from 'crypto';
import { execFileSync } from 'child_process';
import os from 'os';

export interface ParsedMachineCode {
  normalized: string;
  prefix: string;
  fingerprint: string;
}

function platformCode(): string {
  if (process.platform === 'win32') return 'WIN';
  if (process.platform === 'darwin') return 'MAC';
  if (process.platform === 'linux') return 'LINUX';
  return 'NODE';
}

export function normalizeMachineCode(value: string): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseMachineCode(value: string): ParsedMachineCode {
  const normalized = normalizeMachineCode(value);
  const match = normalized.match(/^(LUMI-[A-Z]+)-([A-Z0-9]{10,64})$/);
  if (!match) {
    throw new Error('Invalid Lumi OS machine code format.');
  }
  return {
    normalized,
    prefix: match[1],
    fingerprint: match[2],
  };
}

function readWindowsMachineGuid(): string | undefined {
  if (process.platform !== 'win32') return undefined;
  try {
    const output = execFileSync('reg', [
      'query',
      'HKLM\\SOFTWARE\\Microsoft\\Cryptography',
      '/v',
      'MachineGuid',
    ], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 3000,
    });
    const match = output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

function buildMachineSignals(): string[] {
  return [
    readWindowsMachineGuid(),
    os.hostname(),
    process.platform,
    process.arch,
    os.cpus()?.[0]?.model,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

export function createMachineCode(signals = buildMachineSignals()): string {
  const source = signals.join('|').toLowerCase();
  const fingerprint = crypto.createHash('sha256').update(source || 'lumi-os').digest('hex').slice(0, 20).toUpperCase();
  return `LUMI-${platformCode()}-${fingerprint}`;
}
