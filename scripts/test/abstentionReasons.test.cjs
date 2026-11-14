'use strict';

// overall.abstentionReasons — task order, 2026-10-01; REPLACED on the real
// samples 2026-10-07 (golden sync to neuralcheck-backend d5b6c29; the derived
// zero-measured samples come from 8e49fc6 through the real chain
// `runAnalysisInternal`, with only the model call replaced).
//
// The server sends an ARRAY OF OBJECTS {category, reason} (neuralcheck-backend
// buildDisplayShapeV7.js:353, relayed — filled only when zeroMeasuredMessage
// is set). lib/reportReaders/v7.js used to filter the array with
// `typeof s === 'string'`, which drops every object silently (the whole list
// collapsed to an empty array, then to `null`, no warning), and
// components/verify/V7Notices.js never showed anything for it. Both fixed;
// this file proves it on REAL data.
//
// What is REAL here (golden samples vendored in contract/, byte-for-byte from
// the backend; none of them edited):
//   - v7-verifyReport-response-sample-zero-measured.json            (C)
//   - v7-verifyReport-response-sample-zero-measured-battery-harness-error.json (C)
//   - v7-reports-document-sample-zero-measured.json                 (B)
//   - v7-reports-document-sample-zero-measured-battery-harness-error.json (B)
//   - the default C/B samples, where abstentionReasons is a real `null`.
// Together they reach four reason codes with their approved texts:
//   NO_CALIBRATED_THRESHOLD (battery — the default sample),
//   DECLARED_BUT_NONE_EXECUTED, NO_HEALTH_BEARING_TESTS_DECLARED, and
//   HARNESS_ERROR (battery — the battery-harness-error sample).
//
// Rule 41: verifyReport (C) FLATTENS `overall` onto `aiResponse` —
// `zeroMeasuredMessage` and `abstentionReasons` sit directly on
// `aiResponse`; the Firestore document (B) nests them under
// `aiResponse.overall`. Neither is assumed: the raw JSON of the samples is
// checked below, and the reader is shown to find them at each level.
//
// What is NOT real, and says so: MANUAL_ATTESTATION_ONLY,
// NO_BATTERY_INDICATORS_MEASURED and an unrecognized code cannot be produced
// from any real input (the backend's reasons are in
// v7-zero-measured-samples-meta.json `codesNotReachable`, relayed) — they stay
// synthetic, built by overriding `abstentionReasons` on a real sample, marked
// «لا يُنال من مُدخل حقيقي» (backend 8e49fc6 `codesNotReachable`) — the user's
// decision, 2026-10-07: they stay synthetic tests under exactly that label;
// no technician attestation is invented and the server's code is not changed
// on their account. The unknown code is under the same label. The reader's
// malformed-entry cases are contract violations — synthetic by nature.
//
// Run: node scripts/test/abstentionReasons.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const {
  readOverall,
  classifyAbstentionReason,
  REASON_NO_HEALTH_BEARING_TESTS_DECLARED,
  REASON_DECLARED_BUT_NONE_EXECUTED,
  REASON_HARNESS_ERROR,
  REASON_MANUAL_ATTESTATION_ONLY,
  REASON_NO_CALIBRATED_THRESHOLD,
  REASON_NO_BATTERY_INDICATORS_MEASURED,
} = require('@/lib/reportReaders/v7');
const V7Notices = require('@/components/verify/V7Notices').default;
const { translations } = require('@/lib/i18n');
const {
  loadVerifyReportSample,
  loadReportsDocSample,
  loadVerifyReportZeroMeasuredSample,
  loadReportsDocZeroMeasuredSample,
  loadVerifyReportZeroMeasuredBatteryHarnessErrorSample,
  loadReportsDocZeroMeasuredBatteryHarnessErrorSample,
  withAiResponseOverride,
} = require('./_shapes.cjs');

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
function captureWarnings(fn) {
  const original = console.warn;
  const seen = [];
  console.warn = (...args) => { seen.push(args.map(String).join(' ')); };
  try {
    return { result: fn(), warnings: seen };
  } finally {
    console.warn = original;
  }
}
function unescapeHtml(s) {
  return s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}
