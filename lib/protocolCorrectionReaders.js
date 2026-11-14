// The reader of what `correctProtocolRecord` returns (W-P6-18), and the Set of
// the refusal codes the page's contract names.
//
// Shape: neuralcheck-backend@5361116 docs/PROTOCOL_CONTRACT.md §٢ A11 (4), as
// copied in evidence/run-2026-10-18/protocol-contract-A8-A11-A12-neuralcheck-
// backend-5361116.md line 75:
//   { scanId, action, changed: boolean, basis: "SCAN_PROTOCOL"|"REPORT_ONLY",
//     exclusion: { state, reasonCode } | null, linkState: text | null,
//     linkedScanId: text | null, correctionSeq: integer | null }
// — «الحالة بعد الفعل»: the state AFTER the action; `correctionSeq` is the number
// of the appended line, null when nothing changed. The names are in
// lib/protocolCorrectionWire.js.
//
// What this reader promises (rules 22, 25, 30), the same promises as the readers
// of W-P6-14:
//
//   - an ABSENCE is a named state that reaches the screen. `exclusion: null` is
//     «no mark» (`exclusion.view = NONE`, the server's own `NOT_RECORDED`), never
//     «not excluded»; a null `linkState` / `linkedScanId` / `correctionSeq` is
//     shown as null, never as a made-up text or 0.
//
//   - every key the reader ASKED for and did not find makes the reply UNREADABLE
//     (`ok: false`, the keys in `problems`) — nothing is drawn from a reply that
//     lacks a key of the contract. A value of an enumerated key that the reader
//     does not know (an exclusion state, a reason, a link state) is returned as
//     it came, flagged unknown, and shown.
//
//   - what the contract says about the state AFTER each action is checked and
//     any disagreement is DECLARED in `problems` (not blocking: the reply is
//     still drawn, with the disagreement under it): exclude ⇒ excluded with the
//     reason that was sent; unexclude ⇒ not excluded; unlink ⇒ `unlinked_by_admin`;
//     relink ⇒ `relinked_by_admin` and the target that was sent; `correctionSeq`
//     set exactly when `changed`; a report-only scan carries no link fields.
//
//   - the reasons a call was REFUSED are read from `details.reasonCode` and
//     nowhere else (rule 21): see classifyCallError in
//     lib/protocolAdminReaders.js, called with KNOWN_CORRECTION_REFUSALS.

import {
  CORRECTION_ACTIONS,
  CORRECTION_ACTION,
  CORRECTION_BASIS,
  CORRECTION_REQUEST_KEY,
  EXCLUDE_REASONS,
  EXCLUSION_STATE,
  LINK_STATE,
  LINK_STATES,
  KNOWN_CORRECTION_REFUSAL_CODES,
} from '@/lib/protocolCorrectionWire';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;
const isPositiveInt = (v) => Number.isInteger(v) && v >= 1;
const missing = (o, k) => !hasOwn(o, k) || o[k] === undefined;

/** The refusal codes the page's contract names — for `classifyCallError(err, …)`. */
export const KNOWN_CORRECTION_REFUSALS = new Set(KNOWN_CORRECTION_REFUSAL_CODES);

/** What the mark of the exclusion is, as the page shows it. */
export const EXCLUSION_VIEW = Object.freeze({
  /** `exclusion: null` — no mark on this scan (never corrected). Not «not excluded». */
  NONE: 'NONE',
  EXCLUDED: 'EXCLUDED',
  NOT_EXCLUDED: 'NOT_EXCLUDED',
  /** a `state` the reader does not know; `rawState` carries it. */
  UNKNOWN_STATE: 'UNKNOWN_STATE',
});

