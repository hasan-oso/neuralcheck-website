'use strict';

// W-P6-14 — what the admin pages SEND (lib/protocolAdminPatch.js and
// lib/protocolAdminCalls.js): the settings patch, the parts patch, the
// technician payloads, and the callable names and payload shapes.
//
// Against the contract A10 (neuralcheck-backend@fd730ac; coordinator's copy
// evidence/run-2026-10-18/protocol-contract-A0-A10-neuralcheck-backend-
// fd730ac.md:286-292), and the rules the patch keeps:
//   - a PATCH: only the fields the admin changed; never `null`; never a field
//     the design gives no meaning (symptomChips, targets);
//   - an empty input is an absence, not 0 (`Number('') === 0` is the trap);
//   - the site does not repeat the server's ranges (a rate of 7 is SENT: the
//     server refuses it, with a reason the page shows);
//   - the six part names are sent as `batteryBeforeAfter`, never `batteryPairs`;
//   - no delete action exists; an `active` that is not a boolean is refused
//     before it is made into `false`.
//
// SAMPLES: scripts/test/_protocol-admin-wire-samples.cjs — «اصطناعية من
// العقد، لا من مُنتِج حقيقي».
//
// Run: node scripts/test/protocolAdminPatch.test.cjs

require('./_jsx-require-hook.cjs');

// ---- fakes for the SDK and the firebase module, BEFORE the code loads --------
function install(request, exports) {
  const key = require.resolve(request);
  require.cache[key] = { id: key, filename: key, loaded: true, exports, children: [], paths: [] };
}
const sent = [];
let nextReply = { ok: true };
install('firebase/functions', {
  getFunctions: () => ({ fake: 'functions' }),
  httpsCallable: (fns, name) => async (payload) => {
    sent.push({ name, payload });
    return { data: nextReply };
  },
});
install('firebase/firestore', { getFirestore: () => ({}), collection: () => ({}), getDocs: async () => ({ docs: [] }) });
install('@/firebase', { functions: { fake: 'functions' }, db: {}, auth: {} });

const S = require('./_protocol-admin-wire-samples.cjs');
const R = require('@/lib/protocolAdminReaders');
const W = require('@/lib/protocolAdminWire');
const P = require('@/lib/protocolAdminPatch');
const C = require('@/lib/protocolAdminCalls');

