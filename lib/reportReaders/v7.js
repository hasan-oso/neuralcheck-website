// V7 (findings-based) report readers.
//
// Shape is taken from contract/v7-client-payload-sample.json — read that
// file, not this comment, before changing anything here (contract/README.md
// documents its provenance and its known sample-only gaps). Do NOT use a
// V6-style fallback chain (`aiResponse.x ?? x ?? ai.x`) anywhere in this
// file: on a V7 payload every one of those legacy locations is absent at
// once, and a fallback chain would silently resolve to null instead of
// reading the real V7 location. Each function below reads exactly the path
// the sample shows — through resolveV7Container() first (see below).
//
// ⚠️ 2026-09-24 (coordinator decision, tools-website-v7-shape-probe.cjs) —
// EVERY function below reads through lib/pipelineTags.js's
// resolveV7Container(report) FIRST, never `report.xxx` directly. Before
// this fix, every one of them read the report's own top level directly —
// which matches ONLY the raw contract-sample shape that no page in this
// repo actually fetches. The real shapes every page receives wrap the
// display data one level deeper:
//   - Firestore `reports` documents (admin/reports, admin dashboard,
//     dashboard, shop, /tech): under `doc.aiResponse.*`.
//   - the `verifyReport` response (/verify, /print): under
//     `response.aiResponse.*` — and there, `overall` doesn't exist as a
//     nested object at all; `letter`/`coverage`/`coveragePct` are
//     flattened directly onto `aiResponse` itself (see readOverall).
// See resolveV7Container's doc comment in lib/pipelineTags.js for the full
// three-shape account and rule-37 incident this fix closes.
//
// Two enums arrive from the server with values this repo verifies against
// real payloads (see contract/README.md and the task that produced this
// file):
//   - categories.<name>.state: five values, relayed by the coordinator as
//     the backend's categoryStates.js:70-72 (2026-09-24, decision 82 §1) —
//     MEASURED, PARTIAL, UNMEASURED, ATTESTED_ONLY, HARNESS_ERROR. This
//     repo's own agent cannot read neuralcheck-backend to verify that file
//     directly (out of its bounds) — relayed, not independently confirmed.
//     HARNESS_ERROR IS directly observed here regardless, in this repo's own
//     Honor fixture (contract/v7-reports-document-sample-honor.json — 14 of
//     15 categories carry it). ATTESTED_ONLY has no real fixture in this
//     repo yet; classified all the same, from the relayed enum, per the same
//     decision — not left folded into 'unknown' until one arrives.
//   - issues[].severity: FAIL, INFO, POSITIVE, WARNING — all four ARE
//     present in the sample, so this one is fully verified.
// Per the rule this was built under: never build a switch on a single
// sample, and never fold an unrecognized enum value into an existing
// bucket. Anything OUTSIDE the five-value set above still becomes an
// explicit 'unknown' classification — visibly rendered as unknown, never
// silently merged into 'unmeasured', 'harnessError', or any other case
// (decision 82 §1: "«حالة غير معروفة» تبقى للمجهول فعلاً"). See
// components/verify/V7CategoriesGrid.js and the severity classifier below.

import { resolveV7Container } from '@/lib/pipelineTags';

const KNOWN_CATEGORY_STATES = new Set([
  'MEASURED',
  'PARTIAL',
  'UNMEASURED',
  'ATTESTED_ONLY',
  'HARNESS_ERROR',
]);

/**
 * Classify a category's raw `state` string into one of:
 *   'measured' | 'partial' | 'unmeasured' | 'attestedOnly' | 'harnessError' | 'unknown'
 * 'unknown' covers every value outside the five the backend documents
 * (categoryStates.js:70-72). Logged once per read so an unrecognized value
 * is never silent.
 */
export function classifyCategoryState(raw) {
  if (raw === 'MEASURED') return 'measured';
  if (raw === 'PARTIAL') return 'partial';
  if (raw === 'UNMEASURED') return 'unmeasured';
  if (raw === 'ATTESTED_ONLY') return 'attestedOnly';
  if (raw === 'HARNESS_ERROR') return 'harnessError';
  if (!KNOWN_CATEGORY_STATES.has(raw)) {
    // eslint-disable-next-line no-console
    console.warn('[v7] unrecognized category state — rendered as unknown, not folded into another case', raw);
  }
  return 'unknown';
}

/**
 * Classify an issue's raw `severity` string into the same vocabulary
 * IssuesList already uses for V6 ('danger' | 'warning' | 'info'), plus
 * 'positive' (a V7 addition — a category with no faults) and 'unknown' for
 * anything not in the four verified values. This is intentionally a
 * separate function from V6's classifySeverity in components/verify/
 * IssuesList.js: that one has its own documented catch-all behavior for
 * V6's free-text severities ("warning, medium, … → warning") which must
 * not change, and folding FAIL/POSITIVE through it silently mis-renders
 * them (verified — see the report for this task: FAIL currently falls
 * through to the 'warning' bucket there, not 'info').
 */
export function classifyV7Severity(raw) {
  if (raw === 'FAIL') return 'danger';
  if (raw === 'WARNING') return 'warning';
  if (raw === 'INFO') return 'info';
  if (raw === 'POSITIVE') return 'positive';
  // eslint-disable-next-line no-console
  console.warn('[v7] unrecognized issue severity — rendered as unknown, not folded into another case', raw);
  return 'unknown';
}

