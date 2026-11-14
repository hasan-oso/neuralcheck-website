'use strict';

// scripts/lib/deployGuard.mjs — decision 80 §5, 2026-09-24. Deploy-log +
// dirty-tree/stray-build-source guard, on the pattern of neuralcheck-
// backend's d4b151e, extended for a static export (decision 77 §1: catch a
// gitignored file that still gets shipped) and for the build's documented
// non-determinism (README.md — a freshness stamp instead of a file diff).
//
// Every check below runs against a throwaway git repo under the OS temp
// dir, created and destroyed by this file. This suite never touches this
// repository's (wepsite's) own git state — rule: agents in this repo do not
// run git commands that mutate its working tree/history as a side effect of
// a test.
//
// Run: node scripts/test/deployGuard.test.cjs

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

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

function sh(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8' });
}

function makeTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-guard-test-'));
  sh('git', ['init', '-q'], dir);
  sh('git', ['config', 'user.email', 'test@example.com'], dir);
  sh('git', ['config', 'user.name', 'Deploy Guard Test'], dir);
  sh('git', ['config', 'core.autocrlf', 'false'], dir); // quiets LF/CRLF warnings on Windows
  // Mirror the real repo's build-source shape closely enough to exercise it.
  fs.mkdirSync(path.join(dir, 'app'));
  fs.mkdirSync(path.join(dir, 'public'));
  fs.writeFileSync(path.join(dir, 'app', 'page.js'), 'export default function Page(){return null;}\n');
  fs.writeFileSync(path.join(dir, 'next.config.js'), 'module.exports = {};\n');
  fs.writeFileSync(path.join(dir, '.gitignore'), 'out/\n.next/\nnode_modules/\n.DS_Store\n');
  sh('git', ['add', '-A'], dir);
  sh('git', ['commit', '-q', '-m', 'init'], dir);
  return dir;
}

(async () => {
  const {
    checkCleanTree,
    verifyFreshness,
    writeStamp,
    writeDeployLog,
    getHeadCommit,
    getBranch,
  } = await import('../lib/deployGuard.mjs');

  // ---------------------------------------------------------------------
  // 1. A freshly committed, untouched repo passes.
  // ---------------------------------------------------------------------
  {
    const dir = makeTempRepo();
    const result = checkCleanTree(dir);
    check('clean repo: checkCleanTree passes', result.ok === true);
    check('clean repo: no violations listed', result.violations.length === 0);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // ---------------------------------------------------------------------
  // 2. Rejects a modified TRACKED file (d4b151e's rule).
  // ---------------------------------------------------------------------
  {
    const dir = makeTempRepo();
    fs.appendFileSync(path.join(dir, 'app', 'page.js'), '// edited\n');
    const result = checkCleanTree(dir);
    check('modified tracked file: checkCleanTree fails', result.ok === false);
    check(
      'modified tracked file: violation names app/page.js as tracked-modified',
      result.violations.some((v) => v.type === 'tracked-modified' && v.path === 'app/page.js')
    );
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // ---------------------------------------------------------------------
  // 3. Rejects an UNTRACKED file that would still enter the build
  //    (public/ is copied into out/ verbatim by next build), and passes
  //    again once it is removed — decision 77 §1's proof requirement.
  // ---------------------------------------------------------------------
  {
    const dir = makeTempRepo();
    fs.writeFileSync(path.join(dir, 'public', 'stray.txt'), 'never committed\n');
    const dirty = checkCleanTree(dir);
    check('untracked file in public/: checkCleanTree fails', dirty.ok === false);
    check(
      'untracked file in public/: violation names public/stray.txt',
      dirty.violations.some((v) => v.type === 'untracked-in-build-source' && v.path === 'public/stray.txt')
    );

    fs.rmSync(path.join(dir, 'public', 'stray.txt'));
    const clean = checkCleanTree(dir);
    check('after removing the stray file: checkCleanTree passes', clean.ok === true);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // ---------------------------------------------------------------------
  // 4. Rejects a GITIGNORED file present inside a build-source path — the
  //    ".gitignore lies about what deploys" case decision 77 §1 names.
  // ---------------------------------------------------------------------
  {
    const dir = makeTempRepo();
    fs.writeFileSync(path.join(dir, 'public', '.DS_Store'), 'binary junk\n');
    const result = checkCleanTree(dir);
    check('gitignored file inside public/: checkCleanTree fails', result.ok === false);
    check(
      'gitignored file inside public/: violation is ignored-in-build-source',
      result.violations.some((v) => v.type === 'ignored-in-build-source' && v.path === 'public/.DS_Store')
    );
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // ---------------------------------------------------------------------
  // 5. An untracked file OUTSIDE any build-source path does not block a
  //    deploy (it is never shipped, so it is not this guard's concern).
  // ---------------------------------------------------------------------
  {
    const dir = makeTempRepo();
    fs.writeFileSync(path.join(dir, 'scratch-notes.txt'), 'not a build input\n');
    const result = checkCleanTree(dir);
    check('untracked file outside build sources: checkCleanTree still passes', result.ok === true);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // ---------------------------------------------------------------------
  // 6. Freshness: no stamp fails; a stamp matching HEAD passes; moving HEAD
  //    past a written stamp without rebuilding fails (stale out/).
  // ---------------------------------------------------------------------
  {
    const dir = makeTempRepo();
    fs.mkdirSync(path.join(dir, 'out'));

    const noStamp = verifyFreshness(dir);
    check('no stamp: verifyFreshness fails', noStamp.ok === false);

    const headA = getHeadCommit(dir);
    writeStamp(dir, { commit: headA, branch: getBranch(dir), builtAt: new Date().toISOString() });
    const fresh = verifyFreshness(dir);
    check('stamp matches HEAD: verifyFreshness passes', fresh.ok === true);

    // Advance HEAD without rebuilding — out/ (and its stamp) is now stale.
    fs.writeFileSync(path.join(dir, 'app', 'page.js'), 'export default function Page(){return 1;}\n');
    sh('git', ['add', '-A'], dir);
    sh('git', ['commit', '-q', '-m', 'second commit'], dir);
    const headB = getHeadCommit(dir);
    const stale = verifyFreshness(dir);
    check('HEAD moved past the stamp: verifyFreshness fails (rejects stale out/)', stale.ok === false);
    check(
      'stale reason names both the stamped commit and current HEAD',
      stale.reason.includes(headA) && stale.reason.includes(headB)
    );

    fs.rmSync(dir, { recursive: true, force: true });
  }

  // ---------------------------------------------------------------------
  // 7. writeDeployLog records the commit (and branch) — d4b151e's pattern.
  // ---------------------------------------------------------------------
  {
    const dir = makeTempRepo();
    const commit = getHeadCommit(dir);
    const branch = getBranch(dir);
    const file = writeDeployLog(dir, { commit, branch, isoPlus3: '2026-09-24T12-00-00+03:00' });
    check('writeDeployLog: file exists', fs.existsSync(file));
    check('writeDeployLog: file lands under docs/deploy-log/', file.split(path.sep).includes('deploy-log'));
    const logged = JSON.parse(fs.readFileSync(file, 'utf8'));
    check('writeDeployLog: records the exact HEAD commit', logged.commit === commit);
    check('writeDeployLog: records the branch', logged.branch === branch);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  console.log(`${pass}/${total} assertions passed`);
  if (pass !== total) process.exit(1);
})();
