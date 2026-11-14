#!/usr/bin/env node
//
// npm "build" script — decision 82 §3 (2026-09-24).
//
// Runs `next build` with NEXT_TELEMETRY_DISABLED=1 baked into the BUILD
// SCRIPT ITSELF, not into an environment variable someone has to remember to
// set. Two hard constraints from this task's order:
//
//   1. The build runs on Windows, in predeploy AND in plain `npm run build`.
//      `VAR=1 cmd` (the Unix inline-env-var prefix) is a syntax error in
//      cmd.exe — package.json's "build" script CANNOT be
//      "NEXT_TELEMETRY_DISABLED=1 next build" and work on this host.
//   2. No new package installs (no network available to this session) — so
//      no cross-env or similar.
//
// First attempt (kept here as a documented dead end, not silently deleted —
// rule 17's spirit): spawnSync(node_modules/.bin/next.cmd, ['build'], { env
// }). This FAILED on this host with EINVAL — Node's spawnSync cannot exec a
// Windows .cmd file directly without `shell: true`, and `shell: true` would
// re-introduce a shell (and its own quoting rules) into the one place this
// task explicitly wants none.
//
// Fix, verified working (see this task's report for the exact commands):
// invoke `node <next's own JS CLI entry>` directly — node_modules/next/dist/
// bin/next is a plain Node script (`#!/usr/bin/env node`), not a shell
// wrapper. Spawning it via `process.execPath` needs no shell at all, on any
// platform, and the env var is set through spawnSync's own `env` option —
// never parsed by a shell, so it needs no per-platform branching.
//
// resolveNextCli/buildChildEnv are exported (not just inlined below) so
// scripts/test/runNextBuild.test.cjs can exercise the real logic — path
// resolution and env merging — without re-running an actual `next build`
// (slow, and already proven by hand for this task; see the report) inside
// the fast unit-test suite.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveNextCli(cwd) {
  const p = join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');
  return existsSync(p) ? p : null;
}

export function buildChildEnv(baseEnv) {
  return { ...baseEnv, NEXT_TELEMETRY_DISABLED: '1' };
}

function isMain() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMain()) {
  const cwd = process.cwd();
  const nextCli = resolveNextCli(cwd);

  if (!nextCli) {
    console.error(`✗ run-next-build: expected Next's CLI entry at ${join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next')} — is node_modules installed?`);
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [nextCli, 'build'], {
    cwd,
    stdio: 'inherit',
    env: buildChildEnv(process.env),
  });

  if (result.error) {
    console.error('✗ run-next-build: failed to spawn next build:', result.error);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}
