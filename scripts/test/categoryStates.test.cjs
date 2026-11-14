'use strict';

// classifyCategoryState + V7CategoriesGrid — decision 82 §1, 2026-09-24.
//
// The backend's categories.<name>.state enum has five real values (relayed
// by the coordinator as the backend's categoryStates.js:70-72 — this repo's
// agent cannot read neuralcheck-backend to verify that file directly):
// MEASURED, PARTIAL, UNMEASURED, ATTESTED_ONLY, HARNESS_ERROR. Rule: every
// enumerated value that arrives from the server is tested by classification
// AND by what the reader produces from it — not just one sample value, and
// not classification alone divorced from what actually reaches the screen
// (a unit test on the reader is not "the page renders correctly" — the
// wrong bucket only shows up once something renders through the real
// component, as honorNoLetter.test.cjs's own history already found once).
//
// HARNESS_ERROR has a real fixture (contract/v7-reports-document-sample-
// honor.json, exercised in scripts/test/honorNoLetter.test.cjs). ATTESTED_ONLY
// has none yet in this repo — built here via _shapes.cjs's
// withCategoryOverride on a REAL loaded B fixture, changing only the one
// field under test (see that file's header for why this is narrower than
// inventing a whole synthetic shape). A sixth, deliberately unrecognized raw
// value proves 'unknown' still catches anything outside the five — decision
// 82 §1's own words: "«حالة غير معروفة» تبقى للمجهول فعلاً".
//
// Run: node scripts/test/categoryStates.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { readCategories, classifyCategoryState, countIssuesByCategory, readIssues } = require('@/lib/reportReaders/v7');
const V7CategoriesGrid = require('@/components/verify/V7CategoriesGrid').default;
const { translations } = require('@/lib/i18n');
const { loadReportsDocSample, withCategoryOverride } = require('./_shapes.cjs');

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

// ---------------------------------------------------------------------------
// classifyCategoryState — every one of the five documented values, plus a
// deliberately unrecognized one. Rule 30: all possible values, not one.
// ---------------------------------------------------------------------------
check('classifyCategoryState(MEASURED)', classifyCategoryState('MEASURED') === 'measured');
check('classifyCategoryState(PARTIAL)', classifyCategoryState('PARTIAL') === 'partial');
check('classifyCategoryState(UNMEASURED)', classifyCategoryState('UNMEASURED') === 'unmeasured');
check('classifyCategoryState(ATTESTED_ONLY)', classifyCategoryState('ATTESTED_ONLY') === 'attestedOnly');
check('classifyCategoryState(HARNESS_ERROR)', classifyCategoryState('HARNESS_ERROR') === 'harnessError');
check('classifyCategoryState(a genuinely unrecognized value) stays unknown', classifyCategoryState('NO_DATA') === 'unknown');
check('classifyCategoryState(missing/null) stays unknown, not folded into any real state', classifyCategoryState(null) === 'unknown');

// ---------------------------------------------------------------------------
// Real B fixture (contract/v7-reports-document-sample.json) — 'camera'
// overridden to ATTESTED_ONLY (no real fixture has this value yet), 'gpu'
// overridden to a made-up unrecognized value to exercise the true-unknown
// path. Every other byte of the fixture, and every other category, is real
// vendored data (see _shapes.cjs's withCategoryOverride doc comment).
// ---------------------------------------------------------------------------
const base = loadReportsDocSample();
const withAttestedOnly = withCategoryOverride(base, 'camera', { state: 'ATTESTED_ONLY' });
const withTrulyUnknown = withCategoryOverride(base, 'gpu', { state: 'NOT_A_REAL_STATE' });

const catsBase = readCategories(base);
const catsAttested = readCategories(withAttestedOnly);
const catsUnknown = readCategories(withTrulyUnknown);

const cameraAttested = catsAttested.find((c) => c.name === 'camera');
const gpuUnknown = catsUnknown.find((c) => c.name === 'gpu');

check('fixture sanity: camera classifies as attestedOnly after the override', cameraAttested?.state === 'attestedOnly');
check('fixture sanity: gpu classifies as unknown after the override', gpuUnknown?.state === 'unknown');

function renderOne(cat) {
  return render(
    React.createElement(V7CategoriesGrid, {
      categories: [cat],
      issueCounts: countIssuesByCategory(readIssues(base)),
      t,
    })
  );
}