/**
 * `overall.*` — the report-level grade, coverage, and gate/abstention
 * explanations. Returns a plain object with every field present (null where
 * the source lacked it), so callers never need optional chaining past this
 * point.
 *
 * `letterSource` (e.g. "GATE:ROOT_DETECTED") is deliberately NOT read here.
 * It names which gate mechanism capped the report-level letter — the same
 * class of field as V6's grade_source/reconciled (provenance for us, not a
 * fact about the phone), and it overlaps governingGateReason, which IS read
 * below and carries the buyer-facing version of the same fact: the server's
 * display sentence `text` (W1, 2026-10). name, ceilingLetter and source are
 * still read (they stay in the data — the admin panel's) but V7Notices
 * renders none of them: the gate badge was removed 2026-10-07 because the
 * sentence already says "أعلى حرف C" itself.
 *
 * This is a narrower claim than it used to be: decision 42 removed
 * `letterSource` from scripts/check-render-surface.mjs's FORBIDDEN list
 * entirely, because the same property name also denotes a different,
 * category-level field (categories.<name>.letterSource — see
 * readCategories below) that decision 42 explicitly wants shown. The guard
 * matches on bare property names, so it can no longer distinguish the two
 * spellings and no longer enforces this one either way. Keeping
 * `overall.letterSource` off the buyer surface is therefore enforced only
 * by this function never reading it — not by the guard, and not by
 * anything that would fail loudly if a future edit added the read back.
 */
export function readOverall(report) {
  const container = resolveV7Container(report);
  // `overall` is a nested object on the raw contract-sample and Firestore-
  // document shapes. On the verifyReport response shape, there is NO
  // nested `overall` at all — buildV7Response flattens `letter`/`coverage`/
  // `coveragePct` directly onto `aiResponse` itself (coordinator decision
  // 2026-09-24). Falling back to the container itself when `overall` is
  // absent reads those three flat fields correctly on that shape, and
  // correctly reads every OTHER field below (partialAssessmentTag,
  // governingGateReason, ...) as absent/null there too — via the same
  // type-checks already below, not a special case — since verifyReport's
  // whitelist (§٨-أ) does not carry them at all. Not fabricated: this is
  // absence read as absence, exactly like every other field here.
  const hasNestedOverall = container && typeof container === 'object' && container.overall && typeof container.overall === 'object';
  const o = hasNestedOverall ? container.overall : container;
  if (!o || typeof o !== 'object') {
    return {
      letter: null,
      coverage: null,
      coveragePct: null,
      partialAssessment: false,
      partialAssessmentTag: null,
      governingGateReason: null,
      noDataAtAll: false,
      zeroMeasuredMessage: null,
      abstentionReasons: null,
      harnessError: false,
      harnessErrorReason: null,
      // W6 (task order, 2026-10-01, S-13): see this function's doc comment
      // and the main return below for the full rationale.
      harnessErrorMessage: null,
    };
  }

  const tag =
    o.partialAssessmentTag && typeof o.partialAssessmentTag === 'object'
      ? {
          label: typeof o.partialAssessmentTag.label === 'string' ? o.partialAssessmentTag.label : null,
          coveragePct: typeof o.partialAssessmentTag.coveragePct === 'number' ? o.partialAssessmentTag.coveragePct : null,
          text: typeof o.partialAssessmentTag.text === 'string' ? o.partialAssessmentTag.text : null,
        }
      : null;

  // governingGateReason — W1 (the user's order, 2026-09-30/10-01, "W1 كـA1"
  // + decision S1: "لكل بوّابة جملة عربية للعرض في governingGateReason
  // وletterCeilingReason. ولا يُعرض الاسم … ولا المصدر … ويبقى الاسم
  // والمصدر في البيانات للّوحة"). The server now sends a display sentence in
  // `text` beside the existing name/ceilingLetter/source — e.g. (relayed from
  // neuralcheck-backend's golden fixtures, unverified from this repo, whose
  // contract/ copies are older and do not carry the field):
  //   {"name":"ROOT_DETECTED","ceilingLetter":"C","source":"SEC-04=fail",
  //    "text":"أعلى حرف C: صلاحيات الجذر (الروت) مكتشَفة على الجهاز."}
  // `text` is read with the same type check as its siblings. name and source
  // are STILL read — "ويبقى الاسم والمصدر في البيانات" — but
  // components/verify/V7Notices.js no longer renders either one.
  const gateRaw = o.governingGateReason && typeof o.governingGateReason === 'object' ? o.governingGateReason : null;
  const gate = gateRaw
    ? {
        name: typeof gateRaw.name === 'string' ? gateRaw.name : null,
        ceilingLetter: typeof gateRaw.ceilingLetter === 'string' ? gateRaw.ceilingLetter : null,
        source: typeof gateRaw.source === 'string' ? gateRaw.source : null,
        text: typeof gateRaw.text === 'string' ? gateRaw.text : null,
      }
    : null;
  if (gate && !(gate.text && gate.text.trim())) {
    // Rule 22 — a gate with no display sentence (absent, null, empty,
    // whitespace-only, or not a string) is an explicit state, not a silent
    // blank: an older V7 document from before the server change, or an
    // unmatched gate. The state lives HERE — `text: null` in the data plus
    // this warning — and NOT on screen: V7Notices.js renders no gate card at
    // all for it (the user's decision, 2026-10-07, البند ٤: not the title
    // alone, no marker attribute, no empty container). name and source are
    // never a substitute, and no sentence is invented client-side
    // (decision 90).
    // eslint-disable-next-line no-console
    console.warn(
      '[v7] overall.governingGateReason has no usable `text` (the server\'s display sentence) — an older document or an unmatched gate; the gate card is hidden entirely, never name/source',
      { ceilingLetter: gate.ceilingLetter }
    );
  }

  // abstentionReasons (task order, 2026-10-01): an array of {category,
  // reason} OBJECTS (relayed — neuralcheck-backend buildDisplayShapeV7.js:
  // 353 — filled only when zeroMeasuredMessage is set), not an array of
  // strings as this function guessed before that shape was known ("not
  // documented as array-vs-string. Accept either without guessing
  // further"). That old guess is why a real populated array used to vanish
  // silently: `.filter((s) => typeof s === 'string')` drops every object,
  // leaving an empty array that then collapses to null with no warning at
  // all. Fixed: reads each entry's `category`/`reason` through (both
  // required, non-empty strings), keeps the pair raw — classification into
  // display text is components/verify/V7Notices.js's job via
  // classifyAbstentionReason below, same separation readOverall already
  // keeps for categories/issues. A bare string is no longer accepted as a
  // second valid shape (that was an unverified guess, not a documented
  // one) — anything that isn't an array, and any array ENTRY that isn't a
  // well-formed {category, reason} object, is dropped with its own warning
  // rather than silently (rule 22): a buyer never sees a dropped reason,
  // but a developer always sees why in the console.
  let abstentionReasons = null;
  if (Array.isArray(o.abstentionReasons)) {
    const valid = [];
    for (const entry of o.abstentionReasons) {
      const hasCategory = entry && typeof entry === 'object' && typeof entry.category === 'string' && entry.category.trim();
      const hasReason = entry && typeof entry === 'object' && typeof entry.reason === 'string' && entry.reason.trim();
      if (hasCategory && hasReason) {
        valid.push({ category: entry.category, reason: entry.reason });
      } else {
        // eslint-disable-next-line no-console
        console.warn('[v7] overall.abstentionReasons entry is not a well-formed {category, reason} object — dropped, not rendered', entry);
      }
    }
    abstentionReasons = valid.length > 0 ? valid : null;
  } else if (o.abstentionReasons != null) {
    // eslint-disable-next-line no-console
    console.warn('[v7] overall.abstentionReasons has an unexpected shape (not an array) — not rendered', o.abstentionReasons);
  }

  return {
    letter: typeof o.letter === 'string' ? o.letter : null,
    coverage: typeof o.coverage === 'number' ? o.coverage : null,
    coveragePct: typeof o.coveragePct === 'number' ? o.coveragePct : null,
    partialAssessment: o.partialAssessment === true,
    partialAssessmentTag: tag,
    governingGateReason: gate,
    noDataAtAll: o.noDataAtAll === true,
    zeroMeasuredMessage: typeof o.zeroMeasuredMessage === 'string' ? o.zeroMeasuredMessage : null,
    abstentionReasons,
    harnessError: o.harnessError === true,
    harnessErrorReason: typeof o.harnessErrorReason === 'string' ? o.harnessErrorReason : null,
    // W6 (task order, 2026-10-01, S-13) — `harnessErrorReason` above is a
    // raw backend code (e.g. "FUNCTIONAL_RESULTS_UNAVAILABLE"), never meant
    // for a buyer; `harnessErrorMessage` is the human-readable Arabic
    // sentence meant to replace it on screen. Relayed, not yet verified in
    // this repo: the backend has not shipped this field yet — not in
    // contract/'s vendored samples, and verifyReport.js's own flattening
    // whitelist (§٨-أ) does not carry it onto shape C either (coordinator's
    // own flag, this task's order). So today this is null on every real
    // fixture this repo has, including Honor (harnessError=true) — that is
    // read as genuine absence, not a bug in this reader; once the backend
    // ships the field, a present string flows through the same type-check
    // below with no further change here. Simple nullable string, matching
    // zeroMeasuredMessage/harnessErrorReason's own sibling convention in
    // this same function (plain null-if-absent) rather than the stricter
    // {status,value} wrapper readNarrativeIncomplete uses below — that
    // wrapper exists because narrativeIncomplete's contract REQUIRES the
    // key always present (so absence itself is a contract violation worth
    // warning on); harnessErrorMessage is legitimately absent on most
    // reports (harnessError=false) and, for now, on all of them. The
    // "never show the raw code, always say something when harnessError is
    // true" obligation is enforced at the consumers (V7Notices.js,
    // app/verify/page.js, app/print/[shortId]/PrintClient.js), not here.
    harnessErrorMessage: typeof o.harnessErrorMessage === 'string' ? o.harnessErrorMessage : null,
  };
}

