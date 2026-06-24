import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { exportWindowsReleaseKit } from './windows-installer-exporter.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');

try {
  const result = exportWindowsReleaseKit(projectDir);

  console.log('Windows release kit exported:');
  console.log(`  Installer:     ${result.installerPath}`);
  console.log(`  Uninstaller:   ${result.uninstallerCmdPath}`);
  console.log(`  SHA256SUMS:    ${result.checksumPath}`);
  console.log(`  Manifest:      ${result.manifestPath}`);
  console.log(`  Release notes: ${result.releaseNotesPath}`);
  console.log(`  Size:          ${result.manifest.size} bytes`);
  console.log(`  SHA256:        ${result.manifest.sha256}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