// Every "<h4 …>NAME</h4><p …>TEXT</p>" pair V7Notices' abstention card
// renders, in order — the bold title and the approved sentence under it.
function extractPairs(html) {
  const re = /<h4 class="([^"]*)">([^<]*)<\/h4><p class="[^"]*">([^<]*)<\/p>/g;
  const pairs = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    pairs.push({ headingClass: m[1], name: unescapeHtml(m[2]), text: unescapeHtml(m[3]) });
  }
  return pairs;
}

// Independent expectations — hand-written here, NOT derived from the code
// under test (classifyAbstentionReason / categoryLabel): category -> its
// lib/i18n.js cat* key, reason code -> the key that carries its approved
// sentence. The raw reason strings come from the exported REASON_* constants
// (rule 24), never retyped.
const CATEGORY_KEY = {
  display: 'catDisplay', memory: 'catMemory', storage: 'catStorage', battery: 'catBattery',
  thermal: 'catThermal', cpu: 'catCpu', gpu: 'catGpu', sensors: 'catSensors', camera: 'catCamera',
  gps: 'catGps', cellular: 'catCellular', wireless: 'catWireless', security: 'catSecurity',
  audio: 'catAudio', input: 'catInput',
};
const TEXT_KEY = {
  [REASON_NO_CALIBRATED_THRESHOLD]: 'v7ReasonBatteryUncalibrated',
  [REASON_DECLARED_BUT_NONE_EXECUTED]: 'v7ReasonDeclaredButNoneExecuted',
  [REASON_NO_HEALTH_BEARING_TESTS_DECLARED]: 'v7ReasonNoHealthBearingDeclared',
  [REASON_HARNESS_ERROR]: 'v7ReasonHarnessErrorUnmeasured',
  // لا يُنال من مُدخل حقيقي (backend 8e49fc6 `codesNotReachable`) — synthetic section below:
  [REASON_MANUAL_ATTESTATION_ONLY]: 'v7StateAttestedOnly',
  [REASON_NO_BATTERY_INDICATORS_MEASURED]: 'v7ReasonBatteryUnmeasured',
};
const UNKNOWN_CODE_KEY = 'v7ReasonDeclaredButNoneExecuted'; // #15 — the user's decision
const RAW_FRAGMENTS = ['NO_CALIBRATED_THRESHOLD', 'DECLARED_BUT_NONE_EXECUTED', 'NO_HEALTH_BEARING_TESTS_DECLARED', 'HARNESS_ERROR', 'MANUAL_ATTESTATION_ONLY', 'NO_BATTERY_INDICATORS_MEASURED', 'batteryLayer.js', 'PLAN-03'];

const REAL = {
  'zero-measured C': { shape: 'C', doc: loadVerifyReportZeroMeasuredSample(), battery: REASON_NO_CALIBRATED_THRESHOLD },
  'zero-measured B': { shape: 'B', doc: loadReportsDocZeroMeasuredSample(), battery: REASON_NO_CALIBRATED_THRESHOLD },
  'battery-harness-error C': { shape: 'C', doc: loadVerifyReportZeroMeasuredBatteryHarnessErrorSample(), battery: REASON_HARNESS_ERROR },
  'battery-harness-error B': { shape: 'B', doc: loadReportsDocZeroMeasuredBatteryHarnessErrorSample(), battery: REASON_HARNESS_ERROR },
};
// The raw list as the server sent it, read from the sample's own JSON (C:
// flat on aiResponse; B: under aiResponse.overall) — never via the reader.
function rawList(entry) {
  return entry.shape === 'C' ? entry.doc.aiResponse.abstentionReasons : entry.doc.aiResponse.overall.abstentionReasons;
}

