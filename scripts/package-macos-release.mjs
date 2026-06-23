import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { packageMacosRelease } from './macos-release-exporter.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');

try {
  const result = packageMacosRelease(projectDir);

  console.log('macOS release package created:');
  console.log(`  ${result.packagePath}`);
  console.log(`  ${result.size} bytes`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
