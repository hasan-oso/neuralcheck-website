// The wire vocabulary of the five protocol admin callables — ONE exported
// source for every literal a distinction on this site hangs on (rule 24).
//
// Source of every name below: neuralcheck-backend@fd730ac,
// docs/PROTOCOL_CONTRACT.md §٢ A10 (the settings, the shop parts, the
// technicians) — read here through the coordinator's copy,
// evidence/run-2026-10-18/protocol-contract-A0-A10-neuralcheck-backend-fd730ac.md
// (lines 264-296), and the backend engineer's report
// evidence/run-2026-10-18/reports/backend-engineer-3-rows-a-fd730ac-2026-10-21.md
// (lines 54-60). The site follows the server's code, never the other way
// round. The server names themselves carry the contract's own caveat: only
// `setProtocolSettings` is a name from the design; the other four are
// PROPOSED names (A10: «أسماء الدوالّ الخمس اقتراحية إلا setProtocolSettings»),
// so a rename on the server is a one-line change HERE and nowhere else.
//
// These functions arrived at fd730ac and are in the production function list at
// neuralcheck-backend@488e3ee (published 2026-10-21 18:25; their files are the
// same at fd730ac and 488e3ee; DEPLOY-LIST-MAINTENANCE-PAIRS-0dfe892-2026-10-22.md
// lines 46 and 73, which copies the production list — NOT checked against
// production from this repo). The pages that use them are behind
// ADMIN_PROTOCOL_TEXTS_APPROVED (lib/featureFlags.js).

/** The five callables. */
export const PROTOCOL_ADMIN_FN = Object.freeze({
  GET_SETTINGS: 'getProtocolSettings',
  SET_SETTINGS: 'setProtocolSettings',
  GET_SHOP: 'getShopProtocolConfig',
  SET_PARTS: 'setShopProtocolParts',
  MANAGE_TECHNICIAN: 'manageTechnician',
});

// ---------------------------------------------------------------------------
// getProtocolSettings() → { state, anomaly, version, settings, updatedAtMs,
//                           updatedBy, limits, notSpecified }      (A10 (3))
// ---------------------------------------------------------------------------

/** `state`: the same value `settingsVersion` carries in the scans (A10 (3)). */
export const SETTINGS_STATE = Object.freeze({
  PRESENT: 'PRESENT',
  ABSENT: 'SETTINGS_ABSENT',
});

/** `anomaly`: null, or this — a document that exists with no usable `version`. */
export const SETTINGS_ANOMALY = Object.freeze({
  VERSION_UNUSABLE: 'VERSION_UNUSABLE',
});

/**
 * The seven fields the server WRITES (A10 (1): «سبعة تُكتب»), by the names of
 * the settings document.
 */
export const SETTINGS_FIELD = Object.freeze({
  REPEAT_RATE: 'repeatRate',
  DOUBLE_EVAL_RATE: 'doubleEvalRate',
  OPEN_BEFORE_VALIDITY_HOURS: 'openBeforeValidityHours',
  COLLECTION_PHASE: 'collectionPhase',
  BLINDNESS_ALERT_BELOW_PCT: 'blindnessAlertBelowPct',
  RETURN_REASONS: 'returnReasons',
  MIN_APP_VERSION: 'minAppVersion',
});

/** The seven, in the contract's order (the order of the A10 table). */
export const SETTINGS_FIELDS = Object.freeze([
  SETTINGS_FIELD.REPEAT_RATE,
  SETTINGS_FIELD.DOUBLE_EVAL_RATE,
  SETTINGS_FIELD.OPEN_BEFORE_VALIDITY_HOURS,
  SETTINGS_FIELD.COLLECTION_PHASE,
  SETTINGS_FIELD.BLINDNESS_ALERT_BELOW_PCT,
  SETTINGS_FIELD.RETURN_REASONS,
  SETTINGS_FIELD.MIN_APP_VERSION,
]);

/** What each field is on the wire: a number, a boolean, a text or the list. */
export const SETTINGS_FIELD_TYPE = Object.freeze({
  [SETTINGS_FIELD.REPEAT_RATE]: 'number',
  [SETTINGS_FIELD.DOUBLE_EVAL_RATE]: 'number',
  [SETTINGS_FIELD.OPEN_BEFORE_VALIDITY_HOURS]: 'number',
  [SETTINGS_FIELD.COLLECTION_PHASE]: 'boolean',
  [SETTINGS_FIELD.BLINDNESS_ALERT_BELOW_PCT]: 'number',
  [SETTINGS_FIELD.RETURN_REASONS]: 'list',
  [SETTINGS_FIELD.MIN_APP_VERSION]: 'string',
});

/**
 * The two fields the design names and gives NO meaning to (P6:783-784; A10
 * «معلّق» 1-2): the server refuses them (`SETTINGS_FIELD_NOT_SPECIFIED`) and
 * lists them in `notSpecified`. The order says not to show them. This list
 * exists so a test can prove they are neither rendered nor sent.
 */
export const SETTINGS_FIELDS_NOT_SPECIFIED = Object.freeze([
  'symptomChips',
  'targets',
]);

