// What the admin panel may SHOW or KEEP IN THE BROWSER of a Firestore
// `reports/{scanId}` document — one place, so the two admin pages cannot
// drift apart (rule 24: a literal that a distinction rests on lives in one
// exported source, not a copy per file).
//
// Decision 7 (the user's, 2026-10-09, relayed in the task order — the
// decisions file itself is not visible from this repo): "صفحة المشرف لا
// تعرض الخامّ، ولا تُخزَّن المستندات الكاملة في المتصفّح."
//
// Background (relayed from the task order, neuralcheck-backend@6fa408d, not
// verifiable from this repo): the server stopped writing five keys into the
// `reports` document — and OLD documents still carry them until production
// is migrated by a later script. So a reader here cannot assume they are
// gone: this module removes them from what is displayed, and never reads
// them at all when building what is stored.
//
// contract/v7-reports-document-sample*.json (the six) no longer carry the
// five keys; contract/v6-reports-document-sample.json — a real old report —
// still carries `rawFingerprint`, which is the in-repo example of a
// document this module has to handle.

import { tsToDate } from '@/lib/admin';

/**
 * The five top-level keys of a `reports` document that the admin panel must
 * not display. `userId` is deliberately NOT here: the server kept it, and
 * app/admin/reports/page.js reads it to resolve the owner's name.
 *
 * Top-level only. The five are top-level keys of the document, and every
 * in-repo sample that carries one carries it there (checked over the six V7
 * samples at their previous revision and the V6 sample); a deep removal would
 * also delete any unrelated nested field that merely shares a name.
 */
export const REPORT_DOC_RAW_KEYS = Object.freeze([
  'rawFingerprint',
  'sessionId',
  'deviceFingerprintSha',
  'timeSeriesStoragePath',
  'aiAudit',
]);

/**
 * A copy of the document for DISPLAY, without the five raw keys. The input
 * is never modified — `reports` in app/admin/reports/page.js stays the data
 * (search and filters read it); only the copy handed to the JSON view loses
 * the keys. Anything that is not a plain object is returned as it is.
 */
export function withoutRawKeys(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) return report;
  const view = { ...report };
  for (const key of REPORT_DOC_RAW_KEYS) delete view[key];
  return view;
}

/**
 * The only fields of a report that app/admin/page.js's "آخر 10 فحوصات" table
 * reads, and therefore the only ones it stores in sessionStorage:
 *   id, scanId, shortId  — the code lib/admin.js reportCode() derives
 *   deviceName           — first non-empty of deviceMarketingName,
 *                          deviceModel, device, model (the table's own chain)
 *   grade                — the COMPUTED letter (resolveGrade), not the fields
 *                          it was computed from
 *   createdAtMs          — createdAt || timestamp, as epoch milliseconds
 * A whitelist, not a deny-list: a field the server adds tomorrow does not
 * reach the browser's storage unless somebody adds it here on purpose.
 */
export const RECENT_REPORT_ROW_KEYS = Object.freeze([
  'id',
  'scanId',
  'shortId',
  'deviceName',
  'grade',
  'createdAtMs',
]);

function textOrNull(v) {
  return typeof v === 'string' && v ? v : typeof v === 'number' ? String(v) : null;
}

function firstTruthy(...candidates) {
  for (const c of candidates) {
    if (c) return c;
  }
  return null;
}

/**
 * One table row from one `reports` document. `grade` is passed in already
 * computed by the caller (app/admin/page.js's resolveGrade), so this module
 * does not need to know about pipelines. Absence stays absence (null) — the
 * table, not this function, decides to print "—" (rule 22).
 */
export function toRecentReportRow(report, grade) {
  const r = report && typeof report === 'object' ? report : {};
  const created = tsToDate(r.createdAt || r.timestamp);
  const createdMs = created ? created.getTime() : NaN;
  return {
    id: textOrNull(r.id),
    scanId: textOrNull(r.scanId),
    shortId: textOrNull(r.shortId),
    deviceName: textOrNull(
      firstTruthy(r.deviceMarketingName, r.deviceModel, r.device, r.model)
    ),
    grade: grade ? String(grade) : null,
    createdAtMs: Number.isFinite(createdMs) ? createdMs : null,
  };
}