// ---------------------------------------------------------------------------
// Rule 41 — WHERE the fields are, checked on the real samples themselves.
// ---------------------------------------------------------------------------
for (const [name, entry] of Object.entries(REAL)) {
  const ai = entry.doc.aiResponse;
  if (entry.shape === 'C') {
    check(`[${name}] verifyReport shape: abstentionReasons sits directly on aiResponse`, Array.isArray(ai.abstentionReasons) && ai.abstentionReasons.length === 15);
    check(`[${name}] verifyReport shape: zeroMeasuredMessage sits directly on aiResponse`, typeof ai.zeroMeasuredMessage === 'string' && ai.zeroMeasuredMessage.length > 0);
    check(`[${name}] verifyReport shape: there is NO nested aiResponse.overall`, !('overall' in ai));
  } else {
    check(`[${name}] Firestore document shape: abstentionReasons nests under aiResponse.overall`, Array.isArray(ai.overall.abstentionReasons) && ai.overall.abstentionReasons.length === 15);
    check(`[${name}] Firestore document shape: nothing flat on aiResponse itself`, !('abstentionReasons' in ai));
  }
  const list = rawList(entry);
  check(`[${name}] every raw entry is exactly {category, reason}`, list.every((e) => JSON.stringify(Object.keys(e).sort()) === JSON.stringify(['category', 'reason'])));
  check(`[${name}] the 15 categories are all present, once each`, new Set(list.map((e) => e.category)).size === 15 && list.every((e) => e.category in CATEGORY_KEY));
  check(`[${name}] the battery entry is the one this sample exists for`, list.find((e) => e.category === 'battery').reason === entry.battery);
}

// ---------------------------------------------------------------------------
// The reader — finds them at each level (flat on C, nested on B), keeps the
// {category, reason} pairs raw and in order, B and C identical.
// ---------------------------------------------------------------------------
for (const kind of ['zero-measured', 'battery-harness-error']) {
  const c = readOverall(REAL[`${kind} C`].doc);
  const b = readOverall(REAL[`${kind} B`].doc);
  check(`[${kind}] readOverall(C) reads all 15 entries from the flat aiResponse (rule 41)`, Array.isArray(c.abstentionReasons) && c.abstentionReasons.length === 15);
  check(`[${kind}] readOverall(B) reads all 15 entries from aiResponse.overall`, Array.isArray(b.abstentionReasons) && b.abstentionReasons.length === 15);
  check(`[${kind}] the reader keeps the raw pairs verbatim and in order (C)`, JSON.stringify(c.abstentionReasons) === JSON.stringify(rawList(REAL[`${kind} C`])));
  check(`[${kind}] B and C yield the same list`, JSON.stringify(b.abstentionReasons) === JSON.stringify(c.abstentionReasons));
  check(`[${kind}] zeroMeasuredMessage is read at the same two levels`, c.zeroMeasuredMessage === REAL[`${kind} C`].doc.aiResponse.zeroMeasuredMessage && b.zeroMeasuredMessage === c.zeroMeasuredMessage);
  check(`[${kind}] this is the zero-measured state: letter null, noDataAtAll true`, c.letter === null && c.noDataAtAll === true);
}
{
  // The default real samples carry a real null (the server sends it only when
  // zeroMeasuredMessage is set) — the absent case, on real data.
  check('default C sample: abstentionReasons is a real null and reads as null', readOverall(loadVerifyReportSample()).abstentionReasons === null);
  check('default B sample: abstentionReasons is a real null and reads as null', readOverall(loadReportsDocSample()).abstentionReasons === null);
}

