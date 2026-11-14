#!/usr/bin/env node
//
// npm postbuild — runs automatically right after `next build` succeeds.
// Stamps out/ with the commit it was actually built from, so
// deploy-guard-post.mjs can tell a fresh out/ from a stale one.
//
// README.md's "The build is not deterministic" section is why this can't be
// done by comparing file contents or counts: buildId and chunk-hash suffixes
// differ on every run of the same commit. The stamp is a direct, checkable
// fact instead of an inference from noisy output.
//
// out/.deploy-stamp.json is never uploaded: firebase.json's hosting.ignore
// already excludes every dotfile (`**/.*`) from the actual deploy.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getBranch, getHeadCommit, writeStamp } from './lib/deployGuard.mjs';

const cwd = process.cwd();
const outDir = join(cwd, 'out');

if (!existsSync(outDir)) {
  console.error('✗ write-deploy-stamp: out/ does not exist — next build did not produce it');
  process.exit(1);
}

const commit = getHeadCommit(cwd);
const branch = getBranch(cwd);
const builtAt = new Date().toISOString();

writeStamp(cwd, { commit, branch, builtAt });
console.log(`✓ wrote out/.deploy-stamp.json (${commit.slice(0, 7)} @ ${branch})`);
