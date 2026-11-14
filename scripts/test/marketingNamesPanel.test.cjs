'use strict';

// W-P6-20 — the marketing-name map page (/admin/protocol/marketing-names): what
// it shows of every state of the map, what the admin can and cannot do with a
// row, what it sends, and how it shows a refusal.
//
// WHAT IS PROVEN (and what is not, at the end):
//   1. the four views, by the REAL component under a stand-in hook dispatcher
//      (_call-component.cjs): PRESENT (rows, the saved model read-only, no
//      placeholder, nothing removable), ABSENT (no entry, the explicit sentence),
//      STORED_UNREADABLE for each of the five anomalies (the anomaly shown, no
//      form), REPLY_UNREADABLE (the sentence and the keys, no form); the limits
//      as sent, key by key, absent ones said;
//   2. editing: typing changes one row; the model of a saved row cannot be
//      edited; a row is added blank and unsaved; only an unsaved row can be taken
//      back; every row problem is named under its row and blocks the save;
//   3. the save: the exact patch (the changed saved entries, then the new ones,
//      four keys each), what the toast says of the SERVER's answer, the server
//      read again afterwards (also after an unreadable reply), nothing sent when
//      there is nothing or a problem, a refusal kept by its code for each of the
//      five codes, an unknown code, an admin refusal and a plain error;
//   4. load failure and retry;
//   5. static scans of the new files: no direct Firestore write or read, the
//      function names written once in the wire file, no entry of the map and no
//      placeholder, no delete.
//
// NOT substituted: the readers, the patch builder, the texts, the components.
// Substituted: the SDK (recorders), next/link and next/navigation (stubs), the
// Toast hook (a recorder).
//
// NOT proven here: that the functions behave as the contract says on the real
// server (in the production list at neuralcheck-backend@488e3ee; run only in
// memory, outside this repo), nor how
// the page looks and behaves in a real browser, nor with the ~118 entries the
// map will really hold.
//
// SAMPLES: scripts/test/_marketing-names-wire-samples.cjs — «اصطناعية من
// العقد، لا من مُنتِج حقيقي».
//
// Run: node scripts/test/marketingNamesPanel.test.cjs

require('./_jsx-require-hook.cjs');
const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { callComponent } = require('./_call-component.cjs');

/** Every element in `node`, FUNCTION COMPONENTS EXPANDED, in document order. */
function findAll(node, pred, out = []) {
  if (Array.isArray(node)) {
    node.forEach((n) => findAll(n, pred, out));
    return out;
  }
  if (!React.isValidElement(node)) return out;
  if (pred(node)) out.push(node);
  if (typeof node.type === 'function') {
    findAll(node.type(node.props), pred, out);
    return out;
  }
  for (const v of Object.values(node.props || {})) {
    if (Array.isArray(v) || React.isValidElement(v)) findAll(v, pred, out);
  }
  return out;
}

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ---- fakes ------------------------------------------------------------------
function install(request, exports) {
  const key = require.resolve(request);
  require.cache[key] = { id: key, filename: key, loaded: true, exports, children: [], paths: [] };
}
install('next/navigation', {
  usePathname: () => '/admin/protocol/marketing-names',
  useRouter: () => ({ replace: () => {}, push: () => {} }),
});
install('next/link', { __esModule: true, default: ({ href, children, ...rest }) => React.createElement('a', { href, ...rest }, children) });
install('firebase/functions', { getFunctions: () => ({}), httpsCallable: () => async () => { throw new Error('the panel must be given its calls by props in this test'); } });
install('firebase/firestore', { getFirestore: () => ({}), collection: () => ({}), getDocs: async () => ({ docs: [] }) });
install('firebase/auth', { getAuth: () => ({}), signOut: async () => {} });
install('@/firebase', { functions: {}, db: {}, auth: {} });
const toasts = [];
install('@/components/admin/Toast', {
  useToast: () => ({
    success: (m) => toasts.push(['success', m]),
    error: (m) => toasts.push(['error', m]),
    info: (m) => toasts.push(['info', m]),
  }),
  ToastProvider: ({ children }) => children,
});

