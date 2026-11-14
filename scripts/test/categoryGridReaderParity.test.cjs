'use strict';

// Item 3 of the fourth addendum to decision 102 (2026-09-26): "الفرز
// (CategoriesGrid.js:416)، والترتيب (:424)، واشتقاق الحرف للصيغة القديمة
// التي تحمل رقماً مجرّداً (:263)، تُنقل كلّها إلى القارئ كما هي، دون أي
// تغيير في منطقها." — the normalizer, the filter, the sort, and the
// legacy-shape letter fallback moved from components/verify/CategoriesGrid.js
// into lib/reportReaders/v6.js's new readCategoriesForGrid(report), unchanged
// in logic. This test is the "قبل/بعد" proof the item explicitly requires:
// "تُمرَّر كل عيّنات V6 في المسارين، القديم والجديد، ويُثبت أن الحروف
// والترتيب والفئات المعروضة متطابقة."
//
// The "OLD path" baseline below is not a reimplementation guess — it is the
// exact, real output of the pre-refactor code (commit 798146f, the item-1
// commit immediately before this one), captured by rendering the real,
// then-current CategoriesGrid component against these same two real
// fixtures and parsing out each card's label + resolved letter + measured/
// unmeasured flag, via:
//
//   node -e "... renderToStaticMarkup(CategoriesGrid, { categoryScores,
//     categoryNotes: null, t }) ... regex over <h3> labels + grade badge ..."
//
// run against git commit 798146f, before any of this file's or
// lib/reportReaders/v6.js's edits. Both real V6 fixtures (B and C — the same
// underlying report data) produced the IDENTICAL 15-card sequence below, all
// measured, sorted A's-then-B's-then-C-then-D (ties broken by the original,
// real category_scores object's own key order, since Array.prototype.sort is
// a stable sort — nothing here re-derives that order from raw scores, it is
// what the actual pre-refactor render produced).
//
// Run: node scripts/test/categoryGridReaderParity.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { readCategoriesForGrid } = require('@/lib/reportReaders/v6');
const CategoriesGrid = require('@/components/verify/CategoriesGrid').default;
const { translations } = require('@/lib/i18n');
const { loadV6ReportsDocSample, loadV6VerifyReportSample } = require('./_shapes.cjs');

const t = translations.ar;

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

// Captured from the OLD path (commit 798146f) — see this file's top comment.
const OLD_PATH_BASELINE = [
  { name: 'battery', letter: 'A', unmeasured: false },
  { name: 'display', letter: 'A', unmeasured: false },
  { name: 'memory', letter: 'A', unmeasured: false },
  { name: 'storage', letter: 'A', unmeasured: false },
  { name: 'camera', letter: 'A', unmeasured: false },
  { name: 'gps', letter: 'A', unmeasured: false },
  { name: 'sensors', letter: 'A', unmeasured: false },
  { name: 'cellular', letter: 'A', unmeasured: false },
  { name: 'wireless', letter: 'A', unmeasured: false },
  { name: 'audio', letter: 'A', unmeasured: false },
  { name: 'input', letter: 'A', unmeasured: false },
  { name: 'cpu', letter: 'B', unmeasured: false },
  { name: 'gpu', letter: 'B', unmeasured: false },
  { name: 'security', letter: 'C', unmeasured: false },
  { name: 'thermal', letter: 'D', unmeasured: false },
];

// Parses the same observable facts (label order, resolved letter,
// measured/unmeasured) out of a REAL render, so the NEW path is checked the
// same way the OLD path's baseline above was captured — not by comparing
// internal object shapes, which could match by coincidence while the actual
// screen output differed.
function summarizeRenderedOrder(html) {
  const re = /<h3[^>]*>([^<]*)<\/h3>([\s\S]*?)(?=<h3|$)/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const chunk = m[2];
    const unmeasured = chunk.includes(t.verify.unmeasured);
    const gradeMatch = chunk.match(
      /inline-flex items-center justify-center min-w-\[2\.25rem\][^>]*>([A-Z])</
    );
    out.push({ label: m[1], unmeasured, grade: gradeMatch ? gradeMatch[1] : null });
  }
  return out;
}

// name -> expected Arabic label, via the same t.verify.cat* keys
// categoryLabel() uses in components/verify/CategoriesGrid.js — reused here
// only to map the baseline's raw keys to the labels a render will show, not
// as a second implementation of any hiding/filtering logic.
function expectedLabel(name) {
  const key = `cat${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  return t.verify[key] || name;
}

for (const [label, load] of [
  ['B (reports document)', loadV6ReportsDocSample],
  ['C (verifyReport response)', loadV6VerifyReportSample],
]) {
  const report = load();

  // ---- New path: the reader's own return value ----
  const categories = readCategoriesForGrid(report);
  check(`${label}: readCategoriesForGrid returns 15 categories (matches OLD_PATH_BASELINE length)`, categories.length === OLD_PATH_BASELINE.length);

  const newReaderSummary = categories.map(({ name, v }) => ({
    name,
    letter: v.letter,
    unmeasured: v.unmeasured,
  }));
  check(
    `${label}: readCategoriesForGrid's order + letters + unmeasured flags match the OLD path exactly, category by category`,
    JSON.stringify(newReaderSummary) === JSON.stringify(OLD_PATH_BASELINE)
  );
  check(`${label}: readCategoriesForGrid never carries a score on any category (this item's whole point)`, categories.every(({ v }) => v.score === null));

  // ---- New path: the actual rendered HTML, parsed the same way the OLD
  // baseline was captured, so this checks the real component too, not just
  // the reader's return value (rule 30) ----
  const html = renderToStaticMarkup(
    React.createElement(CategoriesGrid, { categories, categoryNotes: null, t })
  );
  const renderedOrder = summarizeRenderedOrder(html);
  const expectedRenderedOrder = OLD_PATH_BASELINE.map((c) => ({
    label: expectedLabel(c.name),
    unmeasured: c.unmeasured,
    grade: c.unmeasured ? null : c.letter,
  }));
  check(
    `${label}: the RENDERED card order + labels + grade badges match the OLD path's real render exactly`,
    JSON.stringify(renderedOrder) === JSON.stringify(expectedRenderedOrder)
  );
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
