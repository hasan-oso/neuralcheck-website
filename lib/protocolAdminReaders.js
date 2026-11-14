// Readers for what the five protocol admin callables return — one reader per
// response shape, and one for a failed call.
//
// Shapes: neuralcheck-backend@fd730ac docs/PROTOCOL_CONTRACT.md §٢ A10, as
// copied in evidence/run-2026-10-18/protocol-contract-A0-A10-neuralcheck-
// backend-fd730ac.md lines 286-293, and the backend engineer's report lines
// 54-60. The names are in lib/protocolAdminWire.js.
//
// What these readers promise (rules 22, 25, 30):
//
//   - an ABSENCE is a named state that reaches the screen, never a default. A
//     settings document that is not there is `view: 'ABSENT'`, not zeros; a
//     field that is not in it is `state: 'ABSENT'`, not 0 or ''; a part the
//     server did not send is `MISSING`, not «off»; a technician flag the server
//     could not read stays `ACTIVE_FLAG_UNREADABLE`, not active and not
//     inactive. No reader here substitutes a value for a missing one.
//
//   - every key a reader ASKED for and did not find is listed in `problems`
//     (rule 25). Nothing is dropped silently: a key the reader does not know
//     is returned in `unknown…` lists; an enum value it does not know is
//     returned as UNKNOWN with the raw value, and the screen shows it.
//
//   - the reasons a call was refused are read from `details.reasonCode` and
//     nowhere else (rule 21): the exception's class, its `code` and its text
//     are never what decides.
//
// The two fields the design leaves without a meaning (`symptomChips`,
// `targets`; P6:783-784) are NOT read: not as a field, not as «unknown». The
// order says not to show them.

import {
  SETTINGS_STATE,
  SETTINGS_ANOMALY,
  SETTINGS_FIELDS,
  SETTINGS_FIELD_TYPE,
  SETTINGS_FIELDS_NOT_SPECIFIED,
  RETURN_REASON_KEYS,
  PARTS_STATE,
  PROTOCOL_PARTS,
  TECH_ACTIVE_STATE,
  KNOWN_REFUSAL_CODES,
} from '@/lib/protocolAdminWire';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isPositiveInt = (v) => Number.isInteger(v) && v >= 1;
const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;

// ---------------------------------------------------------------------------
// getProtocolSettings
// ---------------------------------------------------------------------------

/** What the page can show of the settings document. */
export const SETTINGS_VIEW = Object.freeze({
  /** state PRESENT, no anomaly, a usable version, a settings object. */
  PRESENT: 'PRESENT',
  /** state SETTINGS_ABSENT (with or without the VERSION_UNUSABLE anomaly). */
  ABSENT: 'ABSENT',
  /** anything else: the reply could not be read as settings. */
  UNREADABLE: 'UNREADABLE',
});

/** What a single field of the settings document is. */
export const FIELD_STATE = Object.freeze({
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  /** the key is there with a value of the wrong type (null included). */
  MALFORMED: 'MALFORMED',
});

function readReturnReasons(raw) {
  if (!Array.isArray(raw)) return { state: FIELD_STATE.MALFORMED, raw };
  const entries = [];
  for (const e of raw) {
    if (!isObj(e)) return { state: FIELD_STATE.MALFORMED, raw };
    const keys = Object.keys(e);
    if (
      keys.length !== RETURN_REASON_KEYS.length ||
      !RETURN_REASON_KEYS.every((k) => keys.includes(k))
    ) {
      return { state: FIELD_STATE.MALFORMED, raw };
    }
    if (
      typeof e.key !== 'string' ||
      typeof e.ar !== 'string' ||
      typeof e.tr !== 'string' ||
      typeof e.active !== 'boolean'
    ) {
      return { state: FIELD_STATE.MALFORMED, raw };
    }
    entries.push({ key: e.key, ar: e.ar, tr: e.tr, active: e.active });
  }
  return { state: FIELD_STATE.PRESENT, value: entries };
}