const KNOWN_LETTER_SOURCES = new Set(['DETERMINISTIC', 'LLM_ADJUSTED']);

/**
 * Classify a category's raw `letterSource` into
 * 'deterministic' | 'llmAdjusted' | 'unknown'. Both values come from
 * decision 42, not from an observed payload — every category in
 * contract/v7-client-payload-sample.json is "DETERMINISTIC"; no
 * "LLM_ADJUSTED" row has ever been seen by this repo. Anything outside
 * those two literal strings, including a missing field, becomes 'unknown'
 * and is logged rather than folded into either bucket — matching
 * classifyCategoryState/classifyV7Severity above exactly, including their
 * choice to warn on a missing value too: the sample never omits this field
 * on any of its 15 categories, so an absence here is as much a surprise as
 * a garbage value, not a quietly-expected case.
 */
export function classifyLetterSource(raw) {
  if (raw === 'DETERMINISTIC') return 'deterministic';
  if (raw === 'LLM_ADJUSTED') return 'llmAdjusted';
  if (!KNOWN_LETTER_SOURCES.has(raw)) {
    // eslint-disable-next-line no-console
    console.warn('[v7] unrecognized category letterSource — rendered as unknown, not folded into another case', raw);
  }
  return 'unknown';
}

// -----------------------------------------------------------------------
// categories.<name>.reason — decision 84 §1 / 86 §3 (2026-09-25).
//
// `reason` used to render on screen VERBATIM (components/verify/
// V7CategoriesGrid.js:243-250, dir="ltr", font-mono) — a raw backend code,
// sometimes with an attached parenthetical (see NO_CALIBRATED_THRESHOLD
// below). Decision 84 §1 replaces that with a lookup table keyed on the
// PAIR (category state, raw reason) — the same raw reason means something
// different depending on the state it landed on (NO_CALIBRATED_THRESHOLD on
// a PARTIAL/MEASURED battery is not the same fact as on an UNMEASURED one).
// A pair outside the table is never rendered as its raw code again: it
// shows the same "unknown state" text the site already has
// (t.verify.v7StateUnknown) and logs the raw pair — visible to a developer,
// never to a buyer. Two pairs are deliberately hidden entirely: the state's
// own full sentence (v7StateHarnessError / v7StateAttestedOnly) already
// says what the reason would only repeat.
//
// Literal reason values — one exported constant per value (rule 24: no
// second hand-typed copy of a literal a distinction depends on).
export const REASON_NO_HEALTH_BEARING_TESTS_DECLARED = 'NO_HEALTH_BEARING_TESTS_DECLARED';
export const REASON_DECLARED_BUT_NONE_EXECUTED = 'DECLARED_BUT_NONE_EXECUTED';
export const REASON_HARNESS_ERROR = 'HARNESS_ERROR';
export const REASON_MANUAL_ATTESTATION_ONLY = 'MANUAL_ATTESTATION_ONLY';
// Relayed by the coordinator as the backend's categoryGradingLock.js:44-45
// literal (this repo's agent cannot read neuralcheck-backend to verify
// directly) — matches this repo's own real B sample verbatim
// (contract/v7-reports-document-sample.json's `battery.reason`). Exact
// string match, not a prefix match: the parenthetical is part of the one
// literal value this table recognizes, not a variable note stripped before
// comparison — an unrecognized variant falls through to 'unknown' below,
// same as any other unrecognized value, rather than being guessed at via a
// startsWith().
export const REASON_NO_CALIBRATED_THRESHOLD =
  'NO_CALIBRATED_THRESHOLD (PLAN-03 لم يُنجَز — انظر batteryLayer.js)';
