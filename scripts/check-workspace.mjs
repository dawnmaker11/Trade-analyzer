import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const required = [
  'apps/web', 'apps/api', 'apps/worker', 'packages/contracts',
  'packages/provider-adapters', 'db/migrations', 'tests/fixtures',
  'docs/Trade-Architecture-and-Execution-Backlog-local.md',
  '.github/agents/trade-implementation.agent.md'
];

const missing = required.filter((item) => !fs.existsSync(path.join(root, item)));
if (missing.length) {
  console.error(`Workspace foundation check failed. Missing:\n${missing.join('\n')}`);
  process.exit(1);
}

console.log('Workspace foundation check passed.');
console.log(`Node: ${process.version}`);
console.log(`Root: ${root}`);