function readSettingsField(settings, name) {
  if (!hasOwn(settings, name) || settings[name] === undefined) {
    return { state: FIELD_STATE.ABSENT };
  }
  const raw = settings[name];
  const type = SETTINGS_FIELD_TYPE[name];
  if (type === 'number') {
    return isFiniteNumber(raw)
      ? { state: FIELD_STATE.PRESENT, value: raw }
      : { state: FIELD_STATE.MALFORMED, raw };
  }
  if (type === 'boolean') {
    return typeof raw === 'boolean'
      ? { state: FIELD_STATE.PRESENT, value: raw }
      : { state: FIELD_STATE.MALFORMED, raw };
  }
  if (type === 'string') {
    return typeof raw === 'string'
      ? { state: FIELD_STATE.PRESENT, value: raw }
      : { state: FIELD_STATE.MALFORMED, raw };
  }
  return readReturnReasons(raw);
}

function unreadableSettings(problems) {
  return {
    view: SETTINGS_VIEW.UNREADABLE,
    anomaly: null,
    version: null,
    fields: Object.fromEntries(
      SETTINGS_FIELDS.map((n) => [n, { state: FIELD_STATE.ABSENT }])
    ),
    unknownSettingsKeys: [],
    updatedAtMs: null,
    updatedBy: null,
    limits: { state: FIELD_STATE.ABSENT },
    problems,
  };
}

/**
 * The reply of getProtocolSettings().
 *
 * `view` is the answer to «what do I show»: PRESENT, ABSENT, or UNREADABLE.
 * The eight keys the contract lists are each asked for; the four that decide
 * the view (`state`, `anomaly`, `version`, `settings`) make the reply
 * UNREADABLE when they are missing or inconsistent, the other three
 * (`updatedAtMs`, `updatedBy`, `limits`) are reported in `problems` and shown
 * as absent without changing the view.
 */
