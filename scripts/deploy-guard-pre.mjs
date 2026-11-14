#!/usr/bin/env node
//
// predeploy step 1/3 — decision 80 §5 (2026-09-24), wepsite.
//
// Runs BEFORE `next build` so the build only ever reads a tree that matches
// HEAD: rejects any modified tracked file (d4b151e's rule, no path
// restriction), and any untracked or gitignored-but-present file sitting
// inside a build-source path (public/, app/, components/, lib/, or the
// listed root config files — see scripts/lib/deployGuard.mjs).
//
// Wired into firebase.json's hosting.predeploy. Also runnable standalone:
//   node scripts/deploy-guard-pre.mjs
// or: npm run deploy:guard:pre

import { checkCleanTree, formatViolation } from './lib/deployGuard.mjs';

const cwd = process.cwd();
const { ok, violations } = checkCleanTree(cwd);

if (!ok) {
  console.error('\n✗ deploy guard (pre-build): working tree is not clean for a deploy\n');
  for (const v of violations) {
    console.error(`  ${formatViolation(v)}`);
  }
  console.error(
    `\n  ${violations.length} violation(s). Commit tracked changes, and remove or commit\n` +
      '  the untracked/gitignored files listed above, before deploying. If a file\n' +
      '  genuinely belongs, add a reasoned entry to EXCEPTIONS in\n' +
      '  scripts/lib/deployGuard.mjs — decision 77 §1.\n'
  );
  process.exit(1);
}

console.log('✓ deploy guard (pre-build): working tree clean, no stray files in build sources');
