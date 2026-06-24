import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateWindowsReleaseKit } from './windows-installer-exporter.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');

try {
  const result = validateWindowsReleaseKit(projectDir);

  console.log('Windows release kit check:');
  console.log(`  Installer: ${result.installerName}`);
  console.log(`  Uninstaller: ${result.uninstallerName}`);
  console.log(`  Size:      ${result.size} bytes`);
  console.log(`  SHA256:    ${result.sha256}`);
  console.log(`  Uninstaller SHA256: ${result.uninstallerSha256}`);

  for (const check of result.resourceChecks) {
    console.log(`  ${check.ok ? 'OK' : 'MISSING'}: ${check.path}`);
  }

  if (!result.ok) {
    throw new Error('Windows release kit check failed.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
