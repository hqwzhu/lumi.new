import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  exportWindowsReleaseKit,
  validateWindowsReleaseKit,
} from './windows-installer-exporter.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');

try {
  const result = exportWindowsReleaseKit(projectDir);
  const validation = validateWindowsReleaseKit(projectDir);
  if (!validation.ok) {
    throw new Error(`Windows release kit validation failed for ${validation.installerName}`);
  }

  console.log('Windows release kit exported:');
  console.log(`  Installer:     ${result.installerPath}`);
  console.log(`  SHA256SUMS:    ${result.checksumPath}`);
  console.log(`  Manifest:      ${result.manifestPath}`);
  console.log(`  Release notes: ${result.releaseNotesPath}`);
  console.log(`  Size:          ${result.manifest.size} bytes`);
  console.log(`  SHA256:        ${result.manifest.sha256}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
