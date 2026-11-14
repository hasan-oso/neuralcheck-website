'use strict';

// readOverall field-by-field parity across the real shapes — coordinator
// decision, 2026-09-24: "أضِف إلى الاختبارات مقارنة كل حقول readOverall بين
// B وC، لا الحرف وحده." A letter-only comparison would have missed, for
// example, governingGateReason or partialAssessmentTag silently resolving
// differently between the Firestore-document shape (B, `overall` nested)
// and the verifyReport response shape (C, every `overall` field flattened
// directly onto `aiResponse` with no nested `overall` object at all).
//
// Uses the REAL vendored fixtures (contract/v7-client-payload-sample.json,
// contract/v7-reports-document-sample.json, contract/v7-verifyReport-
// response-sample.json — contract-handoff-27bacd3, sha256-verified on
// receipt) — no derived/synthetic shape.
//
// Run: node scripts/test/overallShapeParity.test.cjs

require('./_jsx-require-hook.cjs');
const { readOverall } = require('@/lib/reportReaders/v7');
const { loadClientPayloadSample, loadReportsDocSample, loadVerifyReportSample } = require('./_shapes.cjs');

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

const A = loadClientPayloadSample();
const B = loadReportsDocSample();
const C = loadVerifyReportSample();

const overallA = readOverall(A);
const overallB = readOverall(B);
const overallC = readOverall(C);

const OVERALL_FIELDS = [
  'letter',
  'coverage',
  'coveragePct',
  'partialAssessment',
  'partialAssessmentTag',
  'governingGateReason',
  'noDataAtAll',
  'zeroMeasuredMessage',
  'abstentionReasons',
  'harnessError',
  'harnessErrorReason',
  // W6 (2026-10-01) — new field, added to readOverall's contract.
  'harnessErrorMessage',
];

check('readOverall(A) returns every documented field as its own key', OVERALL_FIELDS.every((f) => Object.prototype.hasOwnProperty.call(overallA, f)));

for (const field of OVERALL_FIELDS) {
  check(
    `readOverall(B).${field} === readOverall(C).${field} (${JSON.stringify(overallB[field])})`,
    JSON.stringify(overallB[field]) === JSON.stringify(overallC[field])
  );
  check(
    `readOverall(A).${field} === readOverall(B).${field} (${JSON.stringify(overallA[field])})`,
    JSON.stringify(overallA[field]) === JSON.stringify(overallB[field])
  );
}

// Spot-check the two fields most at risk of a shape-specific bug: a nested
// object (governingGateReason) and a real non-null value on every shape,
// not just a shared `null`.
check('governingGateReason is a real non-null object on all three shapes', overallA.governingGateReason && overallB.governingGateReason && overallC.governingGateReason);
check('governingGateReason.name matches across all three ("ROOT_DETECTED")', overallA.governingGateReason.name === 'ROOT_DETECTED' && overallB.governingGateReason.name === 'ROOT_DETECTED' && overallC.governingGateReason.name === 'ROOT_DETECTED');
check('partialAssessmentTag.text matches across all three (a real non-null string)', typeof overallC.partialAssessmentTag.text === 'string' && overallA.partialAssessmentTag.text === overallB.partialAssessmentTag.text && overallB.partialAssessmentTag.text === overallC.partialAssessmentTag.text);
check('letter is "C" on all three (not null anywhere)', overallA.letter === 'C' && overallB.letter === 'C' && overallC.letter === 'C');

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
