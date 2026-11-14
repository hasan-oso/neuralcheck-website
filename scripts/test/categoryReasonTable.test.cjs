'use strict';

// classifyCategoryReason + V7CategoriesGrid's reason display — decision 84
// §1 / 86 §3 (2026-09-25). The raw `categories.<name>.reason` code used to
// render verbatim on screen (dir="ltr", font-mono) — this table replaces
// that with a curated sentence per (state, reason) PAIR, hides two pairs
// entirely (the state's own text already says it), and folds any pair
// outside the table into the existing "unknown state" text — never the raw
// code again.
//
// Real fixtures cover most of the table already:
//   - contract/v7-reports-document-sample.json: battery(PARTIAL,
//     NO_CALIBRATED_THRESHOLD), thermal/camera(UNMEASURED,
//     DECLARED_BUT_NONE_EXECUTED), audio/input(UNMEASURED,
//     NO_HEALTH_BEARING_TESTS_DECLARED).
//   - contract/v7-reports-document-sample-honor.json: 14 categories at
//     (HARNESS_ERROR, HARNESS_ERROR) — the first "hidden" pair.
// The remaining rows (UNMEASURED+NO_CALIBRATED_THRESHOLD,
// UNMEASURED+HARNESS_ERROR, ATTESTED_ONLY+MANUAL_ATTESTATION_ONLY,
// NO_BATTERY_INDICATORS_MEASURED in every state, and an out-of-table pair)
// have no real sample yet — built via _shapes.cjs's withCategoryOverride on a
// real fixture, changing only the field(s) under test (rule 30: every
// possible value, not one; never a fabricated whole shape).
//
// UPDATE 2026-10-07 (user's decision, البند ٧; rule 23): this file used to
// pin NO_BATTERY_INDICATORS_MEASURED to 'unknown' and call it a "dead/
// never-real value", then use it again as the example of an out-of-table
// code in the end-to-end render at the bottom. The server really produces
// that code (battery's final fallback — neuralcheck-backend
// functions/src/analysis/buildDisplayShapeV7.js:122-124, relayed and not
// verifiable from this repo), so both assertions were replaced: it now maps
// to v7ReasonBatteryUnmeasured whatever the state, and the "unknown code"
// examples use GENUINELY_UNKNOWN_REASON — an invented string that is in no
// backend list.
//
// Run: node scripts/test/categoryReasonTable.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const {
  readCategories,
  countIssuesByCategory,
  readIssues,
  classifyCategoryReason,
  REASON_NO_HEALTH_BEARING_TESTS_DECLARED,
  REASON_DECLARED_BUT_NONE_EXECUTED,
  REASON_HARNESS_ERROR,
  REASON_MANUAL_ATTESTATION_ONLY,
  REASON_NO_CALIBRATED_THRESHOLD,
  REASON_NO_BATTERY_INDICATORS_MEASURED,
} = require('@/lib/reportReaders/v7');
const V7CategoriesGrid = require('@/components/verify/V7CategoriesGrid').default;
const { translations } = require('@/lib/i18n');
const { loadReportsDocSample, loadReportsDocHonorSample, withCategoryOverride } = require('./_shapes.cjs');

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
    React.createElement(V7CategoriesGrid, {
      categories: [cat],
      issueCounts: countIssuesByCategory([]),
      t,
    })
  );
}

const base = loadReportsDocSample();
const honor = loadReportsDocHonorSample();

// A reason string that is in NO backend list (invented for this test, not
// derived from any code the server produces) — the stand-in for "a genuinely
// unknown code" everywhere below that used to borrow
// NO_BATTERY_INDICATORS_MEASURED for that role (see the 2026-10-07 UPDATE in
// this file's header).
const GENUINELY_UNKNOWN_REASON = 'NOT_A_REAL_REASON_CODE';