function readExclusion(raw, critical, problems) {
  if (raw === undefined) {
    critical.push('exclusion:MISSING');
    return null;
  }
  if (raw === null) {
    return { view: EXCLUSION_VIEW.NONE, state: null, reasonCode: null, reasonKnown: true };
  }
  if (!isObj(raw)) {
    critical.push('exclusion:NOT_AN_OBJECT_OR_NULL');
    return null;
  }
  let bad = false;
  if (missing(raw, 'state') || !isNonEmptyString(raw.state)) {
    critical.push(missing(raw, 'state') ? 'exclusion.state:MISSING' : 'exclusion.state:NOT_A_STRING');
    bad = true;
  }
  if (missing(raw, 'reasonCode')) {
    critical.push('exclusion.reasonCode:MISSING');
    bad = true;
  } else if (raw.reasonCode !== null && typeof raw.reasonCode !== 'string') {
    critical.push('exclusion.reasonCode:NOT_A_STRING_OR_NULL');
    bad = true;
  }
  if (bad) return null;

  for (const k of Object.keys(raw)) {
    if (k !== 'state' && k !== 'reasonCode') problems.push(`exclusion:UNKNOWN_KEY(${k})`);
  }

  let view;
  if (raw.state === EXCLUSION_STATE.EXCLUDED) view = EXCLUSION_VIEW.EXCLUDED;
  else if (raw.state === EXCLUSION_STATE.NOT_EXCLUDED) view = EXCLUSION_VIEW.NOT_EXCLUDED;
  else {
    view = EXCLUSION_VIEW.UNKNOWN_STATE;
    problems.push(`exclusion.state:UNKNOWN_VALUE(${JSON.stringify(raw.state)})`);
  }

  const reasonKnown = raw.reasonCode === null || EXCLUDE_REASONS.includes(raw.reasonCode);
  if (!reasonKnown) problems.push(`exclusion.reasonCode:UNKNOWN_VALUE(${JSON.stringify(raw.reasonCode)})`);
  if (view === EXCLUSION_VIEW.EXCLUDED && raw.reasonCode === null) {
    problems.push('exclusion.reasonCode:NULL_WHILE_EXCLUDED');
  }
  if (view === EXCLUSION_VIEW.NOT_EXCLUDED && raw.reasonCode !== null) {
    problems.push('exclusion.reasonCode:SET_WHILE_NOT_EXCLUDED');
  }
  return { view, state: raw.state, reasonCode: raw.reasonCode, reasonKnown };
}

/**
 * The reply of correctProtocolRecord. `sent` is the payload the page sent
 * (`{ action, scanId | shortId, toScanId?, reason? }`): with it the reply is
 * checked to be an answer to THAT request, and its state after the action is
 * checked against the action. Without it only the shape is checked.
 *
 * Returns `{ ok: false, problems }` when the reply cannot be drawn, else
 * `{ ok: true, scanId, action, changed, basis, exclusion, linkState,
 * linkedScanId, correctionSeq, problems }` where `problems` are declared
 * disagreements that do not stop the reply being drawn.
 */
