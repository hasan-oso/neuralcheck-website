'use strict';

// Shared shape helpers for tests — coordinator decision, 2026-09-24.
//
// This file used to DERIVE synthetic B/C fixtures from the vendored A
// sample (same construction as tools-website-v7-shape-probe.cjs), because
// the real golden B/C files had not reached this repo yet. They have now
// (contract-handoff-27bacd3, copied into contract/ as v7-reports-document-
// sample.json / v7-verifyReport-response-sample.json) — coordinator's
// explicit instruction: "الاختبارات تقرأ B وC الحقيقيّتين مباشرة... والمشتقّ
// من A ليس ما تستقبله الصفحة." This file now loads the REAL vendored files
// directly. The derivation functions are gone.
//
//   A — contract/v7-client-payload-sample.json — the raw analyzeDevice
//       response. No page in this repo fetches this shape directly.
//   B — contract/v7-reports-document-sample.json — the real Firestore
//       `reports/{scanId}` document (via buildReportDocument), as read
//       directly by app/admin/reports/page.js, app/admin/page.js,
//       app/dashboard/page.js, app/shop/[slug]/ShopClient.js, and
//       lib/techEval.js's resolveAppGrade (used by /tech). The full V7
//       display shape lives under `aiResponse`.
//   C — contract/v7-verifyReport-response-sample.json — the real
//       `verifyReport` Cloud Function response (via buildV7Response), as
//       fetched by app/verify/page.js and app/print/[shortId]/
//       PrintClient.js (the ONLY two consumers of this shape). `pipeline`
//       is nested inside `aiResponse.pipeline`; every `overall`-level
//       field (letter/coverage/coveragePct/letterSource/
//       partialAssessment/partialAssessmentTag/governingGateReason/
//       noDataAtAll/zeroMeasuredMessage/abstentionReasons/harnessError/
//       harnessErrorReason) is flattened directly onto `aiResponse` — no
//       nested `overall` object exists on this shape at all.
//
// Edge cases a real fixture does not happen to exhibit (a null
// letterCeilingReason, an absent key, narrativeIncomplete=true, ...) are
// built by deep-cloning a REAL loaded fixture and overriding/deleting the
// ONE field under test — every other byte stays real vendored data. This
// is deliberately narrower than "derive the whole shape from A": nothing
// here invents a field's existence or position, only its value, and only
// for a field this task's tests need in a state the current golden sample
// does not happen to be in.

const path = require('path');

const CONTRACT_DIR = path.join(__dirname, '..', '..', 'contract');

function loadClientPayloadSample() {
  return require(path.join(CONTRACT_DIR, 'v7-client-payload-sample.json'));
}
function loadReportsDocSample() {
  return require(path.join(CONTRACT_DIR, 'v7-reports-document-sample.json'));
}
function loadVerifyReportSample() {
  return require(path.join(CONTRACT_DIR, 'v7-verifyReport-response-sample.json'));
}

/**
 * V6 golden samples (contract-handoff-2cab4d6, decision 82 §1 + appendix
 * 80-a, 2026-09-24) — the first real V6 (pipeline: "v6_raw_timeseries")
 * fixtures in this repo. `v6-reports-document-sample.json` (B) is the
 * Firestore `reports/{scanId}` shape (read directly by admin/reports,
 * admin, dashboard, shop, /tech); `v6-verifyReport-response-sample.json`
 * (C) is the `verifyReport` Cloud Function response shape (read by /verify,
 * /print) — built from the committed B sample via the real `buildV6Response`
 * branch (see contract/README.md and the vendored golden-README.md for
 * full provenance). Root `shortId` on B is the literal string
 * `"[REDACTED]"` — a real redaction from the review process, not a bug in
 * any reader; note this explicitly rather than let a test silently assume
 * it looks like a real shortId.
 */
function loadV6ReportsDocSample() {
  return require(path.join(CONTRACT_DIR, 'v6-reports-document-sample.json'));
}
function loadV6VerifyReportSample() {
  return require(path.join(CONTRACT_DIR, 'v6-verifyReport-response-sample.json'));
}