// قائمة الرموز من إحصاء backend-engineer (neuralcheck-backend:
// functions/src/analysis/buildDisplayShapeV7.js:119-131 — categoryAbsenceReason
// — والرمز نفسه هنا عند :122-124، آخر احتياط لسبب البطارية؛ منقول عبر
// المنسّق، غير متحقَّق من هذا المستودع — القاعدة 29): الخادم يُنتج هذا الرمز
// فعلاً، فهو من قيم `categories.<name>.reason` الحقيقية لا قيمة نظرية ولا
// ميتة. وقرار المستخدم 2026-10-07 (البند ٧) أن يسري على الموقع بالنصّ المعتمد
// نفسه ومن هذا الثابت: نصّه واحد أياً كانت الحالة في صفّ الفئة
// (classifyCategoryReason أدناه) وفي قائمة abstentionReasons
// (classifyAbstentionReason).
export const REASON_NO_BATTERY_INDICATORS_MEASURED = 'NO_BATTERY_INDICATORS_MEASURED';

/**
 * Classify a category's (state, reason) PAIR per decision 84 §1's table.
 * `state` is the ALREADY-CLASSIFIED value from classifyCategoryState above
 * ('measured' | 'partial' | 'unmeasured' | 'attestedOnly' | 'harnessError' |
 * 'unknown'), not the raw server string.
 *
 * Returns one of:
 *   { kind: 'none' }   — no reason was sent; nothing to show (unchanged
 *                        from today's "cat.reason is falsy" case).
 *   { kind: 'text', i18nKey, replacesStateLabel? } — a curated sentence
 *                        exists (three reasons are state-independent:
 *                        NO_HEALTH_BEARING_TESTS_DECLARED,
 *                        DECLARED_BUT_NONE_EXECUTED, and — since 2026-10-07 —
 *                        NO_BATTERY_INDICATORS_MEASURED, whatever the
 *                        state); i18nKey names the lib/i18n.js verify.* key
 *                        to render (present in `ar` today only — decision
 *                        86 §3 explicitly withheld tr/en pending
 *                        translation; see this task's report). Caller must
 *                        still guard on `t.verify[i18nKey]` existing before
 *                        rendering, so a language without the key renders
 *                        nothing rather than "undefined".
 *                        `replacesStateLabel: true` (only on the (partial,
 *                        NO_CALIBRATED_THRESHOLD) pair, decision 87 §4)
 *                        means the caller must NOT also show the state's
 *                        short badge word ("تغطية جزئية" / v7StatePartial):
 *                        that word claims the CATEGORY was only partially
 *                        measured, which is false right next to a 100%
 *                        coverage bar (S10) — the PARTIAL here is a
 *                        withheld-judgment call (no calibrated threshold to
 *                        grade against), not a measurement gap. The reason
 *                        sentence takes the label's place; the coverage
 *                        bar itself is untouched either way.
 *   { kind: 'hidden' } — the state's own text already says this; render
 *                        nothing for the reason at all.
 *   { kind: 'unknown' } — the pair is not in the table. Logged once here
 *                        (never rendered); caller shows t.verify.v7StateUnknown
 *                        in the reason's place instead of the raw code.
 */
