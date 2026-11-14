// The wire vocabulary of `correctProtocolRecord` (W-P6-18, the correction by
// appending) — ONE exported source for every literal a distinction on this site
// hangs on (rule 24).
//
// Source of every name below: neuralcheck-backend@5361116,
// docs/PROTOCOL_CONTRACT.md §٢ A11 — read here through the coordinator's copy,
// evidence/run-2026-10-18/protocol-contract-A8-A11-A12-neuralcheck-backend-
// 5361116.md (A11, lines 64-81), and the backend engineer's report
// evidence/run-2026-10-18/reports/backend-engineer-5-rows-b-5361116-2026-10-21.md
// (item 4). The site follows the server's code, never the other way round. The
// contract's own caveat (A11, «ما بُني في S-P6-18»): the function name, its five
// actions, the three exclusion reasons and the mark's fields are FROM THE DESIGN
// (P6:856-864); the request shape, the reply shape, the refusal codes and the
// two basis values are PROPOSED names — a rename on the server is a change HERE
// and nowhere else.
//
// The function arrived at 5361116 (S-P6-18, 9c70fcd) and is in the production
// function list at neuralcheck-backend@488e3ee (published 2026-10-21 18:25; its
// files are the same at 5361116 and 488e3ee; DEPLOY-LIST-MAINTENANCE-PAIRS-
// 0dfe892-2026-10-22.md lines 46 and 73 — NOT checked against production from
// this repo). The batch after it, 0dfe892, changes its internals (pair sync,
// linkModelCheck) and not the reply or the 22 codes read here. The page that uses it is
// behind ADMIN_PROTOCOL_TEXTS_APPROVED (lib/featureFlags.js).

/** The one callable. */
export const PROTOCOL_CORRECTION_FN = Object.freeze({
  CORRECT: 'correctProtocolRecord',
});

/**
 * `action` — the four the page offers (A11 (1)). `resolveIdentityConflict` is
 * the design's fifth (P6:859); the server refuses it with
 * `CORRECTION_ACTION_NOT_SPECIFIED` (A11 «معلّق» 2: HMAC and no specification),
 * so it is NOT here and the page never sends it.
 */
export const CORRECTION_ACTION = Object.freeze({
  UNLINK: 'unlink',
  RELINK: 'relink',
  EXCLUDE: 'exclude',
  UNEXCLUDE: 'unexclude',
});

/** The four, in the design's order (P6:857-858). */
export const CORRECTION_ACTIONS = Object.freeze([
  CORRECTION_ACTION.UNLINK,
  CORRECTION_ACTION.RELINK,
  CORRECTION_ACTION.EXCLUDE,
  CORRECTION_ACTION.UNEXCLUDE,
]);

/** The design's fifth action: named here only so a test can prove it is never sent. */
export const CORRECTION_ACTION_NOT_OFFERED = Object.freeze(['resolveIdentityConflict']);

/** `reason`, for `exclude` alone (P6:858; A11 (1)). */
export const EXCLUDE_REASON = Object.freeze({
  TEST: 'test',
  WRONG: 'wrong',
  GOLDEN_REFERENCE: 'golden_reference',
});

export const EXCLUDE_REASONS = Object.freeze([
  EXCLUDE_REASON.TEST,
  EXCLUDE_REASON.WRONG,
  EXCLUDE_REASON.GOLDEN_REFERENCE,
]);

/** The request's keys (A11 (1)): exactly one of scanId / shortId; toScanId for relink; reason for exclude. */
export const CORRECTION_REQUEST_KEY = Object.freeze({
  ACTION: 'action',
  SCAN_ID: 'scanId',
  SHORT_ID: 'shortId',
  TO_SCAN_ID: 'toScanId',
  REASON: 'reason',
});

/** `basis` of the reply (A11 (3), (4)): a scan with a `scanProtocol` or an older one (E16). */
export const CORRECTION_BASIS = Object.freeze({
  SCAN_PROTOCOL: 'SCAN_PROTOCOL',
  REPORT_ONLY: 'REPORT_ONLY',
});

