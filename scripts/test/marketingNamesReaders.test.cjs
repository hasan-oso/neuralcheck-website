'use strict';

// W-P6-20 — the wire names, the readers of what getMarketingNames and
// setMarketingNames return (lib/marketingNamesReaders.js) and the patch builder
// of the rows (lib/marketingNamesPatch.js).
//
// What is under test is what the READER makes of each value, for every value the
// server can send (rule 30), not that a sample arrives:
//   - state × anomaly: the three states against null, each of the five anomalies,
//     a value the reader does not know, and an absence — what view each pair
//     gives, and which pairs contradict themselves;
//   - version, entries (every shape of an entry, a duplicate model, a non-empty
//     list where the server promises `[]`), updatedAtMs / updatedBy, and each of
//     the three limits in every state;
//   - the reply of setMarketingNames, for every wrong type;
//   - a refusal: the five codes the contract names, a code of another contract,
//     the code taken from `details.reasonCode` (rule 21);
//   - the patch: only what changed or was added, with the four keys, never a
//     delete, never a silent overwrite of a saved entry, and every reason a row
//     cannot be sent.
//
// SAMPLES: scripts/test/_marketing-names-wire-samples.cjs — «اصطناعية من
// العقد، لا من مُنتِج حقيقي» (neuralcheck-backend@5361116 A12; the functions are in
// the production list at 488e3ee). Not checked against neuralcheck-backend by this
// test (outside this repo).
//
// Run: node scripts/test/marketingNamesReaders.test.cjs

require('./_jsx-require-hook.cjs');
const S = require('./_marketing-names-wire-samples.cjs');
const SA = require('./_protocol-admin-wire-samples.cjs');
const W = require('@/lib/marketingNamesWire');
const R = require('@/lib/marketingNamesReaders');
const P = require('@/lib/marketingNamesPatch');
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
  check('the two function names (A12 (2), (3))', eq(W.MARKETING_NAMES_FN, { GET: 'getMarketingNames', SET: 'setMarketingNames' }));
  check('the three states', eq(Object.values(W.MARKETING_STATE), ['PRESENT', 'ABSENT', 'UNREADABLE']));
  check('the five anomalies, as the contract lists them (A12 (3))', eq(W.MARKETING_ANOMALIES, ['DOCUMENT_NOT_AN_OBJECT', 'VERSION_UNUSABLE', 'ENTRIES_NOT_AN_ARRAY', 'ENTRY_UNUSABLE', 'DUPLICATE_MODEL']));
  check('an entry has exactly four keys, all required (E14)', eq(W.MARKETING_ENTRY_KEYS, ['model', 'ar', 'tr', 'en']) && eq(W.MARKETING_NAME_KEYS, ['ar', 'tr', 'en']));
  check('the three limits (A12 (3))', eq(W.MARKETING_LIMIT_KEYS, ['maxEntries', 'modelMaxLength', 'nameMaxLength']));
  check('the request key of setMarketingNames', eq(W.MARKETING_REQUEST_KEY, { ENTRIES: 'entries' }));
  // the contract's own list of refusal codes, typed from A12 (5) (the copy
  // protocol-contract-A8-A11-A12-neuralcheck-backend-5361116.md line 94)
  const CONTRACT = ['MARKETING_NAMES_ENTRIES_REQUIRED', 'MARKETING_NAMES_TOO_MANY_ENTRIES', 'MARKETING_NAMES_ENTRY_INVALID', 'MARKETING_NAMES_DUPLICATE_MODEL', 'MARKETING_NAMES_CURRENT_UNREADABLE'];
  check("the five refusal codes are the contract's, spelt as it spells them", eq([...W.KNOWN_MARKETING_REFUSAL_CODES].sort(), [...CONTRACT].sort()) && eq([...R.KNOWN_MARKETING_REFUSALS].sort(), [...CONTRACT].sort()));
}