// ---------------------------------------------------------------------------
// The real render path — V7Notices, all three site languages, all four real
// samples: each reachable code gets its approved sentence; the category name
// is the bold heading with the text under it; no raw code anywhere.
// ---------------------------------------------------------------------------
for (const [name, entry] of Object.entries(REAL)) {
  for (const lang of ['ar', 'tr', 'en']) {
    const t = translations[lang];
    const html = render(React.createElement(V7Notices, { overall: readOverall(entry.doc), t }));
    const pairs = extractPairs(html);
    const expected = rawList(entry).map((e) => ({ name: t.verify[CATEGORY_KEY[e.category]], text: t.verify[TEXT_KEY[e.reason]] }));
    const tag = `[${lang} ${name}]`;

    check(`${tag} 15 {heading, sentence} pairs render, in the server's order`, pairs.length === 15);
    check(`${tag} every heading is the category's name and every sentence is the approved text for its reason code`, JSON.stringify(pairs.map((p) => ({ name: p.name, text: p.text }))) === JSON.stringify(expected));
    check(`${tag} every category name is a bold title (font-semibold <h4>) with its sentence under it`, pairs.every((p) => p.headingClass.includes('font-semibold')));
    check(`${tag} the battery shows its code's approved text (${TEXT_KEY[entry.battery]})`, pairs.find((p) => p.name === t.verify.catBattery).text === t.verify[TEXT_KEY[entry.battery]]);
    check(`${tag} the zero-measured notice from the same sample still renders`, html.includes(unescapeHtml(entry.doc.aiResponse.zeroMeasuredMessage ?? entry.doc.aiResponse.overall.zeroMeasuredMessage)));
    check(`${tag} no raw reason code (or its parenthetical) appears anywhere in the output`, RAW_FRAGMENTS.every((frag) => !html.includes(frag)));
  }
}
// The three reason codes that cover the default sample's 15 entries, each
// by its approved sentence (Arabic, the language of the approved texts).
{
  const t = translations.ar;
  const pairs = extractPairs(render(React.createElement(V7Notices, { overall: readOverall(REAL['zero-measured C'].doc), t })));
  const textOf = (cat) => pairs.find((p) => p.name === t.verify[CATEGORY_KEY[cat]]).text;
  check('NO_CALIBRATED_THRESHOLD (battery) -> «تُقاس البطارية ولا يُعطى لها حرف في هذا الإصدار.»', textOf('battery') === t.verify.v7ReasonBatteryUncalibrated);
  check('DECLARED_BUT_NONE_EXECUTED (13 categories) -> #15', ['thermal', 'cpu', 'gpu', 'display', 'memory', 'storage', 'camera', 'gps', 'security', 'sensors', 'cellular', 'wireless'].every((c) => textOf(c) === t.verify.v7ReasonDeclaredButNoneExecuted));
  check('NO_HEALTH_BEARING_TESTS_DECLARED (audio, input) -> its approved text', textOf('audio') === t.verify.v7ReasonNoHealthBearingDeclared && textOf('input') === t.verify.v7ReasonNoHealthBearingDeclared);
  const pairsH = extractPairs(render(React.createElement(V7Notices, { overall: readOverall(REAL['battery-harness-error C'].doc), t })));
  check('HARNESS_ERROR (battery) -> v7ReasonHarnessErrorUnmeasured', pairsH.find((p) => p.name === t.verify.catBattery).text === t.verify.v7ReasonHarnessErrorUnmeasured);
}

// ---------------------------------------------------------------------------
// The pages that read FIRESTORE (shape B): /dashboard, /shop/[slug], /tech —
// the real wired components with the real B zero-measured documents.
// ---------------------------------------------------------------------------
{
  const t = translations.ar;
  const { ListingEditorCard } = require('@/app/dashboard/page.js');
  const { DeviceCard } = require('@/app/shop/[slug]/ShopClient.js');
  const EvaluationForm = require('@/components/tech/EvaluationForm').default;
  const evaluation = { technicianGrade: 'B', agreement: 'agree' };
  const mounts = {
    '/dashboard (ListingEditorCard)': (report) => React.createElement(ListingEditorCard, { report: { ...report, id: 'abst-test' }, t, lang: 'ar', onSave: async () => {} }),
    '/shop/[slug] (DeviceCard)': (report) => React.createElement(DeviceCard, { report: { ...report, id: 'abst-test', scanId: 'abst-test' }, t, lang: 'ar' }),
    '/tech (EvaluationForm, revealed)': (report) => React.createElement(EvaluationForm, { report: { ...report, id: 'abst-test' }, evaluation, technicianName: 'Test Tech', onSaved: () => {}, onBack: () => {}, lang: 'ar' }),
  };
  for (const [kindName, entry] of [['zero-measured', REAL['zero-measured B']], ['battery-harness-error', REAL['battery-harness-error B']]]) {
    for (const [route, make] of Object.entries(mounts)) {
      const html = render(make(entry.doc));
      const pairs = extractPairs(html);
      const tag = `${route} [${kindName} B]`;
      check(`${tag}: renders the 15 {category-name heading, approved sentence} pairs`, pairs.length === 15);
      check(`${tag}: the battery pair carries ${TEXT_KEY[entry.battery]}`, pairs.some((p) => p.name === t.verify.catBattery && p.text === t.verify[TEXT_KEY[entry.battery]]));
      check(`${tag}: no raw reason code in the output`, RAW_FRAGMENTS.every((frag) => !html.includes(frag)));
    }
  }
}