export function classifyCategoryReason(state, reason) {
  if (!reason) return { kind: 'none' };

  if (reason === REASON_NO_HEALTH_BEARING_TESTS_DECLARED) {
    return { kind: 'text', i18nKey: 'v7ReasonNoHealthBearingDeclared' };
  }
  if (reason === REASON_DECLARED_BUT_NONE_EXECUTED) {
    return { kind: 'text', i18nKey: 'v7ReasonDeclaredButNoneExecuted' };
  }
  // 2026-10-07 (user's decision, البند ٧): the server really produces this
  // code (battery's final fallback — see its constant's comment above), so
  // it belongs in this table with its approved text, unconditional on state
  // like the two rows above. Until then this fell through to 'unknown' and
  // categoryReasonTable.test.cjs pinned that as "dead/never-real value" —
  // replaced there (rule 23).
  if (reason === REASON_NO_BATTERY_INDICATORS_MEASURED) {
    return { kind: 'text', i18nKey: 'v7ReasonBatteryUnmeasured' };
  }
  if (reason === REASON_NO_CALIBRATED_THRESHOLD) {
    if (state === 'partial' || state === 'measured') {
      return { kind: 'text', i18nKey: 'v7ReasonBatteryUncalibrated', replacesStateLabel: state === 'partial' };
    }
    if (state === 'unmeasured') {
      return { kind: 'text', i18nKey: 'v7ReasonBatteryUnmeasured' };
    }
    // NO_CALIBRATED_THRESHOLD paired with any other state is not in the
    // table — falls through to 'unknown' below, not guessed at.
  } else if (reason === REASON_HARNESS_ERROR) {
    if (state === 'unmeasured') {
      return { kind: 'text', i18nKey: 'v7ReasonHarnessErrorUnmeasured' };
    }
    if (state === 'harnessError') {
      return { kind: 'hidden' };
    }
    // HARNESS_ERROR paired with any other state is not in the table.
  } else if (reason === REASON_MANUAL_ATTESTATION_ONLY) {
    if (state === 'attestedOnly') {
      return { kind: 'hidden' };
    }
    // MANUAL_ATTESTATION_ONLY paired with any other state is not in the
    // table.
  }

  // eslint-disable-next-line no-console
  console.warn('[v7] unrecognized (state, reason) pair — showing "unknown", never the raw code', { state, reason });
  return { kind: 'unknown' };
}

// -----------------------------------------------------------------------
// overall.abstentionReasons[].reason — task order, 2026-10-01.
//
// A SEPARATE classifier from classifyCategoryReason above, deliberately not
// reused for this list, per the user's own explicit decision: that
// function's unknown-pair fallback shows t.verify.v7StateUnknown ("حالة
// قياس هذه الفئة غير معروفة" — this CATEGORY's measurement state is
// unknown), which only makes sense next to a category card that already
// has a visible state badge. abstentionReasons has no `state` at all, only
// {category, reason} — an unrecognized reason code here falls back to
// v7ReasonDeclaredButNoneExecuted (#15, "لم تُقَس هذه الفئة في هذا الفحص.")
// by the user's explicit instruction, not v7StateUnknown. Still reuses the
// REASON_* literal constants above rather than retyping any of the raw
// code strings a second time (rule 24).
//
// قائمة الرموز من إحصاء backend-engineer (neuralcheck-backend:
// functions/src/analysis/buildDisplayShapeV7.js:119-131 — categoryAbsenceReason
// — ومصفوفة abstentionReasons عند :353؛ منقول عبر المنسّق، غير متحقَّق من
// هذا المستودع — القاعدة 29): ستة رموز، كلّها يُنتجها الخادم فعلاً —
// MANUAL_ATTESTATION_ONLY وNO_HEALTH_BEARING_TESTS_DECLARED
// وDECLARED_BUT_NONE_EXECUTED وNO_CALIBRATED_THRESHOLD (PLAN-03 …)
// وHARNESS_ERROR (البطارية) وNO_BATTERY_INDICATORS_MEASURED. (الأخير ثابته
// مُعرَّف أعلاه مع بقيّة REASON_*؛ وهو الآن أيضاً صفٌّ في جدول
// classifyCategoryReason لا قيمة "ميتة" — انظر تعليقه.)

/**
 * Classify an abstentionReasons[].reason code directly to the lib/i18n.js
 * verify.* key that already carries its approved sentence — no new text,
 * all six keys already exist and are approved for other call sites:
 *   MANUAL_ATTESTATION_ONLY          -> v7StateAttestedOnly
 *   NO_HEALTH_BEARING_TESTS_DECLARED -> v7ReasonNoHealthBearingDeclared
 *   DECLARED_BUT_NONE_EXECUTED       -> v7ReasonDeclaredButNoneExecuted
 *   NO_CALIBRATED_THRESHOLD (...)    -> v7ReasonBatteryUncalibrated
 *   HARNESS_ERROR                    -> v7ReasonHarnessErrorUnmeasured
 *   NO_BATTERY_INDICATORS_MEASURED   -> v7ReasonBatteryUnmeasured
 *   anything else (unrecognized)     -> v7ReasonDeclaredButNoneExecuted (#15)
 * Logs the raw code on the unrecognized path only — the six known codes are
 * all expected, ordinary values, not something to warn about.
 */