// ============================================================================
// 2. getMarketingNames — the samples
// ============================================================================
{
  let r = R.readMarketingNames(S.marketingPresent());
  check('present: view PRESENT, version 3, anomaly null, no problems', r.view === R.MARKETING_VIEW.PRESENT && r.version === 3 && r.anomaly === null && eq(r.problems, []));
  check('present: the entries in the server\'s order, four keys each', eq(r.entries, S.marketingPresent().entries) && r.entries.length === 2);
  check('present: updatedAtMs and updatedBy as sent', r.updatedAtMs === 1760000000000 && r.updatedBy === 'FAKE-HASH-ADMIN-1');
  check('present: the three limits, each present, with the contract\'s numbers', r.limits.state === 'PRESENT' && eq(['maxEntries', 'modelMaxLength', 'nameMaxLength'].map((k) => r.limits[k]), [{ state: 'PRESENT', value: 1000 }, { state: 'PRESENT', value: 64 }, { state: 'PRESENT', value: 120 }]) && eq(r.limits.unknownKeys, []));

  r = R.readMarketingNames(S.marketingAbsent());
  check('absent: view ABSENT, NO entry, no version, no problems — the map starts absent', r.view === R.MARKETING_VIEW.ABSENT && eq(r.entries, []) && r.version === null && r.anomaly === null && eq(r.problems, []));
  check('absent: nothing of the map is invented (updatedAtMs and updatedBy stay null)', r.updatedAtMs === null && r.updatedBy === null);

  for (const a of S.MARKETING_ANOMALIES) {
    for (const version of [null, 3]) {
      const x = R.readMarketingNames(S.marketingUnreadable(a, version));
      check(`unreadable × ${a} (version ${version}): STORED_UNREADABLE, the anomaly kept, no entry`, x.view === R.MARKETING_VIEW.STORED_UNREADABLE && x.anomaly === a && x.state === 'UNREADABLE' && eq(x.entries, []) && eq(x.problems, []));
    }
  }
}

// ============================================================================
// 3. state × anomaly (rule 30): every pair
// ============================================================================
{
  const STATES = ['PRESENT', 'ABSENT', 'UNREADABLE', 'WEIRD', undefined];
  const ANOMALIES = [null, ...S.MARKETING_ANOMALIES, 'WEIRD', undefined];
  const baseFor = (state) => (state === 'PRESENT' ? S.marketingPresent() : state === 'ABSENT' ? S.marketingAbsent() : S.marketingUnreadable('VERSION_UNUSABLE'));
  let expectedViews = 0;
  for (const state of STATES) {
    for (const anomaly of ANOMALIES) {
      const d = baseFor(state === 'WEIRD' || state === undefined ? 'PRESENT' : state);
      if (state === undefined) delete d.state; else d.state = state;
      if (anomaly === undefined) delete d.anomaly; else d.anomaly = anomaly;
      const r = R.readMarketingNames(d);
      let want;
      const known = ['PRESENT', 'ABSENT', 'UNREADABLE'].includes(state);
      const anomalyKnown = anomaly === null || S.MARKETING_ANOMALIES.includes(anomaly);
      if (!known || !anomalyKnown) want = 'REPLY_UNREADABLE';
      else if (state === 'PRESENT') want = anomaly === null ? 'PRESENT' : 'REPLY_UNREADABLE';
      else if (state === 'ABSENT') want = anomaly === null ? 'ABSENT' : 'REPLY_UNREADABLE';
      else want = 'STORED_UNREADABLE';
      expectedViews += 1;
      check(`state ${JSON.stringify(state)} × anomaly ${JSON.stringify(anomaly)}: view ${want}`, r.view === want);
      if (want === 'REPLY_UNREADABLE') check(`state ${JSON.stringify(state)} × anomaly ${JSON.stringify(anomaly)}: never an entry from an unreadable reply`, eq(r.entries, []) && r.problems.length > 0);
    }
  }
  check('the matrix is 5 states × 8 anomalies', expectedViews === 40);
  const u = S.marketingUnreadable('ENTRY_UNUSABLE'); u.anomaly = null;
  const x = R.readMarketingNames(u);
  check('state UNREADABLE with no anomaly named: still STORED_UNREADABLE, the missing reason declared', x.view === 'STORED_UNREADABLE' && has(x, 'anomaly:NULL_WHILE_UNREADABLE'));
}

