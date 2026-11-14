// Shared constants + helpers for the technician evaluation panel (/tech).
//
// The panel exists so a partner shop's technician can grade a device himself
// and tell us how far our report was from his own judgement. Everything here
// is tuned for ONE constraint: two mandatory taps and under 15 seconds per
// evaluation, on a phone, in a busy shop.
//
// Most Arabic strings here (UI copy, agreement options, error messages) are
// hardcoded, not routed through lib/i18n.js, for the same reason the admin
// panel is: this is an internal, single-language tool for partner shops, and
// 40 more keys in three languages would be dead weight.
//
// DISPUTED_CATEGORIES' labels are the one exception (2026-10-01, rule 24 —
// "لا نسخة في كل ملفّ"): they used to be a second hardcoded copy of (a
// subset of) lib/i18n.js's cat* names, which had already drifted — three of
// the ten (gpu/sensors/gps) still held the OLD category names after that
// list changed. Read from `translations.ar.verify` below instead, the exact
// same pattern components/tech/EvaluationForm.js's own TECH_T already uses
// for V7Notices — /tech has never had a `lang` prop to thread through (see
// that file's comment), so "always Arabic" is this module's existing,
// precedented convention, not a new one invented for this.

import { classifyPipeline, PipelineKind } from '@/lib/pipelineTags';
import { translations } from '@/lib/i18n';
import { pickGrade } from '@/lib/reportReaders/v6';
import { readOverall } from '@/lib/reportReaders/v7';

/** Firestore collection holding one evaluation per scan (doc id === scanId). */
export const EVALUATIONS_COLLECTION = 'evaluations';

/** Callable Cloud Function implementing the backend contract. */
export const SUBMIT_EVALUATION_FN = 'submitEvaluation';

/** How many recent scans to pull for the technician. Mirrors dashboard. */
export const SCANS_LIMIT = 50;

/** localStorage key holding the technician's name (asked once, then reused). */
export const TECH_NAME_KEY = 'nc_tech_name';

// ---------------------------------------------------------------------------
// Anchoring-bias control
// ---------------------------------------------------------------------------
// The brief asks for the app's grade in the list AND says the app's grade must
// never be shown before the technician commits his own. Those two pull against
// each other: a grade visible on the list card has already anchored him by the
// time he opens the evaluation screen.
//
// We resolve it in favour of the stated PURPOSE (bias reduction): the app grade
// is masked on cards that are not evaluated yet, and shown freely once an
// evaluation exists (the judgement is already recorded — nothing left to bias).
//
// Flip this to `true` to show the app grade on every card instead.
export const REVEAL_APP_GRADE_BEFORE_EVALUATION = false;

// ---------------------------------------------------------------------------
// Contract vocabularies — values MUST match the backend exactly
// ---------------------------------------------------------------------------

/** technicianGrade: A | B | C | D */
export const GRADES = ['A', 'B', 'C', 'D'];

/**
 * agreement: agree | app_lenient | app_harsh
 *
 * All three render identically until selected — no default, no visual
 * shortcut toward "agree". Only the selected state carries an accent colour.
 */
export const AGREEMENT_OPTIONS = [
  {
    value: 'agree',
    label: 'أتفق',
    hint: 'تقييم التطبيق مطابق لحكمي',
  },
  {
    value: 'app_lenient',
    label: 'التطبيق متسامح',
    hint: 'أعطى الجهاز أعلى من الواقع',
  },
  {
    value: 'app_harsh',
    label: 'التطبيق قاسٍ',
    hint: 'أعطى الجهاز أقل من الواقع',
  },
];

/** errorMagnitude: minor | moderate | severe (optional) */
export const ERROR_MAGNITUDES = [
  { value: 'minor', label: 'طفيف' },
  { value: 'moderate', label: 'متوسط' },
  { value: 'severe', label: 'فادح' },
];

/**
 * disputedCategories: the ten backend-accepted keys, with Arabic labels.
 *
 * (2026-10-01) Labels are read from lib/i18n.js's translations.ar.verify —
 * the single exported source for every category name (rule 24: "لا نسخة في
 * كل ملفّ"), the same one app/, components/verify/CategoriesGrid.js, and
 * components/verify/V7CategoriesGrid.js all read. This used to be a second,
 * independently hardcoded copy of (a subset of) those names; it had already
 * drifted — three of the ten (gpu/sensors/gps) still held OLD names
 * (كرت الشاشة / الحساسات / GPS) after lib/i18n.js's list moved on. The
 * mapping below is explicit (value → i18n key), not a string-transform
 * guess, so a renamed or removed i18n key fails loudly (undefined label)
 * rather than silently matching the wrong key.
 *
 * Arabic only, deliberately: /tech has never had a `lang` prop (this file's
 * top comment), the same reason components/tech/EvaluationForm.js's own
 * TECH_T already reads translations.ar directly for V7Notices — this
 * follows that existing precedent rather than inventing a new one.
 *
 * value keys and order unchanged from before this change. camera/wireless/
 * display/audio/input are not in this list at all (only 10 of the 15
 * categories are backend-disputable), so they are not affected.
 */