// ---------------------------------------------------------------------------
// classifyAbstentionReason — direct unit coverage: the four reachable codes
// (also proven end-to-end above) and the two codes «لا يُنال من مُدخل حقيقي»
// (backend 8e49fc6 `codesNotReachable`) + the unknown code, same label.
// ---------------------------------------------------------------------------
{
  check('NO_CALIBRATED_THRESHOLD (...) -> v7ReasonBatteryUncalibrated', classifyAbstentionReason(REASON_NO_CALIBRATED_THRESHOLD) === 'v7ReasonBatteryUncalibrated');
  check('DECLARED_BUT_NONE_EXECUTED -> v7ReasonDeclaredButNoneExecuted', classifyAbstentionReason(REASON_DECLARED_BUT_NONE_EXECUTED) === 'v7ReasonDeclaredButNoneExecuted');
  check('NO_HEALTH_BEARING_TESTS_DECLARED -> v7ReasonNoHealthBearingDeclared', classifyAbstentionReason(REASON_NO_HEALTH_BEARING_TESTS_DECLARED) === 'v7ReasonNoHealthBearingDeclared');
  check('HARNESS_ERROR -> v7ReasonHarnessErrorUnmeasured', classifyAbstentionReason(REASON_HARNESS_ERROR) === 'v7ReasonHarnessErrorUnmeasured');
  // لا يُنال من مُدخل حقيقي (backend 8e49fc6 `codesNotReachable`):
  check('MANUAL_ATTESTATION_ONLY -> v7StateAttestedOnly (لا يُنال من مُدخل حقيقي — backend 8e49fc6 codesNotReachable)', classifyAbstentionReason(REASON_MANUAL_ATTESTATION_ONLY) === 'v7StateAttestedOnly');
  check('NO_BATTERY_INDICATORS_MEASURED -> v7ReasonBatteryUnmeasured (لا يُنال من مُدخل حقيقي — backend 8e49fc6 codesNotReachable)', classifyAbstentionReason(REASON_NO_BATTERY_INDICATORS_MEASURED) === 'v7ReasonBatteryUnmeasured');
  // The user's explicit decision for THIS list: unknown -> #15
  // (v7ReasonDeclaredButNoneExecuted), NOT v7StateUnknown like the
  // per-category classifyCategoryReason uses — the two classifiers were
  // deliberately NOT merged.
  const { result: unknownKey } = captureWarnings(() => classifyAbstentionReason('TOTALLY_UNKNOWN_CODE'));
  check('an unrecognized code -> #15 (v7ReasonDeclaredButNoneExecuted), not v7StateUnknown (لا يُنال من مُدخل حقيقي — same label)', unknownKey === UNKNOWN_CODE_KEY);
}

