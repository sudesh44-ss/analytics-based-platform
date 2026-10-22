// SiteScope Monorepo Environment & Workspace Verification Script
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- SiteScope Monorepo Structure Verification ---');

const expectedWorkspaces = ['frontend', 'backend', 'worker', 'database', 'shared', 'docs'];
let allPresent = true;

for (const ws of expectedWorkspaces) {
  const wsPath = path.join(rootDir, ws);
  if (fs.existsSync(wsPath)) {
    console.log(`[PASS] Workspace folder exists: ${ws}/`);
  } else {
    console.error(`[FAIL] Missing workspace folder: ${ws}/`);
    allPresent = false;
  }
}

const keyFiles = [
  'package.json',
  '.gitignore',
  'IMPLEMENTATION_STATUS.md',
  'database/migrations/00001_initial_schema.sql',
  'backend/src/server.ts',
  'worker/src/index.ts',
  'shared/src/index.ts',
  'frontend/package.json',
];

for (const f of keyFiles) {
  const filePath = path.join(rootDir, f);
  if (fs.existsSync(filePath)) {
    console.log(`[PASS] Critical asset exists: ${f}`);
  } else {
    console.error(`[FAIL] Missing asset: ${f}`);
    allPresent = false;
  }
}

if (allPresent) {
  console.log('\nAll SiteScope monorepo workspaces and assets verified successfully!');
  process.exit(0);
} else {
  console.error('\nVerification failed with missing assets.');
  process.exit(1);
}
