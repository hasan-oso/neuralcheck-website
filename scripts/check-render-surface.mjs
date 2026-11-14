#!/usr/bin/env node
//
// Structural guard for the buyer-facing report surface.
//
// Three fields travel in category_scores that must never reach a buyer:
//
//   ai_grade      what the model would have said. An unmeasured category
//                 arrives grade "?" with ai_grade "B" — a guess made while
//                 not one test ran. Printing it under a heading that reads
//                 "غير مقيسة" contradicts the card in its own corner.
//   grade_source  how the letter was chosen. Provenance for us.
//   reconciled    that the letter was lowered to match the number. The grade
//                 shown is already the reconciled one, so a marker would
//                 caveat a figure that is more trustworthy for the fix.
//
// A comment saying "we deliberately don't render these" survives exactly as
// long as the next person who reads it. This fails the build instead.
//
// Runs on `npm run build` via the prebuild hook, or on its own:
//   node scripts/check-render-surface.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Every file that renders a report to a buyer, on screen or in the PDF.
// The admin panel is deliberately absent: it dumps the raw category object by
// design, and an operator inspecting our own pipeline is not a buyer.
const SURFACE = [
  'components/verify/CategoriesGrid.js',
  'components/verify/HeroCard.js',
  'components/verify/SummaryCard.js',
  'components/verify/IssuesList.js',
  'components/verify/PredictedProblems.js',
  'components/verify/BuyerAdvice.js',
  'app/verify/page.js',
  'app/print/[shortId]/PrintClient.js',
  // Added for V7 (findings-based pipeline) support.
  'components/verify/V7CategoriesGrid.js',
  'components/verify/V7Notices.js',
  'components/verify/NarrativeIncompleteNotice.js',
  'lib/reportReaders/v7.js',
  'lib/reportReaders/v6.js',
];

// snake_case as the payload sends it, camelCase as a defensive reader might.
const FORBIDDEN = [
  'ai_grade',
  'aiGrade',
  'grade_source',
  'gradeSource',
  'reconciled',
  // Same class: says the grade came from a fallback path, not what the phone
  // is like. Observed in the console via lib/reportTelemetry.js, which sits
  // outside this list on purpose.
  'usedFallbackGrade',
  'used_fallback_grade',
];

// Second, separate check: the V6 numeric score (decision 6, "score — لا
// يُعرض للمستخدم إطلاقاً"; fourth addendum to decision 102, item 6(b),
// 2026-09-26). This is NOT folded into FORBIDDEN/SURFACE above, on purpose,
// for two reasons discovered while writing it:
//
//   1. `score` is a real, legitimate property/parameter name in this
//      codebase (HeroCard's own prop is literally called `score`, and
//      lib/reportReaders/v6.js's pickScore/readCategoriesForGrid legitimately
//      read `.score` off raw payload objects to compute a letter or an
//      existence check — never to display the number). A bare-word ban
//      applied to the SAME file list as FORBIDDEN would fail today's
//      already-correct code: v6.js's `.score` reads, and HeroCard.js's own
//      generic (currently unreachable, since no caller passes a real value)
//      score-rendering capability. Unlike ai_grade/reconciled — read by
//      nobody, anywhere, ever — hiding the V6 score is a decision made by
//      each CALLER (app/verify/page.js, PrintClient.js, ShopClient.js,
//      dashboard/page.js) and by CategoriesGrid.js's own reader-fed input,
//      not a property that must never be read at all. So this check's
//      surface is narrower (SCORE_DISPLAY_SURFACE below) and deliberately
//      excludes components/verify/HeroCard.js and both lib/reportReaders/
//      *.js files.
//   2. Within that narrower surface, `score` must still be allowed to exist
//      as long as it is always assigned exactly `null` — `score={null}`
//      (app/verify/page.js, PrintClient.js) is the correct, current state,
//      not a violation.
//
// components/verify/CategoriesGrid.js, app/shop/[slug]/ShopClient.js, and
// app/dashboard/page.js currently contain no "score" token at all outside
// comments (the last two had their guarded-but-dead `score !== null` display
// blocks removed outright in the same commit that added this check, rather
// than leaving a branch this text-based guard cannot prove is unreachable).
const SCORE_DISPLAY_SURFACE = [
  'components/verify/CategoriesGrid.js',
  'app/verify/page.js',
  'app/print/[shortId]/PrintClient.js',
  'app/shop/[slug]/ShopClient.js',
  'app/dashboard/page.js',
];

// Matches `score={null}`, `score = null`, `score: null` (with or without the
// JSX brace) — the one allowed shape. Anything else containing the bare word
// "score" in this narrower surface is a violation.
const SAFE_SCORE_ASSIGNMENT = /\bscore\s*[:=]\s*\{?\s*null\s*\}?/;

