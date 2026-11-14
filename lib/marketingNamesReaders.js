// Readers for what `getMarketingNames` and `setMarketingNames` return (W-P6-20),
// and the Set of the refusal codes the page's contract names.
//
// Shapes: neuralcheck-backend@5361116 docs/PROTOCOL_CONTRACT.md §٢ A12 (2), (3),
// as copied in evidence/run-2026-10-18/protocol-contract-A8-A11-A12-
// neuralcheck-backend-5361116.md lines 91-92:
//   getMarketingNames() → { state: PRESENT|ABSENT|UNREADABLE, anomaly: null|<one
//     of five>, version: integer|null, entries: [{model, ar, tr, en}],
//     updatedAtMs: ms|null, updatedBy: text|null,
//     limits: {maxEntries, modelMaxLength, nameMaxLength} }
//   setMarketingNames({entries}) → { changed, version, added, updated }
// — and the map STARTS ABSENT: «قبل أيّ كتابة: {state: "ABSENT", anomaly: null,
// version: null, entries: [], …}». The names are in lib/marketingNamesWire.js.
//
// What these readers promise (rules 22, 25, 30), the same promises as the
// readers of W-P6-14:
//
//   - an ABSENCE is a named state that reaches the screen, never a default: the
//     map that is not written yet is `view: 'ABSENT'` with NO entry (the server
//     says «لا مدخل افتراضي»), a stored document the server cannot read is
//     `view: 'STORED_UNREADABLE'` with the anomaly it names, and a reply this
//     reader cannot read is `view: 'REPLY_UNREADABLE'` with the keys it failed
//     on. Three different situations, three different views.
//
//   - every key the reader ASKED for and did not find is listed in `problems`
//     (rule 25). The keys that decide the view (`state`, `anomaly`, `version`,
//     `entries` and what is inside each entry) make the reply REPLY_UNREADABLE
//     when they are missing or contradict each other; `updatedAtMs`,
//     `updatedBy` and `limits` are reported in `problems` and shown as absent
//     without changing the view. A key a limit object carries that the reader
//     does not know is returned in `limits.unknownKeys`.
//
//   - the refusals are read from `details.reasonCode` and nowhere else (rule
//     21): see classifyCallError in lib/protocolAdminReaders.js, called with
//     KNOWN_MARKETING_REFUSALS.
//
// No entry of the map is written in this repo: the entries come from the reply
// and are typed by the admin (A12 «معلّق» 1).

import {
  MARKETING_STATE,
  MARKETING_ANOMALIES,
  MARKETING_ENTRY_KEYS,
  MARKETING_LIMIT_KEYS,
  KNOWN_MARKETING_REFUSAL_CODES,
} from '@/lib/marketingNamesWire';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isPositiveInt = (v) => Number.isInteger(v) && v >= 1;
const isNonNegativeInt = (v) => Number.isInteger(v) && v >= 0;
const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;

/** The refusal codes the page's contract names — for `classifyCallError(err, …)`. */
export const KNOWN_MARKETING_REFUSALS = new Set(KNOWN_MARKETING_REFUSAL_CODES);

/** What the page can show of the map. */
export const MARKETING_VIEW = Object.freeze({
  /** state PRESENT, no anomaly, a usable version, the entries. */
  PRESENT: 'PRESENT',
  /** state ABSENT: nothing written yet. No entry. */
  ABSENT: 'ABSENT',
  /** state UNREADABLE: the server holds a document it cannot read (`anomaly` says why). */
  STORED_UNREADABLE: 'STORED_UNREADABLE',
  /** the reply itself could not be read as the contract's shape. */
  REPLY_UNREADABLE: 'REPLY_UNREADABLE',
});

/** What a single limit is. */
export const LIMIT_STATE = Object.freeze({
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  /** the key is there with a value that is not a positive integer. */
  MALFORMED: 'MALFORMED',
});

function replyUnreadable(problems) {
  return {
    view: MARKETING_VIEW.REPLY_UNREADABLE,
    state: null,
    anomaly: null,
    version: null,
    entries: [],
    updatedAtMs: null,
    updatedBy: null,
    limits: readLimits(undefined, []),
    problems,
  };
}

