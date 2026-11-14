'use strict';

// W-P6-18 — the wire names, the reader of what correctProtocolRecord returns
// (lib/protocolCorrectionReaders.js) and the payload builder of the form
// (lib/protocolCorrectionPatch.js).
//
// What is under test is what the READER makes of each value, for every value the
// server can send (rule 30), not that a sample arrives:
//   - action × basis × changed, each value and a value the reader does not know;
//   - exclusion: null, every (state × reason) the contract names, an unknown
//     state, an unknown reason, every shape that is not the contract's;
//   - linkState: each of the plan's five, an unknown text, null, a non-text;
//   - correctionSeq and linkedScanId in every state;
//   - what the contract says about the state AFTER each action (declared, not
//     blocking) and a reply that is not an answer to the request;
//   - a refusal: all 22 codes the contract names, a code of another contract,
//     the code taken from `details.reasonCode` while the message says something
//     else (rule 21);
//   - the payload of each of the four actions, the keys that must NOT travel,
//     and every reason a form cannot be sent.
//
// SAMPLES: scripts/test/_protocol-correction-wire-samples.cjs — «اصطناعية من
// العقد، لا من مُنتِج حقيقي» (neuralcheck-backend@5361116 A11; the function is in
// the production list at 488e3ee). Not checked against neuralcheck-backend by this
// test (outside this repo).
//
// Run: node scripts/test/protocolCorrectionReaders.test.cjs

require('./_jsx-require-hook.cjs');
const S = require('./_protocol-correction-wire-samples.cjs');
const SA = require('./_protocol-admin-wire-samples.cjs');
const W = require('@/lib/protocolCorrectionWire');
const R = require('@/lib/protocolCorrectionReaders');
const P = require('@/lib/protocolCorrectionPatch');
const RA = require('@/lib/protocolAdminReaders');