// `letterSource` is NOT in FORBIDDEN, and deliberately so — decision 42
// overturned the earlier blanket ban recorded here before this edit. The
// name is shared by two different fields, and the decision only concerns
// one of them:
//
//   categories.<name>.letterSource  "DETERMINISTIC" | "LLM_ADJUSTED" — says
//     whether a category's letter is a plain pass/fail read or one a model
//     adjusted, alongside adjustmentReason/adjustmentEvidence (never
//     forbidden). Decision 42: a buyer reading /verify is exactly who should
//     know a letter was model-adjusted rather than measured — withholding it
//     makes the grade look cleaner than it is. Read in
//     lib/reportReaders/v7.js's readCategories and rendered by
//     components/verify/V7CategoriesGrid.js.
//
//   overall.letterSource  e.g. "GATE:ROOT_DETECTED" — names which gate
//     mechanism capped the report-level letter. This is the same class as
//     grade_source above (internal provenance, not buyer-actionable on its
//     own) and overlaps governingGateReason, which already carries the
//     buyer-facing version of the same fact. It stays unread: see
//     lib/reportReaders/v7.js's readOverall doc comment.
//
// Because this guard matches on the bare property name, it cannot tell
// these two apart — removing the entry lifts the ban on both spellings at
// once. The report-level meaning is kept off the surface by readOverall()
// simply never reading `overall.letterSource`, not by this list. If that
// changes, a text-only guard cannot catch it; whoever touches readOverall
// next has to hold that line themselves.

/**
 * Blank out comments while preserving every byte position, so reported line
 * numbers stay true. Walks the source with enough state to tell a comment from
 * a `//` inside a string or template literal — a naive regex would blank half
 * of `'https://...'` and silently stop guarding whatever followed.
 */
function blankComments(src) {
  const out = src.split('');
  let i = 0;
  const n = src.length;
  let state = 'code'; // code | line | block | single | double | template

  while (i < n) {
    const c = src[i];
    const next = src[i + 1];

    if (state === 'code') {
      if (c === '/' && next === '/') {
        state = 'line';
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        continue;
      }
      if (c === '/' && next === '*') {
        state = 'block';
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        continue;
      }
      if (c === "'") state = 'single';
      else if (c === '"') state = 'double';
      else if (c === '`') state = 'template';
      i += 1;
      continue;
    }

    if (state === 'line') {
      if (c === '\n') state = 'code';
      else out[i] = ' ';
      i += 1;
      continue;
    }

    if (state === 'block') {
      if (c === '*' && next === '/') {
        out[i] = ' ';
        out[i + 1] = ' ';
        state = 'code';
        i += 2;
        continue;
      }
      if (c !== '\n') out[i] = ' ';
      i += 1;
      continue;
    }

    // inside a string of some kind
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (
      (state === 'single' && c === "'") ||
      (state === 'double' && c === '"') ||
      (state === 'template' && c === '`')
    ) {
      state = 'code';
    }
    i += 1;
  }

  return out.join('');
}

const violations = [];

for (const rel of SURFACE) {
  let src;
  try {
    src = readFileSync(join(ROOT, rel), 'utf8');
  } catch {
    // A renamed or deleted surface file is itself a reason to stop: the guard
    // would otherwise pass by simply not looking at anything.
    violations.push({
      file: rel,
      line: 0,
      field: '(file)',
      text: 'listed in SURFACE but not found — update scripts/check-render-surface.mjs',
    });
    continue;
  }

  const code = blankComments(src);
  const lines = code.split('\n');

  lines.forEach((line, idx) => {
    for (const field of FORBIDDEN) {
      if (new RegExp(`\\b${field}\\b`).test(line)) {
        violations.push({
          file: rel,
          line: idx + 1,
          field,
          text: src.split('\n')[idx].trim(),
        });
      }
    }
  });
}

for (const rel of SCORE_DISPLAY_SURFACE) {
  let src;
  try {
    src = readFileSync(join(ROOT, rel), 'utf8');
  } catch {
    violations.push({
      file: rel,
      line: 0,
      field: '(file)',
      text: 'listed in SCORE_DISPLAY_SURFACE but not found — update scripts/check-render-surface.mjs',
    });
    continue;
  }

  const code = blankComments(src);
  const lines = code.split('\n');

  lines.forEach((line, idx) => {
    if (!/\bscore\b/i.test(line)) return;
    if (SAFE_SCORE_ASSIGNMENT.test(line)) return;
    violations.push({
      file: rel,
      line: idx + 1,
      field: 'score (not null)',
      text: src.split('\n')[idx].trim(),
    });
  });
}

if (violations.length > 0) {
  console.error('\n✗ render-surface guard failed\n');
  console.error(
    '  These fields describe how we reached a grade, not the phone the buyer\n' +
      '  is looking at. They must not reach the report surface. A "score (not\n' +
      '  null)" violation means the V6 numeric score (decision 6) is reachable\n' +
      '  again on a page that must only show the letter/coverage/gate reason —\n' +
      '  see SCORE_DISPLAY_SURFACE\'s comment above for the one allowed shape\n' +
      '  (`score = null` / `score={null}`).\n'
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.field}]`);
    console.error(`    ${v.text}\n`);
  }
  console.error(
    `  ${violations.length} violation(s). If a field genuinely belongs on the\n` +
      '  report now, remove it from FORBIDDEN (or, for a score violation,\n' +
      '  reconsider decision 6 itself) in this script in the same commit, so\n' +
      '  the decision changes on the record rather than by accident.\n'
  );
  process.exit(1);
}

console.log(
  `✓ render-surface guard: ${SURFACE.length} files clean ` +
    `(${FORBIDDEN.join(', ')}); ` +
    `${SCORE_DISPLAY_SURFACE.length} files clean of a displayed V6 score`
);
