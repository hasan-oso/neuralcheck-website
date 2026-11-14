// Provenance telemetry for a fetched report.
//
// These fields say how a grade was reached rather than what the phone is like,
// so they never reach the buyer — scripts/check-render-surface.mjs fails the
// build if any of them is read on the report surface. But we do want to see
// how often the pipeline falls back, so they are logged to the console here.
//
// This module is deliberately OUTSIDE that guard's file list. Logging is not
// rendering, but the guard is a text scan and cannot tell the two apart; if the
// reads lived in the page, the guard would either fail forever or have to be
// weakened. Keeping them here lets the guard stay absolute about the surface
// while the numbers still get observed. Whatever is added below must stay
// console-only — nothing here may return a value that ends up in JSX.

const REPORT_KEYS = ['usedFallbackGrade', 'used_fallback_grade'];
const CATEGORY_KEYS = [
  'usedFallbackGrade',
  'used_fallback_grade',
  'grade_source',
  'ai_grade',
  'reconciled',
];

function firstPresent(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return undefined;
}

/**
 * Log a report's grade provenance. Call once per successful fetch.
 * Silent when the report carries none of these fields, which is every report
 * written before they existed.
 */
export function logGradeProvenance(report, context = 'verify') {
  if (!report || typeof report !== 'object') return;

  const ai = report.aiResponse || {};
  const reportLevel =
    firstPresent(report, REPORT_KEYS) ?? firstPresent(ai, REPORT_KEYS);

  const categories =
    ai.category_scores || report.category_scores || report.categoryScores || null;

  const perCategory = [];
  if (categories && typeof categories === 'object') {
    for (const [name, data] of Object.entries(categories)) {
      if (!data || typeof data !== 'object') continue;
      const found = {};
      for (const k of CATEGORY_KEYS) {
        if (Object.prototype.hasOwnProperty.call(data, k)) found[k] = data[k];
      }
      if (Object.keys(found).length > 0) perCategory.push({ category: name, ...found });
    }
  }

  if (reportLevel === undefined && perCategory.length === 0) return;

  // eslint-disable-next-line no-console
  console.info(
    `[${context}] grade provenance`,
    {
      scanId: report.scanId || report.id || null,
      shortId: report.shortId || null,
      grade: report.grade ?? null,
      fallbackGradeUsed: reportLevel ?? null,
      categories: perCategory,
    }
  );
}