const DISPUTED_CATEGORY_I18N_KEYS = [
  ['battery', 'catBattery'],
  ['thermal', 'catThermal'],
  ['cpu', 'catCpu'],
  ['gpu', 'catGpu'],
  ['memory', 'catMemory'],
  ['storage', 'catStorage'],
  ['security', 'catSecurity'],
  ['sensors', 'catSensors'],
  ['gps', 'catGps'],
  ['cellular', 'catCellular'],
];

export const DISPUTED_CATEGORIES = DISPUTED_CATEGORY_I18N_KEYS.map(([value, i18nKey]) => ({
  value,
  label: translations.ar.verify[i18nKey],
}));

const VALID_CATEGORY_VALUES = new Set(DISPUTED_CATEGORIES.map((c) => c.value));

// ---------------------------------------------------------------------------
// Technician name — stored once, attached to every later evaluation
// ---------------------------------------------------------------------------

export function readTechnicianName() {
  if (typeof window === 'undefined') return '';
  try {
    return (window.localStorage.getItem(TECH_NAME_KEY) || '').trim();
  } catch {
    // Private mode / blocked storage — the panel still works, the name is
    // just asked again next session.
    return '';
  }
}

export function writeTechnicianName(name) {
  if (typeof window === 'undefined') return;
  const clean = (name || '').trim();
  try {
    if (clean) {
      window.localStorage.setItem(TECH_NAME_KEY, clean);
    } else {
      window.localStorage.removeItem(TECH_NAME_KEY);
    }
  } catch {
    // ignore — non-fatal
  }
}

// ---------------------------------------------------------------------------
// Report field readers
// ---------------------------------------------------------------------------

/**
 * A report's scan id. Firestore doc id and the `scanId` field are the same
 * value in practice, but existing pages read `scanId` first — we match that
 * so the evaluations doc id (which IS the scanId) lines up.
 */
export function resolveScanId(report) {
  return report?.scanId || report?.id || null;
}

/**
 * Device name. Reads both `device_marketing_name` (the schema's snake_case
 * name) and `deviceMarketingName` (what the rest of the site reads) so the
 * technician sees the marketing name rather than a model code either way.
 */
export function resolveDeviceName(report) {
  return (
    report?.device_marketing_name ||
    report?.deviceMarketingName ||
    report?.deviceModel ||
    report?.device ||
    report?.model ||
    [report?.brand, report?.modelName].filter(Boolean).join(' ') ||
    '—'
  );
}

/**
 * Single uppercase grade letter, or `null` when the report carries none.
 *
 * W4 (task order, 2026-10-01): this used to return the literal string '?'
 * for "no grade" — components/GradeBadge.js's own doc comment already
 * documented, and scripts/test/honorNoLetter.test.cjs already tested, that
 * EVERY OTHER page (verify, print, admin, admin/reports, dashboard, shop)
 * treats a missing letter as an explicit "no value" placeholder ('—'), never
 * '?' ("reads as unknown/confused" — GradeBadge.js:15-24's own words), and
 * that file's header comment carved out /tech as the one deliberate
 * exception, "out of [that] task's scope". This task closes that gap:
 * resolveAppGrade now returns `null` on absence, matching GradeBadge's own
 * `(grade || '—')` fallback (ScanCard.js renders through GradeBadge, so it
 * needs no further change) and EvaluationForm.js's direct render now falls
 * back to '—' explicitly (see that file's own comment). Still an explicit,
 * never-invented absence per rule 22 — `null` carries the same "no grade"
 * meaning '?' did, just rendered the way the rest of the site already does.
 *
 * `report` here is a `reports` collection document (the raw device report),
 * same shape /verify and /print read — NOT an `evaluations` document. This
 * mixes V6 and V7 reports (a shop's scan history spans both pipelines), so
 * the pipeline is classified first via lib/pipelineTags.js, then read
 * through the matching reader — the same pattern already used for
 * app/shop/[slug]/ShopClient.js, app/admin/page.js, and
 * app/admin/reports/page.js's resolveGrade(). No fallback chain that tries
 * both shapes at once (see lib/reportReaders/{v6,v7}.js's file-level
 * comments for why): V6's `pickGrade` reads `report.grade` /
 * `report.aiResponse.overallGrade`; V7's `readOverall(report).letter` reads
 * `overall.letter` — the two never overlap on one document.
 *
 * An UNKNOWN_TAG pipeline (a `pipeline` value this repo does not recognize)
 * falls through to the V6 reader as the same best-effort default the other
 * three call sites use, and is not treated as V7.
 *
 * Deliberately narrow, matching this task's scope: this resolves the letter
 * grade ONLY. It does not resolve, invent, or compare a numeric score or
 * per-category scores for the app's side — `evaluationContract.js` on the
 * backend sets `appScore`/`appCategoryScores` to `null` on V7 (decision
 * carried in this task's order, not read live from that repo), and this
 * repo has no read site for either field today (grep confirmed before this
 * change). If one is added later, it must render an explicit "not
 * available" for V7, never `0` or a derived number. Category-letter
 * comparison (technician-disputed category vs. the app's per-category
 * letter) is out of scope here too — a separate item, not built.
 */