/** `exclusion.state` (A11 (2); E45, approved 2026-10-15). */
export const EXCLUSION_STATE = Object.freeze({
  EXCLUDED: 'excluded',
  NOT_EXCLUDED: 'not_excluded',
});

/**
 * `linkState` — the plan's values (P6:490:
 * `linkState ∈ {none, active, missing, unlinked_by_admin, relinked_by_admin}`).
 * The reply carries it as a text or null (A11 (4)); a text outside this list is
 * shown as it came, marked unknown to the page.
 */
export const LINK_STATE = Object.freeze({
  NONE: 'none',
  ACTIVE: 'active',
  MISSING: 'missing',
  UNLINKED_BY_ADMIN: 'unlinked_by_admin',
  RELINKED_BY_ADMIN: 'relinked_by_admin',
});

export const LINK_STATES = Object.freeze(Object.values(LINK_STATE));

// ---------------------------------------------------------------------------
// Refusals — `details.reasonCode` (A11 (6); rule 21: the code, never the text of
// the exception). The message of every one of these is the technical code
// itself, so nothing here may be read from `error.message`. The two admin
// refusals (`unauthenticated`, `permission-denied`) carry no reasonCode: they
// reach the page as a transport code.
// ---------------------------------------------------------------------------

/** `invalid-argument`. */
export const CORRECTION_REFUSAL_INVALID = Object.freeze({
  ACTION_REQUIRED: 'CORRECTION_ACTION_REQUIRED',
  ACTION_INVALID: 'CORRECTION_ACTION_INVALID',
  FIELD_UNKNOWN: 'CORRECTION_FIELD_UNKNOWN',
  FIELD_NOT_APPLICABLE: 'CORRECTION_FIELD_NOT_APPLICABLE',
  TARGET_REQUIRED: 'CORRECTION_TARGET_REQUIRED',
  TARGET_AMBIGUOUS: 'CORRECTION_TARGET_AMBIGUOUS',
  SCAN_ID_INVALID: 'CORRECTION_SCAN_ID_INVALID',
  SHORT_ID_INVALID: 'CORRECTION_SHORT_ID_INVALID',
  REASON_REQUIRED: 'CORRECTION_REASON_REQUIRED',
  REASON_INVALID: 'CORRECTION_REASON_INVALID',
  TO_SCAN_ID_REQUIRED: 'CORRECTION_TO_SCAN_ID_REQUIRED',
  TO_SCAN_ID_INVALID: 'CORRECTION_TO_SCAN_ID_INVALID',
  RELINK_SELF: 'CORRECTION_RELINK_SELF',
});

/** `failed-precondition`. */
export const CORRECTION_REFUSAL_PRECONDITION = Object.freeze({
  ACTION_NOT_SPECIFIED: 'CORRECTION_ACTION_NOT_SPECIFIED',
  SHORT_ID_AMBIGUOUS: 'CORRECTION_SHORT_ID_AMBIGUOUS',
  NO_PROTOCOL_RECORD: 'CORRECTION_NO_PROTOCOL_RECORD',
  NOT_LINKED: 'CORRECTION_NOT_LINKED',
  LINK_STATE_UNKNOWN: 'CORRECTION_LINK_STATE_UNKNOWN',
  EXCLUSION_UNREADABLE: 'CORRECTION_EXCLUSION_UNREADABLE',
});

/** `not-found`. */
export const CORRECTION_REFUSAL_NOT_FOUND = Object.freeze({
  SCAN_NOT_FOUND: 'CORRECTION_SCAN_NOT_FOUND',
  SHORT_ID_NOT_FOUND: 'CORRECTION_SHORT_ID_NOT_FOUND',
  RELINK_TARGET_NOT_FOUND: 'CORRECTION_RELINK_TARGET_NOT_FOUND',
});

/** Every refusal code the contract names for `correctProtocolRecord` (13 + 6 + 3). */
export const KNOWN_CORRECTION_REFUSAL_CODES = Object.freeze([
  ...Object.values(CORRECTION_REFUSAL_INVALID),
  ...Object.values(CORRECTION_REFUSAL_PRECONDITION),
  ...Object.values(CORRECTION_REFUSAL_NOT_FOUND),
]);