/**
 * "security-downgrade" fixtures — REPLACED 2026-09-25 (contract-handoff-
 * 057cf43, decision 98). Originally vendored under contract-handoff-90fb816
 * (decision 95 §1) with `security` carrying letterSource="LLM_ADJUSTED",
 * because its deterministic letter was already "D" before the "adjustment"
 * — no visible change. The backend's real rule (commit 49c0e40): LLM_ADJUSTED
 * is written ONLY when the letter actually changes. So this sample was
 * regenerated: `security` is now letterSource="DETERMINISTIC" (still
 * letter="D"), adjustmentReason/adjustmentEvidence are null in the display,
 * and the audit trail records "ACCEPTED_NO_EFFECT" — this is now the
 * negative case (proves the marker correctly does NOT show), not the
 * positive one. See loadReportsDocCpuC06DowngradeSample below for the real
 * positive case.
 */
function loadReportsDocSecurityDowngradeSample() {
  return require(path.join(CONTRACT_DIR, 'v7-reports-document-sample-security-downgrade.json'));
}
function loadVerifyReportSecurityDowngradeSample() {
  return require(path.join(CONTRACT_DIR, 'v7-verifyReport-response-sample-security-downgrade.json'));
}

/**
 * "cpu-c06-downgrade" fixtures (contract-handoff-057cf43, decision 98,
 * 2026-09-25) — the real positive letterSource="LLM_ADJUSTED" golden pair
 * (see the security-downgrade comment above for why that sample no longer
 * serves this role). Real S10 input with test C-06 (thermal throttling)
 * flipped from pass to fail, plus a crafted-but-accepted model response:
 * `cpu` carries letter="C" (deterministic was "B"), letterSource=
 * "LLM_ADJUSTED", a real adjustmentReason sentence naming C-06, and an
 * adjustmentEvidence value that is an ARRAY
 * (["categoryStates.testResults[13].outcome"]) — the same shape
 * lib/reportReaders/v7.js's readCategories does not read as evidence (see
 * scripts/test/letterSourceAdjusted.test.cjs: not shown on screen is the
 * user's own decision, 99 §4 — evidenceRefs is never shown in the app or
 * PDF either).
 */
function loadReportsDocCpuC06DowngradeSample() {
  return require(path.join(CONTRACT_DIR, 'v7-reports-document-sample-cpu-c06-downgrade.json'));
}
function loadVerifyReportCpuC06DowngradeSample() {
  return require(path.join(CONTRACT_DIR, 'v7-verifyReport-response-sample-cpu-c06-downgrade.json'));
}

/**
 * "zero-measured" fixtures (neuralcheck-backend d5b6c29; the derived samples
 * come from 8e49fc6 through the real chain `runAnalysisInternal`, with only
 * the model call replaced) — a REAL report where nothing measurable reached
 * the judge: overall.letter=null, noDataAtAll=true, `zeroMeasuredMessage`
 * set, and `abstentionReasons` filled with one {category, reason} entry per
 * category (15). Four files, two reasons for the battery entry:
 *   - zero-measured                       : battery = NO_CALIBRATED_THRESHOLD
 *                                           (the default)
 *   - zero-measured-battery-harness-error : battery = HARNESS_ERROR
 * B is the Firestore document (`abstentionReasons` nested under
 * `aiResponse.overall`); C is the verifyReport response, where overall is
 * FLATTENED onto `aiResponse` — `zeroMeasuredMessage` and
 * `abstentionReasons` sit directly on `aiResponse` (rule 41: the reader must
 * read them there; checked against the sample itself in
 * abstentionReasons.test.cjs, not assumed).
 */
