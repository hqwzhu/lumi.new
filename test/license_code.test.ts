import crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import {
  normalizeMachineCode,
  parseMachineCode,
} from '../server/license/machine_code';
import {
  createLicenseCodeForTesting,
  verifyLicenseCode,
  type LicensePayload,
} from '../server/license/license_code';

function testKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

function validPayload(machineCode = 'LUMI-WIN-ABCDE12345'): LicensePayload {
  return {
    v: 1,
    product: 'lumi-os',
    machineCode,
    licenseId: 'LIC-20260624-001',
    issuedAt: '2026-06-24T00:00:00.000Z',
    edition: 'windows',
  };
}

describe('license code verification', () => {
  it('normalizes machine codes for display and comparison', () => {
    expect(normalizeMachineCode(' lumi_win_abcde12345 ')).toBe('LUMI-WIN-ABCDE12345');
    expect(parseMachineCode('LUMI-WIN-ABCDE12345').prefix).toBe('LUMI-WIN');
    expect(parseMachineCode('LUMI-WIN-ABCDE12345').fingerprint).toBe('ABCDE12345');
  });

  it('accepts a signed license for the current machine code', () => {
    const keys = testKeyPair();
    const code = createLicenseCodeForTesting(validPayload(), keys.privateKeyPem);

    const result = verifyLicenseCode(code, {
      machineCode: 'lumi-win-abcde12345',
      publicKeyPem: keys.publicKeyPem,
      now: new Date('2026-06-24T12:00:00.000Z'),
    });

    expect(result.ok).toBe(true);
    if (result.ok === false) throw new Error(result.message);
    expect(result.payload?.licenseId).toBe('LIC-20260624-001');
  });

  it('rejects a license code signed for another computer', () => {
    const keys = testKeyPair();
    const code = createLicenseCodeForTesting(validPayload('LUMI-WIN-OTHER99999'), keys.privateKeyPem);

    const result = verifyLicenseCode(code, {
      machineCode: 'LUMI-WIN-ABCDE12345',
      publicKeyPem: keys.publicKeyPem,
      now: new Date('2026-06-24T12:00:00.000Z'),
    });

    expect(result.ok).toBe(false);
    if (result.ok === true) throw new Error('Expected machine mismatch failure.');
    expect(result.reason).toBe('machine_mismatch');
  });

  it('rejects expired license codes', () => {
    const keys = testKeyPair();
    const code = createLicenseCodeForTesting({
      ...validPayload(),
      expiresAt: '2026-06-23T00:00:00.000Z',
    }, keys.privateKeyPem);

    const result = verifyLicenseCode(code, {
      machineCode: 'LUMI-WIN-ABCDE12345',
      publicKeyPem: keys.publicKeyPem,
      now: new Date('2026-06-24T12:00:00.000Z'),
    });

    expect(result.ok).toBe(false);
    if (result.ok === true) throw new Error('Expected expired failure.');
    expect(result.reason).toBe('expired');
  });

  it('rejects tampered license codes', () => {
    const keys = testKeyPair();
    const code = createLicenseCodeForTesting(validPayload(), keys.privateKeyPem);
    const tamperedCode = code.replace('LUMI1-', 'LUMI1-X');

    const result = verifyLicenseCode(tamperedCode, {
      machineCode: 'LUMI-WIN-ABCDE12345',
      publicKeyPem: keys.publicKeyPem,
      now: new Date('2026-06-24T12:00:00.000Z'),
    });

    expect(result.ok).toBe(false);
    if (result.ok === true) throw new Error('Expected invalid format failure.');
    expect(result.reason).toBe('invalid_format');
  });
});