export function readCorrectionResult(data, sent) {
  if (!isObj(data)) return { ok: false, problems: ['response:NOT_AN_OBJECT'] };

  const critical = [];
  const problems = [];

  // scanId — the resolved id; with a shortId target the page cannot compare it
  let scanId = null;
  if (!isNonEmptyString(data.scanId)) critical.push('scanId:MISSING');
  else {
    scanId = data.scanId;
    if (sent && isNonEmptyString(sent[CORRECTION_REQUEST_KEY.SCAN_ID]) && sent[CORRECTION_REQUEST_KEY.SCAN_ID] !== scanId) {
      critical.push('scanId:DOES_NOT_MATCH_THE_REQUEST');
    }
  }

  // action
  let action = null;
  if (missing(data, 'action')) critical.push('action:MISSING');
  else if (!CORRECTION_ACTIONS.includes(data.action)) {
    critical.push(`action:UNKNOWN_VALUE(${JSON.stringify(data.action)})`);
  } else {
    action = data.action;
    if (sent && sent[CORRECTION_REQUEST_KEY.ACTION] !== action) critical.push('action:DOES_NOT_MATCH_THE_REQUEST');
  }

  // changed
  let changed = null;
  if (typeof data.changed !== 'boolean') critical.push('changed:NOT_A_BOOLEAN');
  else changed = data.changed;

  // basis
  let basis = null;
  if (missing(data, 'basis')) critical.push('basis:MISSING');
  else if (data.basis === CORRECTION_BASIS.SCAN_PROTOCOL || data.basis === CORRECTION_BASIS.REPORT_ONLY) {
    basis = data.basis;
  } else critical.push(`basis:UNKNOWN_VALUE(${JSON.stringify(data.basis)})`);

  // exclusion
  const exclusion = readExclusion(data.exclusion, critical, problems);

  // linkState — a text or null; a text outside the plan's five is shown, flagged
  let linkState = null;
  if (data.linkState === undefined) critical.push('linkState:MISSING');
  else if (data.linkState === null) linkState = { value: null, known: true };
  else if (isNonEmptyString(data.linkState)) {
    linkState = { value: data.linkState, known: LINK_STATES.includes(data.linkState) };
    if (!linkState.known) problems.push(`linkState:UNKNOWN_VALUE(${JSON.stringify(data.linkState)})`);
  } else critical.push('linkState:NOT_A_STRING_OR_NULL');

  // linkedScanId — a text or null
  let linkedScanId = null;
  if (data.linkedScanId === undefined) critical.push('linkedScanId:MISSING');
  else if (data.linkedScanId === null) linkedScanId = null;
  else if (isNonEmptyString(data.linkedScanId)) linkedScanId = data.linkedScanId;
  else critical.push('linkedScanId:NOT_A_STRING_OR_NULL');

  // correctionSeq — the appended line's number, null when nothing changed
  let correctionSeq = null;
  if (data.correctionSeq === undefined) critical.push('correctionSeq:MISSING');
  else if (data.correctionSeq === null) correctionSeq = null;
  else if (isPositiveInt(data.correctionSeq)) correctionSeq = data.correctionSeq;
  else critical.push('correctionSeq:NOT_A_POSITIVE_INTEGER_OR_NULL');

  if (critical.length > 0) return { ok: false, problems: critical };

  // ---- what the contract says must agree (declared, not blocking) ----------
  if (changed === true && correctionSeq === null) problems.push('correctionSeq:NULL_WHILE_CHANGED');
  if (changed === false && correctionSeq !== null) problems.push('correctionSeq:SET_WHILE_UNCHANGED');

  const linkValue = linkState.value;
  if (basis === CORRECTION_BASIS.REPORT_ONLY) {
    // an older scan has no scanProtocol: the line carries no link fields (A11 (3))
    if (linkValue !== null || linkedScanId !== null) problems.push('link:SET_FOR_REPORT_ONLY');
    if (action === CORRECTION_ACTION.UNLINK || action === CORRECTION_ACTION.RELINK) {
      problems.push('basis:REPORT_ONLY_WITH_A_LINK_ACTION');
    }
  } else if (linkValue === null) {
    problems.push('linkState:NULL_FOR_SCAN_PROTOCOL');
  }

  if (action === CORRECTION_ACTION.EXCLUDE) {
    if (exclusion.view !== EXCLUSION_VIEW.EXCLUDED) problems.push('exclusion:NOT_EXCLUDED_AFTER_exclude');
    else if (sent && sent[CORRECTION_REQUEST_KEY.REASON] !== undefined && exclusion.reasonCode !== sent[CORRECTION_REQUEST_KEY.REASON]) {
      problems.push('exclusion.reasonCode:DIFFERS_FROM_THE_REQUEST');
    }
  } else if (action === CORRECTION_ACTION.UNEXCLUDE) {
    if (exclusion.view === EXCLUSION_VIEW.EXCLUDED) problems.push('exclusion:STILL_EXCLUDED_AFTER_unexclude');
    else if (changed === true && exclusion.view !== EXCLUSION_VIEW.NOT_EXCLUDED) {
      problems.push('exclusion:NOT_not_excluded_AFTER_A_CHANGED_unexclude');
    }
  } else if (action === CORRECTION_ACTION.UNLINK) {
    if (basis === CORRECTION_BASIS.SCAN_PROTOCOL && linkValue !== LINK_STATE.UNLINKED_BY_ADMIN) {
      problems.push('linkState:NOT_unlinked_by_admin_AFTER_unlink');
    }
  } else if (action === CORRECTION_ACTION.RELINK) {
    if (basis === CORRECTION_BASIS.SCAN_PROTOCOL) {
      if (linkValue !== LINK_STATE.RELINKED_BY_ADMIN) problems.push('linkState:NOT_relinked_by_admin_AFTER_relink');
      const wanted = sent ? sent[CORRECTION_REQUEST_KEY.TO_SCAN_ID] : undefined;
      if (wanted !== undefined && linkedScanId !== wanted) problems.push('linkedScanId:DIFFERS_FROM_THE_REQUEST');
    }
  }

  return {
    ok: true,
    scanId,
    action,
    changed,
    basis,
    exclusion,
    linkState,
    linkedScanId,
    correctionSeq,
    problems,
  };
}
