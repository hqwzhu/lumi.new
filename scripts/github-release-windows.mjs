import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createWindowsGitHubReleasePlan } from './github-release-plan.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const repoArg = process.argv.find(arg => arg.startsWith('--repo='));
const repo = repoArg ? repoArg.slice('--repo='.length) : 'hqwzhu/lumi.new';

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const plan = createWindowsGitHubReleasePlan(projectDir, { repo });

console.log('Windows GitHub release plan:');
console.log(`  Repo:   ${plan.repo}`);
console.log(`  Tag:    ${plan.tag}`);
console.log(`  Title:  ${plan.title}`);
console.log(`  Notes:  ${plan.notesPath}`);
for (const asset of plan.assets) {
  console.log(`  Asset:  ${asset}`);
}

if (dryRun) {
  console.log('Dry run only. No GitHub release was created.');
  process.exit(0);
}

run('gh', ['auth', 'status']);
run('gh', [
  'release',
  'create',
  plan.tag,
  '--repo',
  plan.repo,
  '--title',
  plan.title,
  '--notes-file',
  plan.notesPath,
  ...plan.assets,
]);