export function classifyAbstentionReason(reason) {
  if (reason === REASON_MANUAL_ATTESTATION_ONLY) return 'v7StateAttestedOnly';
  if (reason === REASON_NO_HEALTH_BEARING_TESTS_DECLARED) return 'v7ReasonNoHealthBearingDeclared';
  if (reason === REASON_DECLARED_BUT_NONE_EXECUTED) return 'v7ReasonDeclaredButNoneExecuted';
  if (reason === REASON_NO_CALIBRATED_THRESHOLD) return 'v7ReasonBatteryUncalibrated';
  if (reason === REASON_HARNESS_ERROR) return 'v7ReasonHarnessErrorUnmeasured';
  if (reason === REASON_NO_BATTERY_INDICATORS_MEASURED) return 'v7ReasonBatteryUnmeasured';
  // eslint-disable-next-line no-console
  console.warn('[v7] unrecognized abstentionReasons[].reason code — showing text #15, never the raw code', reason);
  return 'v7ReasonDeclaredButNoneExecuted';
}

/**
 * `categories.*` as a name-sorted array. Each entry carries the classified
 * state (see classifyCategoryState) alongside the raw string, so a card can
 * show the raw value on an 'unknown' state without the reader having
 * invented a label for it. `letterSource` follows the same pattern via
 * classifyLetterSource, per decision 42 — see
 * scripts/check-render-surface.mjs's comment on why this category-level
 * field is no longer forbidden, and readOverall's doc comment for why the
 * report-level field of the same name still is.
 *
 * `indicators` is deliberately not read or passed through — it is a
 * heterogeneous per-test-id instrumentation dump (different fields per
 * indicator id, raw units like mΩ / °C/Wh), the same class of detail the
 * admin panel exists for. Out of scope for the buyer-facing certificate;
 * see this task's report for the explicit scope decision.
 *
 * `adjustmentEvidence`'s populated shape IS documented per
 * `V7_DISPLAY_SHAPE_CONTRACT.md:14` (neuralcheck-backend, relayed — this
 * repo has no local copy of that file to cross-check against, rule 29):
 * "`adjustmentEvidence` مصفوفة نصوص مسار كود داخلية خام غير محلولة (مثل
 * `"categoryStates.categories.cpu.deterministicLetter"`) تصل فعلاً
 * `display`/التخزين/العميل حين `letterSource==="LLM_ADJUSTED"`" — an array
 * of raw, unresolved internal code-path strings. Confirmed against a real
 * sample too: contract/v7-reports-document-sample-cpu-c06-downgrade.json's
 * `cpu.adjustmentEvidence` is exactly this shape
 * (`["categoryStates.testResults[13].outcome"]`).
 *
 * decision 101 §2 (2026-09-25): `adjustmentEvidence` below is now `null`
 * UNCONDITIONALLY — regardless of whether the raw value matches the
 * documented array shape, or anything else. Before this change, a bare
 * STRING (not the documented array) was treated as valid and passed
 * through as the field's value — which V7CategoriesGrid.js would then
 * render, because decision 99 §4 ("the evidence path is never shown") had
 * only been applied to the array case, not to every shape. Never observed
 * in a real sample (every real sample has either the documented array or
 * `null`), but a live gap regardless: this raw internal path must not
 * reach the screen no matter what shape it arrives in. There is
 * consequently no live code path left that can make readCategories return
 * a non-null `adjustmentEvidence` — see components/verify/
 * V7CategoriesGrid.js's own comment on the resulting dead display branch.
 *
 * The console.warn below is UNCHANGED in its own logic from decision 100
 * §3: silent for the documented array-of-strings shape (or `null`), still
 * fires for anything else. A bare string is NOT the documented shape
 * (the contract says an array), so it now warns too — it did not before
 * this change, which is exactly how the passthrough went unnoticed: a
 * string was accepted, per decision 100 §3's diagnosis, as a no-questions-
 * asked assumption from before real samples existed.
 *
 * One boundary the contract text does not state, decided here rather than
 * left undocumented (flagged in this task's report, per instruction): an
 * empty array `[]` and an array containing an empty string are both still
 * "an array of strings" by the type check below — the contract says the
 * element TYPE is a string, not that elements must be non-empty. Not
 * asserted defensively beyond what the contract actually says.
 */

/**
 * `categories.<name>.letterCeilingReason` — `{name, ceilingLetter, text} |
 * null`, per the task that added it (2026-09-22, "الشرط الأوّل") and the
 * backend contract handoff dated the same day (V7_DISPLAY_SHAPE_CONTRACT.md
 * §٣, the `letterCeilingReason` sub-table — a task-local copy, not read from
 * this repo). Distinct from `reason` above: `reason` explains why a category
 * produced NO letter; `letterCeilingReason` explains why a letter that WAS
 * produced got capped by a named gate (today: only `LOW_CATEGORY_COVERAGE`
 * — other gates that could cap a letter do not populate this field, per the
 * same contract section). The two never coexist on one category.
 *
 * Per v7ContractFieldMap.js's CATEGORY_COMMON_FIELDS (backend, mirrored in
 * this task's handoff, not read live from this repo), the key itself is
 * always present on a V7 category — built by analyzeDevice.js's
 * buildCategoryEntryForStorage field-by-field, never a light `?? null`
 * pass-through. A document missing the KEY entirely is therefore a contract
 * violation (a pre-this-field document, or a bug), never "no ceiling" — Rule
 * 22/25: absence must surface as its own explicit state, never silently read
 * as the same thing a present `null` means. Returns:
 *
 *   { status: 'ok', value: {name, ceilingLetter, text} | null }
 *     the key is present; `value` is `null` (no ceiling) or the type-checked
 *     object. `text` is read verbatim for display — NEVER built or derived
 *     from `name` here (the task's explicit constraint); a present object
 *     whose `text` is `null` gets no substitute text from this reader either.
 *   { status: 'missing', value: null }
 *     the key itself is absent from this category's object.
 *   { status: 'invalid', value: null }
 *     the key is present but is neither `null` nor an object.
 */