export function resolveAppGrade(report) {
  const pipeline = classifyPipeline(report);
  if (pipeline.kind === PipelineKind.UNKNOWN_TAG) {
    // eslint-disable-next-line no-console
    console.warn('[tech] unrecognized pipeline tag — using the V6 reader as a best effort', pipeline.tag);
  }
  const raw = pipeline.kind === PipelineKind.V7 ? readOverall(report).letter : pickGrade(report);
  const letter = String(raw || '').trim().toUpperCase().charAt(0);
  return GRADES.includes(letter) ? letter : null;
}

/**
 * decision 82 §2 (2026-09-24): /tech shows the state and its reason with the
 * same component /verify uses (components/verify/V7Notices.js), not just
 * resolveAppGrade's bare '?'. Returns readOverall(report) for a V7 pipeline,
 * null for V6/unknown (V7Notices already no-ops on null — see its own
 * top-level guard). Separate from resolveAppGrade on purpose: that function's
 * job is narrowly the single-letter-or-'?' contract (already tested,
 * scripts/test/resolveAppGrade.test.cjs), this one hands back the full
 * overall object a caller needs for V7Notices.
 */
export function resolveV7Overall(report) {
  const pipeline = classifyPipeline(report);
  return pipeline.kind === PipelineKind.V7 ? readOverall(report) : null;
}

/** Whatever timestamp shape the report carries; formatted by the caller. */
export function resolveScanDate(report) {
  return (
    report?.createdAt ||
    report?.scannedAt ||
    report?.timestamp ||
    report?.date ||
    null
  );
}

/** Short display code, matching the convention used on /verify. */
export function resolveShortId(report) {
  if (report?.shortId) return String(report.shortId).toUpperCase();
  const raw = resolveScanId(report);
  return raw ? String(raw).slice(0, 8).toUpperCase() : '—';
}

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

/**
 * Build the submitEvaluation payload.
 *
 * Required: scanId, technicianGrade, agreement.
 * Optional keys are OMITTED when empty rather than sent as null — a validator
 * that type-checks `minor|moderate|severe` would reject null.
 *
 * `disputedCategories` is the exception: it is always sent as an array so that
 * clearing it on a re-evaluation transmits as `[]` rather than leaving a stale
 * value behind a merge. When the technician agrees, there is nothing in
 * dispute, so both dispute fields are dropped.
 */
export function buildEvaluationPayload({
  scanId,
  technicianGrade,
  agreement,
  errorMagnitude,
  disputedCategories,
  technicianName,
  durationMs,
}) {
  const payload = { scanId, technicianGrade, agreement };

  const agreed = agreement === 'agree';

  if (!agreed && errorMagnitude) {
    payload.errorMagnitude = errorMagnitude;
  }

  payload.disputedCategories = agreed
    ? []
    : (disputedCategories || []).filter((c) => VALID_CATEGORY_VALUES.has(c));

  const name = (technicianName || '').trim();
  if (name) payload.technicianName = name;

  if (typeof durationMs === 'number' && durationMs >= 0) {
    payload.durationMs = Math.round(durationMs);
  }

  return payload;
}

/**
 * Fields submitEvaluation rewrites from the request on every call. The server
 * writes with `tx.set(ref, doc)` and no merge, so each of these is replaced
 * wholesale — an omitted optional lands as null/[] rather than keeping its
 * previous value.
 */
const CONTRACT_FIELDS = [
  'technicianGrade',
  'agreement',
  'errorMagnitude',
  'disputedCategories',
  'technicianName',
  'durationMs',
];