// ---------------------------------------------------------------------------
// attestedOnly — approved sentence renders verbatim; badge stays icon-only
// (no invented short label); card keeps a SOLID border (a technician did
// give a real answer, unlike an empty/failed measurement).
// ---------------------------------------------------------------------------
{
  const html = renderOne(cameraAttested);
  check('attestedOnly: renders the approved v7StateAttestedOnly sentence verbatim', html.includes(t.verify.v7StateAttestedOnly));
  check('attestedOnly: does not fall back to the unknown label', !html.includes(t.verify.v7StateUnknown));
  check('attestedOnly: does not render a raw "state: ATTESTED_ONLY" debug marker (it is a recognized state now)', !html.includes('state: ATTESTED_ONLY'));
  check('attestedOnly: card border is solid, not dashed (real technician answer, not empty data)', !html.includes('border-dashed'));
}

// ---------------------------------------------------------------------------
// harnessError — approved sentence renders verbatim; card gets the dashed
// "no real measurement" border, same as unmeasured/unknown.
// ---------------------------------------------------------------------------
{
  const harnessCat = { ...cameraAttested, state: 'harnessError', stateRaw: 'HARNESS_ERROR' };
  const html = renderOne(harnessCat);
  check('harnessError: renders the approved v7StateHarnessError sentence verbatim', html.includes(t.verify.v7StateHarnessError));
  check('harnessError: does not render the old raw debug marker', !html.includes('state: HARNESS_ERROR'));
  check('harnessError: card border is dashed (no real measurement)', html.includes('border-dashed'));
}

// ---------------------------------------------------------------------------
// A genuinely unrecognized value (not one of the five) still renders as
// unknown, with its raw value visible — decision 82 §1's explicit
// requirement that 'unknown' stays reserved for the actually-unrecognized.
// ---------------------------------------------------------------------------
{
  // decision 87 §5 (2026-09-25): v7StateUnknown's Arabic text is now the
  // app's own existing string verbatim ("حالة قياس هذه الفئة غير معروفة",
  // NeuralChek's report_v7_state_unknown — rule 29), replacing the shorter
  // "حالة غير معروفة". Content-locked here, not just checked for
  // self-consistency (html.includes(t.verify.v7StateUnknown) alone would
  // still pass even if the key's value drifted to something unapproved).
  check(
    'v7StateUnknown is exactly decision 87 §5\'s approved text',
    t.verify.v7StateUnknown === 'حالة قياس هذه الفئة غير معروفة'
  );

  const html = renderOne(gpuUnknown);
  check('true-unknown: renders the v7StateUnknown label', html.includes(t.verify.v7StateUnknown));
  check('true-unknown: shows the raw debug marker with the real bogus value', html.includes('state: NOT_A_REAL_STATE'));
  check('true-unknown: does NOT render either approved sentence (not folded into attestedOnly/harnessError)', !html.includes(t.verify.v7StateAttestedOnly) && !html.includes(t.verify.v7StateHarnessError));
}

// ---------------------------------------------------------------------------
// Sanity: the ordinary measured/partial categories from the real, unmodified
// fixture are unaffected by any of the above (no cross-talk between cards).
//
// partialCat deliberately excludes a category with a `reason` set — battery
// is 'partial' too, but decision 87 §4 (2026-09-25) specifically suppresses
// its "تغطية جزئية" label for the (partial, NO_CALIBRATED_THRESHOLD) pair
// (see scripts/test/batteryCard.test.cjs for that case). This sanity check
// is about an ORDINARY partial category with no such pairing (gpu, in this
// fixture) — used to assert "still renders v7StatePartial" before decision
// 87 §4 existed; battery happened to be first in iteration order and
// silently made that assertion true for the wrong reason. Replaced (not
// left alongside) per this repo's own convention: a test proving stale
// behavior is corrected, not kept beside a newer one.
// ---------------------------------------------------------------------------
{
  const measuredCat = catsBase.find((c) => c.state === 'measured');
  const partialCat = catsBase.find((c) => c.state === 'partial' && !c.reason);
  check('sanity: fixture has at least one measured category', !!measuredCat);
  check('sanity: fixture has at least one ordinary (reason-less) partial category', !!partialCat);
  if (measuredCat) {
    const html = renderOne(measuredCat);
    check('measured: still renders v7StateMeasured, unaffected by the new states', html.includes(t.verify.v7StateMeasured));
  }
  if (partialCat) {
    const html = renderOne(partialCat);
    check('partial (no special reason): still renders v7StatePartial, unaffected by the new states', html.includes(t.verify.v7StatePartial));
  }
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