// ============================================================================
// 4. version, entries, the other keys, limits
// ============================================================================
{
  const mut = (f, base = S.marketingPresent) => { const d = base(); f(d); return d; };

  for (const v of [null, 0, -1, 1.5, '3', true, NaN]) {
    const r = R.readMarketingNames(mut((d) => { d.version = v; }));
    check(`PRESENT with version ${JSON.stringify(v)}: unreadable`, r.view === 'REPLY_UNREADABLE' && r.problems.some((p) => p.startsWith('version:')));
  }
  check('version missing: unreadable', R.readMarketingNames(mut((d) => { delete d.version; })).view === 'REPLY_UNREADABLE');
  check('version 1 and 41: readable', [1, 41].every((v) => R.readMarketingNames(mut((d) => { d.version = v; })).version === v));
  check('ABSENT with a version: contradiction, unreadable', has(R.readMarketingNames(mut((d) => { d.version = 2; }, S.marketingAbsent)), 'version:SET_WHILE_ABSENT'));

  // entries
  check('entries missing / not a list: unreadable', [undefined, null, {}, 'x', 5].every((v) => { const r = R.readMarketingNames(mut((d) => { if (v === undefined) delete d.entries; else d.entries = v; })); return r.view === 'REPLY_UNREADABLE' && r.problems.some((p) => p.startsWith('entries:')); }));
  check('PRESENT with no entry is readable (the contract does not forbid it): view PRESENT, an empty list', (() => { const r = R.readMarketingNames(mut((d) => { d.entries = []; })); return r.view === 'PRESENT' && eq(r.entries, []); })());
  for (const key of W.MARKETING_ENTRY_KEYS) {
    const missing = R.readMarketingNames(mut((d) => { delete d.entries[1][key]; }));
    check(`an entry without ${key}: the whole reply is unreadable, naming the key`, missing.view === 'REPLY_UNREADABLE' && has(missing, `entries[1].${key}:MISSING`) && eq(missing.entries, []));
    for (const bad of ['', 5, null, true, {}]) {
      const r = R.readMarketingNames(mut((d) => { d.entries[0][key] = bad; }));
      check(`an entry with ${key} = ${JSON.stringify(bad)}: unreadable`, r.view === 'REPLY_UNREADABLE' && has(r, `entries[0].${key}:NOT_A_NON_EMPTY_STRING`));
    }
  }
  check('an entry with a key the contract does not name: unreadable (rule 25: a new shape is not accepted silently)', has(R.readMarketingNames(mut((d) => { d.entries[0].notes = 'x'; })), 'entries[0]:UNKNOWN_KEY(notes)'));
  check('an entry that is not an object: unreadable', [null, 'x', 5, [], undefined].every((v) => R.readMarketingNames(mut((d) => { d.entries[1] = v; })).view === 'REPLY_UNREADABLE'));
  check('two entries with one model: unreadable (the server would have said DUPLICATE_MODEL)', has(R.readMarketingNames(mut((d) => { d.entries[1].model = d.entries[0].model; })), 'entries[1].model:DUPLICATE'));
  check('models that differ only by case or a space are NOT duplicates (the match is literal)', R.readMarketingNames(mut((d) => { d.entries[1].model = d.entries[0].model.toLowerCase(); })).view === 'PRESENT' && R.readMarketingNames(mut((d) => { d.entries[1].model = `${d.entries[0].model} `; })).view === 'PRESENT');
  check('ABSENT with entries: contradiction', has(R.readMarketingNames(mut((d) => { d.entries = S.marketingPresent().entries; }, S.marketingAbsent)), 'entries:NOT_EMPTY_WHILE_ABSENT'));
  check('UNREADABLE with entries: contradiction', has(R.readMarketingNames(mut((d) => { d.entries = S.marketingPresent().entries; }, () => S.marketingUnreadable('ENTRY_UNUSABLE'))), 'entries:NOT_EMPTY_WHILE_UNREADABLE'));
  check('the entries keep the server\'s order and the text exactly (no trim, no case change)', (() => { const r = R.readMarketingNames(mut((d) => { d.entries[0].model = ' Fake Model/1 '; d.entries[0].ar = ' x '; })); return r.view === 'PRESENT' && r.entries[0].model === ' Fake Model/1 ' && r.entries[0].ar === ' x '; })());

  // updatedAtMs / updatedBy — they do not decide the view
  for (const [label, f, p] of [
    ['updatedAtMs missing', (d) => { delete d.updatedAtMs; }, 'updatedAtMs:MISSING'],
    ['updatedAtMs a text', (d) => { d.updatedAtMs = 'x'; }, 'updatedAtMs:NOT_A_NUMBER'],
    ['updatedBy missing', (d) => { delete d.updatedBy; }, 'updatedBy:MISSING'],
    ['updatedBy a number', (d) => { d.updatedBy = 4; }, 'updatedBy:NOT_A_STRING'],
  ]) {
    const r = R.readMarketingNames(mut(f));
    check(`${label}: declared, the view stays PRESENT, shown as absent`, r.view === 'PRESENT' && has(r, p) && (r.updatedAtMs === null || r.updatedBy === null));
  }
  check('updatedAtMs null / updatedBy null on a PRESENT map: readable, no problem', (() => { const r = R.readMarketingNames(mut((d) => { d.updatedAtMs = null; d.updatedBy = null; })); return r.view === 'PRESENT' && eq(r.problems, []); })());

  // limits — each key in every state
  {
    const missing = R.readMarketingNames(mut((d) => { delete d.limits; }));
    check('limits missing: declared, the three are ABSENT, the view stays PRESENT', missing.view === 'PRESENT' && has(missing, 'limits:MISSING') && missing.limits.state === 'ABSENT' && W.MARKETING_LIMIT_KEYS.every((k) => missing.limits[k].state === 'ABSENT'));
    for (const bad of [null, 'x', [], 5]) {
      const r = R.readMarketingNames(mut((d) => { d.limits = bad; }));
      check(`limits ${JSON.stringify(bad)}: MALFORMED, the raw value kept, declared`, r.limits.state === 'MALFORMED' && eq(r.limits.raw, bad) && has(r, 'limits:NOT_AN_OBJECT') && r.view === 'PRESENT');
    }
    for (const key of W.MARKETING_LIMIT_KEYS) {
      const gone = R.readMarketingNames(mut((d) => { delete d.limits[key]; }));
      check(`limits.${key} missing: that one ABSENT (nothing assumed), the other two present, declared`, gone.limits[key].state === 'ABSENT' && W.MARKETING_LIMIT_KEYS.filter((k) => k !== key).every((k) => gone.limits[k].state === 'PRESENT') && has(gone, `limits.${key}:MISSING`));
      for (const bad of [0, -1, 1.5, '1000', null, true]) {
        const r = R.readMarketingNames(mut((d) => { d.limits[key] = bad; }));
        check(`limits.${key} = ${JSON.stringify(bad)}: MALFORMED with the raw value, declared`, r.limits[key].state === 'MALFORMED' && eq(r.limits[key].raw, bad) && has(r, `limits.${key}:NOT_A_POSITIVE_INTEGER`));
      }
    }
    const extra = R.readMarketingNames(mut((d) => { d.limits.somethingNew = 9; }));
    check('a limit key the reader does not know: listed, not read', eq(extra.limits.unknownKeys, ['somethingNew']) && extra.view === 'PRESENT');
  }

  // not an object
  for (const bad of [null, undefined, 'x', 7, [], true]) {
    const r = R.readMarketingNames(bad);
    check(`reply ${JSON.stringify(bad)}: REPLY_UNREADABLE, response:NOT_AN_OBJECT, no entry`, r.view === 'REPLY_UNREADABLE' && eq(r.problems, ['response:NOT_AN_OBJECT']) && eq(r.entries, []));
  }
}