const S = require('./_marketing-names-wire-samples.cjs');
const SA = require('./_protocol-admin-wire-samples.cjs');
const W = require('@/lib/marketingNamesWire');
const R = require('@/lib/marketingNamesReaders');
const P = require('@/lib/marketingNamesPatch');
const { ADMIN_PROTOCOL_TEXTS: T, MARKETING_PROBLEM_TEXT_KEY } = require('@/lib/adminProtocolTexts');
const Panel = require('@/components/admin/protocol/MarketingNamesPanel.js').default;

// ---- bookkeeping --------------------------------------------------------------
let pass = 0;
let total = 0;
function check(name, cond) {
  total += 1;
  if (cond) pass += 1;
  else console.error(`  FAIL: ${name}`);
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = (v) => JSON.parse(JSON.stringify(v));
const html = (tree) => renderToStaticMarkup(tree);
const count = (haystack, needle) => haystack.split(needle).length - 1;
function nodeText(node) {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  return nodeText(node.props && node.props.children);
}

/** The names and order of a component's useState hooks, read from the real source. */
function hookIndex(src, startMarker) {
  const a = src.indexOf(startMarker);
  if (a < 0) throw new Error(`marker not found: ${startMarker}`);
  const names = [...src.slice(a).matchAll(/const \[(\w+), set\w+\]\s*=\s*useState/g)].map((m) => m[1]);
  return Object.fromEntries(names.map((n, i) => [n, i]));
}
const SRC = read('components/admin/protocol/MarketingNamesPanel.js');
const H = hookIndex(SRC, 'export default function MarketingNamesPanel(');
check('panel hooks: the ones this test drives exist, in the declared order', eq(Object.keys(H), ['loading', 'loadFailure', 'read', 'rows', 'saving', 'saveFailure']));

const origError = console.error;
const quiet = async (fn) => { console.error = () => {}; try { return await fn(); } finally { console.error = origError; } };
const saveBtn = (tree) => findAll(tree, (n) => n.type === 'button' && (nodeText(n) === T.save || nodeText(n) === T.saving))[0];
const addBtn = (tree) => findAll(tree, (n) => n.type === 'button' && nodeText(n) === T.marketingAddRow)[0];
const removers = (tree) => findAll(tree, (n) => n.type === 'button' && nodeText(n) === '✕');
const inputs = (tree) => findAll(tree, (n) => n.type === 'input');
const fresh = (o = {}) => ({ ...P.newMarketingRow(), ...o });

/** The panel with the reader's result of `data` and the rows the page starts from. */
const renderOf = (data, extra = {}, props = {}) => {
  const r = R.readMarketingNames(data);
  return callComponent(Panel, props, { [H.loading]: false, [H.read]: r, [H.rows]: P.initialMarketingRows(r), ...extra });
};

(async () => {
  // =========================================================================
  // 1. the four views
  // =========================================================================
  {
    const { tree } = renderOf(S.marketingPresent());
    const m = html(tree);
    check('present: the title is the plan\'s and the tab bar is there', m.includes(T.marketingTitle) && T.marketingTitle === 'خريطة الأسماء التجارية بالعربية' && m.includes('href="/admin/protocol/marketing-names"'));
    check('present: version, the hashed admin and the entry count are shown', m.includes(T.versionLabel) && m.includes('>3<') && m.includes('FAKE-HASH-ADMIN-1') && m.includes(T.marketingEntriesCount(2)));
    const ins = inputs(tree);
    check('present: four inputs per entry — the model and the three names, with the saved values', ins.length === 8 && eq(ins.map((i) => i.props.value), ['FAKE-MODEL-A', 'FAKE-AR-A', 'FAKE-TR-A', 'FAKE-EN-A', 'FAKE-MODEL-B', 'FAKE-AR-B', 'FAKE-TR-B', 'FAKE-EN-B']));
    check('present: the saved models are READ-ONLY (they are the key), the names are editable', ins.filter((_, i) => i % 4 === 0).every((i) => i.props.readOnly === true) && ins.filter((_, i) => i % 4 !== 0).every((i) => !i.props.readOnly));
    check('present: NO placeholder anywhere (no example model, no example name)', ins.every((i) => i.props.placeholder === undefined) && !m.includes('placeholder'));
    check('present: nothing is removable (no ✕ on a saved entry) and nothing says delete', removers(tree).length === 0 && !m.includes('حذف') && !/delet|remov/i.test(m.replace(/aria-label="[^"]*"/g, '')));
    check('present: the column heads, the literal-match hint and the add button', [T.marketingColModel, T.marketingColAr, T.marketingColTr, T.marketingColEn, T.marketingModelHint].every((s) => m.includes(s)) && addBtn(tree) !== undefined);
    check('present: nothing changed → the save button is disabled, «لا تغيير» shown, no «unsaved»', saveBtn(tree).props.disabled === true && m.includes(T.nothingToSave) && !m.includes(T.unsaved));
    check('present: the limits, each with its number, as sent', m.includes(T.limitsTitle) && ['maxEntries', 'modelMaxLength', 'nameMaxLength'].every((k) => m.includes(`>${k}<`)) && m.includes('>1000<') && m.includes('>64<') && m.includes('>120<'));
    check('present: no «absent» sentence, no problem line', !m.includes(T.marketingAbsent) && !m.includes(T.marketingStoredUnreadable) && !m.includes(T.replyUnreadable));
  }
  {
    const { tree } = renderOf(S.marketingAbsent());
    const m = html(tree);
    check('absent: the state code and the explicit sentence — the map is not written yet', m.includes('>ABSENT<') && m.includes(T.marketingAbsent));
    check('absent: NO entry row (nothing made up), «لا مداخل» said, the form is there to start', inputs(tree).length === 0 && m.includes(T.marketingNoEntries) && addBtn(tree) !== undefined);
    check('absent: the save button is disabled; the limits are shown', saveBtn(tree).props.disabled === true && m.includes('>1000<'));
    check('absent: no version and no hashed admin line', !m.includes(T.versionLabel));
  }
  for (const a of S.MARKETING_ANOMALIES) {
    const { tree } = renderOf(S.marketingUnreadable(a, a === 'ENTRY_UNUSABLE' ? 3 : null));
    const m = html(tree);
    check(`stored unreadable × ${a}: the state, the anomaly and the sentence are shown`, m.includes('>UNREADABLE<') && m.includes(`>${a}<`) && m.includes(T.marketingStoredUnreadable));
    check(`stored unreadable × ${a}: NO form — no input, no add, no save — and no «no entries» (an unreadable map is not an empty one)`, inputs(tree).length === 0 && addBtn(tree) === undefined && saveBtn(tree) === undefined && !m.includes(T.marketingNoEntries) && !m.includes(T.marketingAbsent));
    check(`stored unreadable × ${a}: the limits are still shown`, m.includes('>1000<'));
  }
  for (const [label, mk] of [
    ['not an object', () => null],
    ['a state the reader does not know', () => { const d = S.marketingPresent(); d.state = 'WEIRD'; return d; }],
    ['an entry without a key', () => { const d = S.marketingPresent(); delete d.entries[0].en; return d; }],
    ['PRESENT with an anomaly', () => { const d = S.marketingPresent(); d.anomaly = 'ENTRY_UNUSABLE'; return d; }],
    ['ABSENT with entries', () => { const d = S.marketingAbsent(); d.entries = S.marketingPresent().entries; return d; }],
  ]) {
    const { tree } = renderOf(mk());
    const m = html(tree);
    check(`reply unreadable (${label}): the sentence and the problem keys, no entry, no form`, m.includes(T.replyUnreadable) && inputs(tree).length === 0 && addBtn(tree) === undefined && saveBtn(tree) === undefined && !m.includes('FAKE-MODEL-A') && !m.includes(T.marketingAbsent));
  }
  {
    // limits in every state
    const noLimits = S.marketingPresent(); delete noLimits.limits;
    let m = html(renderOf(noLimits).tree);
    check('limits missing: the page says so and declares the key', m.includes(T.limitsAbsent) && m.includes('limits:MISSING'));
    const oneGone = S.marketingPresent(); delete oneGone.limits.nameMaxLength;
    m = html(renderOf(oneGone).tree);
    check('one limit missing: that one is «not sent» (nothing assumed), the other two are shown', m.includes('>maxEntries<') && m.includes('>1000<') && m.includes(T.limitsAbsent) && m.includes('limits.nameMaxLength:MISSING'));
    const bad = S.marketingPresent(); bad.limits.maxEntries = 'many';
    m = html(renderOf(bad).tree);
    check('a limit of the wrong type: the raw value is printed and the problem declared', m.includes('&quot;many&quot;') && m.includes('limits.maxEntries:NOT_A_POSITIVE_INTEGER'));
    const notObj = S.marketingPresent(); notObj.limits = 'x';
    m = html(renderOf(notObj).tree);
    check('limits that is not an object: printed raw, declared', m.includes('&quot;x&quot;') && m.includes('limits:NOT_AN_OBJECT'));
    const extra = S.marketingPresent(); extra.limits.somethingNew = 9;
    m = html(renderOf(extra).tree);
    check('a limit key the reader does not know is listed', m.includes('somethingNew'));
  }

  // =========================================================================
  // 2. editing
  // =========================================================================
  {
    const r0 = R.readMarketingNames(S.marketingPresent());
    const start = P.initialMarketingRows(r0);
    const rendered = renderOf(S.marketingPresent());
    const ins = inputs(rendered.tree);
    ins[5].props.onChange({ target: { value: 'FAKE-AR-B2' } }); // row 1, ar
    const afterTyping = rendered.setters[H.rows].calls[0](start);
    check('typing in a name changes that field of that row only', afterTyping[1].ar === 'FAKE-AR-B2' && afterTyping[0].ar === 'FAKE-AR-A' && afterTyping[1].tr === 'FAKE-TR-B' && afterTyping[1].model === 'FAKE-MODEL-B');
    ins[0].props.onChange({ target: { value: 'FAKE-CHANGED-MODEL' } }); // row 0, model (read-only)
    const afterModel = rendered.setters[H.rows].calls[1](start);
    check('the model of a SAVED row cannot be changed, even if the handler is called', eq(afterModel, start));
    addBtn(rendered.tree).props.onClick();
    const added = rendered.setters[H.rows].calls[2](start);
    check('add: a blank row, unsaved, at the end — the saved ones untouched', added.length === 3 && eq(added[2], { model: '', ar: '', tr: '', en: '', saved: false }) && eq(added.slice(0, 2), start));
    // typing the model of a NEW row works
    const withNew = renderOf(S.marketingPresent(), { [H.rows]: added });
    const newIns = inputs(withNew.tree).slice(8);
    check('a new row: four empty inputs, the model editable, no placeholder', newIns.length === 4 && newIns.every((i) => i.props.value === '' && i.props.placeholder === undefined) && !newIns[0].props.readOnly);
    newIns[0].props.onChange({ target: { value: 'FAKE-NEW-1' } });
    const typedModel = withNew.setters[H.rows].calls[0](added);
    check('typing the model of a NEW row changes it', typedModel[2].model === 'FAKE-NEW-1');
    // remove
    const rm = removers(withNew.tree);
    check('only the unsaved row has a remove button', rm.length === 1);
    rm[0].props.onClick();
    const removed = withNew.setters[H.rows].calls[withNew.setters[H.rows].calls.length - 1](added);
    check('remove: the unsaved row goes, the two saved stay', removed.length === 2 && removed.every((r) => r.saved));
    // the remove handler of a SAVED row (reached through the row's props) removes nothing
    const rowEls = findAll(rendered.tree, (n) => n.props && typeof n.props.onRemove === 'function' && n.props.row);
    rowEls[0].props.onRemove();
    const afterTry = rendered.setters[H.rows].calls[rendered.setters[H.rows].calls.length - 1](start);
    check('the remove handler called for a SAVED row leaves it in place', afterTry.length === 2 && afterTry[0].model === 'FAKE-MODEL-A');
  }
  {
    // the save button and the row problems follow the rows
    const base = P.initialMarketingRows(R.readMarketingNames(S.marketingPresent()));
    const withRows = (rows) => renderOf(S.marketingPresent(), { [H.rows]: rows }).tree;
    const ok = [{ ...base[0], ar: 'FAKE-AR-A2' }, base[1]];
    let tree = withRows(ok);
    check('after a valid edit: the save button is enabled, «• لم يُحفظ بعد» shown, «لا تغيير» not', saveBtn(tree).props.disabled === false && html(tree).includes(T.unsaved) && !html(tree).includes(T.nothingToSave));
    const cases = [
      ['a saved name emptied', [{ ...base[0], tr: '' }, base[1]], 'CANNOT_CLEAR'],
      ['a new row half filled', [...base, fresh({ model: 'FAKE-NEW-1', ar: 'x' })], 'ROW_INCOMPLETE'],
      ['a new row on a saved model', [...base, fresh({ model: 'FAKE-MODEL-A', ar: 'a', tr: 'b', en: 'c' })], 'MODEL_ALREADY_SAVED'],
      ['two new rows with one model', [...base, fresh({ model: 'N', ar: 'a', tr: 'b', en: 'c' }), fresh({ model: 'N', ar: 'a', tr: 'b', en: 'c' })], 'MODEL_DUPLICATE'],
    ];
    for (const [label, rows, problem] of cases) {
      tree = withRows(rows);
      const m = html(tree);
      check(`${label}: its text is named under the row and the save button is disabled`, m.includes(T[MARKETING_PROBLEM_TEXT_KEY[problem]]) && saveBtn(tree).props.disabled === true);
    }
    check('a blank new row alone: no problem, nothing to save', (() => { const t = withRows([...base, fresh()]); return saveBtn(t).props.disabled === true && html(t).includes(T.nothingToSave) && !Object.values(MARKETING_PROBLEM_TEXT_KEY).some((k) => html(t).includes(T[k])); })());
    check('the texts of the row problems are covered one for one', Object.values(P.MARKETING_ROW_PROBLEM).every((q) => MARKETING_PROBLEM_TEXT_KEY[q] in T));
  }

  // =========================================================================
  // 3. the save
  // =========================================================================
  const startRead = R.readMarketingNames(S.marketingPresent());
  const startRows = P.initialMarketingRows(startRead);
  const newComplete = fresh({ model: 'FAKE-NEW-1', ar: 'FAKE-AR-N1', tr: 'FAKE-TR-N1', en: 'FAKE-EN-N1' });
  const EDITED = [startRows[0], { ...startRows[1], en: 'FAKE-EN-B2' }, newComplete];
  const savePanel = (saveImpl, rows = EDITED, loadImpl) => {
    const calls = { save: [], load: 0 };
    const props = {
      loadNames: async () => { calls.load += 1; return loadImpl ? loadImpl() : S.marketingPresent(); },
      saveNames: async (entries) => { calls.save.push(clone(entries)); return saveImpl(entries); },
    };
    return { calls, r: renderOf(S.marketingPresent(), { [H.rows]: rows }, props) };
  };
  {
    toasts.length = 0;
    const { calls, r } = savePanel(async () => S.setMarketingChanged());
    check('save: the button is enabled', saveBtn(r.tree).props.disabled === false);
    await saveBtn(r.tree).props.onClick();
    check('save: setMarketingNames gets exactly the changed saved entry, then the new one — four keys each',
      eq(calls.save, [[{ model: 'FAKE-MODEL-B', ar: 'FAKE-AR-B', tr: 'FAKE-TR-B', en: 'FAKE-EN-B2' }, { model: 'FAKE-NEW-1', ar: 'FAKE-AR-N1', tr: 'FAKE-TR-N1', en: 'FAKE-EN-N1' }]]));
    check('save: the untouched saved entry is NOT sent', !JSON.stringify(calls.save).includes('FAKE-MODEL-A'));
    check('save: the toast says what the SERVER answered (version 4, 1 added, 1 updated)', eq(toasts, [['success', T.marketingSaved(4, 1, 1)]]));
    check('save: the server is read again afterwards', calls.load === 1);
    check('save: saving is switched on then off', eq(r.setters[H.saving].calls, [true, false]));
    check('save: the last failure is cleared first', r.setters[H.saveFailure].calls[0] === null);
  }
  {
    toasts.length = 0;
    const { calls, r } = savePanel(async () => S.setMarketingUnchanged());
    await saveBtn(r.tree).props.onClick();
    check('save, changed:false: the toast says nothing changed, and the server is read again', eq(toasts, [['success', T.savedNoChange]]) && calls.load === 1);
  }
  {
    // nothing to send, or a problem → nothing sent, even if the handler is called
    const log = { save: 0 };
    const props = { loadNames: async () => S.marketingPresent(), saveNames: async () => { log.save += 1; return S.setMarketingChanged(); } };
    const validEdit = { ...startRows[0], ar: 'FAKE-AR-A2' };
    const cases = [
      startRows,
      [...startRows, fresh()],
      [{ ...startRows[0], ar: '' }, startRows[1]],
      [...startRows, fresh({ model: 'N' })],
      [...startRows, fresh({ model: 'FAKE-MODEL-A', ar: 'a', tr: 'b', en: 'c' })],
      // a valid change next to a row with a problem: the whole save waits, the valid change is not sent alone
      [validEdit, startRows[1], fresh({ model: 'N', ar: 'a' })],
      [validEdit, { ...startRows[1], en: '' }],
      [validEdit, startRows[1], fresh({ model: 'FAKE-MODEL-B', ar: 'a', tr: 'b', en: 'c' })],
    ];
    for (const rows of cases) {
      const r = renderOf(S.marketingPresent(), { [H.rows]: rows }, props);
      await saveBtn(r.tree).props.onClick();
    }
    check('nothing changed / a blank row / an emptied name / a half row / a saved model again / a valid change beside a problem row: nothing is sent', log.save === 0);
  }
  {
    // refusals — by code, never by text
    for (const code of W.KNOWN_MARKETING_REFUSAL_CODES) {
      toasts.length = 0;
      const err = SA.refusal(code);
      err.message = 'a sentence that must never be shown';
      const { calls, r } = savePanel(async () => { throw err; });
      await quiet(() => saveBtn(r.tree).props.onClick());
      const failure = r.setters[H.saveFailure].calls.filter((c) => c !== null)[0];
      const shown = html(renderOf(S.marketingPresent(), { [H.rows]: EDITED, [H.saveFailure]: failure }).tree);
      check(`refusal ${code}: kept as { refused, code, field, known:true }; no toast, no reload, the rows left as typed, saving released`,
        failure && failure.refused === true && failure.code === code && failure.known === true && toasts.length === 0 && calls.load === 0 && r.setters[H.rows].calls.length === 0 && eq(r.setters[H.saving].calls, [true, false]));
      check(`refusal ${code}: the code is on screen, the exception's text is not, no «unknown code» note`, shown.includes(code) && !shown.includes('a sentence that must never be shown') && !shown.includes(T.unknownRefusalCode) && shown.includes(T.refusedPrefix));
    }
    for (const code of ['MARKETING_NAMES_SOMETHING_NEW', 'CORRECTION_SCAN_NOT_FOUND']) {
      const { r } = savePanel(async () => { throw SA.refusal(code); });
      await quiet(() => saveBtn(r.tree).props.onClick());
      const failure = r.setters[H.saveFailure].calls.filter((c) => c !== null)[0];
      check(`refusal ${code}: shown with the «unknown to the page» note`, failure.refused === true && failure.known === false && html(renderOf(S.marketingPresent(), { [H.rows]: EDITED, [H.saveFailure]: failure }).tree).includes(T.unknownRefusalCode));
    }
    for (const [label, err, expectCode] of [
      ['permission-denied', { code: 'functions/permission-denied', message: 'FAKE-ADMIN-TEXT-1' }, 'functions/permission-denied'],
      ['unauthenticated', { code: 'functions/unauthenticated', message: 'FAKE-ADMIN-TEXT-2' }, 'functions/unauthenticated'],
      ['not deployed', { code: 'functions/not-found', message: 'FAKE-ADMIN-TEXT-3' }, 'functions/not-found'],
      ['a plain Error', new Error('FAKE-BOOM'), null],
    ]) {
      const { r } = savePanel(async () => { throw err; });
      await quiet(() => saveBtn(r.tree).props.onClick());
      const failure = r.setters[H.saveFailure].calls.filter((c) => c !== null)[0];
      const shown = html(renderOf(S.marketingPresent(), { [H.rows]: EDITED, [H.saveFailure]: failure }).tree);
      check(`${label}: not a refusal — the generic sentence and the SDK code (if any); the error's text is not shown`, failure.refused === false && failure.code === expectCode && shown.includes(T.callFailed) && !shown.includes(T.refusedPrefix) && !shown.includes('FAKE-ADMIN-TEXT') && !shown.includes('FAKE-BOOM'));
    }
    // an unreadable reply: said so, and the server read again (the write may have happened)
    toasts.length = 0;
    const { calls, r } = savePanel(async () => ({ nonsense: true }));
    await saveBtn(r.tree).props.onClick();
    const rf = r.setters[H.saveFailure].calls.filter((c) => c !== null)[0];
    check('an unreadable reply: a reply failure with the keys, no success toast, and the server is read again', rf && rf.reply === true && rf.problems.includes('changed:NOT_A_BOOLEAN') && toasts.length === 0 && calls.load === 1);
  }

  // =========================================================================
  // 4. load failure and retry
  // =========================================================================
  {
    let loads = 0;
    const err = SA.refusal('MARKETING_NAMES_CURRENT_UNREADABLE');
    const props = { loadNames: async () => { loads += 1; throw err; }, saveNames: async () => ({}) };
    const r1 = callComponent(Panel, props, { [H.loading]: false, [H.loadFailure]: { refused: true, code: 'MARKETING_NAMES_CURRENT_UNREADABLE', field: null, known: true } });
    const retry = findAll(r1.tree, (n) => n.type === 'button' && nodeText(n) === T.retry)[0];
    await quiet(() => retry.props.onClick());
    check('retry: calls loadNames again, the failure is kept by its code (known to this contract), loading goes on then off', loads === 1 && eq(r1.setters[H.loadFailure].calls[0], { refused: true, code: 'MARKETING_NAMES_CURRENT_UNREADABLE', field: null, known: true }) && eq(r1.setters[H.loading].calls, [true, false]));
    check('a load failure with no map yet: the failure and no form', (() => { const m = html(r1.tree); return m.includes('MARKETING_NAMES_CURRENT_UNREADABLE') && !m.includes(T.marketingColModel) && !m.includes(T.save); })());
    const okProps = { loadNames: async () => S.marketingPresent(), saveNames: async () => ({}) };
    const r2 = callComponent(Panel, okProps, { [H.loading]: false, [H.loadFailure]: { refused: false, code: 'functions/not-found', field: null, known: false } });
    await findAll(r2.tree, (n) => n.type === 'button' && nodeText(n) === T.retry)[0].props.onClick();
    check('retry, a success: the read is the reader\'s result, the rows start from it, the failure is cleared', r2.setters[H.read].calls[0].view === 'PRESENT' && r2.setters[H.rows].calls[0].length === 2 && r2.setters[H.rows].calls[0].every((r) => r.saved) && r2.setters[H.loadFailure].calls[0] === null);
    const r3 = callComponent(Panel, { loadNames: async () => S.marketingAbsent(), saveNames: async () => ({}) }, { [H.loading]: false, [H.loadFailure]: { refused: false, code: null, field: null, known: false } });
    await findAll(r3.tree, (n) => n.type === 'button' && nodeText(n) === T.retry)[0].props.onClick();
    check('retry onto an ABSENT map: no row', r3.setters[H.read].calls[0].view === 'ABSENT' && eq(r3.setters[H.rows].calls[0], []));
  }

  // =========================================================================
  // 5. static scans of the new files (comments blanked)
  // =========================================================================
  {
    const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const NEW_FILES = [
      'lib/marketingNamesWire.js', 'lib/marketingNamesReaders.js', 'lib/marketingNamesPatch.js',
      'components/admin/protocol/MarketingNamesPanel.js', 'app/admin/protocol/marketing-names/page.js',
    ];
    const code = Object.fromEntries(NEW_FILES.map((p) => [p, stripComments(read(p))]));
    const WRITES = /\b(setDoc|updateDoc|deleteDoc|addDoc|writeBatch|runTransaction|deleteField|arrayRemove)\b/;
    check('no direct Firestore write in any new file of the row', NEW_FILES.every((p) => !WRITES.test(code[p])));
    check('no Firestore READ either (the page reads through getMarketingNames)', NEW_FILES.every((p) => !/\b(getDocs|getDoc|onSnapshot|collection)\b/.test(code[p])));
    check('httpsCallable is not in any new file of the row (it stays in lib/protocolAdminCalls.js)', NEW_FILES.every((p) => !code[p].includes('httpsCallable')));
    const calls = stripComments(read('lib/protocolAdminCalls.js'));
    check('the two function names are written once each, in lib/marketingNamesWire.js, and the calls file takes them from there', ['getMarketingNames', 'setMarketingNames'].every((n) => NEW_FILES.filter((p) => code[p].includes(`'${n}'`)).join() === 'lib/marketingNamesWire.js' && !calls.includes(`'${n}'`)) && calls.includes('MARKETING_NAMES_FN.GET') && calls.includes('MARKETING_NAMES_FN.SET'));
    check('no entry of the map in any new file: no FAKE- literal, no model-looking value, no name', NEW_FILES.every((p) => !/FAKE-|SM-[A-Z]\d|Galaxy|iPhone|Redmi/.test(code[p])));
    check('no `placeholder` in the panel (no example entry)', !code['components/admin/protocol/MarketingNamesPanel.js'].includes('placeholder'));
    check('no delete action or delete label in the feature', NEW_FILES.every((p) => !/['"`](delete|remove)['"`]/i.test(code[p])));
    check('the guard literal is not written in the new files (rule 24: lib/featureFlags.js only)', NEW_FILES.every((p) => !/ADMIN_PROTOCOL_TEXTS_APPROVED\s*=/.test(code[p])));
    check('the route mounts the panel through the gate, nothing else', /<ProtocolGate>\s*<MarketingNamesPanel \/>\s*<\/ProtocolGate>/.test(read('app/admin/protocol/marketing-names/page.js')));
    check('the page shows no limit number of its own: the three numbers of the contract are not written in the panel or the patch builder', !/\b(1000|64|120)\b/.test(code['components/admin/protocol/MarketingNamesPanel.js']) && !/\b(1000|64|120)\b/.test(code['lib/marketingNamesPatch.js']));
  }

  console.log(`${pass}/${total} assertions passed`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
