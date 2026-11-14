// Single source for the pipeline-tag literal that distinguishes a V7
// (findings-based) report from a V6 (raw-timeseries) one.
//
// Mirrors pipelineTags.js in neuralcheck-backend and the equivalent constant
// in NeuralChek's AiPipeline.kt — one exported source per repo, not a copy
// re-typed in every consuming file here (A102 in NEURALCHECK-FINDINGS.md is
// what a second copy of this literal costs).
//
// PIPELINE_TAG_V7 is verified directly against this repo's copy of the real
// payload: contract/v7-client-payload-sample.json has
// `"pipeline": "v7_findings_based"` at the document root (see
// contract/README.md for provenance — copied byte-for-byte from
// neuralcheck-backend @ 43dee66, 2026-09-21 +03).
//
// PIPELINE_TAG_V6 is NOT independently verified from a sample in this repo —
// every report in today's inventory predates the `pipeline` field entirely,
// so an explicit V6 tag has never been observed here. It is carried as given
// in the task instruction so the code still recognizes it if the backend
// starts sending it. Treat this one literal as unverified until a real
// document with it is seen.

export const PIPELINE_TAG_V7 = 'v7_findings_based';
export const PIPELINE_TAG_V6 = 'v6_raw_timeseries'; // unverified — see note above

export const PipelineKind = {
  V7: 'V7',
  // Explicit v6 tag OR the field is simply absent — which is every report in
  // storage today, since they all predate this field. Absence is the
  // default, not an error.
  V6: 'V6',
  // A `pipeline` field is present but its value matches neither known
  // constant. Never silently folded into V6 or V7 — callers must branch on
  // this explicitly and log it; see classifyPipeline's doc comment.
  UNKNOWN_TAG: 'UNKNOWN_TAG',
};

/**
 * Locate the object that actually carries the V7 display shape
 * (`pipeline`/`overall`|flat letter/`categories`/`issues`/`narrative`/...),
 * regardless of which of the three real shapes wraps a given report-like
 * value. Measured directly (2026-09-24, coordinator-run
 * tools-website-v7-shape-probe.cjs, reconfirmed here) against the real
 * readers — before this fix, `classifyPipeline`/every V7 reader in
 * lib/reportReaders/v7.js assumed ONLY the first shape below, which NO
 * page in this repo actually receives (rule 37 incident):
 *
 *   1. The raw analyzeDevice/contract-sample shape — `pipeline` etc. sit
 *      at the object's own root. Nothing in this repo fetches this shape
 *      directly from a live endpoint; contract/v7-client-payload-sample.json
 *      is this shape, kept as the reference sample.
 *   2. The Firestore `reports` document shape — `{id, ...doc.data()}`, as
 *      read directly by app/admin/reports/page.js, app/admin/page.js,
 *      app/dashboard/page.js, app/shop/[slug]/ShopClient.js, and app/tech's
 *      lib/techEval.js (resolveAppGrade). `pipeline` sits at the document
 *      root AND (redundantly) inside `aiResponse.pipeline`; the full V7
 *      display shape (`overall`, `categories`, `issues`, `narrative`,
 *      `narrativeIncomplete`, `narrativeIncompleteFields`) lives under
 *      `aiResponse`, not the document root.
 *   3. The `verifyReport` Cloud Function HTTP response shape — fetched by
 *      app/verify/page.js and app/print/[shortId]/PrintClient.js (the only
 *      two consumers of this shape). `pipeline` exists ONLY inside
 *      `aiResponse.pipeline` — absent at the response's own root. `letter`/
 *      `coverage`/`coveragePct` are flattened directly onto `aiResponse`
 *      itself (NO nested `overall` object at all); `categories`/`issues`/
 *      `narrative`/`narrativeIncomplete`/`narrativeIncompleteFields` are
 *      still nested under `aiResponse`, same as shape 2.
 *
 * Checking `aiResponse` first (when present) correctly resolves shapes 2
 * and 3 to the object that actually carries the payload; falling back to
 * the report itself when `aiResponse` is absent correctly resolves shape 1
 * (and anything else with no wrapper) without any extra branching.
 */
export function resolveV7Container(report) {
  if (report && typeof report === 'object' && report.aiResponse && typeof report.aiResponse === 'object') {
    return report.aiResponse;
  }
  return report;
}

/**
 * Classify a fetched report by its `pipeline` field — read via
 * resolveV7Container() above, NOT the report's own top level unconditionally
 * (see that function's doc comment for why: on the verifyReport response
 * shape, `pipeline` is absent at the top level entirely).
 *
 * Returns `{ kind, tag, reason }`:
 *   - kind: one of PipelineKind
 *   - tag:  the raw value read (undefined when the field is absent)
 *   - reason: 'no_report' | 'field_absent' | 'tag_v7' | 'tag_v6' | 'tag_unknown'
 *
 * This performs no fallback CHAIN across guessed field names, and no
 * guessing about the field's own value — it reads exactly one field (on
 * the correctly-resolved container) and reports exactly what it found,
 * including the "found something we don't recognize" case, which is a
 * first-class outcome here rather than an exception someone has to
 * remember to add later.
 */
export function classifyPipeline(report) {
  if (!report || typeof report !== 'object') {
    return { kind: PipelineKind.V6, tag: undefined, reason: 'no_report' };
  }
  const container = resolveV7Container(report);
  if (!container || typeof container !== 'object' || !Object.prototype.hasOwnProperty.call(container, 'pipeline')) {
    return { kind: PipelineKind.V6, tag: undefined, reason: 'field_absent' };
  }
  const tag = container.pipeline;
  if (tag === PIPELINE_TAG_V7) {
    return { kind: PipelineKind.V7, tag, reason: 'tag_v7' };
  }
  if (tag === PIPELINE_TAG_V6) {
    return { kind: PipelineKind.V6, tag, reason: 'tag_v6' };
  }
  return { kind: PipelineKind.UNKNOWN_TAG, tag, reason: 'tag_unknown' };
}

/** Convenience predicate — the common case callers actually branch on. */
export function isV7Report(report) {
  return classifyPipeline(report).kind === PipelineKind.V7;
}
