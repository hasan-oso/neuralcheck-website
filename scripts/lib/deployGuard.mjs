// Deploy-log + dirty-tree guard — decision 80 §5 (2026-09-24).
//
// Pattern on neuralcheck-backend's d4b151e (predeploy hook that rejects a
// modified tracked file, and writes docs/deploy-log/commit-<time>.json
// before the upload). Extended here for the two things unique to a static
// export site:
//
//   1. `firebase deploy --only hosting` publishes whatever next build
//      copies into out/, and next build reads more than tracked source —
//      an untracked or *gitignored* file sitting inside public/ (or any
//      other build-input path below) still gets copied/bundled into out/
//      and shipped, even though `git status` alone would call the tree
//      "clean". Decision 77 §1 named this exact case: ".gitignore lies
//      about what deploys."
//   2. README.md documents that two builds of the same commit are NOT
//      byte-identical (buildId + chunk hashes differ every run), so file
//      counts/diffs can't prove out/ matches HEAD. A stamp does instead —
//      see write-deploy-stamp.mjs (npm postbuild) and verifyFreshness()
//      below.
//
// This module is the testable core; deploy-guard-pre.mjs, write-deploy-
// stamp.mjs and deploy-guard-post.mjs are thin CLI wrappers around it, and
// scripts/test/deployGuard.test.cjs exercises it directly against throwaway
// git repos (never this repo's own git state).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

export function getHeadCommit(cwd) {
  return git(['rev-parse', 'HEAD'], cwd).trim();
}

export function getBranch(cwd) {
  return git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd).trim();
}

// ---------------------------------------------------------------------------
// What actually feeds `out/`. Explicit and auditable, same convention as
// scripts/check-render-surface.mjs's SURFACE array — not a computed guess
// at what Next.js might read.
//
// Directories: everything Next.js compiles (app/, components/, lib/) plus
// public/, which next build copies into out/ verbatim, unfiltered by
// .gitignore — that is exactly the leak decision 77 §1 called out.
// ---------------------------------------------------------------------------
export const BUILD_SOURCE_DIRS = ['app', 'components', 'lib', 'public'];

// Root-level files Next.js/the toolchain reads directly.
export const BUILD_SOURCE_FILES = [
  'next.config.js',
  'package.json',
  'package-lock.json',
  'tailwind.config.js',
  'postcss.config.js',
  'jsconfig.json',
  'firebase.js', // imported as '@/firebase' across app/** (verified by grep)
];

// Root .env* files are a build input too: Next.js inlines any NEXT_PUBLIC_*
// value straight into the client JS bundle at build time. `.env.example` is
// the tracked template (see .gitignore's `!.env.example`) and is exempt.
const ENV_FILE_AT_ROOT = /^\.env(?!\.example$)/;

// Explicit, reasoned exceptions — decision 77 §1 ("قائمة استثناء صريحة لكل
// بند سببه"). Add an entry ONLY with a one-line reason; do not widen the
// lists above to route around a single file. Empty today — nothing in this
// repo currently needs excepting (verified 2026-09-24: `git ls-files public`
// shows all 4 public/ files tracked, no .env* present).
export const EXCEPTIONS = [
  // { path: 'public/example.txt', reason: '...' },
];

function isBuildSourcePath(relPath) {
  if (EXCEPTIONS.some((e) => e.path === relPath)) return false;
  const top = relPath.split('/')[0];
  if (BUILD_SOURCE_DIRS.includes(top)) return true;
  if (BUILD_SOURCE_FILES.includes(relPath)) return true;
  if (!relPath.includes('/') && ENV_FILE_AT_ROOT.test(relPath)) return true;
  return false;
}

// `git status --porcelain=v1` line: 2-char XY status code, one space, path.
// A rename is "old -> new"; take the new side. A path with unusual
// characters is double-quoted by git; strip that too.
function parsePorcelain(output) {
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2);
      let path = line.slice(3);
      const arrow = path.indexOf(' -> ');
      if (arrow !== -1) path = path.slice(arrow + 4);
      if (path.startsWith('"') && path.endsWith('"')) path = path.slice(1, -1);
      return { code, path };
    });
}

