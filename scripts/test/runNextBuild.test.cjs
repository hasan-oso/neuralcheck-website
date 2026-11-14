'use strict';

// scripts/run-next-build.mjs — decision 82 §3, 2026-09-24.
//
// The build must run with NEXT_TELEMETRY_DISABLED=1 baked into the script,
// not an ambient env var (this repo's build runs on Windows, where
// `VAR=1 cmd` is a syntax error, and no cross-env-style package can be
// installed this session — no network). A first attempt (spawning
// node_modules/.bin/next.cmd directly) failed on this host with EINVAL —
// documented in run-next-build.mjs's own comment, not silently dropped.
//
// This suite does NOT re-run a real `next build` (slow, and already proven
// by hand for this task — see the report for the exact commands, including
// proof that spawnSync-ing next.cmd directly throws EINVAL on this host
// while `node <next's real JS CLI entry>` does not). It exercises the real
// exported logic — path resolution and env merging — and proves the exact
// env-passing mechanism this script uses actually reaches a child process,
// via a real spawnSync of a throwaway script (not a next build).
//
// Run: node scripts/test/runNextBuild.test.cjs

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

let pass = 0;
let total = 0;
function check(name, cond) {
  total += 1;
  if (cond) {
    pass += 1;
  } else {
    console.error(`  FAIL: ${name}`);
  }
}

(async () => {
  const { resolveNextCli, buildChildEnv } = await import('../run-next-build.mjs');

  // -----------------------------------------------------------------------
  // resolveNextCli — finds the real Next.js CLI entry in THIS repo's own
  // node_modules (not a fixture — the actual file `npm run build` spawns).
  // -----------------------------------------------------------------------
  const repoRoot = path.join(__dirname, '..', '..');
  const cli = resolveNextCli(repoRoot);
  check('resolveNextCli: finds a real file under node_modules/next/dist/bin/next', !!cli && fs.existsSync(cli));
  check('resolveNextCli: the file is a plain Node script, not a .cmd shell wrapper (no shell needed to run it)', cli && !cli.endsWith('.cmd'));

  check('resolveNextCli: returns null for a directory with no next installed', resolveNextCli(os.tmpdir()) === null);

  // -----------------------------------------------------------------------
  // buildChildEnv — always sets NEXT_TELEMETRY_DISABLED=1, and never drops
  // the rest of the base environment (a real build still needs PATH etc.).
  // -----------------------------------------------------------------------
  const env = buildChildEnv({ SOME_OTHER_VAR: 'kept', PATH: '/usr/bin' });
  check('buildChildEnv: sets NEXT_TELEMETRY_DISABLED to "1"', env.NEXT_TELEMETRY_DISABLED === '1');
  check('buildChildEnv: keeps other base env vars untouched', env.SOME_OTHER_VAR === 'kept' && env.PATH === '/usr/bin');

  // -----------------------------------------------------------------------
  // End-to-end proof of the actual mechanism run-next-build.mjs uses to
  // launch next build: spawnSync(process.execPath, [<jsFile>], { env:
  // buildChildEnv(...) }) — no shell involved at all. A throwaway script
  // (not next itself) reads back its own NEXT_TELEMETRY_DISABLED to prove
  // the env value really reaches the child process, independent of
  // whatever this HOST machine's own global Next telemetry preference
  // happens to be (verified separately, by hand, to already read
  // "Disabled" regardless of this env var on this machine — see the
  // report; that made `next telemetry status` unusable as a black-box
  // proof, which is why this test checks propagation directly instead).
  // -----------------------------------------------------------------------
  const echoScript = path.join(os.tmpdir(), `run-next-build-test-echo-${process.pid}.js`);
  fs.writeFileSync(
    echoScript,
    "console.log('NEXT_TELEMETRY_DISABLED=' + JSON.stringify(process.env.NEXT_TELEMETRY_DISABLED));"
  );
  try {
    const withoutOverride = spawnSync(process.execPath, [echoScript], {
      encoding: 'utf8',
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: undefined },
    });
    check(
      'without buildChildEnv: the child does not see NEXT_TELEMETRY_DISABLED=1 by itself',
      !withoutOverride.stdout.includes('NEXT_TELEMETRY_DISABLED="1"')
    );

    const withOverride = spawnSync(process.execPath, [echoScript], {
      encoding: 'utf8',
      env: buildChildEnv(process.env),
    });
    check(
      'with buildChildEnv (the real mechanism run-next-build.mjs uses): the child sees NEXT_TELEMETRY_DISABLED="1"',
      withOverride.stdout.trim() === 'NEXT_TELEMETRY_DISABLED="1"'
    );
  } finally {
    fs.unlinkSync(echoScript);
  }

  console.log(`${pass}/${total} assertions passed`);
  if (pass !== total) process.exit(1);
})();
