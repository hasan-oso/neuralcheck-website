'use strict';

// letterCeilingReason — full-path test (reader + the actual component that
// renders it), per this task's rule 30 requirement: a reader-only test does
// not prove the component shows the value correctly (see
// lib/reportReaders/v7.js's readIssues doc comment for the exact prior bug
// this class of test exists to catch — severity was double-classified and
// only visible once IssueCard was in the loop, not the reader alone).
//
// ⚠️ 2026-09-24 (coordinator decision): letterCeilingReason is only ever
// rendered on /verify (and /print, same shared reader/component) — the
// page that fetches the REAL verifyReport response shape (C), now vendored
// at contract/v7-verifyReport-response-sample.json. Every fixture below is
// the real fixture, cloned and overridden on exactly the one field each
// case tests (scripts/test/_shapes.cjs) — never a shape derived from the
// raw contract-sample shape (A), which /verify never receives.
//
// Five cases, each independently rendered through the REAL
// components/verify/V7CategoriesGrid.js via lib/reportReaders/v7.js's
// readCategories() — no reimplementation of either:
//   1. the real fixture's own `gpu` category, completely unmodified — its
//      real "تغطية منخفضة" text (not a fabricated string)
//   2. `gpu` with a different, non-"تغطية منخفضة" text
//   3. `gpu` with letterCeilingReason === null (a category with no ceiling
//      — must render no ceiling text and no debug marker)
//   4. `gpu` with the letterCeilingReason key DELETED (contract violation
//      — must render an explicit "missing" marker, never be silently read
//      as case 3's null)
//   5. `gpu` with an object present but its `text` is null (must render no
//      substitute text, and no "invalid" marker either — this is a
//      well-typed object, just without display text)
//
// Run: node scripts/test/letterCeilingReason.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { readCategories } = require('@/lib/reportReaders/v7');
const V7CategoriesGrid = require('@/components/verify/V7CategoriesGrid').default;
const { translations } = require('@/lib/i18n');
const { loadVerifyReportSample, withCategoryOverride, withCategoryKeyDeleted } = require('./_shapes.cjs');

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

function renderGpu(report) {
  const cats = readCategories(report);
  const gpu = cats.find((c) => c.name === 'gpu');
  const html = renderToStaticMarkup(
    React.createElement(V7CategoriesGrid, {
      categories: cats,
      issueCounts: new Map(),
      t,
    })
  );
  return { cat: gpu, html };
}

// ---------------------------------------------------------------------------
// Case 1 — the real fixture's own gpu category, unmodified. Proves the
// ACTUAL server-shaped verifyReport response text renders, on the real
// shape /verify receives.
// ---------------------------------------------------------------------------
{
  const base = loadVerifyReportSample();
  const realGpuCeiling = base.aiResponse.categories.gpu.letterCeilingReason;
  check('case1 fixture: real gpu.letterCeilingReason is a non-null object', realGpuCeiling && typeof realGpuCeiling === 'object');
  check('case1 fixture: real text contains "تغطية منخفضة"', realGpuCeiling.text.includes('تغطية منخفضة'));

  const { cat, html } = renderGpu(base);
  check('case1 reader: status ok', cat.letterCeilingReasonStatus === 'ok');
  check('case1 reader: text matches the real fixture verbatim', cat.letterCeilingReason.text === realGpuCeiling.text);
  check('case1 component: renders the real text verbatim', html.includes(realGpuCeiling.text));
  check('case1 component: no missing/invalid debug marker', !html.includes('letterCeilingReason:'));
}

// ---------------------------------------------------------------------------
// Case 2 — real fixture, gpu.letterCeilingReason overridden to a different,
// non-"تغطية منخفضة" text (proves the component shows `text` verbatim, not
// a hardcoded/templated string). Everything else in the document is real.
// ---------------------------------------------------------------------------
{
  const altText = 'بوّابة اختبار أخرى — نصّ لا علاقة له بتغطية الاختبارات';
  const report = withCategoryOverride(loadVerifyReportSample(), 'gpu', {
    letterCeilingReason: { name: 'SOME_OTHER_GATE', ceilingLetter: 'C', text: altText },
  });
  const { cat, html } = renderGpu(report);
  check('case2 reader: status ok', cat.letterCeilingReasonStatus === 'ok');
  check('case2 reader: text matches verbatim', cat.letterCeilingReason.text === altText);
  check('case2 component: renders the alternate text verbatim', html.includes(altText));
  check('case2 component: name is not derived into visible text ("SOME_OTHER_GATE" not printed as prose)', !html.includes('SOME_OTHER_GATE'));
}

// ---------------------------------------------------------------------------
// Case 3 — real fixture, gpu.letterCeilingReason overridden to null
// (present key, explicit "no ceiling"). Must render nothing extra and no
// debug marker.
// ---------------------------------------------------------------------------
{
  const report = withCategoryOverride(loadVerifyReportSample(), 'gpu', { letterCeilingReason: null });
  const { cat, html } = renderGpu(report);
  check('case3 reader: status ok', cat.letterCeilingReasonStatus === 'ok');
  check('case3 reader: value is null', cat.letterCeilingReason === null);
  check('case3 component: no debug marker', !html.includes('letterCeilingReason:'));
}

// ---------------------------------------------------------------------------
// Case 4 — real fixture, gpu.letterCeilingReason key DELETED entirely
// (contract violation). Must be told apart from case 3 — an explicit
// "missing" debug marker, never silently treated as "no ceiling".
// ---------------------------------------------------------------------------
{
  const report = withCategoryKeyDeleted(loadVerifyReportSample(), 'gpu', 'letterCeilingReason');
  check('case4 fixture: key truly absent', !Object.prototype.hasOwnProperty.call(report.aiResponse.categories.gpu, 'letterCeilingReason'));

  const { cat, html } = renderGpu(report);
  check('case4 reader: status missing', cat.letterCeilingReasonStatus === 'missing');
  check('case4 reader: value is null (not read as "no ceiling" silently — status carries the distinction)', cat.letterCeilingReason === null);
  check('case4 component: renders explicit "missing" debug marker', html.includes('letterCeilingReason: missing'));
}

// ---------------------------------------------------------------------------
// Case 5 — real fixture, gpu.letterCeilingReason overridden to an object
// with `text` null. Must render no substitute text (no text built from
// `name`), and — being a well-typed object, not a contract violation — no
// missing/invalid marker either.
// ---------------------------------------------------------------------------
{
  const report = withCategoryOverride(loadVerifyReportSample(), 'gpu', {
    letterCeilingReason: { name: 'LOW_CATEGORY_COVERAGE', ceilingLetter: 'B', text: null },
  });
  const { cat, html } = renderGpu(report);
  check('case5 reader: status ok', cat.letterCeilingReasonStatus === 'ok');
  check('case5 reader: text is null', cat.letterCeilingReason.text === null);
  check('case5 component: no debug marker (this is a valid, well-typed object)', !html.includes('letterCeilingReason:'));
  check('case5 component: name not rendered as substitute prose', !html.includes('LOW_CATEGORY_COVERAGE'));
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