// ---------------------------------------------------------------------------
// classifyCategoryReason — every table row, both directions of the
// literal constants, and the fallback. Pure function, no rendering.
// ---------------------------------------------------------------------------
check(
  '(any state, NO_HEALTH_BEARING_TESTS_DECLARED) -> text, unconditional on state',
  classifyCategoryReason('measured', REASON_NO_HEALTH_BEARING_TESTS_DECLARED).kind === 'text' &&
    classifyCategoryReason('measured', REASON_NO_HEALTH_BEARING_TESTS_DECLARED).i18nKey === 'v7ReasonNoHealthBearingDeclared' &&
    classifyCategoryReason('unmeasured', REASON_NO_HEALTH_BEARING_TESTS_DECLARED).i18nKey === 'v7ReasonNoHealthBearingDeclared'
);
check(
  '(any state, DECLARED_BUT_NONE_EXECUTED) -> text, unconditional on state',
  classifyCategoryReason('partial', REASON_DECLARED_BUT_NONE_EXECUTED).i18nKey === 'v7ReasonDeclaredButNoneExecuted' &&
    classifyCategoryReason('unknown', REASON_DECLARED_BUT_NONE_EXECUTED).i18nKey === 'v7ReasonDeclaredButNoneExecuted'
);
check(
  '(PARTIAL, NO_CALIBRATED_THRESHOLD) -> v7ReasonBatteryUncalibrated',
  classifyCategoryReason('partial', REASON_NO_CALIBRATED_THRESHOLD).i18nKey === 'v7ReasonBatteryUncalibrated'
);
check(
  '(MEASURED, NO_CALIBRATED_THRESHOLD) -> v7ReasonBatteryUncalibrated',
  classifyCategoryReason('measured', REASON_NO_CALIBRATED_THRESHOLD).i18nKey === 'v7ReasonBatteryUncalibrated'
);
check(
  '(UNMEASURED, NO_CALIBRATED_THRESHOLD) -> v7ReasonBatteryUnmeasured (different text, same reason code)',
  classifyCategoryReason('unmeasured', REASON_NO_CALIBRATED_THRESHOLD).i18nKey === 'v7ReasonBatteryUnmeasured'
);
check(
  '(UNMEASURED, HARNESS_ERROR) -> v7ReasonHarnessErrorUnmeasured',
  classifyCategoryReason('unmeasured', REASON_HARNESS_ERROR).i18nKey === 'v7ReasonHarnessErrorUnmeasured'
);
check(
  '(HARNESS_ERROR, HARNESS_ERROR) -> hidden (state\'s own sentence already says it)',
  classifyCategoryReason('harnessError', REASON_HARNESS_ERROR).kind === 'hidden'
);
check(
  '(ATTESTED_ONLY, MANUAL_ATTESTATION_ONLY) -> hidden',
  classifyCategoryReason('attestedOnly', REASON_MANUAL_ATTESTATION_ONLY).kind === 'hidden'
);
check('no reason at all -> none', classifyCategoryReason('measured', null).kind === 'none');
check('empty-string reason -> none', classifyCategoryReason('measured', '').kind === 'none');

// Pairs OUTSIDE the table — every named reason paired with a state the
// table does NOT list for it, plus a wholly unrecognized reason string.
check(
  '(ATTESTED_ONLY, NO_CALIBRATED_THRESHOLD) is not in the table -> unknown (not silently matched to the battery rows)',
  classifyCategoryReason('attestedOnly', REASON_NO_CALIBRATED_THRESHOLD).kind === 'unknown'
);
check(
  '(MEASURED, HARNESS_ERROR) is not in the table -> unknown',
  classifyCategoryReason('measured', REASON_HARNESS_ERROR).kind === 'unknown'
);
check(
  '(MEASURED, MANUAL_ATTESTATION_ONLY) is not in the table -> unknown',
  classifyCategoryReason('measured', REASON_MANUAL_ATTESTATION_ONLY).kind === 'unknown'
);
check(
  'a wholly unrecognized reason string -> unknown (a genuinely unknown code, not a real one)',
  classifyCategoryReason('unmeasured', GENUINELY_UNKNOWN_REASON).kind === 'unknown'
);

// NO_BATTERY_INDICATORS_MEASURED — a REAL code (2026-10-07, user's decision
// البند ٧). Replaces the old assertion that pinned it to 'unknown' as a
// "dead/never-real value" (rule 23): text v7ReasonBatteryUnmeasured,
// unconditional on state — every classified state, none falling to
// 'unknown'. No `replacesStateLabel` (that flag belongs only to the
// (partial, NO_CALIBRATED_THRESHOLD) pair, decision 87 §4).
for (const state of ['measured', 'partial', 'unmeasured', 'attestedOnly', 'harnessError', 'unknown']) {
  const r = classifyCategoryReason(state, REASON_NO_BATTERY_INDICATORS_MEASURED);
  check(
    `(${state}, NO_BATTERY_INDICATORS_MEASURED) -> text v7ReasonBatteryUnmeasured, whatever the state`,
    r.kind === 'text' && r.i18nKey === 'v7ReasonBatteryUnmeasured' && !r.replacesStateLabel
  );
}

