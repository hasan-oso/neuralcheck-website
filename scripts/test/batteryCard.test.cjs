'use strict';

// Battery card — decision 87 §4 (2026-09-25).
//
// The (partial, NO_CALIBRATED_THRESHOLD) pair: "تغطية جزئية" (v7StatePartial)
// is FALSE right next to a 100% coverage bar (S10's real battery) — the
// PARTIAL here is a withheld-judgment call (no calibrated threshold to grade
// against), not a measurement gap. classifyCategoryReason's
// `replacesStateLabel` flag (lib/reportReaders/v7.js) tells V7CategoriesGrid
// to show the reason sentence in the badge's place instead — once, not
// alongside the old label — while the coverage bar itself is untouched.
//
// Rule 41 (2026-09-25, applies to every reader touched this round): "القارئ
// يُختبر بالشكل الذي يستقبله فعلاً" — tested here on BOTH real shapes this
// pair actually arrives in: v7-reports-document-sample(.json) (B — read
// directly by admin/reports) and v7-verifyReport-response-sample.json (C —
// read by /verify, /print), and on both the ordinary (S10, 100% coverage)
// and Honor (25% coverage, one measured indicator) real fixtures — the
// user's explicit two-fixture requirement, so the fix is proven independent
// of any one coverage number.
//
// Run: node scripts/test/batteryCard.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { readCategories, countIssuesByCategory } = require('@/lib/reportReaders/v7');
const V7CategoriesGrid = require('@/components/verify/V7CategoriesGrid').default;
const { translations } = require('@/lib/i18n');
const {
  loadReportsDocSample,
  loadVerifyReportSample,
  loadReportsDocHonorSample,
  loadVerifyReportHonorSample,
  withCategoryOverride,
} = require('./_shapes.cjs');

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

function render(el) {
  return renderToStaticMarkup(el);
}

function renderOneCategory(cat) {
  return render(
    React.createElement(V7CategoriesGrid, { categories: [cat], issueCounts: countIssuesByCategory([]), t })
  );
}

/** Runs the full set of battery-card assertions against one real report. */
function checkBatteryCard(label, report, expectedCoveragePct) {
  const battery = readCategories(report).find((c) => c.name === 'battery');
  check(`${label}: fixture sanity — battery is (partial, the real NO_CALIBRATED_THRESHOLD literal)`, battery.state === 'partial' && battery.reason.startsWith('NO_CALIBRATED_THRESHOLD'));
  check(`${label}: fixture sanity — battery has no letter (withheld, not a measurement gap)`, battery.letter === null);
  check(`${label}: fixture sanity — coverage is ${expectedCoveragePct}%`, Math.round(battery.coverage * 100) === expectedCoveragePct);

  const html = renderOneCategory(battery);
  check(`${label}: shows the curated v7ReasonBatteryUncalibrated sentence`, html.includes(t.verify.v7ReasonBatteryUncalibrated));
  check(`${label}: does NOT show the misleading "تغطية جزئية" label`, !html.includes(t.verify.v7StatePartial));
  check(`${label}: the reason sentence appears exactly once (not duplicated as a label too)`, html.split(t.verify.v7ReasonBatteryUncalibrated).length - 1 === 1);
  check(`${label}: never shows the raw reason code`, !html.includes('NO_CALIBRATED_THRESHOLD'));
  check(`${label}: coverage bar still shows the real ${expectedCoveragePct}%, untouched`, html.includes(`${expectedCoveragePct}%`));
  // Single-category render, so any "border-dashed" in the output belongs to
  // this card. isDashed only covers unmeasured/unknown/harnessError — battery
  // here is 'partial' (a real measurement exists), so it must stay solid.
  check(`${label}: card border stays solid (a real measurement exists, just no calibrated grade)`, !html.includes('border-dashed'));
}

// ---------------------------------------------------------------------------
// S10 — 100% coverage. Tested on BOTH real shapes it actually arrives in.
// ---------------------------------------------------------------------------
checkBatteryCard('S10 (B — Firestore reports document, admin/reports\' shape)', loadReportsDocSample(), 100);
checkBatteryCard('S10 (C — verifyReport response, /verify+/print\'s shape)', loadVerifyReportSample(), 100);

// ---------------------------------------------------------------------------
// Honor — 25% coverage (one measured indicator, BAT-COULOMB; three
// ABSTAINED). Same pair, very different coverage — proves the fix isn't
// coincidentally tied to the 100% case.
// ---------------------------------------------------------------------------
checkBatteryCard('Honor (B)', loadReportsDocHonorSample(), 25);
checkBatteryCard('Honor (C)', loadVerifyReportHonorSample(), 25);

// ---------------------------------------------------------------------------
// The model-adjusted marker must never appear for a category with no
// letter — decision 87 §4's second requirement. Not observed combined with
// letter=null in any real fixture (both S10 and Honor's battery carry
// letterSource=DETERMINISTIC), so built via withCategoryOverride to prove
// the guard itself, both ways (it fires when it should, not just never).
// ---------------------------------------------------------------------------
{
  const base = loadReportsDocSample();

  const noLetterAdjusted = withCategoryOverride(base, 'battery', { letter: null, letterSource: 'LLM_ADJUSTED' });
  const cat1 = readCategories(noLetterAdjusted).find((c) => c.name === 'battery');
  check('synthetic (letter=null, letterSource=LLM_ADJUSTED): classifies as llmAdjusted', cat1.letterSource === 'llmAdjusted');
  const html1 = renderOneCategory(cat1);
  check(
    'synthetic (letter=null, letterSource=LLM_ADJUSTED): the "model-adjusted" marker does NOT render for a letterless category',
    !html1.includes(t.verify.letterSourceAdjustedLabel)
  );

  const letterAdjusted = withCategoryOverride(base, 'cpu', { letter: 'B', letterSource: 'LLM_ADJUSTED' });
  const cat2 = readCategories(letterAdjusted).find((c) => c.name === 'cpu');
  const html2 = renderOneCategory(cat2);
  check(
    'synthetic (letter="B", letterSource=LLM_ADJUSTED): the marker DOES render when a real letter exists (guard is not just "never show it")',
    html2.includes(t.verify.letterSourceAdjustedLabel)
  );
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
