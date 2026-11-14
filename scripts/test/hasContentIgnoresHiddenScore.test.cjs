'use strict';

// Item 4 of the sixth addendum to decision 102 (2026-09-26): app/verify/
// page.js:247's "does this report have content" check (gates whether
// <IssuesList> renders at all, line ~407) used to be
// `resolvedScore !== null || (v6Categories && v6Categories.length > 0) ||
// (isV7 && v7Categories && v7Categories.length > 0)` — the FIRST branch read
// the hidden V6 score, a field this report never displays (decision 6). A
// report carrying only a score and nothing else (no grade, no categories)
// would render '—' for the grade circle and nothing from CategoriesGrid, yet
// still be judged "has content" and show the issues list's "no issues"
// callout beside an otherwise-empty report.
//
// Fixed by dropping the score branch entirely — not by adding a separate
// grade check — because `v6Categories` (lib/reportReaders/v6.js's
// readCategoriesForGrid, item 3/b24a8a9) never returns an entry without a
// resolved `letter`: even the legacy bare-number category shape (no `grade`
// field at all) gets one via the letterForScore fallback. So "there is at
// least one category" already means "there is at least one displayed
// letter" — this file's own SOURCE for that legacy shape's existence and
// semantics is lib/reportReaders/v6.js:236-249's `normalizeGridCategory`
// comment ("Legacy plain number...") and components/verify/CategoriesGrid.js
// :12-14's doc comment — there is no other source (no contract/README.md
// mention, checked directly: zero hits for "legacy"/"plain number" there).
// The numbered list this addendum's order quotes ("1. a plain number
// (legacy)") was paraphrased into that prose form during item 3/b24a8a9 —
// same meaning, different wording; this is disclosed in the report, not
// silently treated as a mismatch.
//
// OLD_HAS_CONTENT / NEW_HAS_CONTENT below are the two literal formulas —
// the OLD one exactly as committed at 224aea8 (before this fix), the NEW one
// exactly as this fix leaves it — both replicated here (hasContent is
// inline logic in a page component, not an exported function; this mirrors
// v6RenderingRealPages.test.cjs's established convention of replicating a
// real page's inline wiring verbatim, by real reader output, not
// reimplementing the readers themselves).
//
// Run: node scripts/test/hasContentIgnoresHiddenScore.test.cjs

require('./_jsx-require-hook.cjs');
const { pickScore, pickGrade, readCategoriesForGrid } = require('@/lib/reportReaders/v6');
const { loadV6ReportsDocSample, loadV6VerifyReportSample } = require('./_shapes.cjs');

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

function OLD_HAS_CONTENT(resolvedScore, v6Categories) {
  // app/verify/page.js:247, commit 224aea8 (V7 branches omitted — all
  // fixtures here are V6; they were always `false` for a V6 report anyway).
  return resolvedScore !== null || !!(v6Categories && v6Categories.length > 0);
}

function NEW_HAS_CONTENT(v6Categories) {
  // app/verify/page.js's hasContent, this commit.
  return !!(v6Categories && v6Categories.length > 0);
}

// ---------------------------------------------------------------------------
// Fixture 1: derived from the real B sample — every category converted to
// the legacy bare-number shape (its own real `score`, no `grade`/counts/
// notes at all), nothing else touched (grade, issues, summary, etc. stay
// the real vendored data).
// ---------------------------------------------------------------------------
const realB = loadV6ReportsDocSample();
const legacyDerived = JSON.parse(JSON.stringify(realB));
{
  const rawCats = legacyDerived.aiResponse.category_scores;
  for (const name of Object.keys(rawCats)) {
    const data = rawCats[name];
    rawCats[name] = typeof data.score === 'number' ? data.score : data.value;
  }
}

// ---------------------------------------------------------------------------
// Fixture 4/5: an empty V6-shaped report, and one carrying only a score.
// ---------------------------------------------------------------------------
const emptyReport = {};
const scoreOnlyReport = { aiResponse: { score: 78 } };

const scenarios = [
  ['derived (all 15 categories legacy bare-number shape)', legacyDerived, true, true],
  ['real B (reports document, unmodified)', realB, true, true],
  ['real C (verifyReport response, unmodified)', loadV6VerifyReportSample(), true, true],
  ['empty V6 report ({})', emptyReport, false, false],
  ['score-only V6 report (score present, no grade, no categories)', scoreOnlyReport, true, false],
];

for (const [label, report, expectedOld, expectedNew] of scenarios) {
  const resolvedScore = pickScore(report);
  const v6Categories = readCategoriesForGrid(report);
  const oldResult = OLD_HAS_CONTENT(resolvedScore, v6Categories);
  const newResult = NEW_HAS_CONTENT(v6Categories);

  check(`${label}: OLD formula (224aea8) === ${expectedOld}`, oldResult === expectedOld);
  check(`${label}: NEW formula (this commit) === ${expectedNew}`, newResult === expectedNew);
  if (expectedOld === expectedNew) {
    check(`${label}: result matches before/after (no behavior change here)`, oldResult === newResult);
  } else {
    check(`${label}: result DIFFERS before/after — the one disclosed exception`, oldResult !== newResult);
  }
}

// Extra fixture-sanity for the derived sample specifically, proving the
// legacy-shape claim ("the letter is derived from the number") directly:
{
  const grade = pickGrade(legacyDerived);
  check('derived sample: still carries its real overall grade "B" (untouched — only categories were converted)', grade === 'B');
  const cats = readCategoriesForGrid(legacyDerived);
  check('derived sample: readCategoriesForGrid returns all 15 categories', cats.length === 15);
  check('derived sample: every category has a non-empty derived letter (none carried a `grade` field at all)', cats.every(({ v }) => typeof v.letter === 'string' && v.letter.length > 0));
  check('derived sample: every category has score forced to null on the way out (item 3)', cats.every(({ v }) => v.score === null));
  const battery = cats.find((c) => c.name === 'battery');
  check('derived sample: battery specifically derives letter "A" from its real bare score 100 (letterForScore(100) === "A")', battery.v.letter === 'A');
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
