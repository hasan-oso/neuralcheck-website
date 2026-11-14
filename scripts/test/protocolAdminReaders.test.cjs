'use strict';

// W-P6-14 — the readers of what the five protocol admin callables return
// (lib/protocolAdminReaders.js), and of a failed call.
//
// What is under test is what the READER makes of each value, for every value
// the server can send (rule 30), not that a sample arrives:
//   - settings: state × anomaly (all four values each, plus a value the reader
//     does not know and an absence), every field in every state (absent,
//     right type, each wrong type), returnReasons entries, the three keys that
//     do not decide the view, and a reply that is not an object;
//   - shop: partsState (3 + absent), each part (true, false, absent, wrong
//     types), each technician state (3 + unknown + absent) and its agreement
//     with `active`, a technician with no id;
//   - the three result shapes;
//   - a refusal: all 18 codes the contract names, a code it does not name,
//     the code taken from `details.reasonCode` while the message says
//     something else (rule 21), and no code read from a message.
//
// SAMPLES: scripts/test/_protocol-admin-wire-samples.cjs — «اصطناعية من
// العقد، لا من مُنتِج حقيقي» (neuralcheck-backend@fd730ac A10; the functions
// are in the production list at 488e3ee). Not checked against neuralcheck-backend
// by this test (outside this repo).
//
// Run: node scripts/test/protocolAdminReaders.test.cjs

require('./_jsx-require-hook.cjs');
const S = require('./_protocol-admin-wire-samples.cjs');
const R = require('@/lib/protocolAdminReaders');
const W = require('@/lib/protocolAdminWire');

