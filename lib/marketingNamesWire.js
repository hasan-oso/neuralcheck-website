// The wire vocabulary of `getMarketingNames` / `setMarketingNames` (W-P6-20, the
// marketing-name map) — ONE exported source for every literal a distinction on
// this site hangs on (rule 24).
//
// Source of every name below: neuralcheck-backend@5361116,
// docs/PROTOCOL_CONTRACT.md §٢ A12 — read here through the coordinator's copy,
// evidence/run-2026-10-18/protocol-contract-A8-A11-A12-neuralcheck-backend-
// 5361116.md (A12, lines 83-97), and the backend engineer's report
// evidence/run-2026-10-18/reports/backend-engineer-5-rows-b-5361116-2026-10-21.md
// (item 5). The site follows the server's code, never the other way round. The
// contract's own caveat (A12 «ما بُني في S-P6-20»): from the design and E14
// (approved) are the collection `marketingNames/current` with `version` and
// `entries[] {model, ar, tr, en}` and the state `name_unmapped`; PROPOSED are
// the two function names, the limits, the state `mapped`, the reasons of
// `name_unmapped` and the refusal codes — a rename on the server is a change
// HERE and nowhere else.
//
// The two functions arrived at 5361116 (S-P6-20) and are in the production
// function list at neuralcheck-backend@488e3ee (published 2026-10-21 18:25;
// their files are the same at 5361116 and 488e3ee, and at 0dfe892;
// DEPLOY-LIST-MAINTENANCE-PAIRS-0dfe892-2026-10-22.md lines 46 and 73 — NOT
// checked against production from this repo). The page that uses them is
// behind ADMIN_PROTOCOL_TEXTS_APPROVED (lib/featureFlags.js).
//
// `resolveMarketingName` (A12 (4)) is the SERVER's reader of the map for the
// progress panel (P6-16, after the handover): not a callable, not on the site.

/** The two callables. */
export const MARKETING_NAMES_FN = Object.freeze({
  GET: 'getMarketingNames',
  SET: 'setMarketingNames',
});

/** `state` of the reply of getMarketingNames (A12 (3)). */
export const MARKETING_STATE = Object.freeze({
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  UNREADABLE: 'UNREADABLE',
});

/** `anomaly`: null, or why the stored document cannot be read (A12 (3)). */
export const MARKETING_ANOMALY = Object.freeze({
  DOCUMENT_NOT_AN_OBJECT: 'DOCUMENT_NOT_AN_OBJECT',
  VERSION_UNUSABLE: 'VERSION_UNUSABLE',
  ENTRIES_NOT_AN_ARRAY: 'ENTRIES_NOT_AN_ARRAY',
  ENTRY_UNUSABLE: 'ENTRY_UNUSABLE',
  DUPLICATE_MODEL: 'DUPLICATE_MODEL',
});

export const MARKETING_ANOMALIES = Object.freeze(Object.values(MARKETING_ANOMALY));

/**
 * An entry of `entries[]` — exactly these four keys, all required (A12 (1):
 * «المفاتيح الأربعة كلّها إلزامية»; E14). `model` is what `Build.MODEL` sends;
 * the match is literal (case and spaces as they are).
 */
export const MARKETING_ENTRY_KEY = Object.freeze({
  MODEL: 'model',
  AR: 'ar',
  TR: 'tr',
  EN: 'en',
});

export const MARKETING_ENTRY_KEYS = Object.freeze([
  MARKETING_ENTRY_KEY.MODEL,
  MARKETING_ENTRY_KEY.AR,
  MARKETING_ENTRY_KEY.TR,
  MARKETING_ENTRY_KEY.EN,
]);

/** The three names of an entry (everything but the model). */
export const MARKETING_NAME_KEYS = Object.freeze([
  MARKETING_ENTRY_KEY.AR,
  MARKETING_ENTRY_KEY.TR,
  MARKETING_ENTRY_KEY.EN,
]);

/** `limits` of the reply: `{maxEntries, modelMaxLength, nameMaxLength}` (A12 (3)). */
export const MARKETING_LIMIT_KEYS = Object.freeze(['maxEntries', 'modelMaxLength', 'nameMaxLength']);

/** The key of the request of setMarketingNames (A12 (2)): `{ entries }`. */
export const MARKETING_REQUEST_KEY = Object.freeze({ ENTRIES: 'entries' });

// ---------------------------------------------------------------------------
// Refusals — `details.reasonCode` (A12 (5); rule 21: the code, never the text of
// the exception). The message of every one is the technical code itself. The two
// admin refusals (`unauthenticated`, `permission-denied`) carry no reasonCode.
// ---------------------------------------------------------------------------

export const MARKETING_REFUSAL = Object.freeze({
  ENTRIES_REQUIRED: 'MARKETING_NAMES_ENTRIES_REQUIRED',
  TOO_MANY_ENTRIES: 'MARKETING_NAMES_TOO_MANY_ENTRIES',
  ENTRY_INVALID: 'MARKETING_NAMES_ENTRY_INVALID',
  DUPLICATE_MODEL: 'MARKETING_NAMES_DUPLICATE_MODEL',
  CURRENT_UNREADABLE: 'MARKETING_NAMES_CURRENT_UNREADABLE',
});

/** Every refusal code the contract names for `setMarketingNames` (4 + 1). */
export const KNOWN_MARKETING_REFUSAL_CODES = Object.freeze(Object.values(MARKETING_REFUSAL));