/** An entry of `returnReasons[]` — exactly these four keys (A10 (2)). */
export const RETURN_REASON_KEYS = Object.freeze(['key', 'ar', 'tr', 'active']);

// ---------------------------------------------------------------------------
// getShopProtocolConfig({ ownerId }) → { ownerId, partsState, parts,
//                                        technicians[...] }        (A10 (7))
// ---------------------------------------------------------------------------

/** `partsState`: does the shop document carry `protocolParts` as an object. */
export const PARTS_STATE = Object.freeze({
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
});

/**
 * The six parts (`PROTOCOL_PART`, A10 «التفعيل»). `batteryBeforeAfter` is the
 * key — the design's own name for it collided with an existing payload field
 * and was renamed (E42); the old name is deliberately NOT here and must never
 * be sent (the server answers it with `SHOP_PARTS_KEY_UNKNOWN`).
 */
export const PROTOCOL_PART = Object.freeze({
  PURPOSES: 'purposes',
  BATTERY_BEFORE_AFTER: 'batteryBeforeAfter',
  COLD_REPEAT: 'coldRepeat',
  RETURNS: 'returns',
  DOUBLE_EVAL: 'doubleEval',
  CONSENT: 'consent',
});

/** The six, in the contract's order. */
export const PROTOCOL_PARTS = Object.freeze([
  PROTOCOL_PART.PURPOSES,
  PROTOCOL_PART.BATTERY_BEFORE_AFTER,
  PROTOCOL_PART.COLD_REPEAT,
  PROTOCOL_PART.RETURNS,
  PROTOCOL_PART.DOUBLE_EVAL,
  PROTOCOL_PART.CONSENT,
]);

/** `technicians[].activeState`. */
export const TECH_ACTIVE_STATE = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ACTIVE_FLAG_UNREADABLE: 'ACTIVE_FLAG_UNREADABLE',
});

/** The technician fields the list is read by (A10 (7)). */
export const TECHNICIAN_KEYS = Object.freeze([
  'technicianId',
  'displayName',
  'active',
  'activeState',
  'createdAtMs',
  'updatedAtMs',
]);

// ---------------------------------------------------------------------------
// manageTechnician({ ownerId, action, technicianId?, displayName?, active? })
// → { technicianId, ownerId, displayName, active, changed }        (A10 (6))
// ---------------------------------------------------------------------------

/** `action`: add, rename, set_active — and NO delete (the user's decision). */
export const TECH_ACTION = Object.freeze({
  ADD: 'add',
  RENAME: 'rename',
  SET_ACTIVE: 'set_active',
});

// ---------------------------------------------------------------------------
// Refusals — `details.reasonCode` (A10 (4), (5), (6); rule 21: the code, never
// the text of the exception). The message of every one of these is the
// technical code itself, so nothing here may be read from `error.message`.
// ---------------------------------------------------------------------------

export const SETTINGS_REFUSAL = Object.freeze({
  PATCH_REQUIRED: 'SETTINGS_PATCH_REQUIRED',
  FIELD_UNKNOWN: 'SETTINGS_FIELD_UNKNOWN',
  FIELD_NOT_SPECIFIED: 'SETTINGS_FIELD_NOT_SPECIFIED',
  FIELD_INVALID: 'SETTINGS_FIELD_INVALID',
  RETURN_REASON_KEY_REMOVED: 'SETTINGS_RETURN_REASON_KEY_REMOVED',
  CURRENT_VERSION_INVALID: 'SETTINGS_CURRENT_VERSION_INVALID',
});

export const SHOP_REFUSAL = Object.freeze({
  ID_REQUIRED: 'SHOP_ID_REQUIRED',
  NOT_FOUND: 'SHOP_NOT_FOUND',
  PARTS_REQUIRED: 'SHOP_PARTS_REQUIRED',
  PARTS_KEY_UNKNOWN: 'SHOP_PARTS_KEY_UNKNOWN',
  PARTS_VALUE_INVALID: 'SHOP_PARTS_VALUE_INVALID',
});

export const TECHNICIAN_REFUSAL = Object.freeze({
  ACTION_REQUIRED: 'TECHNICIAN_ACTION_REQUIRED',
  ACTION_INVALID: 'TECHNICIAN_ACTION_INVALID',
  ID_REQUIRED: 'TECHNICIAN_ID_REQUIRED',
  NAME_INVALID: 'TECHNICIAN_NAME_INVALID',
  ACTIVE_INVALID: 'TECHNICIAN_ACTIVE_INVALID',
  NOT_FOUND: 'TECHNICIAN_NOT_FOUND',
  OWNER_MISMATCH: 'TECHNICIAN_OWNER_MISMATCH',
});

/** Every refusal code the contract names, for the three groups together. */
export const KNOWN_REFUSAL_CODES = Object.freeze([
  ...Object.values(SETTINGS_REFUSAL),
  ...Object.values(SHOP_REFUSAL),
  ...Object.values(TECHNICIAN_REFUSAL),
]);
