import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { exportWindowsInstaller } from './windows-installer-exporter.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');

try {
  const result = exportWindowsInstaller(projectDir);
  console.log('Windows installer exported:');
  console.log(`  Source:      ${result.source}`);
  console.log(`  Destination: ${result.destination}`);
  console.log(`  Size:        ${result.size} bytes`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