/** `limits`: each of the three keys in its own state; nothing is assumed when one is missing. */
function readLimits(raw, problems) {
  const out = { state: LIMIT_STATE.ABSENT, unknownKeys: [] };
  for (const k of MARKETING_LIMIT_KEYS) out[k] = { state: LIMIT_STATE.ABSENT };
  if (raw === undefined) {
    problems.push('limits:MISSING');
    return out;
  }
  if (!isObj(raw)) {
    out.state = LIMIT_STATE.MALFORMED;
    out.raw = raw;
    problems.push('limits:NOT_AN_OBJECT');
    return out;
  }
  out.state = LIMIT_STATE.PRESENT;
  for (const k of MARKETING_LIMIT_KEYS) {
    if (!hasOwn(raw, k) || raw[k] === undefined) {
      problems.push(`limits.${k}:MISSING`);
    } else if (isPositiveInt(raw[k])) {
      out[k] = { state: LIMIT_STATE.PRESENT, value: raw[k] };
    } else {
      out[k] = { state: LIMIT_STATE.MALFORMED, raw: raw[k] };
      problems.push(`limits.${k}:NOT_A_POSITIVE_INTEGER`);
    }
  }
  out.unknownKeys = Object.keys(raw).filter((k) => !MARKETING_LIMIT_KEYS.includes(k));
  return out;
}

/** One entry: exactly the four keys, each a non-empty text. Returns null and fills `critical` when not. */
function readEntry(e, index, critical) {
  const at = `entries[${index}]`;
  if (!isObj(e)) {
    critical.push(`${at}:NOT_AN_OBJECT`);
    return null;
  }
  let ok = true;
  for (const k of MARKETING_ENTRY_KEYS) {
    if (!hasOwn(e, k) || e[k] === undefined) {
      critical.push(`${at}.${k}:MISSING`);
      ok = false;
    } else if (!isNonEmptyString(e[k])) {
      critical.push(`${at}.${k}:NOT_A_NON_EMPTY_STRING`);
      ok = false;
    }
  }
  for (const k of Object.keys(e)) {
    if (!MARKETING_ENTRY_KEYS.includes(k)) {
      critical.push(`${at}:UNKNOWN_KEY(${k})`);
      ok = false;
    }
  }
  return ok ? { model: e.model, ar: e.ar, tr: e.tr, en: e.en } : null;
}

/**
 * The reply of getMarketingNames().
 *
 * `view` is the answer to «what do I show»: PRESENT, ABSENT, STORED_UNREADABLE or
 * REPLY_UNREADABLE (see MARKETING_VIEW). `entries` are the entries as the server
 * sent them, in its order, and are `[]` unless the view is PRESENT.
 */