export function readProtocolSettings(data) {
  if (!isObj(data)) return unreadableSettings(['response:NOT_AN_OBJECT']);

  const problems = [];
  const critical = [];

  // state
  let stateKnown = null;
  if (!hasOwn(data, 'state') || data.state === undefined) {
    critical.push('state:MISSING');
  } else if (data.state === SETTINGS_STATE.PRESENT || data.state === SETTINGS_STATE.ABSENT) {
    stateKnown = data.state;
  } else {
    critical.push(`state:UNKNOWN_VALUE(${JSON.stringify(data.state)})`);
  }

  // anomaly
  let anomaly = null;
  if (!hasOwn(data, 'anomaly') || data.anomaly === undefined) {
    critical.push('anomaly:MISSING');
  } else if (data.anomaly === null) {
    anomaly = null;
  } else if (data.anomaly === SETTINGS_ANOMALY.VERSION_UNUSABLE) {
    anomaly = SETTINGS_ANOMALY.VERSION_UNUSABLE;
  } else {
    critical.push(`anomaly:UNKNOWN_VALUE(${JSON.stringify(data.anomaly)})`);
  }

  // version. With the VERSION_UNUSABLE anomaly the stored version is by
  // definition not a usable one, so its value is not judged: the anomaly IS the
  // report on it (A10 (3): «مستند موجود بلا version صالح: يُقرأ غائباً»).
  let version = null;
  if (anomaly === SETTINGS_ANOMALY.VERSION_UNUSABLE) {
    version = null;
  } else if (!hasOwn(data, 'version') || data.version === undefined) {
    critical.push('version:MISSING');
  } else if (data.version === null) {
    version = null;
  } else if (isPositiveInt(data.version)) {
    version = data.version;
  } else {
    critical.push('version:NOT_A_POSITIVE_INTEGER_OR_NULL');
  }

  // settings
  let settings = null;
  if (!hasOwn(data, 'settings') || data.settings === undefined || data.settings === null) {
    if (stateKnown === SETTINGS_STATE.PRESENT) critical.push('settings:MISSING');
    else problems.push('settings:MISSING');
  } else if (!isObj(data.settings)) {
    critical.push('settings:NOT_AN_OBJECT');
  } else {
    settings = data.settings;
  }

  // the three that do not decide the view
  let updatedAtMs = null;
  if (!hasOwn(data, 'updatedAtMs') || data.updatedAtMs === undefined) {
    problems.push('updatedAtMs:MISSING');
  } else if (data.updatedAtMs === null) {
    updatedAtMs = null;
  } else if (isFiniteNumber(data.updatedAtMs)) {
    updatedAtMs = data.updatedAtMs;
  } else {
    problems.push('updatedAtMs:NOT_A_NUMBER');
  }

  let updatedBy = null;
  if (!hasOwn(data, 'updatedBy') || data.updatedBy === undefined) {
    problems.push('updatedBy:MISSING');
  } else if (data.updatedBy === null) {
    updatedBy = null;
  } else if (typeof data.updatedBy === 'string') {
    updatedBy = data.updatedBy;
  } else {
    problems.push('updatedBy:NOT_A_STRING');
  }

  // `limits`: the contract names the key and says «الحدود أعلاه» but gives no
  // shape for it (A10 (3)), so it is passed through untouched and shown
  // verbatim; nothing is read from inside it.
  let limits = { state: FIELD_STATE.ABSENT };
  if (!hasOwn(data, 'limits') || data.limits === undefined) {
    problems.push('limits:MISSING');
  } else if (isObj(data.limits)) {
    limits = { state: FIELD_STATE.PRESENT, value: data.limits };
  } else {
    limits = { state: FIELD_STATE.MALFORMED, raw: data.limits };
    problems.push('limits:NOT_AN_OBJECT');
  }

  // the combination of state / anomaly / version
  if (critical.length === 0) {
    if (stateKnown === SETTINGS_STATE.PRESENT) {
      if (anomaly !== null) critical.push('state:PRESENT_WITH_ANOMALY');
      if (version === null) critical.push('version:NULL_WHILE_PRESENT');
    } else if (version !== null) {
      critical.push('version:SET_WHILE_ABSENT');
    }
  }

  const fields = Object.fromEntries(
    SETTINGS_FIELDS.map((n) => [n, settings ? readSettingsField(settings, n) : { state: FIELD_STATE.ABSENT }])
  );
  const unknownSettingsKeys = settings
    ? Object.keys(settings).filter(
        (k) => !SETTINGS_FIELDS.includes(k) && !SETTINGS_FIELDS_NOT_SPECIFIED.includes(k)
      )
    : [];

  const all = [...critical, ...problems];
  let view;
  if (critical.length > 0) view = SETTINGS_VIEW.UNREADABLE;
  else if (stateKnown === SETTINGS_STATE.PRESENT) view = SETTINGS_VIEW.PRESENT;
  else view = SETTINGS_VIEW.ABSENT;

  return {
    view,
    anomaly,
    version,
    fields,
    unknownSettingsKeys,
    updatedAtMs,
    updatedBy,
    limits,
    problems: all,
  };
}

// ---------------------------------------------------------------------------
// setProtocolSettings
// ---------------------------------------------------------------------------

/** The reply of setProtocolSettings: { changed, version, fields }. */
export function readSetSettingsResult(data) {
  const problems = [];
  if (!isObj(data)) return { ok: false, problems: ['response:NOT_AN_OBJECT'] };
  if (typeof data.changed !== 'boolean') problems.push('changed:NOT_A_BOOLEAN');
  if (!isPositiveInt(data.version)) problems.push('version:NOT_A_POSITIVE_INTEGER');
  if (!Array.isArray(data.fields) || !data.fields.every((f) => typeof f === 'string')) {
    problems.push('fields:NOT_A_LIST_OF_STRINGS');
  }
  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, changed: data.changed, version: data.version, fields: data.fields.slice(), problems };
}

// ---------------------------------------------------------------------------
// getShopProtocolConfig
// ---------------------------------------------------------------------------

/** What a single part of a shop is. */
export const PART_STATE = Object.freeze({
  ON: 'ON',
  OFF: 'OFF',
  /** the server promised six keys and this one is not in the reply. */
  MISSING: 'MISSING',
  /** the key is there and is not a boolean. */
  MALFORMED: 'MALFORMED',
});