// ============================================================================
// 5. the reply of setMarketingNames
// ============================================================================
{
  let r = R.readSetMarketingNamesResult(S.setMarketingChanged());
  check('changed sample: ok, version 4, 1 added, 1 updated, no problem', r.ok === true && r.changed === true && r.version === 4 && r.added === 1 && r.updated === 1 && eq(r.problems, []));
  r = R.readSetMarketingNamesResult(S.setMarketingUnchanged());
  check('unchanged sample: ok, changed false, version kept, 0 and 0', r.ok === true && r.changed === false && r.version === 3 && r.added === 0 && r.updated === 0 && eq(r.problems, []));
  const base = () => S.setMarketingChanged();
  const mut = (f) => { const d = base(); f(d); return R.readSetMarketingNamesResult(d); };
  for (const v of ['true', 1, 0, null, undefined]) check(`changed ${JSON.stringify(v)}: unreadable`, (() => { const x = mut((d) => { if (v === undefined) delete d.changed; else d.changed = v; }); return x.ok === false && x.problems.includes('changed:NOT_A_BOOLEAN'); })());
  for (const v of [0, -1, 1.5, '4', null, undefined]) check(`version ${JSON.stringify(v)}: unreadable`, (() => { const x = mut((d) => { if (v === undefined) delete d.version; else d.version = v; }); return x.ok === false && x.problems.includes('version:NOT_A_POSITIVE_INTEGER'); })());
  for (const key of ['added', 'updated']) {
    for (const v of [-1, 1.5, '1', null, undefined]) check(`${key} ${JSON.stringify(v)}: unreadable`, (() => { const x = mut((d) => { if (v === undefined) delete d[key]; else d[key] = v; }); return x.ok === false && x.problems.includes(`${key}:NOT_A_NON_NEGATIVE_INTEGER`); })());
    check(`${key} 0 and 7: readable`, mut((d) => { d[key] = 0; }).ok && mut((d) => { d[key] = 7; })[key] === 7);
  }
  check('changed false with something added: declared, still shown', (() => { const x = mut((d) => { d.changed = false; }); return x.ok && x.problems.includes('counts:SET_WHILE_UNCHANGED'); })());
  check('changed true with nothing added or updated: declared, still shown', (() => { const x = mut((d) => { d.added = 0; d.updated = 0; }); return x.ok && x.problems.includes('counts:ZERO_WHILE_CHANGED'); })());
  for (const bad of [null, undefined, 'x', [], 7]) check(`reply ${JSON.stringify(bad)}: unreadable`, R.readSetMarketingNamesResult(bad).ok === false);
  check('an unreadable reply carries only ok:false and the problems', eq(Object.keys(mut((d) => { d.changed = 'x'; d.version = 0; })).sort(), ['ok', 'problems']));
}

