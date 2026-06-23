#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log(`
Lumi OS license utility

Initialize a signing key pair:
  node scripts/generate-license-code.mjs --init-keypair --out-dir ./license-authority

Generate a license code:
  node scripts/generate-license-code.mjs --machine-code LUMI-WIN-ABCDE12345 --private-key-file ./license-authority/lumi-license-private-key.pem

Options:
  --init-keypair                 Create Ed25519 private/public PEM files
  --out-dir <dir>                Output directory for --init-keypair
  --machine-code <code>          Machine code shown in Lumi OS
  --private-key-file <file>      Private signing key PEM file
  --license-id <id>              Optional license id, defaults to LIC-<timestamp>
  --expires-at <iso-date>        Optional ISO expiry timestamp
  --edition <edition>            Optional edition, defaults to windows

Environment fallback:
  LUMI_LICENSE_PRIVATE_KEY       Private key PEM content, with real newlines or \\n
  LUMI_LICENSE_PRIVATE_KEY_FILE  Private key PEM file path
`);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function normalizeMachineCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function readPrivateKey(args) {
  const inline = process.env.LUMI_LICENSE_PRIVATE_KEY;
  if (inline) return inline.replace(/\\n/g, '\n');

  const file = args['private-key-file'] || process.env.LUMI_LICENSE_PRIVATE_KEY_FILE;
  if (!file) throw new Error('Missing --private-key-file or LUMI_LICENSE_PRIVATE_KEY.');
  return fs.readFileSync(path.resolve(file), 'utf8');
}

function initKeypair(outDirValue) {
  const outDir = path.resolve(String(outDirValue || './license-authority'));
  fs.mkdirSync(outDir, { recursive: true });
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicPath = path.join(outDir, 'lumi-license-public-key.pem');
  const privatePath = path.join(outDir, 'lumi-license-private-key.pem');
  fs.writeFileSync(publicPath, publicPem, { mode: 0o600 });
  fs.writeFileSync(privatePath, privatePem, { mode: 0o600 });
  console.log(`Public key: ${publicPath}`);
  console.log(`Private key: ${privatePath}`);
  console.log('');
  console.log('Keep the private key out of GitHub and user download packages.');
  console.log('Use the public key in Lumi OS as LUMI_LICENSE_PUBLIC_KEY or the built-in app key.');
}

function generateLicense(args) {
  const machineCode = normalizeMachineCode(args['machine-code']);
  if (!/^LUMI-[A-Z]+-[A-Z0-9]{10,64}$/.test(machineCode)) {
    throw new Error('Machine code must look like LUMI-WIN-ABCDE12345.');
  }

  const issuedAt = new Date().toISOString();
  const payload = {
    v: 1,
    product: 'lumi-os',
    machineCode,
    licenseId: String(args['license-id'] || `LIC-${issuedAt.replace(/[-:.TZ]/g, '').slice(0, 14)}`),
    issuedAt,
    edition: String(args.edition || 'windows'),
  };
  if (args['expires-at']) payload.expiresAt = String(args['expires-at']);

  const payloadSegment = base64UrlJson(payload);
  const signature = crypto.sign(null, Buffer.from(payloadSegment, 'utf8'), readPrivateKey(args)).toString('base64url');
  const code = `LUMI1-${payloadSegment}.${signature}`;

  console.log(JSON.stringify({
    licenseCode: code,
    payload,
  }, null, 2));
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    usage();
    process.exit(0);
  }
  if (args['init-keypair']) {
    initKeypair(args['out-dir']);
  } else if (args['machine-code']) {
    generateLicense(args);
  } else {
    usage();
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