export function readMarketingNames(data) {
  if (!isObj(data)) return replyUnreadable(['response:NOT_AN_OBJECT']);

  const problems = [];
  const critical = [];

  // state
  let state = null;
  if (!hasOwn(data, 'state') || data.state === undefined) critical.push('state:MISSING');
  else if (Object.values(MARKETING_STATE).includes(data.state)) state = data.state;
  else critical.push(`state:UNKNOWN_VALUE(${JSON.stringify(data.state)})`);

  // anomaly
  let anomaly = null;
  if (!hasOwn(data, 'anomaly') || data.anomaly === undefined) critical.push('anomaly:MISSING');
  else if (data.anomaly === null) anomaly = null;
  else if (MARKETING_ANOMALIES.includes(data.anomaly)) anomaly = data.anomaly;
  else critical.push(`anomaly:UNKNOWN_VALUE(${JSON.stringify(data.anomaly)})`);

  // version — an integer ≥ 1 or null
  let version = null;
  if (!hasOwn(data, 'version') || data.version === undefined) critical.push('version:MISSING');
  else if (data.version === null) version = null;
  else if (isPositiveInt(data.version)) version = data.version;
  else critical.push('version:NOT_A_POSITIVE_INTEGER_OR_NULL');

  // entries — a list; each entry read; the list must be empty unless PRESENT
  let entries = [];
  if (!hasOwn(data, 'entries') || data.entries === undefined) critical.push('entries:MISSING');
  else if (!Array.isArray(data.entries)) critical.push('entries:NOT_AN_ARRAY');
  else {
    const read = data.entries.map((e, i) => readEntry(e, i, critical));
    if (read.every((e) => e !== null)) {
      entries = read;
      // the server declares a duplicate model as an anomaly (state UNREADABLE),
      // so a PRESENT reply with one contradicts itself
      const seen = new Set();
      entries.forEach((e, i) => {
        if (seen.has(e.model)) critical.push(`entries[${i}].model:DUPLICATE`);
        seen.add(e.model);
      });
    }
  }

  // the three that do not decide the view
  let updatedAtMs = null;
  if (!hasOwn(data, 'updatedAtMs') || data.updatedAtMs === undefined) problems.push('updatedAtMs:MISSING');
  else if (data.updatedAtMs === null) updatedAtMs = null;
  else if (isFiniteNumber(data.updatedAtMs)) updatedAtMs = data.updatedAtMs;
  else problems.push('updatedAtMs:NOT_A_NUMBER');

  let updatedBy = null;
  if (!hasOwn(data, 'updatedBy') || data.updatedBy === undefined) problems.push('updatedBy:MISSING');
  else if (data.updatedBy === null) updatedBy = null;
  else if (typeof data.updatedBy === 'string') updatedBy = data.updatedBy;
  else problems.push('updatedBy:NOT_A_STRING');

  const limits = readLimits(hasOwn(data, 'limits') ? data.limits : undefined, problems);

  // the combination of state / anomaly / version / entries
  if (critical.length === 0) {
    if (state === MARKETING_STATE.PRESENT) {
      if (anomaly !== null) critical.push('state:PRESENT_WITH_ANOMALY');
      if (version === null) critical.push('version:NULL_WHILE_PRESENT');
    } else if (state === MARKETING_STATE.ABSENT) {
      if (anomaly !== null) critical.push('state:ABSENT_WITH_ANOMALY');
      if (version !== null) critical.push('version:SET_WHILE_ABSENT');
      if (entries.length > 0) critical.push('entries:NOT_EMPTY_WHILE_ABSENT');
    } else {
      // UNREADABLE: the server could not read the entries; it sends none
      if (entries.length > 0) critical.push('entries:NOT_EMPTY_WHILE_UNREADABLE');
      if (anomaly === null) problems.push('anomaly:NULL_WHILE_UNREADABLE');
    }
  }

  if (critical.length > 0) return replyUnreadable([...critical, ...problems]);

  let view;
  if (state === MARKETING_STATE.PRESENT) view = MARKETING_VIEW.PRESENT;
  else if (state === MARKETING_STATE.ABSENT) view = MARKETING_VIEW.ABSENT;
  else view = MARKETING_VIEW.STORED_UNREADABLE;

  return { view, state, anomaly, version, entries, updatedAtMs, updatedBy, limits, problems };
}

/**
 * The reply of setMarketingNames: { changed, version, added, updated } (A12 (2)).
 * `ok: false` + `problems` when it cannot be read; `problems` of an `ok` reply
 * are declared disagreements (a change with nothing added or updated, and the
 * other way round) that do not stop it being shown.
 */
export function readSetMarketingNamesResult(data) {
  const critical = [];
  if (!isObj(data)) return { ok: false, problems: ['response:NOT_AN_OBJECT'] };
  if (typeof data.changed !== 'boolean') critical.push('changed:NOT_A_BOOLEAN');
  if (!isPositiveInt(data.version)) critical.push('version:NOT_A_POSITIVE_INTEGER');
  if (!isNonNegativeInt(data.added)) critical.push('added:NOT_A_NON_NEGATIVE_INTEGER');
  if (!isNonNegativeInt(data.updated)) critical.push('updated:NOT_A_NON_NEGATIVE_INTEGER');
  if (critical.length > 0) return { ok: false, problems: critical };

  const problems = [];
  if (data.changed === false && (data.added > 0 || data.updated > 0)) problems.push('counts:SET_WHILE_UNCHANGED');
  if (data.changed === true && data.added === 0 && data.updated === 0) problems.push('counts:ZERO_WHILE_CHANGED');
  return { ok: true, changed: data.changed, version: data.version, added: data.added, updated: data.updated, problems };
}
