'use strict';

// Item 1 of the fourth addendum to decision 102 (2026-09-26): the per-category
// pass ratio ("N/M اختبار ناجح") is not one of the things decision 6 lists as
// shown ("الحرف · التغطية · سبب البوّابة إن أطلقت") — a pass count is none of
// those, so components/verify/CategoriesGrid.js's MeasuredCard no longer
// renders it. The coverage-gap sentence ("N من M اختبارات لم تُجرَ") is a
// DIFFERENT fact (tests that never ran at all, not a pass/fail ratio of tests
// that did) and stays.
//
// Real V6 sample, real reader (pickCategoryScores for fixture sanity,
// readCategoriesForGrid for what the component actually receives — item 3 of
// this same addendum moved CategoriesGrid.js to a pre-built `categories`
// prop, so this test was updated in that commit to keep matching the real
// wiring), real component (CategoriesGrid — rule 30/41), via
// renderToStaticMarkup. battery in
// contract/v6-reports-document-sample.json is used because it is the one
// category that carries BOTH facts at once in the real data: pass_count=9/
// total_count=9 (would have rendered "9/9") AND excluded_count=1/
// declared_count=10 (renders "1 من 10 اختبارات لم تُجرَ") — verified against
// the actual pre-fix render first (not assumed): before this fix, battery's
// card contained the literal text ">9/9<" and the exact filled sentence
// "1 من 10 اختبارات لم تُجرَ", and the grade badge ">A<".
//
// Run: node scripts/test/categoryPassRatioHidden.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { pickCategoryScores, readCategoriesForGrid } = require('@/lib/reportReaders/v6');
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

for (const [label, load] of [
  ['B (reports document)', loadV6ReportsDocSample],
  ['C (verifyReport response)', loadV6VerifyReportSample],
]) {
  const report = load();
  const catScores = pickCategoryScores(report);

  check(`${label}: fixture sanity — battery is pass_count 9 / total_count 9`, catScores.battery.pass_count === 9 && catScores.battery.total_count === 9);
  check(`${label}: fixture sanity — battery is excluded_count 1 / declared_count 10`, catScores.battery.excluded_count === 1 && catScores.battery.declared_count === 10);

  const categories = readCategoriesForGrid(report);
  const html = renderToStaticMarkup(
    React.createElement(CategoriesGrid, { categories, categoryNotes: null, t })
  );

  check(`${label}: does not display the pass ratio ("9/9")`, !html.includes('>9/9<'));
  check(`${label}: does not display the pass-ratio label ("${t.verify.testsPassed}")`, !html.includes(t.verify.testsPassed));
  check(
    `${label}: DOES still display the coverage-gap sentence ("1 من 10 اختبارات لم تُجرَ") — a different fact, not touched by this item`,
    html.includes(t.verify.testsNotRun.replace('{n}', '1').replace('{total}', '10'))
  );
  check(`${label}: still shows battery's real grade badge (">A<")`, html.includes('>A<'));
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
