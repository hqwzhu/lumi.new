import crypto from 'crypto';
import { normalizeMachineCode } from './machine_code';

export interface LicensePayload {
  v: 1;
  product: 'lumi-os';
  machineCode: string;
  licenseId: string;
  issuedAt: string;
  expiresAt?: string;
  edition?: string;
}

export type LicenseFailureReason =
  | 'invalid_format'
  | 'invalid_payload'
  | 'invalid_signature'
  | 'wrong_product'
  | 'machine_mismatch'
  | 'expired';

export type LicenseVerificationResult =
  | { ok: true; payload: LicensePayload }
  | { ok: false; reason: LicenseFailureReason; message: string };

export interface VerifyLicenseOptions {
  machineCode: string;
  publicKeyPem?: string;
  now?: Date;
}

const DEFAULT_LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEANVv1/fdhRiyVfM2f1eTVKjuH0cO04m+Nr7PKkhp6NOQ=
-----END PUBLIC KEY-----`;

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeBase64UrlJson(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

function isLicensePayload(value: unknown): value is LicensePayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<LicensePayload>;
  return payload.v === 1
    && payload.product === 'lumi-os'
    && typeof payload.machineCode === 'string'
    && typeof payload.licenseId === 'string'
    && typeof payload.issuedAt === 'string'
    && (payload.expiresAt === undefined || typeof payload.expiresAt === 'string')
    && (payload.edition === undefined || typeof payload.edition === 'string');
}

function failure(reason: LicenseFailureReason, message: string): LicenseVerificationResult {
  return { ok: false, reason, message };
}

export function getLicensePublicKeyPem(): string {
  return process.env.LUMI_LICENSE_PUBLIC_KEY?.replace(/\\n/g, '\n') || DEFAULT_LICENSE_PUBLIC_KEY;
}

export function createLicenseCodeForTesting(payload: LicensePayload, privateKeyPem: string): string {
  const payloadSegment = base64UrlJson({
    ...payload,
    machineCode: normalizeMachineCode(payload.machineCode),
  });
  const signature = crypto.sign(null, Buffer.from(payloadSegment, 'utf8'), privateKeyPem).toString('base64url');
  return `LUMI1-${payloadSegment}.${signature}`;
}

export function verifyLicenseCode(code: string, options: VerifyLicenseOptions): LicenseVerificationResult {
  const trimmed = String(code || '').trim();
  if (!trimmed.startsWith('LUMI1-')) {
    return failure('invalid_format', 'Authorization code must start with LUMI1-.');
  }

  const body = trimmed.slice('LUMI1-'.length);
  const segments = body.split('.');
  if (segments.length !== 2 || !segments[0] || !segments[1]) {
    return failure('invalid_format', 'Authorization code is incomplete.');
  }

  const [payloadSegment, signatureSegment] = segments;
  let payload: unknown;
  let signature: Buffer;
  try {
    payload = decodeBase64UrlJson(payloadSegment);
    signature = Buffer.from(signatureSegment, 'base64url');
  } catch {
    return failure('invalid_format', 'Authorization code is not valid base64url data.');
  }

  if (!isLicensePayload(payload)) {
    return failure('invalid_payload', 'Authorization payload is missing required fields.');
  }

  let signatureValid = false;
  try {
    signatureValid = crypto.verify(
      null,
      Buffer.from(payloadSegment, 'utf8'),
      options.publicKeyPem || getLicensePublicKeyPem(),
      signature,
    );
  } catch {
    return failure('invalid_signature', 'Authorization signature cannot be verified.');
  }

  if (!signatureValid) {
    return failure('invalid_signature', 'Authorization signature does not match.');
  }

  if (payload.product !== 'lumi-os') {
    return failure('wrong_product', 'Authorization code is not for Lumi OS.');
  }

  if (normalizeMachineCode(payload.machineCode) !== normalizeMachineCode(options.machineCode)) {
    return failure('machine_mismatch', 'Authorization code belongs to another computer.');
  }

  if (payload.expiresAt) {
    const expiresAt = Date.parse(payload.expiresAt);
    if (!Number.isFinite(expiresAt)) {
      return failure('invalid_payload', 'Authorization expiry time is invalid.');
    }
    if ((options.now || new Date()).getTime() > expiresAt) {
      return failure('expired', 'Authorization code has expired.');
    }
  }

  return {
    ok: true,
    payload: {
      ...payload,
      machineCode: normalizeMachineCode(payload.machineCode),
    },
  };
}
