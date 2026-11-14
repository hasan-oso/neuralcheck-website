// What the correction page SENDS: the `correctProtocolRecord` payload built from
// the form — a pure function, so the exact payload of each action is testable
// against the contract (A11 (1); neuralcheck-backend@5361116).
//
// Rules it keeps:
//
//   - Exactly the keys that APPLY to the chosen action, and no others. The
//     server refuses an unknown key (`CORRECTION_FIELD_UNKNOWN`) and a key that
//     does not apply to the action (`CORRECTION_FIELD_NOT_APPLICABLE`) rather
//     than drop it silently, so a value left in the form from another action
//     (a `toScanId` typed for relink, then the action changed to exclude) must
//     NOT travel: only `toScanId` for relink, only `reason` for exclude.
//
//   - The target is ONE of `scanId` / `shortId` (A11 (1): «الهدف واحد بالضبط»).
//     Neither, or both, is a problem the page names; it is not decided for the
//     admin.
//
//   - Nothing is defaulted (rule 22): the action and the reason start unchosen
//     and a payload is not built until the admin has chosen them. The text
//     fields are trimmed (a space typed or pasted at an end is not part of an
//     id); the server normalises the report code (trim, upper-case) and judges
//     the format, which the site does not repeat.

import {
  CORRECTION_ACTION,
  CORRECTION_ACTIONS,
  CORRECTION_REQUEST_KEY as K,
  EXCLUDE_REASONS,
} from '@/lib/protocolCorrectionWire';

/** The form the page edits; the empty text is «not chosen / not typed». */
export function initialCorrectionForm() {
  return { action: '', shortId: '', scanId: '', toScanId: '', reason: '' };
}

/** Why the form cannot be sent as it stands. */
export const CORRECTION_FORM_PROBLEM = Object.freeze({
  NO_ACTION: 'NO_ACTION',
  NO_TARGET: 'NO_TARGET',
  BOTH_TARGETS: 'BOTH_TARGETS',
  NO_TO_SCAN_ID: 'NO_TO_SCAN_ID',
  NO_REASON: 'NO_REASON',
});

const text = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * `{ payload, problems }`: `payload` is the exact object for
 * `correctProtocolRecord` or null; `problems` lists every reason there is none.
 * The payload's key order is: action, the target, then toScanId or reason.
 */
export function buildCorrectionPayload(form) {
  const problems = [];
  const f = form && typeof form === 'object' ? form : {};

  const action = CORRECTION_ACTIONS.includes(f.action) ? f.action : null;
  if (action === null) problems.push(CORRECTION_FORM_PROBLEM.NO_ACTION);

  const shortId = text(f.shortId);
  const scanId = text(f.scanId);
  let target = null;
  if (shortId === '' && scanId === '') problems.push(CORRECTION_FORM_PROBLEM.NO_TARGET);
  else if (shortId !== '' && scanId !== '') problems.push(CORRECTION_FORM_PROBLEM.BOTH_TARGETS);
  else target = shortId !== '' ? [K.SHORT_ID, shortId] : [K.SCAN_ID, scanId];

  const toScanId = text(f.toScanId);
  if (action === CORRECTION_ACTION.RELINK && toScanId === '') {
    problems.push(CORRECTION_FORM_PROBLEM.NO_TO_SCAN_ID);
  }
  const reason = EXCLUDE_REASONS.includes(f.reason) ? f.reason : null;
  if (action === CORRECTION_ACTION.EXCLUDE && reason === null) {
    problems.push(CORRECTION_FORM_PROBLEM.NO_REASON);
  }

  if (problems.length > 0) return { payload: null, problems };

  const payload = { [K.ACTION]: action, [target[0]]: target[1] };
  if (action === CORRECTION_ACTION.RELINK) payload[K.TO_SCAN_ID] = toScanId;
  if (action === CORRECTION_ACTION.EXCLUDE) payload[K.REASON] = reason;
  return { payload, problems };
}