/**
 * Rejects (a) any tracked file with a pending change — staged or not,
 * modified/added/deleted/renamed — matching d4b151e's plain "tracked file
 * modified" rule with no path restriction, and (b) any untracked OR
 * gitignored-but-present file that sits inside a build-source path (the
 * `.gitignore lies` case). `--ignored=matching` + `--untracked-files=all`
 * make git report individual files inside a tracked, non-ignored directory
 * (like public/) rather than collapsing to a directory line — confirmed
 * empirically: a wholly-ignored dir like node_modules/ still collapses to
 * one `!! node_modules/` line (cheap; no recursion into it), while
 * public/.DS_Store or public/stray.txt are reported individually.
 */
export function checkCleanTree(cwd) {
  const raw = git(['status', '--porcelain=v1', '--ignored=matching', '--untracked-files=all'], cwd);
  const entries = parsePorcelain(raw);

  const violations = [];
  for (const e of entries) {
    if (e.code === '??' || e.code === '!!') {
      if (isBuildSourcePath(e.path)) {
        violations.push({
          type: e.code === '!!' ? 'ignored-in-build-source' : 'untracked-in-build-source',
          path: e.path,
          code: e.code,
        });
      }
      continue;
    }
    // Anything else is a tracked path with a pending change of some kind.
    violations.push({ type: 'tracked-modified', path: e.path, code: e.code });
  }

  return { ok: violations.length === 0, violations };
}

export function formatViolation(v) {
  if (v.type === 'tracked-modified') {
    return `tracked file changed (${v.code.trim() || v.code}): ${v.path}`;
  }
  if (v.type === 'ignored-in-build-source') {
    return `gitignored file present inside a build-source path — next build still copies/bundles it into out/: ${v.path}`;
  }
  return `untracked file inside a build-source path — never committed, would still ship: ${v.path}`;
}

// ---------------------------------------------------------------------------
// Freshness stamp. out/ is gitignored and, per README.md, non-deterministic
// build-to-build (buildId + chunk hashes always differ), so "diff out/
// against something" can't prove it matches HEAD. The stamp is a direct
// fact instead: written by write-deploy-stamp.mjs (npm postbuild, so it
// always reflects the commit that was actually just built), checked here.
// ---------------------------------------------------------------------------

export function stampPath(cwd) {
  return join(cwd, 'out', '.deploy-stamp.json');
}

export function writeStamp(cwd, { commit, branch, builtAt }) {
  const dir = join(cwd, 'out');
  mkdirSync(dir, { recursive: true });
  writeFileSync(stampPath(cwd), JSON.stringify({ commit, branch, builtAt }, null, 2) + '\n', 'utf8');
}

export function readStamp(cwd) {
  const p = stampPath(cwd);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function verifyFreshness(cwd) {
  const stamp = readStamp(cwd);
  if (!stamp) {
    return {
      ok: false,
      reason: 'out/.deploy-stamp.json is missing — out/ was not produced by npm run build (or predates this guard). Run npm run build.',
    };
  }
  if (typeof stamp.commit !== 'string' || !stamp.commit) {
    return { ok: false, reason: 'out/.deploy-stamp.json has no commit field — cannot verify out/ matches HEAD.' };
  }
  const head = getHeadCommit(cwd);
  if (stamp.commit !== head) {
    return {
      ok: false,
      reason: `out/ was built from commit ${stamp.commit} but HEAD is now ${head} — rebuild before deploying.`,
    };
  }
  return { ok: true, stamp, head };
}

// ---------------------------------------------------------------------------
// Deploy log — d4b151e's pattern: one JSON file per deploy, written before
// the upload, naming the commit. All times are +03 (workspace convention).
// ---------------------------------------------------------------------------

export function nowPlus3ISO(date = new Date()) {
  const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return shifted.toISOString().replace('Z', '+03:00');
}

export function deployLogFilename(isoPlus3) {
  // Colons are not safe in Windows filenames.
  return `commit-${isoPlus3.replace(/:/g, '-')}.json`;
}

export function writeDeployLog(cwd, { commit, branch, isoPlus3 = nowPlus3ISO() } = {}) {
  const dir = join(cwd, 'docs', 'deploy-log');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, deployLogFilename(isoPlus3));
  writeFileSync(file, JSON.stringify({ commit, branch, deployedAt: isoPlus3 }, null, 2) + '\n', 'utf8');
  return file;
}
