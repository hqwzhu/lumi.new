import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeApp } from './helpers';
import { mountLicenseRoutes } from '../server/routes/license_routes';
import { createLicenseCodeForTesting } from '../server/license/license_code';

vi.mock('../server/license/machine_code', async () => {
  const actual = await vi.importActual<typeof import('../server/license/machine_code')>('../server/license/machine_code');
  return {
    ...actual,
    createMachineCode: () => 'LUMI-WIN-ROUTE12345',
  };
});

function testKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

describe('license routes', () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let previousPublicKey: string | undefined;
  let keys: ReturnType<typeof testKeyPair>;

  beforeEach(async () => {
    previousPublicKey = process.env.LUMI_LICENSE_PUBLIC_KEY;
    keys = testKeyPair();
    process.env.LUMI_LICENSE_PUBLIC_KEY = keys.publicKeyPem;
    ctx = await makeApp();
    mountLicenseRoutes(ctx.apiRouter);
  });

  afterEach(() => {
    ctx.cleanup();
    if (previousPublicKey === undefined) {
      delete process.env.LUMI_LICENSE_PUBLIC_KEY;
    } else {
      process.env.LUMI_LICENSE_PUBLIC_KEY = previousPublicKey;
    }
  });

  it('returns machine code and inactive state by default', async () => {
    const res = await fetch(`${ctx.url}/api/license/status`);
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.machineCode).toBe('LUMI-WIN-ROUTE12345');
    expect(body.activated).toBe(false);
    expect(body.requiresActivation).toBe(true);
  });

  it('rejects an invalid authorization code', async () => {
    const res = await fetch(`${ctx.url}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseCode: 'bad-code' }),
    });
    const body = await res.json() as any;

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.reason).toBe('invalid_format');
  });

  it('activates with a signed license code for this machine', async () => {
    const code = createLicenseCodeForTesting({
      v: 1,
      product: 'lumi-os',
      machineCode: 'LUMI-WIN-ROUTE12345',
      licenseId: 'LIC-ROUTE-001',
      issuedAt: '2026-06-24T00:00:00.000Z',
      edition: 'windows',
    }, keys.privateKeyPem);

    const activateRes = await fetch(`${ctx.url}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseCode: code }),
    });
    const activateBody = await activateRes.json() as any;

    expect(activateRes.status).toBe(200);
    expect(activateBody.success).toBe(true);
    expect(activateBody.state.activated).toBe(true);
    expect(activateBody.state.licenseCode).toBeUndefined();
    expect(activateBody.state.payload.licenseId).toBe('LIC-ROUTE-001');

    const statusRes = await fetch(`${ctx.url}/api/license/status`);
    const statusBody = await statusRes.json() as any;
    expect(statusBody.activated).toBe(true);
    expect(statusBody.requiresActivation).toBe(false);
  });

  it('rejects a signed license code for another machine', async () => {
    const code = createLicenseCodeForTesting({
      v: 1,
      product: 'lumi-os',
      machineCode: 'LUMI-WIN-OTHER00000',
      licenseId: 'LIC-ROUTE-002',
      issuedAt: '2026-06-24T00:00:00.000Z',
      edition: 'windows',
    }, keys.privateKeyPem);

    const res = await fetch(`${ctx.url}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseCode: code }),
    });
    const body = await res.json() as any;

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.reason).toBe('machine_mismatch');
  });
});
