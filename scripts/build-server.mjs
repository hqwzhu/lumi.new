import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';

await build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist-server/server.mjs',
  external: ['sqlite3'],
  banner: {
    js: "import { createRequire as __lumiCreateRequire } from 'module'; const require = __lumiCreateRequire(import.meta.url);",
  },
});

// Generate entry.cjs for CommonJS environments (Tauri node.exe, production serve)
mkdirSync('dist-server', { recursive: true });
writeFileSync('dist-server/entry.cjs', `// CJS entry point - dynamically imports the ESM server bundle.
import('./server.mjs').catch(err => {
  console.error('Failed to start Lumi OS server:', err);
  process.exit(1);
});
`);

console.log('[build-server] Generated dist-server/server.mjs + dist-server/entry.cjs');