let pass = 0;
let total = 0;
function check(name, cond) {
  total += 1;
  if (cond) pass += 1;
  else console.error(`  FAIL: ${name}`);
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = (v) => JSON.parse(JSON.stringify(v));

// ============================================================================
// 1. settings — the three samples
// ============================================================================
{
  const r = R.readProtocolSettings(S.settingsPresent());
  check('present: view PRESENT', r.view === R.SETTINGS_VIEW.PRESENT);
  check('present: version 3, anomaly null', r.version === 3 && r.anomaly === null);
  check('present: no problems', eq(r.problems, []));
  check('present: repeatRate 0.37', r.fields.repeatRate.state === 'PRESENT' && r.fields.repeatRate.value === 0.37);
  check('present: doubleEvalRate 0.11', r.fields.doubleEvalRate.value === 0.11);
  check('present: openBeforeValidityHours 24', r.fields.openBeforeValidityHours.value === 24);
  check('present: collectionPhase true', r.fields.collectionPhase.value === true);
  check('present: blindnessAlertBelowPct 61', r.fields.blindnessAlertBelowPct.value === 61);
  check('present: minAppVersion', r.fields.minAppVersion.value === '0.0.1');
  check(
    'present: returnReasons keep order and the four keys',
    eq(r.fields.returnReasons.value, [
      { key: 'fake_reason_a', ar: 'FAKE-AR-A', tr: 'FAKE-TR-A', active: true },
      { key: 'fake_reason_b', ar: 'FAKE-AR-B', tr: 'FAKE-TR-B', active: false },
    ])
  );
  check('present: updatedAtMs and updatedBy', r.updatedAtMs === 1760000000000 && r.updatedBy === 'FAKE-HASH-ADMIN-1');
  check('present: limits passed through verbatim', eq(r.limits, { state: 'PRESENT', value: S.LIMITS_SYNTHETIC }));
  check('present: no unknown key', eq(r.unknownSettingsKeys, []));
  check('present: exactly the seven fields are read', eq(Object.keys(r.fields), [...W.SETTINGS_FIELDS]) && W.SETTINGS_FIELDS.length === 7);
}
{
  const r = R.readProtocolSettings(S.settingsAbsent());
  check('absent: view ABSENT, no anomaly, no version', r.view === 'ABSENT' && r.anomaly === null && r.version === null);
  check(
    'absent: EVERY field is ABSENT and carries no value (not 0, not \'\', not false, not [])',
    W.SETTINGS_FIELDS.every((n) => r.fields[n].state === 'ABSENT' && !('value' in r.fields[n]))
  );
  check('absent: updatedAtMs / updatedBy stay null', r.updatedAtMs === null && r.updatedBy === null);
  check('absent: no problems', eq(r.problems, []));
}
{
  const r = R.readProtocolSettings(S.settingsVersionUnusable());
  check('unusable version: view ABSENT with the anomaly named', r.view === 'ABSENT' && r.anomaly === 'VERSION_UNUSABLE');
  check('unusable version: version is null, never a made-up number', r.version === null);
  check('unusable version: the one field the document has is read, the others are absent',
    r.fields.repeatRate.state === 'PRESENT' && r.fields.repeatRate.value === 0.37 &&
    W.SETTINGS_FIELDS.filter((n) => n !== 'repeatRate').every((n) => r.fields[n].state === 'ABSENT'));
  // the anomaly is the report on the version: a junk version value must not turn it into UNREADABLE
  for (const junk of [0, -1, 1.5, 'abc', {}, []]) {
    const d = S.settingsVersionUnusable();
    d.version = junk;
    check(`unusable version: version ${JSON.stringify(junk)} is not judged, view stays ABSENT`, R.readProtocolSettings(d).view === 'ABSENT');
  }
}

// ============================================================================
// 2. settings — state × anomaly, all values (rule 30), independent oracle
// ============================================================================
{
  const STATES = [
    ['PRESENT', 'PRESENT'],
    ['SETTINGS_ABSENT', 'ABSENT'],
    ['WEIRD', 'UNKNOWN'],
    [undefined, 'MISSING'],
  ];
  const ANOMALIES = [
    [null, 'none'],
    ['VERSION_UNUSABLE', 'unusable'],
    ['WEIRD', 'UNKNOWN'],
    [undefined, 'MISSING'],
  ];
  // The oracle is written out, not computed from the reader's own rules:
  //   PRESENT+none → PRESENT; ABSENT+none → ABSENT; ABSENT+unusable → ABSENT;
  //   everything else (PRESENT+unusable, any unknown or missing) → UNREADABLE.
  const EXPECT = {
    'PRESENT|none': 'PRESENT',
    'ABSENT|none': 'ABSENT',
    'ABSENT|unusable': 'ABSENT',
  };
  for (const [state, stateTag] of STATES) {
    for (const [anomaly, anomalyTag] of ANOMALIES) {
      const d = stateTag === 'PRESENT' ? S.settingsPresent() : S.settingsAbsent();
      if (state === undefined) delete d.state;
      else d.state = state;
      if (anomaly === undefined) delete d.anomaly;
      else d.anomaly = anomaly;
      // a PRESENT-looking body keeps its version 3, an ABSENT-looking one keeps null;
      // for an unknown or missing state the ABSENT-looking body is used: the state decides
      const want = EXPECT[`${stateTag}|${anomalyTag}`] || 'UNREADABLE';
      const got = R.readProtocolSettings(d).view;
      check(`state ${stateTag} × anomaly ${anomalyTag} → ${want}`, got === want);
    }
  }
}
{
  // the version the state needs
  for (const v of [0, -2, 1.5, '3', null, undefined]) {
    const d = S.settingsPresent();
    if (v === undefined) delete d.version;
    else d.version = v;
    check(`PRESENT with version ${JSON.stringify(v)} → UNREADABLE`, R.readProtocolSettings(d).view === 'UNREADABLE');
  }
  const d = S.settingsAbsent();
  d.version = 5;
  check('SETTINGS_ABSENT with a version number → UNREADABLE (contradiction named)', (() => {
    const r = R.readProtocolSettings(d);
    return r.view === 'UNREADABLE' && r.problems.includes('version:SET_WHILE_ABSENT');
  })());
  const d2 = S.settingsPresent();
  delete d2.settings;
  check('PRESENT with no settings object → UNREADABLE', R.readProtocolSettings(d2).view === 'UNREADABLE');
  const d3 = S.settingsPresent();
  d3.settings = [];
  check('PRESENT with settings as a list → UNREADABLE', R.readProtocolSettings(d3).view === 'UNREADABLE');
  const d4 = S.settingsAbsent();
  delete d4.settings;
  const r4 = R.readProtocolSettings(d4);
  check('ABSENT with no settings key stays ABSENT, the missing key is declared', r4.view === 'ABSENT' && r4.problems.includes('settings:MISSING'));
}

// ============================================================================
// 3. settings — each field in each state
// ============================================================================
{
  const WRONG = {
    number: [null, '0.5', true, {}, [], NaN, Infinity],
    boolean: [null, 'true', 1, 0, {}, []],
    string: [null, 5, true, {}, []],
    list: [null, 'x', 5, {}, true],
  };
  for (const name of W.SETTINGS_FIELDS) {
    const type = W.SETTINGS_FIELD_TYPE[name];
    // absent: key missing, and key undefined
    let d = S.settingsPresent();
    delete d.settings[name];
    check(`${name}: key missing → ABSENT`, R.readProtocolSettings(d).fields[name].state === 'ABSENT');
    d = S.settingsPresent();
    d.settings[name] = undefined;
    check(`${name}: key undefined → ABSENT`, R.readProtocolSettings(d).fields[name].state === 'ABSENT');
    // right type: the sample's own value
    d = S.settingsPresent();
    check(`${name}: the sample's value → PRESENT`, R.readProtocolSettings(d).fields[name].state === 'PRESENT');
    // every wrong type: MALFORMED, raw kept, never ABSENT and never PRESENT
    for (const bad of WRONG[type]) {
      d = S.settingsPresent();
      d.settings[name] = bad;
      const f = R.readProtocolSettings(d).fields[name];
      check(`${name}: ${typeof bad === 'number' ? String(bad) : JSON.stringify(bad)} → MALFORMED`, f.state === 'MALFORMED' && !('value' in f));
    }
    // a malformed field does not change the view or the other fields
    d = S.settingsPresent();
    d.settings[name] = WRONG[type][0];
    const r = R.readProtocolSettings(d);
    check(`${name}: malformed leaves the view PRESENT and the other six fields as sent`, r.view === 'PRESENT' &&
      W.SETTINGS_FIELDS.filter((n) => n !== name).every((n) => r.fields[n].state === 'PRESENT'));
  }
  // zero and false and the empty list are VALUES, not absences
  const d = S.settingsPresent();
  d.settings.repeatRate = 0;
  d.settings.collectionPhase = false;
  d.settings.returnReasons = [];
  d.settings.minAppVersion = '';
  const r = R.readProtocolSettings(d);
  check('a real 0 is PRESENT 0', r.fields.repeatRate.state === 'PRESENT' && r.fields.repeatRate.value === 0);
  check('a real false is PRESENT false', r.fields.collectionPhase.state === 'PRESENT' && r.fields.collectionPhase.value === false);
  check('an empty list is PRESENT []', r.fields.returnReasons.state === 'PRESENT' && eq(r.fields.returnReasons.value, []));
}

// returnReasons entries
{
  const base = () => S.settingsPresent();
  const cases = {
    'an entry without `tr`': (d) => { delete d.settings.returnReasons[0].tr; },
    'an entry with an extra key': (d) => { d.settings.returnReasons[0].note = 'x'; },
    'an entry that is not an object': (d) => { d.settings.returnReasons[1] = 'x'; },
    'an entry with active as a string': (d) => { d.settings.returnReasons[0].active = 'true'; },
    'an entry with key as a number': (d) => { d.settings.returnReasons[0].key = 5; },
    'an entry with ar as null': (d) => { d.settings.returnReasons[0].ar = null; },
    'an entry that is a list': (d) => { d.settings.returnReasons[0] = []; },
  };
  for (const [name, mutate] of Object.entries(cases)) {
    const d = base();
    mutate(d);
    const f = R.readProtocolSettings(d).fields.returnReasons;
    check(`returnReasons: ${name} → the whole field MALFORMED, raw kept`, f.state === 'MALFORMED' && Array.isArray(f.raw));
  }
}

// unknown keys, and the two fields that have no meaning
{
  const d = S.settingsPresent();
  d.settings.symptomChips = ['x'];
  d.settings.targets = { a: 1 };
  d.settings.someFutureField = 1;
  const r = R.readProtocolSettings(d);
  check('an unknown settings key is reported', eq(r.unknownSettingsKeys, ['someFutureField']));
  check('symptomChips and targets are neither fields nor unknown keys', !('symptomChips' in r.fields) && !('targets' in r.fields) && !r.unknownSettingsKeys.includes('symptomChips') && !r.unknownSettingsKeys.includes('targets'));
  check('the notSpecified list of the reply is not read at all', !('notSpecified' in r));
}

// the three keys that do not decide the view
{
  for (const key of ['updatedAtMs', 'updatedBy', 'limits']) {
    const d = S.settingsPresent();
    delete d[key];
    const r = R.readProtocolSettings(d);
    check(`${key} missing: view stays PRESENT and the key is declared`, r.view === 'PRESENT' && r.problems.includes(`${key}:MISSING`));
  }
  const d = S.settingsPresent();
  d.updatedAtMs = 'yesterday';
  d.updatedBy = 5;
  d.limits = 'wide';
  const r = R.readProtocolSettings(d);
  check('wrongly typed updatedAtMs / updatedBy / limits are declared, none is made up',
    r.view === 'PRESENT' && r.updatedAtMs === null && r.updatedBy === null && r.limits.state === 'MALFORMED' &&
    ['updatedAtMs:NOT_A_NUMBER', 'updatedBy:NOT_A_STRING', 'limits:NOT_AN_OBJECT'].every((p) => r.problems.includes(p)));
  // limits is not read from the inside
  const spy = {};
  let touched = 0;
  Object.defineProperty(spy, 'inner', { enumerable: true, get() { touched += 1; return 1; } });
  const d2 = S.settingsPresent();
  d2.limits = spy;
  const r2 = R.readProtocolSettings(d2);
  check('limits: the reader does not touch a key inside it', touched === 0 && r2.limits.value === spy);
}

// critical keys
{
  for (const key of ['state', 'anomaly', 'version', 'settings']) {
    const d = S.settingsPresent();
    delete d[key];
    const r = R.readProtocolSettings(d);
    check(`${key} missing → UNREADABLE and named`, r.view === 'UNREADABLE' && r.problems.some((p) => p.startsWith(`${key}:`)));
  }
  for (const bad of [null, undefined, 'x', 5, [], true]) {
    const r = R.readProtocolSettings(bad);
    check(`a reply that is ${JSON.stringify(bad)} → UNREADABLE (response:NOT_AN_OBJECT)`, r.view === 'UNREADABLE' && eq(r.problems, ['response:NOT_AN_OBJECT']));
  }
}

// ============================================================================
// 4. shop config
// ============================================================================
{
  const r = R.readShopConfig(S.shopPresent());
  check('shop present: ok, owner, PRESENT', r.ok && r.ownerId === 'fake-owner-1' && r.partsState === 'PRESENT');
  const want = { purposes: 'ON', batteryBeforeAfter: 'OFF', coldRepeat: 'ON', returns: 'OFF', doubleEval: 'ON', consent: 'OFF' };
  check('shop present: the six parts by name', W.PROTOCOL_PARTS.every((k) => r.parts[k].state === want[k]));
  check('shop present: three technicians, in the order sent', r.technicians.length === 3 && r.technicians[0].technicianId === 'fake-tech-id-a' && r.technicians[2].technicianId === 'fake-tech-id-c');
  check('technician ACTIVE: state and flag', r.technicians[0].activeState === 'ACTIVE' && r.technicians[0].active === true && r.technicians[0].readable);
  check('technician INACTIVE: state and flag', r.technicians[1].activeState === 'INACTIVE' && r.technicians[1].active === false);
  check('technician ACTIVE_FLAG_UNREADABLE stays that (null flag), neither active nor inactive', r.technicians[2].activeState === 'ACTIVE_FLAG_UNREADABLE' && r.technicians[2].active === null);
  check('technician with no timestamps: null, not 0', r.technicians[2].createdAtMs === null && r.technicians[2].updatedAtMs === null);
  check('shop present: no problems, no unknown part key', eq(r.problems, []) && eq(r.unknownPartKeys, []) && r.technicians.every((t) => eq(t.problems, [])));
  check('the part names are the six of the contract, with batteryBeforeAfter and without batteryPairs',
    eq([...W.PROTOCOL_PARTS], ['purposes', 'batteryBeforeAfter', 'coldRepeat', 'returns', 'doubleEval', 'consent']) && !Object.values(W.PROTOCOL_PART).includes('batteryPairs'));
}
{
  const r = R.readShopConfig(S.shopAbsent());
  check('shop absent: partsState ABSENT, the six read as OFF (the server sends false), no technicians', r.ok && r.partsState === 'ABSENT' && W.PROTOCOL_PARTS.every((k) => r.parts[k].state === 'OFF') && eq(r.technicians, []));
  const d = S.shopAbsent();
  d.parts.coldRepeat = true;
  const r2 = R.readShopConfig(d);
  check('shop ABSENT with a part ON is declared, not hidden', r2.problems.includes('parts.coldRepeat:ON_WHILE_partsState_ABSENT'));
}
{
  // partsState: all values
  const cases = [['PRESENT', true], ['ABSENT', true], ['present', false], ['', false], [null, false], [undefined, false], [1, false]];
  for (const [v, ok] of cases) {
    const d = S.shopPresent();
    if (v === undefined) delete d.partsState;
    else d.partsState = v;
    check(`partsState ${JSON.stringify(v)} → ${ok ? 'ok' : 'not ok'}`, R.readShopConfig(d).ok === ok);
  }
  // each part: true, false, missing, and wrong types
  for (const key of W.PROTOCOL_PARTS) {
    const run = (mutate) => {
      const d = S.shopPresent();
      mutate(d.parts, key);
      return R.readShopConfig(d).parts[key];
    };
    check(`part ${key}: true → ON`, run((p, k) => { p[k] = true; }).state === 'ON');
    check(`part ${key}: false → OFF`, run((p, k) => { p[k] = false; }).state === 'OFF');
    check(`part ${key}: missing → MISSING (not OFF)`, run((p, k) => { delete p[k]; }).state === 'MISSING');
    for (const bad of ['true', 1, 0, null, {}, []]) {
      const f = run((p, k) => { p[k] = bad; });
      check(`part ${key}: ${JSON.stringify(bad)} → MALFORMED`, f.state === 'MALFORMED');
    }
  }
  const d = S.shopPresent();
  d.parts.batteryPairs = true;
  d.parts.somethingNew = false;
  const r = R.readShopConfig(d);
  check('a part key that is not one of the six is reported (batteryPairs included)', eq(r.unknownPartKeys, ['batteryPairs', 'somethingNew']));
  // technician states, all values
  const tech = (mutate) => {
    const d2 = S.shopPresent();
    mutate(d2.technicians[0]);
    return R.readShopConfig(d2).technicians[0];
  };
  for (const [state, flag] of [['ACTIVE', true], ['INACTIVE', false], ['ACTIVE_FLAG_UNREADABLE', null]]) {
    const t = tech((x) => { x.activeState = state; x.active = flag; });
    check(`technician ${state} with the matching flag: known, no problem`, t.activeState === state && eq(t.problems, []));
  }
  for (const [state, wrongFlag] of [['ACTIVE', false], ['ACTIVE', null], ['INACTIVE', true], ['INACTIVE', null], ['ACTIVE_FLAG_UNREADABLE', true], ['ACTIVE_FLAG_UNREADABLE', false]]) {
    const t = tech((x) => { x.activeState = state; x.active = wrongFlag; });
    check(`technician ${state} with flag ${wrongFlag}: the disagreement is declared, the state stays`, t.activeState === state && t.problems.includes('active:DISAGREES_WITH_activeState'));
  }
  const tu = tech((x) => { x.activeState = 'WEIRD'; });
  check('technician with an unknown activeState: UNKNOWN, the raw value kept and declared', tu.activeState === 'UNKNOWN' && tu.rawActiveState === 'WEIRD' && tu.problems.some((p) => p.startsWith('activeState:UNKNOWN_VALUE')));
  const tm = tech((x) => { delete x.activeState; });
  check('technician with no activeState: UNKNOWN and declared MISSING (never ACTIVE)', tm.activeState === 'UNKNOWN' && tm.problems.includes('activeState:MISSING'));
  const t1 = tech((x) => { delete x.technicianId; });
  check('technician with no id: not readable (no actions can be offered)', t1.readable === false && t1.technicianId === null);
  const t2 = tech((x) => { x.displayName = 5; });
  check('technician with a non-text name: not readable', t2.readable === false);
  const t3 = tech((x) => { delete x.createdAtMs; x.updatedAtMs = 'x'; });
  check('technician timestamps missing / wrong type: null and declared', t3.createdAtMs === null && t3.updatedAtMs === null && t3.problems.includes('createdAtMs:MISSING') && t3.problems.includes('updatedAtMs:NOT_A_NUMBER_OR_NULL'));
  const dn = S.shopPresent();
  dn.technicians[1] = 'x';
  check('a technician entry that is not an object: unreadable entry, the others still read', (() => {
    const rr = R.readShopConfig(dn);
    return rr.ok && rr.technicians[1].readable === false && rr.technicians[0].readable === true;
  })());
  // top-level
  for (const key of ['ownerId', 'parts', 'technicians']) {
    const d2 = S.shopPresent();
    delete d2[key];
    check(`shop reply without ${key} → not ok, named`, (() => { const rr = R.readShopConfig(d2); return !rr.ok && rr.problems.some((p) => p.startsWith(`${key}:`)); })());
  }
  const d5 = S.shopPresent();
  d5.technicians = {};
  check('technicians as an object → not ok', !R.readShopConfig(d5).ok);
  for (const bad of [null, undefined, 'x', 5, []]) {
    check(`shop reply ${JSON.stringify(bad)} → not ok`, !R.readShopConfig(bad).ok);
  }
}

// ============================================================================
// 5. the three result shapes
// ============================================================================
{
  const a = R.readSetSettingsResult(S.setSettingsChanged());
  check('setProtocolSettings: changed', a.ok && a.changed === true && a.version === 4 && eq(a.fields, ['repeatRate']));
  const b = R.readSetSettingsResult(S.setSettingsUnchanged());
  check('setProtocolSettings: changed:false with no fields is read as such', b.ok && b.changed === false && b.version === 3 && eq(b.fields, []));
  for (const key of ['changed', 'version', 'fields']) {
    const d = S.setSettingsChanged();
    delete d[key];
    check(`setProtocolSettings reply without ${key} → not ok`, !R.readSetSettingsResult(d).ok);
  }
  check('setProtocolSettings: version 0 → not ok', !R.readSetSettingsResult({ changed: true, version: 0, fields: [] }).ok);
  check('setProtocolSettings: fields with a non-string → not ok', !R.readSetSettingsResult({ changed: true, version: 1, fields: [1] }).ok);
  check('setProtocolSettings: not an object → not ok', !R.readSetSettingsResult(null).ok && !R.readSetSettingsResult('x').ok);

  const c = R.readSetPartsResult(S.setPartsChanged());
  check('setShopProtocolParts: owner, the six, changed', c.ok && c.ownerId === 'fake-owner-1' && c.parts.coldRepeat.state === 'OFF' && eq(c.changed, ['coldRepeat']));
  for (const key of ['ownerId', 'parts', 'changed']) {
    const d = S.setPartsChanged();
    delete d[key];
    check(`setShopProtocolParts reply without ${key} → not ok`, !R.readSetPartsResult(d).ok);
  }
  const d1 = S.setPartsChanged();
  d1.changed = [];
  check('setShopProtocolParts: changed [] is a reply (nothing written)', R.readSetPartsResult(d1).ok);

  const m = R.readManageResult(S.manageChanged());
  check('manageTechnician: all five keys', m.ok && m.technicianId === 'fake-tech-id-a' && m.ownerId === 'fake-owner-1' && m.displayName === 'FAKE-TECH-A' && m.active === true && m.changed === true);
  for (const key of ['technicianId', 'ownerId', 'displayName', 'active', 'changed']) {
    const d = S.manageChanged();
    delete d[key];
    check(`manageTechnician reply without ${key} → not ok`, !R.readManageResult(d).ok);
  }
  const d2 = S.manageChanged();
  d2.active = 'yes';
  check('manageTechnician: active as text → not ok', !R.readManageResult(d2).ok);
}

// ============================================================================
// 6. a failed call — the code, from details.reasonCode, and nowhere else
// ============================================================================
{
  check('the contract names 18 refusal codes', W.KNOWN_REFUSAL_CODES.length === 6 + 5 + 7 && new Set(W.KNOWN_REFUSAL_CODES).size === 18);
  for (const code of W.KNOWN_REFUSAL_CODES) {
    const c = R.classifyCallError(S.refusal(code));
    check(`refusal ${code}: read from details.reasonCode, known`, c.reasonCode === code && c.known === true && c.field === null);
  }
  const f = R.classifyCallError(S.refusal('SETTINGS_FIELD_INVALID', 'repeatRate'));
  check('SETTINGS_FIELD_INVALID carries its field', f.reasonCode === 'SETTINGS_FIELD_INVALID' && f.field === 'repeatRate');
  const unk = R.classifyCallError(S.refusal('SOMETHING_NEW'));
  check('a code the contract does not name: kept, known false', unk.reasonCode === 'SOMETHING_NEW' && unk.known === false);

  // rule 21 — the message and the class do not decide
  const clash = { code: 'functions/internal', message: 'SHOP_NOT_FOUND', details: { reasonCode: 'SETTINGS_FIELD_INVALID' } };
  check('the code comes from details, while the message says another known code', R.classifyCallError(clash).reasonCode === 'SETTINGS_FIELD_INVALID');
  const onlyMessage = { code: 'functions/failed-precondition', message: 'SHOP_NOT_FOUND' };
  const om = R.classifyCallError(onlyMessage);
  check('a message that names a known code and no details: NO reason code is made of it', om.reasonCode === null && om.known === false);
  check('…and the SDK code is returned only as transportCode', om.transportCode === 'functions/failed-precondition');
  const dm = R.classifyCallError({ code: 'functions/failed-precondition', message: 'x', details: { note: 'SHOP_NOT_FOUND' } });
  check('details without a reasonCode: none', dm.reasonCode === null);
  const dm2 = R.classifyCallError({ code: 'x', message: 'x', details: { reasonCode: '' } });
  check('an empty reasonCode is none', dm2.reasonCode === null);
  const dm3 = R.classifyCallError({ code: 'x', message: 'x', details: { reasonCode: 5 } });
  check('a reasonCode that is not text is none', dm3.reasonCode === null);
  const dm4 = R.classifyCallError({ code: 'x', message: 'x', details: 'SHOP_NOT_FOUND' });
  check('details that is a bare string is none', dm4.reasonCode === null);
  for (const bad of [null, undefined, 'boom', 5, {}]) {
    const c = R.classifyCallError(bad);
    check(`classify(${JSON.stringify(bad)}): no reason, no field, not known`, c.reasonCode === null && c.field === null && c.known === false);
  }
  // the reader never reads err.message: a getter that throws must not be touched
  const trap = {};
  Object.defineProperty(trap, 'message', { get() { throw new Error('message was read'); } });
  let readMessage = false;
  try { R.classifyCallError(trap); } catch { readMessage = true; }
  check('err.message is never read', readMessage === false);
}

console.log(`${pass}/${total} assertions passed`);
process.exit(pass === total ? 0 : 1);
