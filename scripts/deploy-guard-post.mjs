#!/usr/bin/env node
//
// predeploy step 3/3 — decision 80 §5 (2026-09-24), wepsite.
//
// Runs AFTER `next build`. Confirms out/ was actually built from the same
// commit step 1 (deploy-guard-pre.mjs) verified clean — rejecting a stale or
// foreign out/ (see verifyFreshness in scripts/lib/deployGuard.mjs) — then
// writes the deploy-log entry, before firebase uploads anything. Pattern on
// neuralcheck-backend's d4b151e (docs/deploy-log/commit-<time +03>.json).
//
// Wired into firebase.json's hosting.predeploy. Also runnable standalone:
//   node scripts/deploy-guard-post.mjs
// or: npm run deploy:guard:post

import { getBranch, getHeadCommit, verifyFreshness, writeDeployLog } from './lib/deployGuard.mjs';

const cwd = process.cwd();
const fresh = verifyFreshness(cwd);

if (!fresh.ok) {
  console.error(`\n✗ deploy guard (post-build): ${fresh.reason}\n`);
  process.exit(1);
}

const commit = getHeadCommit(cwd);
const branch = getBranch(cwd);
const file = writeDeployLog(cwd, { commit, branch });

console.log(`✓ deploy guard (post-build): out/ matches HEAD (${commit.slice(0, 7)})`);
console.log(`✓ wrote ${file}`);
