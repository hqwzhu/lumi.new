import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';

const NODE_OPTIONS_SANITIZER = `function __lumiStripRelativeHideConsolePreload(nodeOptions) {
  if (!nodeOptions) return undefined;
  const tokens = nodeOptions.split(/\\s+/).filter(Boolean);
  const kept = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const next = tokens[i + 1];
    const isSeparateRequire = (token === '--require' || token === '-r') && next && next.includes('hide-console.cjs');
    const isInlineRequire = /^(--require=|-r=).*[\\\\/]?hide-console\\.cjs$/.test(token);
    if (isSeparateRequire) {
      i += 1;
      continue;
    }
    if (isInlineRequire) continue;
    kept.push(token);
  }
  return kept.length > 0 ? kept.join(' ') : undefined;
}
function __lumiSanitizeNodeOptionsForDesktopChildren() {
  const cleaned = __lumiStripRelativeHideConsolePreload(process.env.NODE_OPTIONS);
  if (cleaned) process.env.NODE_OPTIONS = cleaned;
  else delete process.env.NODE_OPTIONS;
}
__lumiSanitizeNodeOptionsForDesktopChildren();
`;

await build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist-server/server.mjs',
  external: ['sqlite3', 'sharp', '@img/sharp-win32-x64', '@img/sharp-libvips-win32-x64', 'lightningcss'],
  banner: {
    js: `import { createRequire as __lumiCreateRequire } from 'module'; const require = __lumiCreateRequire(import.meta.url);
${NODE_OPTIONS_SANITIZER}`,
  },
});

// Generate entry.cjs for CommonJS environments (Tauri node.exe, production serve)
mkdirSync('dist-server', { recursive: true });
writeFileSync('dist-server/entry.cjs', `// CJS entry point - dynamically imports the ESM server bundle.

${NODE_OPTIONS_SANITIZER}

// Monkey-patch child_process to hide console windows on Windows (desktop app)
if (process.platform === 'win32') {
  const cp = require('child_process');
  const origSpawn = cp.spawn;
  const origExec = cp.exec;
  const origExecSync = cp.execSync;
  const origFork = cp.fork;

  cp.spawn = function (cmd, args, opts) {
    if (!opts) opts = {};
    if (opts.windowsHide === undefined) opts.windowsHide = true;
    return origSpawn.call(this, cmd, args, opts);
  };
  cp.exec = function (cmd, opts, cb) {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    if (!opts) opts = {};
    if (opts.windowsHide === undefined) opts.windowsHide = true;
    return origExec.call(this, cmd, opts, cb);
  };
  cp.execSync = function (cmd, opts) {
    if (!opts) opts = {};
    if (opts.windowsHide === undefined) opts.windowsHide = true;
    return origExecSync.call(this, cmd, opts);
  };
  cp.fork = function (mod, args, opts) {
    if (!opts) opts = {};
    if (opts.windowsHide === undefined) opts.windowsHide = true;
    return origFork.call(this, mod, args, opts);
  };
}

import('./server.mjs').catch(err => {
  console.error('Failed to start Lumi OS server:', err);
  process.exit(1);
});
`);

// Generate hide-console.cjs — required by Tauri production spawn via NODE_OPTIONS (Windows only)
if (process.platform === 'win32') {
writeFileSync('dist-server/hide-console.cjs', `// Hide console window on Windows desktop app
if (process.platform === 'win32') {
  const { exec } = require('child_process');
  exec('powershell -WindowStyle Hidden -Command ""', { windowsHide: true });
}
`);
console.log('[build-server] Generated dist-server/hide-console.cjs');
} else {
console.log('[build-server] Skipped hide-console.cjs (not Windows)');
}

console.log('[build-server] Generated dist-server/server.mjs + dist-server/entry.cjs + dist-server/hide-console.cjs');
