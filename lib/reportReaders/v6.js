import { letterForScore } from '@/lib/grade';

// V6 report readers — extracted unchanged from app/verify/page.js and
// app/print/[shortId]/PrintClient.js, which carried two near-identical
// copies of the same fallback chains. Consolidated here so there is one
// place to read, not two that can drift (the same class of problem as a
// duplicated literal — see lib/pipelineTags.js).
//
// These are for reports classified V6 by lib/pipelineTags.js (explicit
// v6_raw_timeseries tag, or — today, always — no `pipeline` field at all).
// Do not call these on a V7 report: every fallback here reads V6-era shapes
// (aiResponse.*, top-level, ai.*) that a V7 payload never populates, so the
// whole chain silently resolves to null/[] on V7 — which is the exact bug
// this pass exists to fix. V7 reports must go through
// lib/reportReaders/v7.js instead.
//
// Logic is unchanged from the pre-existing code; only names were unified
// (PrintClient.js used shorter aliases for a few of these — pickTier,
// pickPredicted, pickAdvice, pickYear — now pickDeviceTier,
// pickPredictedProblems, pickBuyerAdvice, pickEstimatedYear everywhere).

export function pickScoreNumber(v) {
  if (typeof v !== 'number' || isNaN(v)) return null;
  // Normalize: 0..1 → percent, else clamp to 0..100
  const pct = v > 1 ? v : v * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function pickScore(report) {
  return (
    pickScoreNumber(report?.aiResponse?.score) ??
    pickScoreNumber(report?.aiResponse?.overallScore) ??
    pickScoreNumber(report?.score) ??
    pickScoreNumber(report?.overallScore) ??
    pickScoreNumber(report?.ai?.score) ??
    null
  );
}

/**
 * Raw grade string, or null when none of the known V6 locations carry one.
 * Callers decide how to render "no grade" — this never returns a '?'
 * placeholder itself, so a genuinely-missing grade can be told apart from a
 * server-sent one.
 */
export function pickGrade(report) {
  return report?.grade || report?.aiResponse?.overallGrade || null;
}

export function pickSummary(report) {
  return (
    report?.aiResponse?.summary ||
    report?.summary ||
    report?.ai?.summary ||
    report?.description ||
    ''
  );
}

export function pickDetails(report) {
  return (
    report?.aiResponse?.details ||
    report?.details ||
    ''
  );
}

export function pickIssues(report) {
  const raw =
    report?.aiResponse?.issues ||
    report?.issues ||
    report?.problems ||
    report?.ai?.issues ||
    [];
  if (!Array.isArray(raw)) return [];
  // Keep the issue object shape intact — IssuesList renders title +
  // description + evidence + severity + category. Returning normalized
  // text (as the legacy code did) would discard the rich fields the
  // new design depends on.
  return raw.filter(Boolean);
}

export function pickCategoryScores(report) {
  return (
    report?.aiResponse?.category_scores ||
    report?.category_scores ||
    report?.categories ||
    report?.categoryScores ||
    report?.scores ||
    report?.ai?.categories ||
    null
  );
}

export function pickPredictedProblems(report) {
  const raw =
    report?.aiResponse?.predicted_problems ||
    report?.predicted_problems ||
    report?.ai?.predicted_problems ||
    [];
  return Array.isArray(raw) ? raw.filter(Boolean) : [];
}

export function pickBuyerAdvice(report) {
  return (
    report?.aiResponse?.buyer_advice ||
    report?.buyer_advice ||
    report?.ai?.buyer_advice ||
    null
  );
}

export function pickCategoryNotes(report) {
  return (
    report?.aiResponse?.category_notes ||
    report?.category_notes ||
    report?.ai?.category_notes ||
    null
  );
}

export function pickDeviceTier(report) {
  return (
    report?.aiResponse?.deviceTier ||
    report?.deviceTier ||
    report?.ai?.deviceTier ||
    null
  );
}

export function pickEstimatedYear(report) {
  const v =
    report?.aiResponse?.estimatedReleaseYear ??
    report?.estimatedReleaseYear ??
    report?.ai?.estimatedReleaseYear;
  if (typeof v === 'number' && v > 1900 && v < 2100) return v;
  if (typeof v === 'string' && /^\d{4}$/.test(v)) return Number(v);
  return null;
}

// ---------- pipeline-agnostic reads ----------
//
// These three read fields that are either shared verbatim between V6 and V7
// payloads (shortId, deviceMarketingName) or simply absent from both without
// risk of misreading (createdAt-family fields aren't in the V7 findings
// payload at all — see contract/README.md). Safe to call regardless of
// pipeline; kept here rather than duplicated in the V7 reader.

export function resolveShortId(report, fallbackScanId) {
  if (report?.shortId) return report.shortId.toString().toUpperCase();
  const raw = report?.scanId || report?.id || fallbackScanId;
  if (!raw) return '—';
  return raw.toString().slice(0, 8).toUpperCase();
}

export function pickDeviceName(report) {
  return (
    report?.deviceMarketingName ||
    report?.deviceModel ||
    report?.device ||
    report?.model ||
    [report?.brand, report?.modelName].filter(Boolean).join(' ') ||
    '—'
  );
}

export function pickCreatedAt(report) {
  return (
    report?.date ||
    report?.timestamp ||
    report?.createdAt ||
    report?.scannedAt ||
    null
  );
}

// ---------- category grid (moved from components/verify/CategoriesGrid.js) ----------
//
// Item 3 of the fourth addendum to decision 102 (2026-09-26): "هذا ما قُرّر
// في التطبيق: لا نموذج عرض يحمل الدرجة" — no display model carries the
// score, same rule already applied on the app side. The normalizer
// (readCategory), the filter, the sort order, and the legacy-shape (bare
// number, no separate letter field) letter fallback are moved here from
// CategoriesGrid.js UNCHANGED IN LOGIC — only their home changes. `score` is
// still computed internally (needed for the filter's existence check, the
// sort order, and the legacy-shape letter fallback below) but is forced to
// null on every object this module hands back — the grid component receives
// an already-filtered, already-sorted list, by letter, with no score.
//
// GRADE_BAR's key set (A/B/C/D) used to live in CategoriesGrid.js purely to
// answer "is this a letter we recognize" before falling back to
// letterForScore — KNOWN_LETTERS below is that same check, unchanged,
// without the CSS-class map (which stays a display-only concern, still in
// CategoriesGrid.js's GRADE_BADGE).
const KNOWN_LETTERS = ['A', 'B', 'C', 'D'];

function clampCategoryScore(v) {
  if (typeof v !== 'number' || isNaN(v)) return null;
  const pct = v > 1 ? v : v * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** A finite number, or null. Every new count field is optional. */
function categoryCount(v) {
  return typeof v === 'number' && isFinite(v) && v >= 0 ? v : null;
}

function categoryGradeLetter(grade) {
  if (!grade) return '';
  return String(grade).trim().toUpperCase().charAt(0);
}

/**
 * Normalize whatever the server sent into one predictable shape. See
 * components/verify/CategoriesGrid.js's git history (before this task) for
 * the original doc comment on the three deliberately-unread fields
 * (ai_grade, grade_source, reconciled) and on expected_range — unchanged,
 * just relocated with this function.
 */
const EMPTY_GRID_CATEGORY = {
  score: null,
  grade: null,
  letter: '',
  unmeasured: false,
  note: null,
  expectedRange: null,
  passCount: null,
  totalCount: null,
  declared: null,
  notRun: null,
  failCount: null,
  warningCount: null,
};

function normalizeGridCategory(data) {
  // Legacy plain number. Returned through the full shape so every optional
  // field is an explicit null.
  if (typeof data === 'number') {
    const score = clampCategoryScore(data);
    return {
      ...EMPTY_GRID_CATEGORY,
      score,
      // No separate letter field in this shape — the score IS the only
      // signal, so the letter must be derived from it here, before `score`
      // is stripped on the way out. (Open edge case, documented in this
      // task's report: a legacy category that is also hidden loses the
      // means to derive its own letter — not resolved here, unchanged from
      // before this task.)
      letter: letterForScore(score),
    };
  }
  if (!data || typeof data !== 'object') return null;

  const score = clampCategoryScore(
    typeof data.score === 'number' ? data.score : data.value
  );
  const grade = data.grade || null;
  const rawLetter = categoryGradeLetter(grade);

  const passCount = categoryCount(data.pass_count ?? data.passCount);
  const totalCount = categoryCount(data.total_count ?? data.totalCount);
  const declaredCount = categoryCount(data.declared_count ?? data.declaredCount);
  const excludedCount = categoryCount(data.excluded_count ?? data.excludedCount);
  const notTestedCount = categoryCount(data.not_tested_count ?? data.notTestedCount);
  const unavailableCount = categoryCount(data.unavailable_count ?? data.unavailableCount);
  const failCount = categoryCount(data.fail_count ?? data.failCount);
  const warningCount = categoryCount(data.warning_count ?? data.warningCount);

  const measured = typeof data.measured === 'boolean' ? data.measured : null;

  const unmeasured = measured === false || rawLetter === '?' || totalCount === 0;

  // Letter fallback — only for a MEASURED category, exactly mirroring the
  // original code's conditionality (MeasuredCard, never UnmeasuredCard, ran
  // this computation; an unmeasured category's letter was never read by
  // UnmeasuredCard either way).
  const letter = unmeasured
    ? rawLetter
    : rawLetter && KNOWN_LETTERS.includes(rawLetter)
      ? rawLetter
      : letterForScore(score);

  let notRun = excludedCount;
  if (notRun === null) {
    if (declaredCount !== null && totalCount !== null) {
      notRun = Math.max(0, declaredCount - totalCount);
    } else if (notTestedCount !== null || unavailableCount !== null) {
      notRun = (notTestedCount ?? 0) + (unavailableCount ?? 0);
    }
  }

  const declared =
    declaredCount ??
    (totalCount !== null && notRun !== null ? totalCount + notRun : null);

  return {
    ...EMPTY_GRID_CATEGORY,
    score,
    grade,
    letter,
    unmeasured,
    note: data.note || null,
    expectedRange: unmeasured
      ? null
      : data.expected_range || data.expectedRange || null,
    passCount,
    totalCount,
    declared,
    notRun,
    failCount,
    warningCount,
  };
}

/**
 * V6 categories, ready for components/verify/CategoriesGrid.js: filtered,
 * sorted, letters resolved — and `score` always null (see this section's
 * top comment). Returns null when the report carries no category data at
 * all (mirrors CategoriesGrid.js's own former early return), matching the
 * component's existing "render nothing" contract for that case.
 */
export function readCategoriesForGrid(report) {
  const categoryScores = pickCategoryScores(report);
  if (!categoryScores || typeof categoryScores !== 'object') return null;

  const entries = Object.entries(categoryScores)
    .map(([name, data]) => ({ name, v: normalizeGridCategory(data) }))
    // Keep a card whenever it can say something: a score, or the fact that
    // nothing was measured.
    .filter(({ v }) => v && (v.score !== null || v.unmeasured));

  if (entries.length === 0) return null;

  // Measured first, best score first; unmeasured collected at the end.
  entries.sort((a, b) => {
    if (a.v.unmeasured !== b.v.unmeasured) return a.v.unmeasured ? 1 : -1;
    return (b.v.score ?? 0) - (a.v.score ?? 0);
  });

  // Score never leaves this function on the returned objects — computed
  // above only for the filter, the sort, and the legacy-shape letter
  // fallback.
  return entries.map(({ name, v }) => ({ name, v: { ...v, score: null } }));
}