function loadReportsDocZeroMeasuredSample() {
  return require(path.join(CONTRACT_DIR, 'v7-reports-document-sample-zero-measured.json'));
}
function loadVerifyReportZeroMeasuredSample() {
  return require(path.join(CONTRACT_DIR, 'v7-verifyReport-response-sample-zero-measured.json'));
}
function loadReportsDocZeroMeasuredBatteryHarnessErrorSample() {
  return require(path.join(CONTRACT_DIR, 'v7-reports-document-sample-zero-measured-battery-harness-error.json'));
}
function loadVerifyReportZeroMeasuredBatteryHarnessErrorSample() {
  return require(path.join(CONTRACT_DIR, 'v7-verifyReport-response-sample-zero-measured-battery-harness-error.json'));
}

/**
 * "Honor" fixtures (scanId e4b65a2f, contract-handoff-77b710a, 2026-09-24) —
 * a REAL report with no letter at all (overall.letter=null) and
 * harnessError=true (functionalResults=null: the test harness itself
 * failed, not "nothing measured"). Distinct from the other B/C fixtures
 * above, which all carry letter="C" — this is the one real sample this repo
 * has of the letter===null / harnessError===true report state, used to
 * verify /verify, /print, and every GradeBadge-based B-reader (admin/
 * reports, admin dashboard, /dashboard, /shop) show the status and its
 * reason for this state, not '?' or a blank box (this task's rule 2).
 */
function loadReportsDocHonorSample() {
  return require(path.join(CONTRACT_DIR, 'v7-reports-document-sample-honor.json'));
}
function loadVerifyReportHonorSample() {
  return require(path.join(CONTRACT_DIR, 'v7-verifyReport-response-sample-honor.json'));
}

function cloneShape(shape) {
  return JSON.parse(JSON.stringify(shape));
}

/** Deep-clone a real B or C fixture, overriding one or more keys directly
 * on `aiResponse` (e.g. `narrativeIncomplete`, or — on shape C only —
 * `letter`). Everything else stays the real vendored data. */
function withAiResponseOverride(shape, overrides) {
  const clone = cloneShape(shape);
  Object.assign(clone.aiResponse, overrides);
  return clone;
}

/** Deep-clone a real B or C fixture, deleting one key from `aiResponse`
 * entirely (for testing the "key genuinely absent" contract-violation
 * case — `delete`, not overriding to `undefined`, which JSON.stringify
 * would drop silently and quietly produce the same test as this one). */
function withAiResponseKeyDeleted(shape, key) {
  const clone = cloneShape(shape);
  delete clone.aiResponse[key];
  return clone;
}

/** Deep-clone a real B or C fixture, overriding fields on ONE named
 * category (e.g. gpu's `letterCeilingReason`). Every other category and
 * every other field on this one stays real vendored data. */
function withCategoryOverride(shape, categoryName, overrides) {
  const clone = cloneShape(shape);
  const cat = clone.aiResponse.categories[categoryName];
  if (!cat) {
    throw new Error(`withCategoryOverride: category "${categoryName}" not found in this real fixture`);
  }
  Object.assign(cat, overrides);
  return clone;
}

/** Deep-clone a real B or C fixture, deleting one key from a named
 * category entirely (contract-violation case, same rationale as
 * withAiResponseKeyDeleted above). */
function withCategoryKeyDeleted(shape, categoryName, key) {
  const clone = cloneShape(shape);
  delete clone.aiResponse.categories[categoryName][key];
  return clone;
}

module.exports = {
  loadClientPayloadSample,
  loadReportsDocSample,
  loadVerifyReportSample,
  loadReportsDocHonorSample,
  loadVerifyReportHonorSample,
  loadReportsDocZeroMeasuredSample,
  loadVerifyReportZeroMeasuredSample,
  loadReportsDocZeroMeasuredBatteryHarnessErrorSample,
  loadVerifyReportZeroMeasuredBatteryHarnessErrorSample,
  loadV6ReportsDocSample,
  loadV6VerifyReportSample,
  loadReportsDocSecurityDowngradeSample,
  loadVerifyReportSecurityDowngradeSample,
  loadReportsDocCpuC06DowngradeSample,
  loadVerifyReportCpuC06DowngradeSample,
  withAiResponseOverride,
  withAiResponseKeyDeleted,
  withCategoryOverride,
  withCategoryKeyDeleted,
};