let pass = 0;
let total = 0;
function check(name, cond) {
  total += 1;
  if (cond) pass += 1;
  else console.error(`  FAIL: ${name}`);
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = (v) => JSON.parse(JSON.stringify(v));
const containsNull = (v) => {
  if (v === null) return true;
  if (Array.isArray(v)) return v.some(containsNull);
  if (v && typeof v === 'object') return Object.values(v).some(containsNull);
  return false;
};

// ============================================================================
// 1. a number typed in a box
// ============================================================================
{
  check('the trap: Number(\'\') is 0', Number('') === 0);
  for (const t of ['', '   ', null, undefined]) {
    check(`parseNumberText(${JSON.stringify(t)}) is EMPTY, not 0`, P.parseNumberText(t).state === 'EMPTY');
  }
  const valid = [['0', 0], ['0.5', 0.5], ['168', 168], [' 12 ', 12], ['-1', -1], ['٠.٥', 0.5], ['١٢٣', 123], ['۱۲', 12], ['007', 7]];
  for (const [t, v] of valid) {
    const r = P.parseNumberText(t);
    check(`parseNumberText(${JSON.stringify(t)}) → VALID ${v}`, r.state === 'VALID' && r.value === v);
  }
  for (const t of ['abc', '1e3', '0x10', '1,5', '.5', '5.', '٠٫٥', '1 2', '--1', '+1', 'Infinity', 'NaN', 5, true, {}, []]) {
    check(`parseNumberText(${JSON.stringify(t)}) → INVALID`, P.parseNumberText(t).state === 'INVALID');
  }
}

// ============================================================================
// 2. the settings form and its patch
// ============================================================================
const readOf = (d) => R.readProtocolSettings(d);
{
  const read = readOf(S.settingsPresent());
  const form = P.initialSettingsForm(read);
  check('form from a PRESENT document: each value as text / choice / rows',
    form.repeatRate === '0.37' && form.doubleEvalRate === '0.11' && form.openBeforeValidityHours === '24' &&
    form.blindnessAlertBelowPct === '61' && form.minAppVersion === '0.0.1' && form.collectionPhase === 'true');
  check('form: the saved return reasons are marked saved', form.returnReasons.length === 2 && form.returnReasons.every((r) => r.saved === true));
  const b = P.buildSettingsPatch(read, form);
  check('an untouched form sends nothing (empty patch, no problems)', eq(b.patch, {}) && eq(b.problems, []) && eq(b.changedFields, []));

  // one field changed → only that field
  for (const [field, value, expected] of [
    ['repeatRate', '0.5', 0.5],
    ['doubleEvalRate', '0', 0],
    ['openBeforeValidityHours', '48', 48],
    ['blindnessAlertBelowPct', '70', 70],
    ['minAppVersion', ' 1.2.3 ', '1.2.3'],
    ['collectionPhase', 'false', false],
  ]) {
    const f = clone(form);
    f[field] = value;
    const r = P.buildSettingsPatch(read, f);
    check(`${field} changed → the patch is exactly { ${field}: ${JSON.stringify(expected)} }`, eq(r.patch, { [field]: expected }) && eq(r.problems, []));
  }
  // a value outside any range is SENT: the server owns the ranges
  const f7 = clone(form);
  f7.repeatRate = '7';
  f7.openBeforeValidityHours = '999999';
  check('values outside the server\'s ranges are sent, not blocked here', eq(P.buildSettingsPatch(read, f7).patch, { repeatRate: 7, openBeforeValidityHours: 999999 }));
  // the same value retyped differently is not a change
  const fs = clone(form);
  fs.repeatRate = '0.370';
  fs.openBeforeValidityHours = '024';
  check('the same number retyped (0.370, 024) is not a change', eq(P.buildSettingsPatch(read, fs).patch, {}));
}
{
  // a number that is not a number blocks the send and names the field
  const read = readOf(S.settingsPresent());
  const f = P.initialSettingsForm(read);
  f.repeatRate = 'abc';
  const r = P.buildSettingsPatch(read, f);
  check('an invalid number: no patch for it, the problem names the field', !('repeatRate' in r.patch) && eq(r.problems, [{ field: 'repeatRate', problem: 'INVALID_NUMBER' }]));
  // clearing a saved value is refused before it is sent (the server refuses null)
  for (const field of ['repeatRate', 'doubleEvalRate', 'openBeforeValidityHours', 'blindnessAlertBelowPct', 'minAppVersion']) {
    const g = P.initialSettingsForm(read);
    g[field] = '';
    const rr = P.buildSettingsPatch(read, g);
    check(`${field}: emptied while saved → CANNOT_CLEAR, nothing sent for it`, eq(rr.problems, [{ field, problem: 'CANNOT_CLEAR' }]) && !(field in rr.patch));
  }
  const g = P.initialSettingsForm(read);
  g.collectionPhase = 'unset';
  check('collectionPhase set back to «not set» while saved → CANNOT_CLEAR', eq(P.buildSettingsPatch(read, g).problems, [{ field: 'collectionPhase', problem: 'CANNOT_CLEAR' }]));
}
{
  // an ABSENT document: nothing is sent until the admin fills something
  const read = readOf(S.settingsAbsent());
  const form = P.initialSettingsForm(read);
  check('form from an ABSENT document: empty texts, «unset», no rows — no default value anywhere',
    ['repeatRate', 'doubleEvalRate', 'openBeforeValidityHours', 'blindnessAlertBelowPct', 'minAppVersion'].every((k) => form[k] === '') &&
    form.collectionPhase === 'unset' && eq(form.returnReasons, []));
  check('an untouched ABSENT form sends nothing — not 0, not false, not []', eq(P.buildSettingsPatch(read, form).patch, {}));
  const f = clone(form);
  f.repeatRate = '0';
  f.collectionPhase = 'false';
  check('filled on an ABSENT document: a 0 and a false are SENT (they were typed), the rest is not', eq(P.buildSettingsPatch(read, f).patch, { repeatRate: 0, collectionPhase: false }));
  const f2 = clone(form);
  f2.returnReasons = [{ key: 'fake_reason_z', ar: 'FAKE-AR-Z', tr: 'FAKE-TR-Z', active: false, saved: false }];
  check('a return reason added on an ABSENT document: the list is sent without the UI flag `saved`',
    eq(P.buildSettingsPatch(read, f2).patch, { returnReasons: [{ key: 'fake_reason_z', ar: 'FAKE-AR-Z', tr: 'FAKE-TR-Z', active: false }] }));
  // the document with an unusable version: a field it has is a field it has
  const ru = readOf(S.settingsVersionUnusable());
  const fu = P.initialSettingsForm(ru);
  check('unusable-version document: its one field is in the form, the others empty', fu.repeatRate === '0.37' && fu.doubleEvalRate === '');
}
{
  // a MALFORMED saved value is replaced by what is typed, and left alone when nothing is typed
  const d = S.settingsPresent();
  d.settings.repeatRate = 'oops';
  const read = readOf(d);
  const form = P.initialSettingsForm(read);
  check('malformed saved value: the input starts empty (the bad value is not copied)', form.repeatRate === '');
  check('malformed saved value, nothing typed: nothing is sent and it is not a CANNOT_CLEAR', eq(P.buildSettingsPatch(read, form), { patch: {}, problems: [], changedFields: [] }));
  const f = clone(form);
  f.repeatRate = '0.2';
  check('malformed saved value, a number typed: it is sent', eq(P.buildSettingsPatch(read, f).patch, { repeatRate: 0.2 }));
}
{
  // returnReasons on a PRESENT list
  const read = readOf(S.settingsPresent());
  const base = P.initialSettingsForm(read);
  const edit = (mutate) => {
    const f = clone(base);
    mutate(f.returnReasons);
    return P.buildSettingsPatch(read, f);
  };
  check('return reasons untouched: not sent', eq(edit(() => {}).patch, {}));
  const edited = edit((rows) => { rows[0].ar = 'FAKE-AR-A2'; });
  check('one row\'s text changed: the WHOLE list is sent (all saved keys stay), without `saved`',
    eq(edited.patch, { returnReasons: [
      { key: 'fake_reason_a', ar: 'FAKE-AR-A2', tr: 'FAKE-TR-A', active: true },
      { key: 'fake_reason_b', ar: 'FAKE-AR-B', tr: 'FAKE-TR-B', active: false },
    ] }));
  const toggled = edit((rows) => { rows[0].active = false; });
  check('a reason switched off is sent as active:false — the key stays (stop, not delete)', toggled.patch.returnReasons[0].key === 'fake_reason_a' && toggled.patch.returnReasons[0].active === false && toggled.patch.returnReasons.length === 2);
  const added = edit((rows) => { rows.push({ key: 'fake_reason_c', ar: 'x', tr: 'y', active: true, saved: false }); });
  check('a reason added: the list has the two saved keys and the new one', eq(added.patch.returnReasons.map((r) => r.key), ['fake_reason_a', 'fake_reason_b', 'fake_reason_c']));
  check('no row carries the UI flag `saved` on the wire', added.patch.returnReasons.every((r) => !('saved' in r) && eq(Object.keys(r), ['key', 'ar', 'tr', 'active'])));
}
{
  // across every form: never null, never symptomChips / targets, only known fields
  const reads = [readOf(S.settingsPresent()), readOf(S.settingsAbsent()), readOf(S.settingsVersionUnusable())];
  let nulls = 0;
  let foreign = 0;
  for (const read of reads) {
    const f = P.initialSettingsForm(read);
    f.symptomChips = ['x'];
    f.targets = { a: 1 };
    f.repeatRate = '0.5';
    f.collectionPhase = 'true';
    f.minAppVersion = '1.0.0';
    f.returnReasons = [{ key: 'k', ar: 'a', tr: 't', active: true, saved: false }];
    const r = P.buildSettingsPatch(read, f);
    if (containsNull(r.patch)) nulls += 1;
    if (Object.keys(r.patch).some((k) => !W.SETTINGS_FIELDS.includes(k))) foreign += 1;
  }
  check('no patch ever contains null', nulls === 0);
  check('no patch ever contains a key outside the seven (symptomChips and targets never go out)', foreign === 0);
}

// ============================================================================
// 3. the parts patch
// ============================================================================
{
  const shop = R.readShopConfig(S.shopPresent());
  const d = P.initialPartsDraft();
  check('the initial draft has the six parts, all untouched (null)', eq(Object.keys(d), [...W.PROTOCOL_PARTS]) && Object.values(d).every((v) => v === null));
  check('untouched → empty patch', eq(P.buildPartsPatch(shop, d), {}));
  // each part: choosing the saved value is no change; choosing the other is
  const SAVED = { purposes: true, batteryBeforeAfter: false, coldRepeat: true, returns: false, doubleEval: true, consent: false };
  for (const key of W.PROTOCOL_PARTS) {
    const same = { ...d, [key]: SAVED[key] };
    check(`${key}: choosing the saved value (${SAVED[key]}) sends nothing`, eq(P.buildPartsPatch(shop, same), {}));
    const flip = { ...d, [key]: !SAVED[key] };
    check(`${key}: flipping it sends exactly { ${key}: ${!SAVED[key]} }`, eq(P.buildPartsPatch(shop, flip), { [key]: !SAVED[key] }));
  }
  const all = Object.fromEntries(W.PROTOCOL_PARTS.map((k) => [k, !SAVED[k]]));
  check('all six flipped: the six names, booleans', eq(P.buildPartsPatch(shop, all), all));
  check('the part sent for the battery pair is batteryBeforeAfter, never batteryPairs', 'batteryBeforeAfter' in P.buildPartsPatch(shop, all) && !('batteryPairs' in P.buildPartsPatch(shop, all)));
  // a part the server did not send / sent unreadable is not turned into false by default
  const d2 = S.shopPresent();
  delete d2.parts.coldRepeat;
  d2.parts.returns = 'maybe';
  const shop2 = R.readShopConfig(d2);
  check('unreadable parts untouched: nothing is sent for them', eq(P.buildPartsPatch(shop2, P.initialPartsDraft()), {}));
  check('an unreadable part the admin chooses: sent, either way', eq(P.buildPartsPatch(shop2, { ...P.initialPartsDraft(), coldRepeat: false, returns: true }), { coldRepeat: false, returns: true }));
  // a shop with no parts document (ABSENT, all false): turning one on is a change
  const shop3 = R.readShopConfig(S.shopAbsent());
  check('ABSENT shop: turning a part on sends it', eq(P.buildPartsPatch(shop3, { ...P.initialPartsDraft(), consent: true }), { consent: true }));
  check('ABSENT shop: choosing «off» for an already-off part sends nothing', eq(P.buildPartsPatch(shop3, { ...P.initialPartsDraft(), consent: false }), {}));
}

// ============================================================================
// 4. the technician payloads (A10 (6))
// ============================================================================
{
  check('the actions are add, rename, set_active — and no delete', eq(Object.values(W.TECH_ACTION), ['add', 'rename', 'set_active']));
  check('add: { ownerId, action, displayName } exactly', eq(P.addTechnicianPayload('fake-owner-1', 'FAKE-TECH-X'), { ownerId: 'fake-owner-1', action: 'add', displayName: 'FAKE-TECH-X' }));
  check('add: the name is trimmed', P.addTechnicianPayload('o', '  FAKE-TECH-X  ').displayName === 'FAKE-TECH-X');
  check('rename: { ownerId, action, technicianId, displayName } exactly', eq(P.renameTechnicianPayload('o', 'fake-tech-id-a', ' FAKE-TECH-Y '), { ownerId: 'o', action: 'rename', technicianId: 'fake-tech-id-a', displayName: 'FAKE-TECH-Y' }));
  check('set_active true / false: { ownerId, action, technicianId, active } exactly',
    eq(P.setTechnicianActivePayload('o', 't', true), { ownerId: 'o', action: 'set_active', technicianId: 't', active: true }) &&
    eq(P.setTechnicianActivePayload('o', 't', false), { ownerId: 'o', action: 'set_active', technicianId: 't', active: false }));
  for (const bad of [undefined, null, 'true', 1, 0, {}]) {
    let threw = false;
    try { P.setTechnicianActivePayload('o', 't', bad); } catch (e) { threw = e instanceof TypeError; }
    check(`set_active with ${JSON.stringify(bad)} is refused, not made into false`, threw);
  }
  check('no payload builder produces a delete', ![
    P.addTechnicianPayload('o', 'n'), P.renameTechnicianPayload('o', 't', 'n'), P.setTechnicianActivePayload('o', 't', true),
  ].some((p) => /delet|remov/i.test(p.action)));
}

// ============================================================================
// 5. the callables: names and payload shapes
// ============================================================================
(async () => {
  check('the five names of the contract', eq(W.PROTOCOL_ADMIN_FN, {
    GET_SETTINGS: 'getProtocolSettings',
    SET_SETTINGS: 'setProtocolSettings',
    GET_SHOP: 'getShopProtocolConfig',
    SET_PARTS: 'setShopProtocolParts',
    MANAGE_TECHNICIAN: 'manageTechnician',
  }));
  sent.length = 0;
  nextReply = { echoed: 'x' };
  const r1 = await C.callGetProtocolSettings();
  const r2 = await C.callSetProtocolSettings({ repeatRate: 0.5 });
  const r3 = await C.callGetShopProtocolConfig('fake-owner-1');
  const r4 = await C.callSetShopProtocolParts('fake-owner-1', { coldRepeat: true });
  const payload = P.addTechnicianPayload('fake-owner-1', 'FAKE-TECH-X');
  const r5 = await C.callManageTechnician(payload);
  check('getProtocolSettings is called with {}', eq(sent[0], { name: 'getProtocolSettings', payload: {} }));
  check('setProtocolSettings is called with { settings: <patch> }', eq(sent[1], { name: 'setProtocolSettings', payload: { settings: { repeatRate: 0.5 } } }));
  check('getShopProtocolConfig is called with { ownerId }', eq(sent[2], { name: 'getShopProtocolConfig', payload: { ownerId: 'fake-owner-1' } }));
  check('setShopProtocolParts is called with { ownerId, parts }', eq(sent[3], { name: 'setShopProtocolParts', payload: { ownerId: 'fake-owner-1', parts: { coldRepeat: true } } }));
  check('manageTechnician is called with the payload as built', eq(sent[4], { name: 'manageTechnician', payload }));
  check('every wrapper returns res.data untouched', [r1, r2, r3, r4, r5].every((r) => eq(r, { echoed: 'x' })));
  check('exactly five calls, nothing else', sent.length === 5);

  console.log(`${pass}/${total} assertions passed`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