// ============================================================================
// 6. a refusal — by details.reasonCode, never by the text (rule 21)
// ============================================================================
{
  for (const code of W.KNOWN_MARKETING_REFUSAL_CODES) {
    const c = RA.classifyCallError(SA.refusal(code), R.KNOWN_MARKETING_REFUSALS);
    check(`refusal ${code}: read from details.reasonCode, known to this contract`, c.reasonCode === code && c.known === true);
  }
  const other = RA.classifyCallError(SA.refusal('CORRECTION_SCAN_NOT_FOUND'), R.KNOWN_MARKETING_REFUSALS);
  check('a code of ANOTHER contract (A11) is read, and is not known to this page\'s contract', other.reasonCode === 'CORRECTION_SCAN_NOT_FOUND' && other.known === false);
  const unk = RA.classifyCallError(SA.refusal('MARKETING_NAMES_SOMETHING_NEW'), R.KNOWN_MARKETING_REFUSALS);
  check('a code the contract does not name: read, not known', unk.reasonCode === 'MARKETING_NAMES_SOMETHING_NEW' && unk.known === false);
  const clash = { code: 'functions/failed-precondition', message: 'MARKETING_NAMES_ENTRIES_REQUIRED', details: { reasonCode: 'MARKETING_NAMES_DUPLICATE_MODEL' } };
  check('the code comes from details while the message says another known code', RA.classifyCallError(clash, R.KNOWN_MARKETING_REFUSALS).reasonCode === 'MARKETING_NAMES_DUPLICATE_MODEL');
  const om = RA.classifyCallError({ code: 'functions/invalid-argument', message: 'MARKETING_NAMES_ENTRY_INVALID' }, R.KNOWN_MARKETING_REFUSALS);
  check('a message that is a known code, with no details: NO reason code (never read from the text)', om.reasonCode === null && om.known === false);
}