// ---------------------------------------------------------------------------
// Real fixture -> real component: battery (PARTIAL, NO_CALIBRATED_THRESHOLD)
// and thermal/camera/audio/input, from the real vendored B sample.
// ---------------------------------------------------------------------------
{
  const cats = readCategories(base);
  const battery = cats.find((c) => c.name === 'battery');
  const thermal = cats.find((c) => c.name === 'thermal');
  const audio = cats.find((c) => c.name === 'audio');

  check('fixture sanity: real battery is (partial, the real NO_CALIBRATED_THRESHOLD literal)', battery.state === 'partial' && battery.reason === REASON_NO_CALIBRATED_THRESHOLD);
  check('fixture sanity: real thermal is (unmeasured, DECLARED_BUT_NONE_EXECUTED)', thermal.state === 'unmeasured' && thermal.reason === REASON_DECLARED_BUT_NONE_EXECUTED);
  check('fixture sanity: real audio is (unmeasured, NO_HEALTH_BEARING_TESTS_DECLARED)', audio.state === 'unmeasured' && audio.reason === REASON_NO_HEALTH_BEARING_TESTS_DECLARED);

  const batteryHtml = renderOneCategory(battery);
  check('real battery card: shows the curated v7ReasonBatteryUncalibrated sentence', batteryHtml.includes(t.verify.v7ReasonBatteryUncalibrated));
  check('real battery card: never shows the raw reason code', !batteryHtml.includes('NO_CALIBRATED_THRESHOLD'));
  check('real battery card: never shows the PLAN-03 parenthetical', !batteryHtml.includes('batteryLayer.js'));

  const thermalHtml = renderOneCategory(thermal);
  check('real thermal card: shows the curated v7ReasonDeclaredButNoneExecuted sentence', thermalHtml.includes(t.verify.v7ReasonDeclaredButNoneExecuted));
  check('real thermal card: never shows the raw "DECLARED_BUT_NONE_EXECUTED" code', !thermalHtml.includes('DECLARED_BUT_NONE_EXECUTED'));

  const audioHtml = renderOneCategory(audio);
  check('real audio card: shows the curated v7ReasonNoHealthBearingDeclared sentence', audioHtml.includes(t.verify.v7ReasonNoHealthBearingDeclared));
  check('real audio card: never shows the raw "NO_HEALTH_BEARING_TESTS_DECLARED" code', !audioHtml.includes('NO_HEALTH_BEARING_TESTS_DECLARED'));
}

// ---------------------------------------------------------------------------
// Real Honor fixture -> real component: 14 categories at (harnessError,
// HARNESS_ERROR) — the hidden pair. The state's own full sentence still
// shows (from decision 82 §1); the reason paragraph must not ALSO show.
// ---------------------------------------------------------------------------
{
  const cats = readCategories(honor);
  const harnessCats = cats.filter((c) => c.state === 'harnessError' && c.reason === REASON_HARNESS_ERROR);
  check('fixture sanity: Honor has 14 real (harnessError, HARNESS_ERROR) categories', harnessCats.length === 14);

  const html = renderOneCategory(harnessCats[0]);
  check('hidden pair: the state\'s own sentence still renders', html.includes(t.verify.v7StateHarnessError));
  check('hidden pair: the raw "HARNESS_ERROR" code never appears as its own visible text node', !html.includes('>HARNESS_ERROR<'));
  // The state sentence appears exactly three times by design: the badge's
  // `title` attribute, its `aria-label`, and the visible body paragraph
  // (see V7CategoryCard) — never a FOURTH time, which would mean a
  // separate reason paragraph duplicated it.
  const occurrences = html.split(t.verify.v7StateHarnessError).length - 1;
  check(
    'hidden pair: the state sentence appears exactly 3 times (title + aria-label + body), not a 4th from a reason paragraph',
    occurrences === 3
  );
}