function readLetterCeilingReason(data, categoryName) {
  if (!Object.prototype.hasOwnProperty.call(data, 'letterCeilingReason')) {
    // eslint-disable-next-line no-console
    console.warn(
      `[v7] categories.${categoryName}.letterCeilingReason is missing from this document — the contract requires the key always present (an object, or null when nothing capped the letter). Treated as an explicit "missing" state, never silently read as null/"no ceiling".`
    );
    return { status: 'missing', value: null };
  }

  const raw = data.letterCeilingReason;
  if (raw === null) return { status: 'ok', value: null };

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return {
      status: 'ok',
      value: {
        name: typeof raw.name === 'string' ? raw.name : null,
        ceilingLetter: typeof raw.ceilingLetter === 'string' ? raw.ceilingLetter : null,
        text: typeof raw.text === 'string' ? raw.text : null,
      },
    };
  }

  // eslint-disable-next-line no-console
  console.warn(
    `[v7] categories.${categoryName}.letterCeilingReason has an unexpected shape (neither null nor an object) — not rendered`,
    raw
  );
  return { status: 'invalid', value: null };
}

export function readCategories(report) {
  const categories = resolveV7Container(report)?.categories;
  if (!categories || typeof categories !== 'object') return [];

  return Object.entries(categories)
    .filter(([, data]) => data && typeof data === 'object')
    .map(([name, data]) => {
      // decision 101 §2: always null — see this field's doc comment above
      // for why a bare string used to slip through here and reach the
      // screen. Never reassigned below; only whether a genuinely
      // off-contract shape gets warned about is decided here.
      const adjustmentEvidence = null;
      if (data.adjustmentEvidence != null) {
        // Decision 100 §3: an array of strings is the documented contract
        // shape (V7_DISPLAY_SHAPE_CONTRACT.md:14, relayed) — not a warning
        // case. A bare string is NOT that shape (decision 101 §2) and now
        // warns too.
        const isDocumentedArrayShape =
          Array.isArray(data.adjustmentEvidence) &&
          data.adjustmentEvidence.every((item) => typeof item === 'string');
        if (!isDocumentedArrayShape) {
          // eslint-disable-next-line no-console
          console.warn(
            `[v7] categories.${name}.adjustmentEvidence does not match the documented contract shape (array of strings, or null) — not rendered`,
            data.adjustmentEvidence
          );
        }
      }

      const ceiling = readLetterCeilingReason(data, name);

      return {
        name,
        stateRaw: typeof data.state === 'string' ? data.state : null,
        state: classifyCategoryState(data.state),
        letter: typeof data.letter === 'string' ? data.letter : null,
        coverage: typeof data.coverage === 'number' ? data.coverage : null,
        reason: typeof data.reason === 'string' ? data.reason : null,
        testIds: Array.isArray(data.testIds) ? data.testIds : [],
        letterSourceRaw: typeof data.letterSource === 'string' ? data.letterSource : null,
        letterSource: classifyLetterSource(data.letterSource),
        adjustmentReason: typeof data.adjustmentReason === 'string' ? data.adjustmentReason : null,
        adjustmentEvidence,
        letterCeilingReasonStatus: ceiling.status,
        letterCeilingReason: ceiling.value,
      };
    });
}

/**
 * `issues[]`, normalized. Shape is already close to what IssuesList expects
 * (id/category/severity/title/evidence/evidenceUnit/description).
 *
 * `severity` is kept RAW here ("FAIL", "INFO", …) — NOT run through
 * classifyV7Severity(). components/verify/IssuesList.js's IssueCard calls
 * its `severityClassifier` prop on `issue.severity` itself (that is the
 * existing V6 contract: the reader hands over the raw value, the render
 * layer classifies it), so pre-classifying here and also passing
 * classifyV7Severity as the prop double-classifies — classifyV7Severity's
 * exact-match check against 'FAIL'/'INFO'/… never matches an
 * already-lowercased 'danger'/'info'/…, and every issue silently becomes
 * 'unknown'. Caught live in the browser while verifying this task (every
 * issue showed the unknown badge, and concerningCount — which counts
 * 'unknown' as concerning — read 31 instead of the correct 4), not by the
 * standalone reader-only test script, which only exercised this file in
 * isolation and so never called through IssueCard. Left as a cautionary
 * comment rather than deleted quietly.
 */
export function readIssues(report) {
  const container = resolveV7Container(report);
  const raw = Array.isArray(container?.issues) ? container.issues : [];
  return raw
    .filter((it) => it && typeof it === 'object')
    .map((it) => ({
      id: it.id ?? null,
      category: typeof it.category === 'string' ? it.category : null,
      severity: typeof it.severity === 'string' ? it.severity : null,
      title: typeof it.title === 'string' ? it.title : '',
      evidence: it.evidence ?? null,
      evidenceUnit: typeof it.evidenceUnit === 'string' ? it.evidenceUnit : null,
      description: typeof it.description === 'string' ? it.description : '',
    }));
}

/**
 * `narrative.buyerAdvice` — already {casual, gamer, photographer} with
 * string|null values, exactly the shape components/verify/BuyerAdvice.js
 * expects. All-null is a valid, non-error state in principle (a report with
 * nothing persona-specific to say) — the current contract/v7-client-payload-
 * sample.json now carries real text for all three (refreshed for the
 * letterCeilingReason task, 2026-09-23), but an older or degraded document
 * could still legitimately send all-null, and BuyerAdvice already renders
 * nothing when every persona is empty, so no extra handling is needed here.
 */
export function readBuyerAdvice(report) {
  const advice = resolveV7Container(report)?.narrative?.buyerAdvice;
  return advice && typeof advice === 'object' ? advice : null;
}

