import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, rm, copyFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const outDir = path.join(root, 'dist-server');

const NODE_VERSION = '20.19.0';
const forceDownload = process.env.LUMI_FORCE_DOWNLOAD_NODE === '1';

const platformMap = {
  'win32-x64':  { os: 'win',   arch: 'x64', ext: 'zip' },
  'darwin-x64': { os: 'darwin', arch: 'x64', ext: 'tar.gz' },
  'darwin-arm64': { os: 'darwin', arch: 'arm64', ext: 'tar.gz' },
  'linux-x64':  { os: 'linux',  arch: 'x64', ext: 'tar.gz' },
};

const key = `${process.platform}-${process.arch}`;
const target = platformMap[key];
if (!target) {
  console.error(`[download-node] Unsupported platform: ${key}`);
  process.exit(1);
}

const { os: osName, arch, ext } = target;
const base = `node-v${NODE_VERSION}-${osName}-${arch}`;
const url = `https://nodejs.org/dist/v${NODE_VERSION}/${base}.${ext}`;
const nodeBinaryName = process.platform === 'win32' ? 'node.exe' : 'node';
const nodeOutPath = path.join(outDir, nodeBinaryName);

await mkdir(outDir, { recursive: true });

if (existsSync(nodeOutPath) && !forceDownload) {
  console.log(`[download-node] Reusing existing ${path.relative(root, nodeOutPath)}`);
  process.exit(0);
}

if (!forceDownload && process.execPath && existsSync(process.execPath)) {
  await copyFile(process.execPath, nodeOutPath);
  if (process.platform !== 'win32') {
    execSync(`chmod +x "${nodeOutPath}"`, { stdio: 'inherit' });
  }
  console.log(`[download-node] Copied current Node.js runtime to ${path.relative(root, nodeOutPath)}`);
  process.exit(0);
}

console.log(`[download-node] Downloading Node.js ${NODE_VERSION} for ${key}...`);
console.log(`[download-node] ${url}`);

const res = await fetch(url);
if (!res.ok) {
  console.error(`[download-node] HTTP ${res.status}: ${res.statusText}`);
  process.exit(1);
}

const tmpDir = path.join(os.tmpdir(), `lumi-node-${Date.now()}`);
await mkdir(tmpDir, { recursive: true });

const archivePath = path.join(tmpDir, `${base}.${ext}`);
const archiveFile = createWriteStream(archivePath);
await pipeline(res.body, archiveFile);

try {
  if (ext === 'zip') {
    execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${tmpDir}' -Force"`, { stdio: 'inherit' });
    await copyFile(path.join(tmpDir, base, 'node.exe'), nodeOutPath);
    console.log('[download-node] Extracted node.exe to dist-server/');
  } else {
    // macOS / Linux: extract only the node binary
    execSync(`tar -xzf "${archivePath}" -C "${tmpDir}" "${base}/bin/node"`, { stdio: 'inherit' });
    const extracted = path.join(tmpDir, base, 'bin', 'node');
    await copyFile(extracted, nodeOutPath);
    // Ensure executable permission
    execSync(`chmod +x "${nodeOutPath}"`, { stdio: 'inherit' });
    console.log('[download-node] Extracted node to dist-server/');
  }
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}

console.log('[download-node] Done');