function readParts(parts) {
  const out = {};
  for (const key of PROTOCOL_PARTS) {
    if (!hasOwn(parts, key) || parts[key] === undefined) out[key] = { state: PART_STATE.MISSING };
    else if (parts[key] === true) out[key] = { state: PART_STATE.ON };
    else if (parts[key] === false) out[key] = { state: PART_STATE.OFF };
    else out[key] = { state: PART_STATE.MALFORMED, raw: parts[key] };
  }
  return out;
}

/** Technician `activeState` values the page knows; anything else is UNKNOWN. */
export const TECH_STATE_UNKNOWN = 'UNKNOWN';

function readTechnician(t, index) {
  if (!isObj(t)) {
    return { readable: false, index, problems: ['technician:NOT_AN_OBJECT'] };
  }
  const problems = [];
  if (!isNonEmptyString(t.technicianId)) problems.push('technicianId:MISSING');
  if (typeof t.displayName !== 'string') problems.push('displayName:NOT_A_STRING');

  let activeState;
  if (
    t.activeState === TECH_ACTIVE_STATE.ACTIVE ||
    t.activeState === TECH_ACTIVE_STATE.INACTIVE ||
    t.activeState === TECH_ACTIVE_STATE.ACTIVE_FLAG_UNREADABLE
  ) {
    activeState = t.activeState;
  } else {
    activeState = TECH_STATE_UNKNOWN;
    problems.push(
      t.activeState === undefined
        ? 'activeState:MISSING'
        : `activeState:UNKNOWN_VALUE(${JSON.stringify(t.activeState)})`
    );
  }

  // `active` (boolean or null) must agree with `activeState`; a disagreement is
  // declared, and `activeState` stays what the page shows.
  let active = null;
  if (t.active === true || t.active === false || t.active === null) active = t.active;
  else problems.push(t.active === undefined ? 'active:MISSING' : 'active:NOT_A_BOOLEAN_OR_NULL');
  const expected =
    activeState === TECH_ACTIVE_STATE.ACTIVE
      ? true
      : activeState === TECH_ACTIVE_STATE.INACTIVE
      ? false
      : activeState === TECH_ACTIVE_STATE.ACTIVE_FLAG_UNREADABLE
      ? null
      : undefined;
  if (expected !== undefined && t.active !== undefined && t.active !== expected) {
    problems.push('active:DISAGREES_WITH_activeState');
  }

  const ms = (v, name) => {
    if (v === undefined) problems.push(`${name}:MISSING`);
    else if (v !== null && !isFiniteNumber(v)) problems.push(`${name}:NOT_A_NUMBER_OR_NULL`);
    return isFiniteNumber(v) ? v : null;
  };
  const createdAtMs = ms(t.createdAtMs, 'createdAtMs');
  const updatedAtMs = ms(t.updatedAtMs, 'updatedAtMs');

  // A technician without an id or a name cannot be acted on: it is shown as an
  // unreadable row, with no buttons.
  const readable = isNonEmptyString(t.technicianId) && typeof t.displayName === 'string';
  return {
    readable,
    index,
    technicianId: isNonEmptyString(t.technicianId) ? t.technicianId : null,
    displayName: typeof t.displayName === 'string' ? t.displayName : null,
    active,
    activeState,
    rawActiveState: t.activeState,
    createdAtMs,
    updatedAtMs,
    problems,
  };
}

/** The reply of getShopProtocolConfig({ ownerId }). */
export function readShopConfig(data) {
  if (!isObj(data)) return { ok: false, problems: ['response:NOT_AN_OBJECT'] };
  const problems = [];

  if (!isNonEmptyString(data.ownerId)) problems.push('ownerId:MISSING');

  let partsState = null;
  if (data.partsState === PARTS_STATE.PRESENT || data.partsState === PARTS_STATE.ABSENT) {
    partsState = data.partsState;
  } else if (data.partsState === undefined) {
    problems.push('partsState:MISSING');
  } else {
    problems.push(`partsState:UNKNOWN_VALUE(${JSON.stringify(data.partsState)})`);
  }

  if (!isObj(data.parts)) problems.push('parts:NOT_AN_OBJECT');
  if (!Array.isArray(data.technicians)) problems.push('technicians:NOT_A_LIST');
  if (problems.length > 0) return { ok: false, problems };

  const parts = readParts(data.parts);
  const unknownPartKeys = Object.keys(data.parts).filter((k) => !PROTOCOL_PARTS.includes(k));
  const declared = [];
  if (partsState === PARTS_STATE.ABSENT) {
    for (const key of PROTOCOL_PARTS) {
      if (parts[key].state === PART_STATE.ON) declared.push(`parts.${key}:ON_WHILE_partsState_ABSENT`);
    }
  }
  const technicians = data.technicians.map(readTechnician);

  return {
    ok: true,
    ownerId: data.ownerId,
    partsState,
    parts,
    unknownPartKeys,
    technicians,
    problems: declared,
  };
}