export function readSummary(report) {
  const summary = resolveV7Container(report)?.narrative?.summary;
  return typeof summary === 'string' ? summary : '';
}

/**
 * `narrative.verdict` — a single sentence naming the overall letter and why
 * it landed there (e.g. "...والحرف مقصوص ببوّابة كشف صلاحيات الجذر..."),
 * distinct from `narrative.summary` (a fuller paragraph) and from
 * `narrative.details` (the full per-category breakdown, see readDetails
 * below). Read as its own single location — no fallback chain to `summary`
 * here: that chain is exactly what a V6-only page (see lib/reportReaders/
 * v6.js's file-level comment) would build, and this repo's V7 readers each
 * read exactly one contract path. A report with no verdict text renders
 * nothing for this field rather than substituting a different one.
 */
export function readVerdict(report) {
  const verdict = resolveV7Container(report)?.narrative?.verdict;
  return typeof verdict === 'string' ? verdict : null;
}

/**
 * `narrative.details` — the full per-category prose breakdown. Same
 * empty-string-default convention as readSummary above (both feed straight
 * into text rendering that expects a string, never null).
 */
export function readDetails(report) {
  const details = resolveV7Container(report)?.narrative?.details;
  return typeof details === 'string' ? details : '';
}

/**
 * Count issues per category and severity bucket, for the compact breakdown
 * on a V7 category card. Purely a count — no smoothing, no picking a peak,
 * no inferred sign — so it stays on the "reversible, lossless" side of the
 * line the raw-storage rule (finding A-series decisions) draws for anything
 * computed from server data.
 *
 * Takes `issues` as returned by readIssues() above, i.e. with RAW severity
 * strings — classifies each one here via classifyV7Severity rather than
 * assuming it was classified already (see readIssues' doc comment for why
 * that assumption is exactly the bug this file previously had).
 */
export function countIssuesByCategory(issues) {
  const counts = new Map();
  for (const issue of issues) {
    if (!issue.category) continue;
    if (!counts.has(issue.category)) {
      counts.set(issue.category, { danger: 0, warning: 0, info: 0, positive: 0, unknown: 0 });
    }
    const bucket = counts.get(issue.category);
    const level = classifyV7Severity(issue.severity);
    if (Object.prototype.hasOwnProperty.call(bucket, level)) {
      bucket[level] += 1;
    } else {
      bucket.unknown += 1;
    }
  }
  return counts;
}

// -----------------------------------------------------------------------
// narrativeIncomplete — a sibling of `narrative`, NOT nested under it
// (v7ContractFieldMap.js's ROOT_FIELDS lists both `narrativeIncomplete`
// and `narrativeIncompleteFields` alongside `narrative` itself, all at the
// same level — confirmed directly against contract/v7-client-payload-
// sample.json: `s.narrativeIncomplete === false` at that sample's own
// root). That "same level" is resolveV7Container(report)'s result, NOT
// necessarily the report's own top level — see this file's 2026-09-24
// update: on both the Firestore reports-document shape and the
// verifyReport response shape, `narrativeIncomplete` lives inside
// `aiResponse`, sibling to `narrative`/`categories`/`issues` there, same
// as everything else this file reads. Per this task's order (2026-09-23,
// coordinator decision 72): only `narrativeIncomplete` (the boolean) is
// read/shown. `narrativeIncompleteFields` is explicitly OUT of scope — not
// read, not rendered, no function for it here.
// -----------------------------------------------------------------------

// The narrativeIncomplete notice text used to live here as a fixed,
// language-independent constant (NARRATIVE_INCOMPLETE_NOTICE) — decision 91
// §3 (2026-09-25) moved it into lib/i18n.js as `verify.v7NarrativeIncomplete`
// (ar/tr/en), a real translated UI string like every other `verify.*` key,
// rather than a single Arabic-only export. See that key's own comment in
// lib/i18n.js for the rule-29 cross-repo source citation (NeuralChek's
// report_v7_narrative_incomplete) — the Arabic text itself is unchanged,
// only its home moved. components/verify/NarrativeIncompleteNotice.js now
// takes a `t` prop and reads `t.verify.v7NarrativeIncomplete` directly;
// nothing in this file exports the text anymore (rule 24 — one source).

/**
 * `narrativeIncomplete` — boolean, always present per the contract (see
 * comment above). Returns:
 *
 *   { status: 'ok', value: true|false }
 *     the key is present and is a real boolean.
 *   { status: 'missing', value: null }
 *     the key itself is absent (or `report` isn't an object at all) — a
 *     contract violation, NEVER read as `false` ("complete"). Rule 22/25:
 *     an absent required field must surface as its own explicit state.
 *   { status: 'invalid', value: null }
 *     the key is present but is not a boolean.
 */
export function readNarrativeIncomplete(report) {
  const container = resolveV7Container(report);
  if (!container || typeof container !== 'object') {
    return { status: 'missing', value: null };
  }
  if (!Object.prototype.hasOwnProperty.call(container, 'narrativeIncomplete')) {
    // eslint-disable-next-line no-console
    console.warn(
      '[v7] narrativeIncomplete is missing from this document — the contract requires the key always present (a boolean). Treated as an explicit "missing" state, never silently read as false/"complete".'
    );
    return { status: 'missing', value: null };
  }
  const raw = container.narrativeIncomplete;
  if (typeof raw === 'boolean') {
    return { status: 'ok', value: raw };
  }
  // eslint-disable-next-line no-console
  console.warn(
    '[v7] narrativeIncomplete has an unexpected shape (not a boolean) — not rendered',
    raw
  );
  return { status: 'invalid', value: null };
}