let pass = 0;
let total = 0;
function check(name, cond) {
  total += 1;
  if (cond) pass += 1;
  else console.error(`  FAIL: ${name}`);
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = (v) => JSON.parse(JSON.stringify(v));
const has = (r, p) => r.problems.some((x) => x === p || x.startsWith(p));

// ============================================================================
// 1. the wire
// ============================================================================
{
  check('the function name is the design\'s (P6:856)', W.PROTOCOL_CORRECTION_FN.CORRECT === 'correctProtocolRecord');
  check('the four actions, in the design\'s order', eq(W.CORRECTION_ACTIONS, ['unlink', 'relink', 'exclude', 'unexclude']));
  check('the design\'s fifth action is named and NOT among the four', eq(W.CORRECTION_ACTION_NOT_OFFERED, ['resolveIdentityConflict']) && !W.CORRECTION_ACTIONS.includes('resolveIdentityConflict'));
  check('the three exclusion reasons (P6:858)', eq(W.EXCLUDE_REASONS, ['test', 'wrong', 'golden_reference']));
  check('the two bases', eq(Object.values(W.CORRECTION_BASIS), ['SCAN_PROTOCOL', 'REPORT_ONLY']));
  check('the two exclusion states (E45)', eq(Object.values(W.EXCLUSION_STATE), ['excluded', 'not_excluded']));
  check('the five link states are the plan\'s (P6:490)', eq(W.LINK_STATES, ['none', 'active', 'missing', 'unlinked_by_admin', 'relinked_by_admin']));
  check('the request keys: action, scanId, shortId, toScanId, reason', eq(Object.values(W.CORRECTION_REQUEST_KEY), ['action', 'scanId', 'shortId', 'toScanId', 'reason']));
  check('the contract names 22 refusal codes: 13 invalid-argument, 6 failed-precondition, 3 not-found, all distinct and all CORRECTION_*',
    Object.keys(W.CORRECTION_REFUSAL_INVALID).length === 13 && Object.keys(W.CORRECTION_REFUSAL_PRECONDITION).length === 6 && Object.keys(W.CORRECTION_REFUSAL_NOT_FOUND).length === 3 &&
    W.KNOWN_CORRECTION_REFUSAL_CODES.length === 22 && new Set(W.KNOWN_CORRECTION_REFUSAL_CODES).size === 22 && W.KNOWN_CORRECTION_REFUSAL_CODES.every((c) => c.startsWith('CORRECTION_')));
  // The contract's own list, typed here from A11 (6) (the copy
  // protocol-contract-A8-A11-A12-neuralcheck-backend-5361116.md line 77), group by
  // group — a copy that pins every code's spelling, so a misspelt code on the
  // wire file cannot pass by agreeing with itself.
  const CONTRACT_INVALID = ['CORRECTION_ACTION_REQUIRED', 'CORRECTION_ACTION_INVALID', 'CORRECTION_FIELD_UNKNOWN', 'CORRECTION_FIELD_NOT_APPLICABLE', 'CORRECTION_TARGET_REQUIRED', 'CORRECTION_TARGET_AMBIGUOUS', 'CORRECTION_SCAN_ID_INVALID', 'CORRECTION_SHORT_ID_INVALID', 'CORRECTION_REASON_REQUIRED', 'CORRECTION_REASON_INVALID', 'CORRECTION_TO_SCAN_ID_REQUIRED', 'CORRECTION_TO_SCAN_ID_INVALID', 'CORRECTION_RELINK_SELF'];
  const CONTRACT_PRECONDITION = ['CORRECTION_ACTION_NOT_SPECIFIED', 'CORRECTION_SHORT_ID_AMBIGUOUS', 'CORRECTION_NO_PROTOCOL_RECORD', 'CORRECTION_NOT_LINKED', 'CORRECTION_LINK_STATE_UNKNOWN', 'CORRECTION_EXCLUSION_UNREADABLE'];
  const CONTRACT_NOT_FOUND = ['CORRECTION_SCAN_NOT_FOUND', 'CORRECTION_SHORT_ID_NOT_FOUND', 'CORRECTION_RELINK_TARGET_NOT_FOUND'];
  check("the invalid-argument codes are the contract's, spelt as it spells them (13)", eq(Object.values(W.CORRECTION_REFUSAL_INVALID).sort(), [...CONTRACT_INVALID].sort()));
  check("the failed-precondition codes are the contract's, spelt as it spells them (6)", eq(Object.values(W.CORRECTION_REFUSAL_PRECONDITION).sort(), [...CONTRACT_PRECONDITION].sort()));
  check("the not-found codes are the contract's, spelt as it spells them (3)", eq(Object.values(W.CORRECTION_REFUSAL_NOT_FOUND).sort(), [...CONTRACT_NOT_FOUND].sort()));
  check("the page's known set is exactly those 22", eq([...R.KNOWN_CORRECTION_REFUSALS].sort(), [...CONTRACT_INVALID, ...CONTRACT_PRECONDITION, ...CONTRACT_NOT_FOUND].sort()));
}

// ============================================================================
// 2. the reader — the six samples, each with the request that produces it
// ============================================================================
const SENT = {
  excluded: { action: 'exclude', scanId: 'fake-scan-1', reason: 'test' },
  unexcluded: { action: 'unexclude', scanId: 'fake-scan-1' },
  unlinked: { action: 'unlink', scanId: 'fake-scan-1' },
  relinked: { action: 'relink', scanId: 'fake-scan-1', toScanId: 'fake-scan-3' },
  unchanged: { action: 'exclude', shortId: 'NC-FAKE01', reason: 'test' },
  reportOnly: { action: 'exclude', scanId: 'fake-scan-old', reason: 'golden_reference' },
};
const SAMPLES = {
  excluded: S.correctionExcluded,
  unexcluded: S.correctionUnexcluded,
  unlinked: S.correctionUnlinked,
  relinked: S.correctionRelinked,
  unchanged: S.correctionUnchanged,
  reportOnly: S.correctionReportOnly,
};
{
  for (const [name, mk] of Object.entries(SAMPLES)) {
    const r = R.readCorrectionResult(mk(), SENT[name]);
    check(`sample ${name}: read ok, no problem, answering its request`, r.ok === true && eq(r.problems, []));
    const r2 = R.readCorrectionResult(mk());
    check(`sample ${name}: read ok without the request too`, r2.ok === true && eq(r2.problems, []));
  }
  let r = R.readCorrectionResult(S.correctionExcluded(), SENT.excluded);
  check('excluded: the fields as sent', r.scanId === 'fake-scan-1' && r.action === 'exclude' && r.changed === true && r.basis === 'SCAN_PROTOCOL' && r.correctionSeq === 1 && r.linkedScanId === 'fake-scan-2');
  check('excluded: the exclusion is EXCLUDED with the reason, known', r.exclusion.view === R.EXCLUSION_VIEW.EXCLUDED && r.exclusion.state === 'excluded' && r.exclusion.reasonCode === 'test' && r.exclusion.reasonKnown === true);
  check('excluded: the link state is the text and known', eq(r.linkState, { value: 'active', known: true }));
  r = R.readCorrectionResult(S.correctionUnlinked(), SENT.unlinked);
  check('unlinked: «no mark» is NONE — not «not excluded» (rule 22)', r.exclusion.view === R.EXCLUSION_VIEW.NONE && r.exclusion.state === null && r.exclusion.reasonCode === null);
  r = R.readCorrectionResult(S.correctionUnexcluded(), SENT.unexcluded);
  check('unexcluded: NOT_EXCLUDED with no reason (the mark stays, E45)', r.exclusion.view === R.EXCLUSION_VIEW.NOT_EXCLUDED && r.exclusion.reasonCode === null);
  r = R.readCorrectionResult(S.correctionUnchanged(), SENT.unchanged);
  check('unchanged: changed false, no appended line (correctionSeq null)', r.changed === false && r.correctionSeq === null);
  r = R.readCorrectionResult(S.correctionReportOnly(), SENT.reportOnly);
  check('report only: the basis, and the link fields are null — shown as null, not as a value', r.basis === 'REPORT_ONLY' && r.linkState.value === null && r.linkedScanId === null);
  check('a shortId request: the reply\'s scanId is the resolved one and is not compared', R.readCorrectionResult(S.correctionUnchanged(), SENT.unchanged).ok === true);
}

// ============================================================================
// 3. the reader — every value of every key (rule 30)
// ============================================================================
{
  const base = () => S.correctionExcluded();
  const mut = (f) => { const d = base(); f(d); return d; };

  // not an object
  for (const bad of [null, undefined, 'x', 7, [], true]) {
    const r = R.readCorrectionResult(bad);
    check(`reply ${JSON.stringify(bad)}: unreadable, response:NOT_AN_OBJECT`, r.ok === false && eq(r.problems, ['response:NOT_AN_OBJECT']));
  }

  // scanId
  check('scanId missing / empty / not a text: unreadable', [undefined, '', 5, null].every((v) => { const r = R.readCorrectionResult(mut((d) => { d.scanId = v; })); return r.ok === false && has(r, 'scanId:MISSING'); }));
  check('scanId that is not the one asked for: unreadable (never drawn)', (() => { const r = R.readCorrectionResult(base(), { action: 'exclude', scanId: 'someone-else', reason: 'test' }); return r.ok === false && has(r, 'scanId:DOES_NOT_MATCH_THE_REQUEST'); })());

  // action — all four, and what it must not be
  for (const a of W.CORRECTION_ACTIONS) {
    const d = mut((x) => { x.action = a; x.exclusion = null; x.linkState = 'unlinked_by_admin'; });
    check(`action ${a}: readable`, R.readCorrectionResult(d).ok === true && R.readCorrectionResult(d).action === a);
  }
  for (const bad of ['resolveIdentityConflict', 'delete', 'EXCLUDE', '', null, 3]) {
    const r = R.readCorrectionResult(mut((d) => { d.action = bad; }));
    check(`action ${JSON.stringify(bad)}: unreadable`, r.ok === false && r.problems.some((p) => p.startsWith('action:')));
  }
  check('action missing: unreadable', R.readCorrectionResult(mut((d) => { delete d.action; })).ok === false);
  check('action that is not the one sent: unreadable (never drawn)', (() => { const r = R.readCorrectionResult(base(), { action: 'unexclude', scanId: 'fake-scan-1' }); return r.ok === false && has(r, 'action:DOES_NOT_MATCH_THE_REQUEST'); })());

  // changed
  for (const v of [true, false]) check(`changed ${v}: readable`, R.readCorrectionResult(mut((d) => { d.changed = v; d.correctionSeq = v ? 1 : null; })).changed === v);
  for (const v of ['true', 'false', 1, 0, null, undefined]) check(`changed ${JSON.stringify(v)}: unreadable`, (() => { const r = R.readCorrectionResult(mut((d) => { d.changed = v; })); return r.ok === false && has(r, 'changed:NOT_A_BOOLEAN'); })());

  // basis
  for (const b of ['SCAN_PROTOCOL', 'REPORT_ONLY']) check(`basis ${b}: readable`, R.readCorrectionResult(mut((d) => { d.basis = b; if (b === 'REPORT_ONLY') { d.linkState = null; d.linkedScanId = null; } })).basis === b);
  for (const b of ['WEIRD', 'scan_protocol', '', null, 4]) check(`basis ${JSON.stringify(b)}: unreadable`, (() => { const r = R.readCorrectionResult(mut((d) => { d.basis = b; })); return r.ok === false && r.problems.some((p) => p.startsWith('basis:')); })());
  check('basis missing: unreadable', R.readCorrectionResult(mut((d) => { delete d.basis; })).ok === false);

  // exclusion — every (state × reason) the contract names
  const EX = (state, reasonCode) => mut((d) => { d.action = 'unlink'; d.linkState = 'unlinked_by_admin'; d.exclusion = { state, reasonCode }; });
  for (const reason of W.EXCLUDE_REASONS) {
    const r = R.readCorrectionResult(EX('excluded', reason));
    check(`exclusion excluded × ${reason}: EXCLUDED, the reason known, no problem`, r.ok && r.exclusion.view === 'EXCLUDED' && r.exclusion.reasonCode === reason && r.exclusion.reasonKnown === true && eq(r.problems, []));
  }
  {
    const r = R.readCorrectionResult(EX('not_excluded', null));
    check('exclusion not_excluded × null: NOT_EXCLUDED, no problem', r.ok && r.exclusion.view === 'NOT_EXCLUDED' && eq(r.problems, []));
  }
  {
    const r = R.readCorrectionResult(mut((d) => { d.action = 'unlink'; d.linkState = 'unlinked_by_admin'; d.exclusion = null; }));
    check('exclusion null: NONE, no problem', r.ok && r.exclusion.view === 'NONE' && eq(r.problems, []));
  }
  {
    const r = R.readCorrectionResult(EX('quarantined', null));
    check('exclusion with a state the reader does not know: drawn, UNKNOWN_STATE, the raw state kept, the problem declared', r.ok && r.exclusion.view === 'UNKNOWN_STATE' && r.exclusion.state === 'quarantined' && has(r, 'exclusion.state:UNKNOWN_VALUE'));
  }
  {
    const r = R.readCorrectionResult(EX('excluded', 'duplicate'));
    check('exclusion with a reason the reader does not know: drawn, flagged not known, declared', r.ok && r.exclusion.reasonKnown === false && r.exclusion.reasonCode === 'duplicate' && has(r, 'exclusion.reasonCode:UNKNOWN_VALUE'));
  }
  check('exclusion excluded with a null reason: declared', has(R.readCorrectionResult(EX('excluded', null)), 'exclusion.reasonCode:NULL_WHILE_EXCLUDED'));
  check('exclusion not_excluded with a reason: declared', has(R.readCorrectionResult(EX('not_excluded', 'test')), 'exclusion.reasonCode:SET_WHILE_NOT_EXCLUDED'));
  check('exclusion with a key the contract does not name: declared, drawn', (() => { const r = R.readCorrectionResult(mut((d) => { d.exclusion.at = 1760000000000; })); return r.ok && has(r, 'exclusion:UNKNOWN_KEY(at)'); })());
  const exclBad = [
    ['absent (undefined)', (d) => { delete d.exclusion; }, 'exclusion:MISSING'],
    ['a text', (d) => { d.exclusion = 'excluded'; }, 'exclusion:NOT_AN_OBJECT_OR_NULL'],
    ['a list', (d) => { d.exclusion = []; }, 'exclusion:NOT_AN_OBJECT_OR_NULL'],
    ['a number', (d) => { d.exclusion = 1; }, 'exclusion:NOT_AN_OBJECT_OR_NULL'],
    ['no state', (d) => { d.exclusion = { reasonCode: 'test' }; }, 'exclusion.state:MISSING'],
    ['a state that is not a text', (d) => { d.exclusion = { state: 3, reasonCode: 'test' }; }, 'exclusion.state:NOT_A_STRING'],
    ['an empty state', (d) => { d.exclusion = { state: '', reasonCode: 'test' }; }, 'exclusion.state:NOT_A_STRING'],
    ['no reasonCode', (d) => { d.exclusion = { state: 'excluded' }; }, 'exclusion.reasonCode:MISSING'],
    ['a reasonCode that is a number', (d) => { d.exclusion = { state: 'excluded', reasonCode: 4 }; }, 'exclusion.reasonCode:NOT_A_STRING_OR_NULL'],
  ];
  for (const [label, f, code] of exclBad) {
    const r = R.readCorrectionResult(mut(f));
    check(`exclusion ${label}: unreadable with ${code}`, r.ok === false && has(r, code));
  }

  // linkState
  for (const ls of W.LINK_STATES) {
    const r = R.readCorrectionResult(mut((d) => { d.action = 'exclude'; d.exclusion = { state: 'excluded', reasonCode: 'test' }; d.linkState = ls; }), { action: 'exclude', scanId: 'fake-scan-1', reason: 'test' });
    check(`linkState ${ls}: known`, r.ok && eq(r.linkState, { value: ls, known: true }) && eq(r.problems, []));
  }
  {
    const r = R.readCorrectionResult(mut((d) => { d.linkState = 'quarantined'; }));
    check('linkState a text the plan does not list: drawn as it came, flagged not known, declared', r.ok && eq(r.linkState, { value: 'quarantined', known: false }) && has(r, 'linkState:UNKNOWN_VALUE'));
  }
  {
    const r = R.readCorrectionResult(mut((d) => { d.linkState = null; }));
    check('linkState null on a scanProtocol basis: drawn as null, declared (no scan with a record has no link state)', r.ok && r.linkState.value === null && has(r, 'linkState:NULL_FOR_SCAN_PROTOCOL'));
  }
  for (const v of [3, true, {}, [], '']) check(`linkState ${JSON.stringify(v)}: unreadable`, (() => { const r = R.readCorrectionResult(mut((d) => { d.linkState = v; })); return r.ok === false && has(r, 'linkState:NOT_A_STRING_OR_NULL'); })());
  check('linkState missing: unreadable', (() => { const r = R.readCorrectionResult(mut((d) => { delete d.linkState; })); return r.ok === false && has(r, 'linkState:MISSING'); })());

  // linkedScanId
  check('linkedScanId a text / null: readable, as it came', R.readCorrectionResult(base()).linkedScanId === 'fake-scan-2' && R.readCorrectionResult(mut((d) => { d.linkedScanId = null; })).linkedScanId === null);
  for (const v of [3, true, {}, '']) check(`linkedScanId ${JSON.stringify(v)}: unreadable`, R.readCorrectionResult(mut((d) => { d.linkedScanId = v; })).ok === false);
  check('linkedScanId missing: unreadable', R.readCorrectionResult(mut((d) => { delete d.linkedScanId; })).ok === false);

  // correctionSeq
  for (const v of [1, 2, 41]) check(`correctionSeq ${v}: readable`, R.readCorrectionResult(mut((d) => { d.correctionSeq = v; })).correctionSeq === v);
  check('correctionSeq null with changed:false: readable, no problem', (() => { const r = R.readCorrectionResult(mut((d) => { d.changed = false; d.correctionSeq = null; })); return r.ok && r.correctionSeq === null && eq(r.problems, []); })());
  for (const v of [0, -1, 1.5, '1', true, {}, NaN]) check(`correctionSeq ${JSON.stringify(v)}: unreadable`, (() => { const r = R.readCorrectionResult(mut((d) => { d.correctionSeq = v; })); return r.ok === false && has(r, 'correctionSeq:NOT_A_POSITIVE_INTEGER_OR_NULL'); })());
  check('correctionSeq missing: unreadable', R.readCorrectionResult(mut((d) => { delete d.correctionSeq; })).ok === false);

  // consistency, declared and drawn
  check('changed true with no appended line: declared, drawn', (() => { const r = R.readCorrectionResult(mut((d) => { d.correctionSeq = null; })); return r.ok && has(r, 'correctionSeq:NULL_WHILE_CHANGED'); })());
  check('changed false with an appended line: declared, drawn', (() => { const r = R.readCorrectionResult(mut((d) => { d.changed = false; })); return r.ok && has(r, 'correctionSeq:SET_WHILE_UNCHANGED'); })());
  check('report only with link fields set: declared, drawn', (() => { const r = R.readCorrectionResult(mut((d) => { d.basis = 'REPORT_ONLY'; })); return r.ok && has(r, 'link:SET_FOR_REPORT_ONLY'); })());
  check('report only with a link action: declared (the server refuses it: CORRECTION_NO_PROTOCOL_RECORD)', (() => { const r = R.readCorrectionResult(mut((d) => { d.basis = 'REPORT_ONLY'; d.action = 'unlink'; d.linkState = null; d.linkedScanId = null; d.exclusion = null; })); return r.ok && has(r, 'basis:REPORT_ONLY_WITH_A_LINK_ACTION'); })());

  // the state AFTER each action (A11 (2), (4))
  check('exclude answered «not excluded»: declared', (() => { const r = R.readCorrectionResult(mut((d) => { d.exclusion = { state: 'not_excluded', reasonCode: null }; }), SENT.excluded); return r.ok && has(r, 'exclusion:NOT_EXCLUDED_AFTER_exclude'); })());
  check('exclude answered with no mark: declared', (() => { const r = R.readCorrectionResult(mut((d) => { d.exclusion = null; }), SENT.excluded); return r.ok && has(r, 'exclusion:NOT_EXCLUDED_AFTER_exclude'); })());
  check('exclude answered with another reason than the one sent: declared', (() => { const r = R.readCorrectionResult(mut((d) => { d.exclusion = { state: 'excluded', reasonCode: 'wrong' }; }), SENT.excluded); return r.ok && has(r, 'exclusion.reasonCode:DIFFERS_FROM_THE_REQUEST'); })());
  check('unexclude answered «excluded»: declared', (() => { const r = R.readCorrectionResult(mut((d) => { d.action = 'unexclude'; }), SENT.unexcluded); return r.ok && has(r, 'exclusion:STILL_EXCLUDED_AFTER_unexclude'); })());
  check('a CHANGED unexclude answered with no mark: declared', (() => { const r = R.readCorrectionResult(mut((d) => { d.action = 'unexclude'; d.exclusion = null; }), SENT.unexcluded); return r.ok && has(r, 'exclusion:NOT_not_excluded_AFTER_A_CHANGED_unexclude'); })());
  check('an UNCHANGED unexclude with no mark is fine (nothing to undo)', (() => { const r = R.readCorrectionResult(mut((d) => { d.action = 'unexclude'; d.exclusion = null; d.changed = false; d.correctionSeq = null; }), SENT.unexcluded); return r.ok && eq(r.problems, []); })());
  check('unlink answered with another link state: declared', (() => { const r = R.readCorrectionResult(mut((d) => { d.action = 'unlink'; d.exclusion = null; }), SENT.unlinked); return r.ok && has(r, 'linkState:NOT_unlinked_by_admin_AFTER_unlink'); })());
  check('relink answered with another link state: declared', (() => { const r = R.readCorrectionResult(S.correctionRelinked(), SENT.relinked); return r.ok && eq(r.problems, []); })() && (() => { const d = S.correctionRelinked(); d.linkState = 'active'; const r = R.readCorrectionResult(d, SENT.relinked); return r.ok && has(r, 'linkState:NOT_relinked_by_admin_AFTER_relink'); })());
  check('relink answered with another target than the one sent: declared', (() => { const d = S.correctionRelinked(); d.linkedScanId = 'fake-scan-9'; const r = R.readCorrectionResult(d, SENT.relinked); return r.ok && has(r, 'linkedScanId:DIFFERS_FROM_THE_REQUEST'); })());

  // an unreadable reply never yields a partial result
  const bad = R.readCorrectionResult(mut((d) => { d.basis = 'WEIRD'; d.changed = 'x'; }));
  check('an unreadable reply carries only ok:false and the problems — nothing is drawn from it', eq(Object.keys(bad).sort(), ['ok', 'problems']) && bad.problems.length === 2);
}

// ============================================================================
// 4. a refusal — by details.reasonCode, never by the text (rule 21)
// ============================================================================
{
  for (const code of W.KNOWN_CORRECTION_REFUSAL_CODES) {
    const c = RA.classifyCallError(SA.refusal(code), R.KNOWN_CORRECTION_REFUSALS);
    check(`refusal ${code}: read from details.reasonCode, known to this contract`, c.reasonCode === code && c.known === true);
  }
  const f = RA.classifyCallError(SA.refusal('CORRECTION_FIELD_NOT_APPLICABLE', 'toScanId'), R.KNOWN_CORRECTION_REFUSALS);
  check('a refusal that names a field: the field is read from details.field', f.field === 'toScanId' && f.known === true);
  const other = RA.classifyCallError(SA.refusal('SETTINGS_FIELD_INVALID', 'repeatRate'), R.KNOWN_CORRECTION_REFUSALS);
  check('a code of ANOTHER contract (A10) is read, and is not known to this page\'s contract', other.reasonCode === 'SETTINGS_FIELD_INVALID' && other.known === false);
  const unk = RA.classifyCallError(SA.refusal('CORRECTION_SOMETHING_NEW'), R.KNOWN_CORRECTION_REFUSALS);
  check('a code the contract does not name: read, not known', unk.reasonCode === 'CORRECTION_SOMETHING_NEW' && unk.known === false);
  const dflt = RA.classifyCallError(SA.refusal('CORRECTION_SCAN_NOT_FOUND'));
  check('the DEFAULT set is still A10\'s (the settings and shops pages): a correction code is not known there', dflt.reasonCode === 'CORRECTION_SCAN_NOT_FOUND' && dflt.known === false && RA.classifyCallError(SA.refusal('SHOP_NOT_FOUND')).known === true);
  const clash = { code: 'functions/not-found', message: 'CORRECTION_SCAN_NOT_FOUND', details: { reasonCode: 'CORRECTION_NOT_LINKED' } };
  check('the code comes from details while the message says another known code', RA.classifyCallError(clash, R.KNOWN_CORRECTION_REFUSALS).reasonCode === 'CORRECTION_NOT_LINKED');
  const onlyMessage = { code: 'functions/not-found', message: 'CORRECTION_SCAN_NOT_FOUND' };
  const om = RA.classifyCallError(onlyMessage, R.KNOWN_CORRECTION_REFUSALS);
  check('a message that is a known code, with no details: NO reason code (never read from the text), the SDK code is kept', om.reasonCode === null && om.known === false && om.transportCode === 'functions/not-found');
  const admin = RA.classifyCallError({ code: 'functions/permission-denied', message: 'صلاحية Admin مطلوبة' }, R.KNOWN_CORRECTION_REFUSALS);
  check('the admin refusals carry no reasonCode: only the SDK code', admin.reasonCode === null && admin.transportCode === 'functions/permission-denied');
  let readMessage = false;
  const trap = { code: 'x', get message() { readMessage = true; return 'm'; }, details: { reasonCode: 'CORRECTION_RELINK_SELF' } };
  RA.classifyCallError(trap, R.KNOWN_CORRECTION_REFUSALS);
  check('the exception\'s message is never read', readMessage === false);
}

// ============================================================================
// 5. the payload builder
// ============================================================================
{
  check('the form starts with nothing chosen and nothing typed', eq(P.initialCorrectionForm(), { action: '', shortId: '', scanId: '', toScanId: '', reason: '' }));
  const f = (o) => ({ ...P.initialCorrectionForm(), ...o });
  const build = (o) => P.buildCorrectionPayload(f(o));

  // the exact payload of each action
  check('unlink by scanId: { action, scanId } and nothing else', eq(build({ action: 'unlink', scanId: 'fake-scan-1' }), { payload: { action: 'unlink', scanId: 'fake-scan-1' }, problems: [] }));
  check('unlink by report code: { action, shortId }', eq(build({ action: 'unlink', shortId: 'NC-FAKE01' }).payload, { action: 'unlink', shortId: 'NC-FAKE01' }));
  check('relink: { action, scanId, toScanId }', eq(build({ action: 'relink', scanId: 'fake-scan-1', toScanId: 'fake-scan-3' }).payload, { action: 'relink', scanId: 'fake-scan-1', toScanId: 'fake-scan-3' }));
  for (const reason of W.EXCLUDE_REASONS) {
    check(`exclude × ${reason}: { action, target, reason }`, eq(build({ action: 'exclude', shortId: 'NC-FAKE01', reason }).payload, { action: 'exclude', shortId: 'NC-FAKE01', reason }));
  }
  check('unexclude: { action, scanId }', eq(build({ action: 'unexclude', scanId: 'fake-scan-1' }).payload, { action: 'unexclude', scanId: 'fake-scan-1' }));

  // what must NOT travel: the values left in the form from another action
  const dirty = { shortId: '', scanId: 'fake-scan-1', toScanId: 'fake-scan-3', reason: 'wrong' };
  check('unlink with a stale toScanId and reason: neither is sent (the server refuses a key that does not apply)', eq(build({ action: 'unlink', ...dirty }).payload, { action: 'unlink', scanId: 'fake-scan-1' }));
  check('unexclude with a stale toScanId and reason: neither is sent', eq(build({ action: 'unexclude', ...dirty }).payload, { action: 'unexclude', scanId: 'fake-scan-1' }));
  check('relink with a stale reason: no reason', eq(build({ action: 'relink', ...dirty }).payload, { action: 'relink', scanId: 'fake-scan-1', toScanId: 'fake-scan-3' }));
  check('exclude with a stale toScanId: no toScanId', eq(build({ action: 'exclude', ...dirty }).payload, { action: 'exclude', scanId: 'fake-scan-1', reason: 'wrong' }));
  check('a space typed at an end of an id is not part of it', eq(build({ action: 'unlink', shortId: '  NC-FAKE01 ' }).payload, { action: 'unlink', shortId: 'NC-FAKE01' }) && eq(build({ action: 'relink', scanId: ' a ', toScanId: ' b ' }).payload, { action: 'relink', scanId: 'a', toScanId: 'b' }));
  check('the report code is sent as typed (the server normalises it; the site does not upper-case)', build({ action: 'unlink', shortId: 'nc-fake01' }).payload.shortId === 'nc-fake01');

  // every reason a form cannot be sent
  const probs = (o) => build(o).problems;
  check('nothing chosen: no action and no target', eq(probs({}), ['NO_ACTION', 'NO_TARGET']));
  check('an action that is not one of the four (the design\'s fifth, a delete, a case) is NO_ACTION', ['resolveIdentityConflict', 'delete', 'EXCLUDE', 'remove', 3, null, undefined].every((a) => probs({ action: a, scanId: 'x' }).includes('NO_ACTION') && build({ action: a, scanId: 'x' }).payload === null));
  check('no target', eq(probs({ action: 'unlink' }), ['NO_TARGET']) && eq(probs({ action: 'unlink', shortId: '   ', scanId: '  ' }), ['NO_TARGET']));
  check('both targets are refused, not decided', eq(probs({ action: 'unlink', shortId: 'NC-FAKE01', scanId: 'fake-scan-1' }), ['BOTH_TARGETS']));
  check('relink without toScanId (empty, spaces)', eq(probs({ action: 'relink', scanId: 'x' }), ['NO_TO_SCAN_ID']) && eq(probs({ action: 'relink', scanId: 'x', toScanId: '   ' }), ['NO_TO_SCAN_ID']));
  check('exclude without a reason, or with one that is not of the three', eq(probs({ action: 'exclude', scanId: 'x' }), ['NO_REASON']) && eq(probs({ action: 'exclude', scanId: 'x', reason: 'other' }), ['NO_REASON']) && eq(probs({ action: 'exclude', scanId: 'x', reason: 'TEST' }), ['NO_REASON']));
  check('several problems at once are all named, in order', eq(probs({ action: 'relink', shortId: 'a', scanId: 'b' }), ['BOTH_TARGETS', 'NO_TO_SCAN_ID']));
  check('no payload while there is a problem', build({ action: 'exclude', scanId: 'x' }).payload === null && build({}).payload === null);
  check('a form that is not an object does not throw', P.buildCorrectionPayload(null).payload === null && P.buildCorrectionPayload(undefined).payload === null && P.buildCorrectionPayload('x').payload === null);

  // sweep: every action × target kind × reason × a stale-value setting
  let sweepOk = true;
  const KEYS = new Set(Object.values(W.CORRECTION_REQUEST_KEY));
  for (const action of W.CORRECTION_ACTIONS) {
    for (const target of [{ shortId: 'NC-FAKE01' }, { scanId: 'fake-scan-1' }]) {
      for (const reason of ['', ...W.EXCLUDE_REASONS]) {
        for (const toScanId of ['', 'fake-scan-3']) {
          const { payload, problems } = build({ action, ...target, reason, toScanId });
          if (payload === null) continue; // a problem: covered above
          const keys = Object.keys(payload);
          const targets = keys.filter((k) => k === 'scanId' || k === 'shortId');
          const okKeys = keys.every((k) => KEYS.has(k)) && targets.length === 1;
          const okApplies = (keys.includes('toScanId') === (action === 'relink')) && (keys.includes('reason') === (action === 'exclude'));
          if (!okKeys || !okApplies || problems.length !== 0) sweepOk = false;
        }
      }
    }
  }
  check('sweep: in every sendable combination the payload has exactly one target, only keys of the contract, toScanId only for relink, reason only for exclude', sweepOk);
}

console.log(`${pass}/${total} assertions passed`);
process.exit(pass === total ? 0 : 1);
