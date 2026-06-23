import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { exportMacosReleaseKit } from './macos-release-exporter.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');

try {
  const result = exportMacosReleaseKit(projectDir);

  console.log('macOS release kit exported:');
  console.log(`  DMG:           ${result.dmgPath}`);
  console.log(`  App archive:   ${result.appArchivePath}`);
  console.log(`  SHA256SUMS:    ${result.checksumPath}`);
  console.log(`  Manifest:      ${result.manifestPath}`);
  console.log(`  Release notes: ${result.releaseNotesPath}`);
  console.log(`  DMG SHA256:    ${result.manifest.dmgSha256}`);
  console.log(`  App SHA256:    ${result.manifest.appArchiveSha256}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