// ---------------------------------------------------------------------------
// setShopProtocolParts and manageTechnician
// ---------------------------------------------------------------------------

/** The reply of setShopProtocolParts: { ownerId, parts (six), changed[] }. */
export function readSetPartsResult(data) {
  const problems = [];
  if (!isObj(data)) return { ok: false, problems: ['response:NOT_AN_OBJECT'] };
  if (!isNonEmptyString(data.ownerId)) problems.push('ownerId:MISSING');
  if (!isObj(data.parts)) problems.push('parts:NOT_AN_OBJECT');
  if (!Array.isArray(data.changed) || !data.changed.every((c) => typeof c === 'string')) {
    problems.push('changed:NOT_A_LIST_OF_STRINGS');
  }
  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, ownerId: data.ownerId, parts: readParts(data.parts), changed: data.changed.slice(), problems };
}

/** The reply of manageTechnician: { technicianId, ownerId, displayName, active, changed }. */
export function readManageResult(data) {
  const problems = [];
  if (!isObj(data)) return { ok: false, problems: ['response:NOT_AN_OBJECT'] };
  if (!isNonEmptyString(data.technicianId)) problems.push('technicianId:MISSING');
  if (!isNonEmptyString(data.ownerId)) problems.push('ownerId:MISSING');
  if (typeof data.displayName !== 'string') problems.push('displayName:NOT_A_STRING');
  if (typeof data.active !== 'boolean') problems.push('active:NOT_A_BOOLEAN');
  if (typeof data.changed !== 'boolean') problems.push('changed:NOT_A_BOOLEAN');
  if (problems.length > 0) return { ok: false, problems };
  return {
    ok: true,
    technicianId: data.technicianId,
    ownerId: data.ownerId,
    displayName: data.displayName,
    active: data.active,
    changed: data.changed,
    problems,
  };
}

// ---------------------------------------------------------------------------
// A failed call
// ---------------------------------------------------------------------------

const KNOWN_REFUSALS = new Set(KNOWN_REFUSAL_CODES);

/**
 * What a rejected callable says, read from `details.reasonCode` (and
 * `details.field` when the refusal names one) — rule 21, and the order's
 * «رسائل الرفض تُقرأ من details.reasonCode (لا من نصّ الاستثناء)».
 *
 * `reasonCode` is null when the rejection carries none (a network failure, a
 * function that is not deployed, a signed-out session…): then only the SDK's
 * own `code` is returned, as `transportCode`, to be SHOWN, never to be turned
 * into a reason. The exception's message is never read at all.
 *
 * `knownCodes` is the Set of codes the CALLER's contract names (W-P6-18 and
 * W-P6-20 pass their own; the default is A10's, which the settings and shops
 * pages use): `known` says whether this page's contract names the code. The
 * `reasonCode` itself is always the one in `details`.
 */
export function classifyCallError(err, knownCodes = KNOWN_REFUSALS) {
  const details = err && isObj(err.details) ? err.details : null;
  const reasonCode = details && isNonEmptyString(details.reasonCode) ? details.reasonCode : null;
  const field = details && isNonEmptyString(details.field) ? details.field : null;
  const transportCode = err && isNonEmptyString(err.code) ? err.code : null;
  return {
    reasonCode,
    field,
    known: reasonCode !== null && knownCodes.has(reasonCode),
    transportCode,
  };
}