// ---------------------------------------------------------------------------
// ⚠️ لا يُنال من مُدخل حقيقي (backend 8e49fc6 `codesNotReachable`).
// MANUAL_ATTESTATION_ONLY, NO_BATTERY_INDICATORS_MEASURED and an unknown code
// cannot be produced by any real input (`codesNotReachable` in the backend's
// v7-zero-measured-samples-meta.json — relayed, not read from this repo).
// So these stay SYNTHETIC (the user's decision, 2026-10-07: no technician
// attestation is invented and the server's code is not changed on their
// account): built by overriding `abstentionReasons` on the REAL
// zero-measured C sample (every other byte real), through the real
// V7Notices. This is not a golden sample and is not claimed to be one.
// ---------------------------------------------------------------------------
{
  const UNKNOWN = 'SOME_FUTURE_CODE_NOT_YET_DOCUMENTED';
  const synthetic = withAiResponseOverride(REAL['zero-measured C'].doc, {
    abstentionReasons: [
      { category: 'gps', reason: REASON_MANUAL_ATTESTATION_ONLY },
      { category: 'battery', reason: REASON_NO_BATTERY_INDICATORS_MEASURED },
      { category: 'cellular', reason: UNKNOWN },
    ],
  });
  const expected = [
    ['gps', 'v7StateAttestedOnly'],
    ['battery', 'v7ReasonBatteryUnmeasured'],
    ['cellular', UNKNOWN_CODE_KEY],
  ];
  for (const lang of ['ar', 'tr', 'en']) {
    const t = translations[lang];
    const { result: html } = captureWarnings(() => render(React.createElement(V7Notices, { overall: readOverall(synthetic), t })));
    const pairs = extractPairs(html);
    const tag = `[${lang}] (لا يُنال من مُدخل حقيقي — backend 8e49fc6 codesNotReachable)`;
    check(`${tag} MANUAL_ATTESTATION_ONLY, NO_BATTERY_INDICATORS_MEASURED and an unknown code each render their approved text under the category's bold name`, JSON.stringify(pairs.map((p) => ({ name: p.name, text: p.text }))) === JSON.stringify(expected.map(([cat, key]) => ({ name: t.verify[CATEGORY_KEY[cat]], text: t.verify[key] }))));
    check(`${tag} the unknown code takes #15 and never its raw string`, !html.includes(UNKNOWN) && pairs[2].text === t.verify[UNKNOWN_CODE_KEY]);
    check(`${tag} no raw reason code in the output`, RAW_FRAGMENTS.every((frag) => !html.includes(frag)));
  }
}

// ---------------------------------------------------------------------------
// The reader's malformed-entry handling — CONTRACT VIOLATIONS, synthetic by
// nature (the real server never sends these): drop with a warning each, never
// silently (rule 22). Built on the real zero-measured C sample.
// ---------------------------------------------------------------------------
{
  const base = REAL['zero-measured C'].doc;
  const malformed = withAiResponseOverride(base, {
    abstentionReasons: [
      { category: 'battery', reason: REASON_HARNESS_ERROR }, // valid, kept
      { category: '', reason: REASON_HARNESS_ERROR }, // empty category, dropped
      { reason: REASON_HARNESS_ERROR }, // missing category, dropped
      'just a string', // the OLD shape this reader used to accept — now dropped
      { category: 'cpu', reason: 42 }, // wrong reason type, dropped
      null,
    ],
  });
  const { result: overall, warnings } = captureWarnings(() => readOverall(malformed));
  check('malformed entries (contract violation): only the valid one is kept', Array.isArray(overall.abstentionReasons) && overall.abstentionReasons.length === 1 && overall.abstentionReasons[0].category === 'battery');
  check('malformed entries: each dropped entry is warned about, not silent (rule 22)', warnings.filter((m) => m.includes('not a well-formed {category, reason} object')).length === 5);

  const { result: notArray, warnings: w2 } = captureWarnings(() => readOverall(withAiResponseOverride(base, { abstentionReasons: 'oops, a bare string' })));
  check('a non-array value (contract violation) is dropped to null, not wrapped into a 1-item array, with a warning', notArray.abstentionReasons === null && w2.some((m) => m.includes('not an array')));

  const { result: allBad } = captureWarnings(() => readOverall(withAiResponseOverride(base, { abstentionReasons: [{ category: '', reason: '' }] })));
  check('an array of only malformed entries (contract violation) collapses to null', allBad.abstentionReasons === null);
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