/**
 * Fields the server recomputes on every write and that we cannot derive on the
 * client (gradeDistance needs the report's grade; revisionCount needs the
 * previous document). Carrying the old values forward would be a lie, so they
 * are dropped — a reader gets `undefined` ("unknown") instead of a stale
 * number. The next list refresh fills them in from Firestore.
 */
const SERVER_RECOMPUTED_FIELDS = [
  'gradeDistance',
  'consistencyFlag',
  'revisionCount',
  'updatedAt',
];

/**
 * Apply a just-submitted payload to the locally cached evaluation, mirroring
 * the server's replace-don't-merge semantics.
 *
 * Spreading the payload over the previous entry is NOT equivalent: an omitted
 * optional key leaves the old value in place locally while the server has
 * already cleared it to null. That divergence is the bug this exists to avoid.
 *
 * Everything the payload does not own — the report snapshot (appGrade,
 * deviceModel, …), ownership, createdAt — is preserved from `prev` untouched,
 * because the UI reads those and they never travel in the payload.
 */
export function applyEvaluationPayloadLocally(prev, payload) {
  const next = { ...(prev || {}) };

  next.id = payload.scanId;
  next.scanId = payload.scanId;

  // Full replacement of every contract field, using the same defaults the
  // server applies when a key is absent (submitEvaluation.js:91/106/132/148).
  for (const key of CONTRACT_FIELDS) {
    if (key === 'disputedCategories') {
      next[key] = payload[key] ?? [];
    } else {
      next[key] = payload[key] ?? null;
    }
  }

  for (const key of SERVER_RECOMPUTED_FIELDS) {
    delete next[key];
  }

  return next;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

const ARABIC_RE = /[؀-ۿ]/;

const GENERIC_INVALID_ARGUMENT =
  'بيانات التقييم غير مقبولة من الخادم. أبلغ الدعم بهذه الرسالة.';

/**
 * `invalid-argument` is the one code whose server message is worth more than
 * anything we could write here. submitEvaluation throws it from ten distinct
 * checks, and each message names the offending field and the accepted values
 * in Arabic — deliberately, so the technician can fix it on the spot instead
 * of guessing. Flattening all ten into "contact support" destroys that.
 *
 * We only pass it through when it is actually usable: non-empty and carrying
 * Arabic. An English framework-level message (or an empty one) falls back to
 * the generic text rather than showing the technician something he can't read.
 */
function passThroughServerMessage(err) {
  const raw = typeof err?.message === 'string' ? err.message.trim() : '';
  if (!raw) return GENERIC_INVALID_ARGUMENT;
  if (!ARABIC_RE.test(raw)) return GENERIC_INVALID_ARGUMENT;
  return raw;
}

/**
 * Turn a Firebase callable error into something a technician can act on.
 * Codes follow the functions.https.HttpsError convention.
 *
 * submitEvaluation itself throws exactly four codes — unauthenticated,
 * invalid-argument, not-found, permission-denied. The rest below are raised by
 * the Firebase layer around it (network, timeout, quota) or by an unhandled
 * server exception (`internal`).
 */
export function describeSubmitError(err) {
  const code = (err?.code || '').replace(/^functions\//, '');

  switch (code) {
    case 'permission-denied':
      return 'هذا الفحص ليس ضمن حساب هذا المتجر — لا يمكن حفظ تقييمه.';
    case 'not-found':
      return 'لم يعد هذا الفحص موجوداً. حدّث القائمة وحاول مجدداً.';
    case 'unauthenticated':
      return 'انتهت الجلسة. سجّل الدخول مجدداً ثم أعد المحاولة.';
    case 'invalid-argument':
      return passThroughServerMessage(err);
    case 'internal':
      // Unhandled server-side exception — most likely the Firestore
      // transaction failing. Nothing was written, so say so plainly: the
      // technician must know his two taps did not land.
      return 'تعطّل الخادم أثناء الحفظ — لم يُحفَظ تقييمك. أعد الضغط على حفظ، وإن تكرر أبلغ الدعم.';
    case 'resource-exhausted':
      return 'الخادم مشغول حالياً. انتظر لحظة ثم أعد الحفظ.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'تعذّر الوصول إلى الخادم — تحقّق من الاتصال ثم أعد الحفظ.';
    default:
      break;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'لا يوجد اتصال بالإنترنت. تقييمك محفوظ في الشاشة — أعد الحفظ بعد عودة الشبكة.';
  }

  return 'تعذّر حفظ التقييم. أعد المحاولة، وإن تكرر الخطأ أبلغ الدعم.';
}