// ============================================================================
// 7. the patch
// ============================================================================
{
  const read = R.readMarketingNames(S.marketingPresent());
  const rows0 = P.initialMarketingRows(read);
  check('the rows start from the saved entries: four keys, saved, in the server\'s order', rows0.length === 2 && rows0.every((r) => r.saved === true) && eq(rows0.map((r) => r.model), ['FAKE-MODEL-A', 'FAKE-MODEL-B']) && eq(rows0[0], { model: 'FAKE-MODEL-A', ar: 'FAKE-AR-A', tr: 'FAKE-TR-A', en: 'FAKE-EN-A', saved: true }));
  check('no row at all unless the map is PRESENT (absent, unreadable stored, unreadable reply)', eq(P.initialMarketingRows(R.readMarketingNames(S.marketingAbsent())), []) && eq(P.initialMarketingRows(R.readMarketingNames(S.marketingUnreadable('ENTRY_UNUSABLE'))), []) && eq(P.initialMarketingRows(R.readMarketingNames(null)), []) && eq(P.initialMarketingRows(null), []));
  check('a new row is blank, four empty texts, not saved', eq(P.newMarketingRow(), { model: '', ar: '', tr: '', en: '', saved: false }));

  const build = (rows, r = read) => P.buildMarketingPatch(r, rows);
  const edit = (i, o) => rows0.map((r, j) => (j === i ? { ...r, ...o } : r));
  const fresh = (o = {}) => ({ ...P.newMarketingRow(), ...o });
  const complete = (n, o = {}) => fresh({ model: `FAKE-NEW-${n}`, ar: `FAKE-AR-N${n}`, tr: `FAKE-TR-N${n}`, en: `FAKE-EN-N${n}`, ...o });

  check('nothing edited: an empty patch, no problem, nothing to count', eq(build(rows0), { entries: [], problems: [], counts: { updated: 0, added: 0 } }));
  check('one saved name edited: that entry alone, with its four keys and the saved model', eq(build(edit(1, { tr: 'FAKE-TR-B2' })), { entries: [{ model: 'FAKE-MODEL-B', ar: 'FAKE-AR-B', tr: 'FAKE-TR-B2', en: 'FAKE-EN-B' }], problems: [], counts: { updated: 1, added: 0 } }));
  check('every one of the three names, edited one at a time, makes the entry go', ['ar', 'tr', 'en'].every((k) => eq(build(edit(0, { [k]: 'FAKE-CHANGED' })).entries.length, 1)));
  check('two saved entries edited: both, in the saved order', eq(build(edit(0, { ar: 'X1' }).map((r, i) => (i === 1 ? { ...r, en: 'X2' } : r))).entries.map((e) => e.model), ['FAKE-MODEL-A', 'FAKE-MODEL-B']));
  check("a row flagged saved whose model is no longer a saved one (the panel never lets it be edited) is checked as a NEW row: it can add an entry, never overwrite one", (() => { const r = build(edit(0, { model: 'FAKE-OTHER', ar: 'Y' })); return eq(r.entries, [{ model: 'FAKE-OTHER', ar: 'Y', tr: 'FAKE-TR-A', en: 'FAKE-EN-A' }]) && r.counts.added === 1 && r.counts.updated === 0 && r.problems.length === 0; })());
  check('one new complete row: appended, four keys, counted as added', eq(build([...rows0, complete(1)]), { entries: [{ model: 'FAKE-NEW-1', ar: 'FAKE-AR-N1', tr: 'FAKE-TR-N1', en: 'FAKE-EN-N1' }], problems: [], counts: { updated: 0, added: 1 } }));
  check('changed saved entries come first, then the new ones in the order typed', eq(build([...edit(1, { ar: 'Z' }), complete(2), complete(1)]).entries.map((e) => e.model), ['FAKE-MODEL-B', 'FAKE-NEW-2', 'FAKE-NEW-1']));
  check('on an ABSENT map every complete new row is an added entry (the first write)', (() => { const r = P.buildMarketingPatch(R.readMarketingNames(S.marketingAbsent()), [complete(1), complete(2)]); return r.entries.length === 2 && r.counts.added === 2 && r.problems.length === 0; })());
  check('a blank new row (all four empty, or only spaces) is nothing: not sent, no problem', eq(build([...rows0, fresh(), fresh({ ar: '  ' })]), { entries: [], problems: [], counts: { updated: 0, added: 0 } }));
  // a new row with only some keys: incomplete, for every missing key
  for (const key of ['model', 'ar', 'tr', 'en']) {
    const row = complete(1, { [key]: '' });
    check(`a new row without ${key}: ROW_INCOMPLETE at its index, nothing sent from it`, eq(build([...rows0, row]).problems, [{ row: 2, problem: 'ROW_INCOMPLETE' }]) && build([...rows0, row]).entries.length === 0);
    check(`a new row with ${key} of spaces only: counts as empty — ROW_INCOMPLETE`, eq(build([...rows0, complete(1, { [key]: '   ' })]).problems, [{ row: 2, problem: 'ROW_INCOMPLETE' }]));
  }
  // a saved entry cannot be emptied
  for (const key of ['ar', 'tr', 'en']) {
    check(`a saved name emptied (${key}): CANNOT_CLEAR at its row, no patch`, eq(build(edit(1, { [key]: '' })).problems, [{ row: 1, problem: 'CANNOT_CLEAR' }]) && eq(build(edit(1, { [key]: '  ' })).problems, [{ row: 1, problem: 'CANNOT_CLEAR' }]) && build(edit(1, { [key]: '' })).entries.length === 0);
  }
  // a new row on a saved model would overwrite it silently
  check('a new row whose model is already saved: MODEL_ALREADY_SAVED, not sent (it would overwrite the saved names unopened)', eq(build([...rows0, complete(1, { model: 'FAKE-MODEL-A' })]).problems, [{ row: 2, problem: 'MODEL_ALREADY_SAVED' }]) && build([...rows0, complete(1, { model: 'FAKE-MODEL-A' })]).entries.length === 0);
  check('the match is LITERAL: another case or a space is another model, so it is a new entry', build([...rows0, complete(1, { model: 'fake-model-a' })]).problems.length === 0 && build([...rows0, complete(1, { model: 'FAKE-MODEL-A ' })]).problems.length === 0);
  check('two new rows with one model: the later one is MODEL_DUPLICATE', eq(build([...rows0, complete(1), complete(2, { model: 'FAKE-NEW-1' })]).problems, [{ row: 3, problem: 'MODEL_DUPLICATE' }]));
  check('the model is sent as typed — not trimmed (the server refuses an untrimmed one on purpose)', eq(build([...rows0, complete(1, { model: ' FAKE-NEW-1' })]).entries[0].model, ' FAKE-NEW-1'));
  check('the names are sent as typed — not trimmed, not changed', (() => { const e = build([...rows0, complete(1, { ar: ' FAKE ar ', en: 'FAKE  en' })]).entries[0]; return e.ar === ' FAKE ar ' && e.en === 'FAKE  en'; })());
  check('several problems at once are all named, by row', eq(build([...edit(0, { ar: '' }), complete(1, { en: '' }), complete(2, { model: 'FAKE-MODEL-B' })]).problems, [{ row: 0, problem: 'CANNOT_CLEAR' }, { row: 2, problem: 'ROW_INCOMPLETE' }, { row: 3, problem: 'MODEL_ALREADY_SAVED' }]));
  check('a row that says saved but is not in the reply is treated as a NEW row (checked like one)', eq(build([{ model: 'FAKE-GHOST', ar: 'a', tr: 'b', en: 'c', saved: true }]).entries, [{ model: 'FAKE-GHOST', ar: 'a', tr: 'b', en: 'c' }]));
  check('garbage in does not throw', P.buildMarketingPatch(null, null).entries.length === 0 && P.buildMarketingPatch(read, [null, 3, 'x']).problems.length === 0);

  // sweep: any patch sent has the four keys, only the four, a unique model, no delete
  let sweepOk = true;
  const KEYS = ['model', 'ar', 'tr', 'en'];
  const variants = [rows0, edit(0, { ar: 'E' }), [...rows0, complete(1)], [...edit(1, { en: 'E' }), complete(1), complete(2)], [complete(1)]];
  for (const rows of variants) {
    const { entries, problems } = build(rows);
    if (problems.length > 0) continue;
    const models = entries.map((e) => e.model);
    if (!entries.every((e) => eq(Object.keys(e), KEYS) && KEYS.every((k) => typeof e[k] === 'string' && e[k].trim() !== ''))) sweepOk = false;
    if (new Set(models).size !== models.length) sweepOk = false;
  }
  check('sweep: every sendable patch has entries of exactly the four non-empty keys, in the order model/ar/tr/en, each model once', sweepOk);
}

console.log(`${pass}/${total} assertions passed`);
process.exit(pass === total ? 0 : 1);
