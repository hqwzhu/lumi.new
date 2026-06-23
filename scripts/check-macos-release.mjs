import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateMacosReleaseKit } from './macos-release-exporter.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');

try {
  const result = validateMacosReleaseKit(projectDir);

  console.log('macOS release kit check:');
  console.log(`  DMG:         ${result.dmgName}`);
  console.log(`  App archive: ${result.appArchiveName}`);
  console.log(`  Package:     ${result.packageName}${result.packageExists ? '' : ' (not created)'}`);
  console.log(`  DMG SHA256:  ${result.dmgSha256}`);
  console.log(`  App SHA256:  ${result.appArchiveSha256}`);

  for (const check of result.resourceChecks) {
    console.log(`  ${check.ok ? 'OK' : 'MISSING'}: ${check.path}`);
  }

  if (!result.ok) {
    throw new Error('macOS release kit check failed.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