// ---------------------------------------------------------------------------
// Synthetic (via withCategoryOverride on a real fixture) — rows with no
// real sample yet: UNMEASURED+NO_CALIBRATED_THRESHOLD,
// UNMEASURED+HARNESS_ERROR, ATTESTED_ONLY+MANUAL_ATTESTATION_ONLY, and an
// out-of-table pair rendered through the real component end to end.
// ---------------------------------------------------------------------------
{
  const batteryUnmeasured = withCategoryOverride(base, 'battery', { state: 'UNMEASURED', reason: REASON_NO_CALIBRATED_THRESHOLD });
  const cat1 = readCategories(batteryUnmeasured).find((c) => c.name === 'battery');
  const html1 = renderOneCategory(cat1);
  check('synthetic (UNMEASURED, NO_CALIBRATED_THRESHOLD): shows v7ReasonBatteryUnmeasured, not v7ReasonBatteryUncalibrated', html1.includes(t.verify.v7ReasonBatteryUnmeasured) && !html1.includes(t.verify.v7ReasonBatteryUncalibrated));

  const camUnmeasuredHarness = withCategoryOverride(base, 'camera', { state: 'UNMEASURED', reason: REASON_HARNESS_ERROR });
  const cat2 = readCategories(camUnmeasuredHarness).find((c) => c.name === 'camera');
  const html2 = renderOneCategory(cat2);
  check('synthetic (UNMEASURED, HARNESS_ERROR): shows v7ReasonHarnessErrorUnmeasured', html2.includes(t.verify.v7ReasonHarnessErrorUnmeasured));

  const attestedManual = withCategoryOverride(base, 'input', { state: 'ATTESTED_ONLY', reason: REASON_MANUAL_ATTESTATION_ONLY });
  const cat3 = readCategories(attestedManual).find((c) => c.name === 'input');
  const html3 = renderOneCategory(cat3);
  check('synthetic (ATTESTED_ONLY, MANUAL_ATTESTATION_ONLY): the attestedOnly sentence shows', html3.includes(t.verify.v7StateAttestedOnly));
  check('synthetic (ATTESTED_ONLY, MANUAL_ATTESTATION_ONLY): no separate reason text, no raw code', !html3.includes('MANUAL_ATTESTATION_ONLY'));

  // Out-of-table: a genuinely unknown code (2026-10-07: this used to be
  // NO_BATTERY_INDICATORS_MEASURED, which is a real code — see the header's
  // UPDATE). An unknown code in a category ROW still shows v7StateUnknown —
  // unchanged — never the abstention list's #15 fallback and never the raw
  // string.
  const outOfTable = withCategoryOverride(base, 'gps', { state: 'MEASURED', reason: GENUINELY_UNKNOWN_REASON });
  const cat4 = readCategories(outOfTable).find((c) => c.name === 'gps');
  const html4 = renderOneCategory(cat4);
  check('synthetic out-of-table pair: shows the existing "unknown state" text in the reason\'s place', html4.includes(t.verify.v7StateUnknown));
  check('synthetic out-of-table pair: never shows the unknown raw code on screen', !html4.includes(GENUINELY_UNKNOWN_REASON));
  check('synthetic out-of-table pair: does NOT show the #15 sentence (that is the abstention list\'s fallback, not the category row\'s)', !html4.includes(t.verify.v7ReasonDeclaredButNoneExecuted));
}

// ---------------------------------------------------------------------------
// NO_BATTERY_INDICATORS_MEASURED through the real component (2026-10-07,
// user's decision البند ٧) — battery, via withCategoryOverride on the real B
// fixture: every raw state the server can send (plus one garbage state),
// Arabic; then all three site languages for the realistic UNMEASURED case
// (the battery's final fallback — deterministicLetter null). The approved
// sentence renders, never the raw code, and for the five real states never
// the "unknown" text either (it must not fall into the unknown path).
// ---------------------------------------------------------------------------
{
  const RAW_STATES = ['UNMEASURED', 'MEASURED', 'PARTIAL', 'ATTESTED_ONLY', 'HARNESS_ERROR'];
  for (const rawState of RAW_STATES) {
    const doc = withCategoryOverride(base, 'battery', { state: rawState, reason: REASON_NO_BATTERY_INDICATORS_MEASURED });
    const cat = readCategories(doc).find((c) => c.name === 'battery');
    const html = renderOneCategory(cat);
    check(`category row (${rawState}, NO_BATTERY_INDICATORS_MEASURED): shows the approved v7ReasonBatteryUnmeasured sentence`, html.includes(t.verify.v7ReasonBatteryUnmeasured));
    check(`category row (${rawState}, NO_BATTERY_INDICATORS_MEASURED): never shows the raw code`, !html.includes(REASON_NO_BATTERY_INDICATORS_MEASURED));
    check(`category row (${rawState}, NO_BATTERY_INDICATORS_MEASURED): does not fall into the unknown path (no v7StateUnknown)`, !html.includes(t.verify.v7StateUnknown));
  }

  const garbageState = withCategoryOverride(base, 'battery', { state: 'NOT_A_REAL_STATE', reason: REASON_NO_BATTERY_INDICATORS_MEASURED });
  const garbageCat = readCategories(garbageState).find((c) => c.name === 'battery');
  const garbageHtml = renderOneCategory(garbageCat);
  check('category row (garbage state, NO_BATTERY_INDICATORS_MEASURED): the reason sentence still renders — state-independent', garbageHtml.includes(t.verify.v7ReasonBatteryUnmeasured));

  for (const lang of ['ar', 'tr', 'en']) {
    const tt = translations[lang];
    const doc = withCategoryOverride(base, 'battery', { state: 'UNMEASURED', reason: REASON_NO_BATTERY_INDICATORS_MEASURED });
    const cat = readCategories(doc).find((c) => c.name === 'battery');
    const html = render(
      React.createElement(V7CategoriesGrid, { categories: [cat], issueCounts: countIssuesByCategory([]), t: tt })
    );
    // react-dom/server HTML-escapes apostrophes; normalize as the lock test does.
    check(`[${lang}] category row (UNMEASURED, NO_BATTERY_INDICATORS_MEASURED): shows its approved text in this language`, html.includes(tt.verify.v7ReasonBatteryUnmeasured.replace(/'/g, '&#x27;')));
  }
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
