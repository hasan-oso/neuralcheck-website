'use strict';

// W-P6-18 — the correction page (/admin/protocol/corrections): the form, what it
// sends for each of the four actions, what it shows of every state of the reply,
// and how it shows a refusal.
//
// WHAT IS PROVEN (and what is not, at the end):
//   1. the form: nothing is chosen at the start (no default action, no default
//      reason); `toScanId` shows for relink alone and the reason for exclude
//      alone; the problems are named once the admin has touched the form; typing
//      changes one field;
//   2. the send, by the REAL component under a stand-in hook dispatcher
//      (_call-component.cjs): each of the four actions sends the exact payload,
//      switches busy on and off, clears the last result and the last failure
//      first, shows what the server answered; nothing is sent while the form has
//      a problem or a send is in flight; a refusal is kept by its code for each
//      of the 22 codes of the contract, an unknown code, an admin refusal with no
//      code, a plain error; an unreadable reply, or one that is not an answer to
//      the request, is said so and nothing is drawn from it;
//   3. the result card, for every value: the six samples, each exclusion view
//      and reason, each link state, null link fields, no appended line, both
//      bases, an unknown state flagged, the declared disagreements;
//   4. static scans of the new files: no direct Firestore write, no read at all,
//      the function name written once and only in the wire file, no delete, no
//      placeholder, the design's fifth action never offered.
//
// NOT substituted: the readers, the payload builder, the texts, the components.
// Substituted: the SDK (recorders), next/link and next/navigation (stubs), the
// Toast hook (a recorder).
//
// NOT proven here: that the function behaves as the contract says on the real
// server (it is in the production list at neuralcheck-backend@488e3ee; run only
// in memory, outside this repo), nor how the page looks and behaves in a real
// browser.
//
// SAMPLES: scripts/test/_protocol-correction-wire-samples.cjs — «اصطناعية من
// العقد، لا من مُنتِج حقيقي».
//
// Run: node scripts/test/protocolCorrectionPanel.test.cjs

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
  usePathname: () => '/admin/protocol/corrections',
  useRouter: () => ({ replace: () => {}, push: () => {} }),
});
install('next/link', { __esModule: true, default: ({ href, children, ...rest }) => React.createElement('a', { href, ...rest }, children) });
install('firebase/functions', { getFunctions: () => ({}), httpsCallable: () => async () => { throw new Error('the panel must be given its call by props in this test'); } });
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

const S = require('./_protocol-correction-wire-samples.cjs');
const SA = require('./_protocol-admin-wire-samples.cjs');
const W = require('@/lib/protocolCorrectionWire');
const P = require('@/lib/protocolCorrectionPatch');
const R = require('@/lib/protocolCorrectionReaders');
const {
  ADMIN_PROTOCOL_TEXTS: T,
  CORRECTION_ACTION_LABEL_KEY,
  EXCLUDE_REASON_LABEL_KEY,
  CORRECTION_BASIS_LABEL_KEY,
  CORRECTION_PROBLEM_TEXT_KEY,
} = require('@/lib/adminProtocolTexts');
const PanelModule = require('@/components/admin/protocol/ProtocolCorrectionPanel.js');
const Panel = PanelModule.default;
const { CorrectionResultCard } = PanelModule;

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
const SRC = read('components/admin/protocol/ProtocolCorrectionPanel.js');
const H = hookIndex(SRC, 'export default function ProtocolCorrectionPanel(');
check('panel hooks: the ones this test drives exist, in the declared order', eq(Object.keys(H), ['form', 'busy', 'result', 'failure']));

const f = (o) => ({ ...P.initialCorrectionForm(), ...o });
const render = (states = {}, props = {}) => callComponent(Panel, { correct: async () => S.correctionExcluded(), ...props }, states);
const sendButton = (tree) => findAll(tree, (n) => n.type === 'button' && (nodeText(n) === T.correctionSend || nodeText(n) === T.saving))[0];
const origError = console.error;
const quiet = async (fn) => { console.error = () => {}; try { return await fn(); } finally { console.error = origError; } };

(async () => {
  // =========================================================================
  // 1. the form
  // =========================================================================
  {
    const { tree } = render({ [H.form]: P.initialCorrectionForm() });
    const m = html(tree);
    check('the title is the plan\'s heading and the tab bar is there', m.includes(T.correctionsTitle) && T.correctionsTitle === 'التصحيح: سجلّ بالإلحاق وحده' && m.includes('href="/admin/protocol/corrections"'));
    const selects = findAll(tree, (n) => n.type === 'select');
    check('at the start there is ONE select (the action): nothing chosen, five options — «choose» and the four actions', selects.length === 1 && selects[0].props.value === '' && eq(findAll(selects[0], (n) => n.type === 'option').map((o) => o.props.value), ['', 'unlink', 'relink', 'exclude', 'unexclude']));
    check('the design\'s fifth action is not offered, and nothing says delete', !m.includes('resolveIdentityConflict') && !/delet|remov/i.test(m.replace(/aria-label="[^"]*"/g, '')) && !m.includes('حذف'));
    check('each option carries the proposed label and the action\'s own code', W.CORRECTION_ACTIONS.every((a) => m.includes(`${T[CORRECTION_ACTION_LABEL_KEY[a]]} — ${a}`)));
    const inputs = findAll(tree, (n) => n.type === 'input');
    check('two text inputs (report code, scan id), both empty, LTR, with NO placeholder (no example id)', inputs.length === 2 && inputs.every((i) => i.props.value === '' && i.props.dir === 'ltr' && i.props.placeholder === undefined));
    check('the toScanId input and the reason select are NOT there before their action is chosen', !m.includes(T.toScanIdLabel) && !m.includes(T.reasonLabel));
    check('the send button is disabled, and a pristine form names no problem', sendButton(tree).props.disabled === true && W && !Object.values(CORRECTION_PROBLEM_TEXT_KEY).some((k) => m.includes(T[k]) && k !== 'correctionActionUnset'));
    check('no result card and no failure at the start', !m.includes(T.resultTitle) && !m.includes('role="alert"'));
  }
  {
    const relink = html(render({ [H.form]: f({ action: 'relink' }) }).tree);
    check('relink: the toScanId input appears, the reason does not', relink.includes(T.toScanIdLabel) && !relink.includes(T.reasonLabel));
    const exclude = render({ [H.form]: f({ action: 'exclude' }) });
    const em = html(exclude.tree);
    check('exclude: the reason select appears (unchosen, «choose» + the three), the toScanId input does not', em.includes(T.reasonLabel) && !em.includes(T.toScanIdLabel) && eq(findAll(findAll(exclude.tree, (n) => n.type === 'select')[1], (n) => n.type === 'option').map((o) => o.props.value), ['', 'test', 'wrong', 'golden_reference']));
    check('each reason shows its proposed label and its code', W.EXCLUDE_REASONS.every((r) => em.includes(`${T[EXCLUDE_REASON_LABEL_KEY[r]]} — ${r}`)));
    for (const a of ['unlink', 'unexclude']) {
      const mm = html(render({ [H.form]: f({ action: a }) }).tree);
      check(`${a}: neither the toScanId input nor the reason select`, !mm.includes(T.toScanIdLabel) && !mm.includes(T.reasonLabel));
    }
    // problems are named once the form is touched
    const touched = html(render({ [H.form]: f({ action: 'exclude' }) }).tree);
    check('a touched form names what is missing (target, reason) and disables send', touched.includes(T.problemNoTarget) && touched.includes(T.problemNoReason) && sendButton(render({ [H.form]: f({ action: 'exclude' }) }).tree).props.disabled === true);
    check('both targets: named', html(render({ [H.form]: f({ action: 'unlink', shortId: 'a', scanId: 'b' }) }).tree).includes(T.problemBothTargets));
    check('relink with no toScanId: named', html(render({ [H.form]: f({ action: 'relink', scanId: 'a' }) }).tree).includes(T.problemNoToScanId));
    check('a text typed with no action chosen: the «choose the action» problem is named', html(render({ [H.form]: f({ scanId: 'a' }) }).tree).includes(`>${T.correctionActionUnset}</li>`));
    const ok = render({ [H.form]: f({ action: 'exclude', scanId: 'fake-scan-1', reason: 'test' }) });
    check('a complete form: enabled, no problem shown', sendButton(ok.tree).props.disabled === false && findAll(ok.tree, (n) => n.type === 'li').length === 0);
    // typing and choosing change one field
    const r = render({ [H.form]: P.initialCorrectionForm() });
    const [sel, shortIn, scanIn] = [findAll(r.tree, (n) => n.type === 'select')[0], ...findAll(r.tree, (n) => n.type === 'input')];
    sel.props.onChange({ target: { value: 'relink' } });
    shortIn.props.onChange({ target: { value: 'NC-FAKE01' } });
    scanIn.props.onChange({ target: { value: 'fake-scan-1' } });
    const apply = (i, base) => r.setters[H.form].calls[i](base);
    const a0 = apply(0, P.initialCorrectionForm());
    check('choosing the action changes that field only', eq(a0, f({ action: 'relink' })));
    check('typing in the report-code box changes that field only; same for the scan-id box', eq(apply(1, P.initialCorrectionForm()), f({ shortId: 'NC-FAKE01' })) && eq(apply(2, P.initialCorrectionForm()), f({ scanId: 'fake-scan-1' })));
  }

  // =========================================================================
  // 2. the send
  // =========================================================================
  const FORMS = {
    unlink: { form: f({ action: 'unlink', scanId: 'fake-scan-1' }), payload: { action: 'unlink', scanId: 'fake-scan-1' }, reply: S.correctionUnlinked },
    relink: { form: f({ action: 'relink', scanId: 'fake-scan-1', toScanId: 'fake-scan-3', reason: 'wrong' }), payload: { action: 'relink', scanId: 'fake-scan-1', toScanId: 'fake-scan-3' }, reply: S.correctionRelinked },
    exclude: { form: f({ action: 'exclude', scanId: 'fake-scan-1', toScanId: 'stale', reason: 'test' }), payload: { action: 'exclude', scanId: 'fake-scan-1', reason: 'test' }, reply: S.correctionExcluded },
    unexclude: { form: f({ action: 'unexclude', scanId: 'fake-scan-1', reason: 'test' }), payload: { action: 'unexclude', scanId: 'fake-scan-1' }, reply: S.correctionUnexcluded },
  };
  for (const [name, c] of Object.entries(FORMS)) {
    const sent = [];
    toasts.length = 0;
    const r = render({ [H.form]: c.form }, { correct: async (p) => { sent.push(clone(p)); return c.reply(); } });
    const btn = sendButton(r.tree);
    check(`${name}: the send button is enabled`, btn.props.disabled === false);
    await btn.props.onClick();
    check(`${name}: the function gets exactly the payload (no key that does not apply)`, eq(sent, [c.payload]));
    check(`${name}: busy is switched on then off`, eq(r.setters[H.busy].calls, [true, false]));
    check(`${name}: the last failure and the last result are cleared first, then the result is the reader's`, r.setters[H.failure].calls[0] === null && r.setters[H.result].calls[0] === null && r.setters[H.result].calls[1].ok === true && r.setters[H.result].calls[1].action === name && r.setters[H.result].calls[1].problems.length === 0);
    check(`${name}: the toast says the correction was recorded`, eq(toasts, [['success', T.correctionRecorded]]));
    check(`${name}: nothing is read again (the contract has no read for this page)`, sent.length === 1);
  }
  {
    // changed:false → its own toast
    toasts.length = 0;
    const r = render({ [H.form]: f({ action: 'exclude', shortId: 'NC-FAKE01', reason: 'test' }) }, { correct: async () => S.correctionUnchanged() });
    await sendButton(r.tree).props.onClick();
    check('changed:false: the toast says nothing changed, the result is kept', eq(toasts, [['success', T.savedNoChange]]) && r.setters[H.result].calls[1].changed === false);
  }
  {
    // nothing is sent while the form has a problem, or while a send is in flight
    const sent = [];
    const props = { correct: async (p) => { sent.push(p); return S.correctionExcluded(); } };
    for (const bad of [P.initialCorrectionForm(), f({ action: 'exclude', scanId: 'x' }), f({ action: 'relink', scanId: 'x' }), f({ action: 'unlink', scanId: 'x', shortId: 'y' }), f({ scanId: 'x' })]) {
      const r = render({ [H.form]: bad }, props);
      await sendButton(r.tree).props.onClick();
    }
    check('a form with a problem sends nothing, even if the handler is called', sent.length === 0);
    const busy = render({ [H.form]: FORMS.unlink.form, [H.busy]: true }, props);
    check('while a send is in flight the button is disabled and shows «جاري الحفظ...»', sendButton(busy.tree).props.disabled === true && nodeText(sendButton(busy.tree)) === T.saving);
    await sendButton(busy.tree).props.onClick();
    check('…and the handler, if called, sends nothing (no second request)', sent.length === 0);
  }

  // ---- a refusal: kept by its code, for every code, never by the text ----------
  {
    for (const code of W.KNOWN_CORRECTION_REFUSAL_CODES) {
      toasts.length = 0;
      const err = SA.refusal(code, code === 'CORRECTION_FIELD_NOT_APPLICABLE' ? 'toScanId' : undefined);
      err.message = 'a sentence that must never be shown';
      const r = render({ [H.form]: FORMS.exclude.form }, { correct: async () => { throw err; } });
      await quiet(() => sendButton(r.tree).props.onClick());
      const failure = r.setters[H.failure].calls.filter((c) => c !== null)[0];
      const shown = html(render({ [H.form]: FORMS.exclude.form, [H.failure]: failure }).tree);
      check(`refusal ${code}: kept as { refused, code, field, known:true }, busy released, no toast, no result`,
        failure && failure.refused === true && failure.code === code && failure.known === true && eq(r.setters[H.busy].calls, [true, false]) && toasts.length === 0 && r.setters[H.result].calls.filter((c) => c !== null).length === 0);
      check(`refusal ${code}: the code is on screen, the exception's text is not, and no «unknown code» note`, shown.includes(code) && !shown.includes('a sentence that must never be shown') && !shown.includes(T.unknownRefusalCode) && shown.includes(T.refusedPrefix));
    }
    const fld = render({ [H.form]: FORMS.exclude.form }, { correct: async () => { throw SA.refusal('CORRECTION_FIELD_NOT_APPLICABLE', 'toScanId'); } });
    await quiet(() => sendButton(fld.tree).props.onClick());
    check('a refusal that names a field: the field is kept and shown in brackets', fld.setters[H.failure].calls.some((c) => c && c.field === 'toScanId') && html(render({ [H.failure]: { refused: true, code: 'CORRECTION_FIELD_NOT_APPLICABLE', field: 'toScanId', known: true } }).tree).includes('(toScanId)'));
    // a code the contract does not name, a code of another contract
    for (const code of ['CORRECTION_SOMETHING_NEW', 'SETTINGS_FIELD_INVALID']) {
      const r = render({ [H.form]: FORMS.exclude.form }, { correct: async () => { throw SA.refusal(code); } });
      await quiet(() => sendButton(r.tree).props.onClick());
      const failure = r.setters[H.failure].calls.filter((c) => c !== null)[0];
      check(`refusal ${code}: shown with the «unknown to the page» note`, failure.refused === true && failure.known === false && html(render({ [H.failure]: failure }).tree).includes(T.unknownRefusalCode));
    }
    // the admin refusals and a plain failure: no reasonCode, the SDK code only
    for (const [label, err, expectCode] of [
      ['permission-denied', { code: 'functions/permission-denied', message: 'صلاحية Admin مطلوبة' }, 'functions/permission-denied'],
      ['unauthenticated', { code: 'functions/unauthenticated', message: 'غير مصادق' }, 'functions/unauthenticated'],
      ['not deployed', { code: 'functions/not-found', message: 'FAKE-ERROR-TEXT-NOT-FOUND' }, 'functions/not-found'],
      ['a plain Error', new Error('boom'), null],
    ]) {
      const r = render({ [H.form]: FORMS.exclude.form }, { correct: async () => { throw err; } });
      await quiet(() => sendButton(r.tree).props.onClick());
      const failure = r.setters[H.failure].calls.filter((c) => c !== null)[0];
      const shown = html(render({ [H.form]: FORMS.exclude.form, [H.failure]: failure }).tree);
      check(`${label}: not a refusal — the generic sentence and the SDK code (if any); the text of the error is not shown`, failure.refused === false && failure.code === expectCode && shown.includes(T.callFailed) && !shown.includes(T.refusedPrefix) && !shown.includes(err.message === 'boom' ? 'boom' : err.message));
    }
  }

  // ---- a reply that cannot be drawn -----------------------------------------------
  {
    for (const [label, reply, problem] of [
      ['not an object', 'ok', 'response:NOT_AN_OBJECT'],
      ['no basis', (() => { const d = S.correctionExcluded(); delete d.basis; return d; })(), 'basis:MISSING'],
      ['an unknown action', (() => { const d = S.correctionExcluded(); d.action = 'resolveIdentityConflict'; return d; })(), 'action:UNKNOWN_VALUE'],
      ['an answer to another request (action)', S.correctionUnexcluded(), 'action:DOES_NOT_MATCH_THE_REQUEST'],
      ['an answer to another scan', (() => { const d = S.correctionExcluded(); d.scanId = 'someone-else'; return d; })(), 'scanId:DOES_NOT_MATCH_THE_REQUEST'],
      ['changed that is not a boolean', (() => { const d = S.correctionExcluded(); d.changed = 'yes'; return d; })(), 'changed:NOT_A_BOOLEAN'],
    ]) {
      toasts.length = 0;
      const r = render({ [H.form]: FORMS.exclude.form }, { correct: async () => reply });
      await sendButton(r.tree).props.onClick();
      const failure = r.setters[H.failure].calls.filter((c) => c !== null)[0];
      const shown = html(render({ [H.form]: FORMS.exclude.form, [H.failure]: failure }).tree);
      check(`unreadable reply (${label}): a reply failure naming the key, nothing drawn, no toast`,
        failure && failure.reply === true && failure.problems.some((p) => p.startsWith(problem)) && r.setters[H.result].calls.filter((c) => c !== null).length === 0 && toasts.length === 0 && shown.includes(T.replyUnreadable) && shown.includes(problem) && !shown.includes(T.resultTitle));
    }
  }

  // =========================================================================
  // 3. the result card, for every value
  // =========================================================================
  const card = (reply, sent) => {
    const read = R.readCorrectionResult(reply, sent);
    if (!read.ok) throw new Error(`the sample is not readable: ${read.problems.join(',')}`);
    return html(React.createElement(CorrectionResultCard, { result: read }));
  };
  {
    const m = card(S.correctionExcluded(), { action: 'exclude', scanId: 'fake-scan-1', reason: 'test' });
    check('excluded: the title, «recorded», the action with its code, the scan id, the basis', m.includes(T.resultTitle) && m.includes(T.correctionRecorded) && m.includes(T.actionExclude) && m.includes('>exclude<') && m.includes('fake-scan-1') && m.includes(T.basisScanProtocol) && m.includes('>SCAN_PROTOCOL<'));
    check('excluded: «مستبعَد» with the state code and the reason (label and code)', m.includes(T.exclusionExcluded) && m.includes('>excluded<') && m.includes(T.reasonTest) && m.includes('>test<') && !m.includes(T.exclusionNotExcluded) && !m.includes(T.exclusionNone));
    check('excluded: the link state and the linked scan as they came, the appended line\'s number', m.includes('>active<') && m.includes('fake-scan-2') && m.includes('>1<') && !m.includes(T.seqNone));
  }
  for (const reason of W.EXCLUDE_REASONS) {
    const d = S.correctionExcluded(); d.exclusion.reasonCode = reason;
    const m = card(d);
    check(`reason ${reason}: its label and its code are shown, and no unknown note`, m.includes(T[EXCLUDE_REASON_LABEL_KEY[reason]]) && m.includes(`>${reason}<`) && !m.includes(T.valueUnknown));
  }
  {
    const m = card(S.correctionUnexcluded(), { action: 'unexclude', scanId: 'fake-scan-1' });
    check('not excluded: «غير مستبعَد» with the state code, and no reason line', m.includes(T.exclusionNotExcluded) && m.includes('>not_excluded<') && !m.includes(T.exclusionReasonLabel) && !m.includes(T.exclusionNone));
  }
  {
    const m = card(S.correctionUnlinked(), { action: 'unlink', scanId: 'fake-scan-1' });
    check('no mark: «لا علامة (لم يُصحَّح قطّ)» — and NOT «غير مستبعَد» (an absence is not a «no»)', m.includes(T.exclusionNone) && !m.includes(T.exclusionNotExcluded) && !m.includes(T.exclusionExcluded));
    check('unlinked: the link state shown, the linked scan kept', m.includes('>unlinked_by_admin<') && m.includes('fake-scan-2') && m.includes(T.actionUnlink));
  }
  {
    const m = card(S.correctionRelinked(), { action: 'relink', scanId: 'fake-scan-1', toScanId: 'fake-scan-3' });
    check('relinked: the new state and the new target, the line\'s number', m.includes('>relinked_by_admin<') && m.includes('fake-scan-3') && m.includes('>3<') && m.includes(T.actionRelink));
  }
  {
    const m = card(S.correctionUnchanged(), { action: 'exclude', shortId: 'NC-FAKE01', reason: 'test' });
    check('unchanged: «لم يتغيّر شيء», «no line appended» (not 0 and not empty), no «recorded»', m.includes(T.savedNoChange) && m.includes(T.seqNone) && !m.includes(T.correctionRecorded));
  }
  {
    const m = card(S.correctionReportOnly(), { action: 'exclude', scanId: 'fake-scan-old', reason: 'golden_reference' });
    check('report only: the basis in words and its code', m.includes(T.basisReportOnly) && m.includes('>REPORT_ONLY<') && !m.includes('>SCAN_PROTOCOL<'));
    check('report only: the link fields are shown as «لا قيمة» — twice — not blank and not a made-up value', count(m, T.valueNull) === 2);
  }
  for (const ls of W.LINK_STATES) {
    const m = card((() => { const d = S.correctionExcluded(); d.linkState = ls; return d; })());
    check(`link state ${ls}: shown as the code, not flagged`, m.includes(`>${ls}<`) && !m.includes(T.valueUnknown));
  }
  {
    const d = S.correctionExcluded(); d.linkState = 'quarantined';
    const m = card(d);
    check('a link state the plan does not list: shown as it came, with «unknown to the page», and the problem line', m.includes('>quarantined<') && m.includes(T.valueUnknown) && m.includes('linkState:UNKNOWN_VALUE'));
    const e = S.correctionExcluded(); e.exclusion.state = 'quarantined';
    const em = card(e);
    check('an exclusion state the reader does not know: the raw state, flagged, never drawn as excluded or not excluded', em.includes('>quarantined<') && em.includes(T.valueUnknown) && !em.includes(T.exclusionExcluded) && !em.includes(T.exclusionNotExcluded));
    const u = S.correctionExcluded(); u.exclusion.reasonCode = 'duplicate';
    const um = card(u);
    check('a reason the reader does not know: the code, flagged', um.includes('>duplicate<') && um.includes(T.valueUnknown));
  }
  {
    const d = S.correctionExcluded(); d.correctionSeq = null;
    const m = card(d);
    check('a disagreement the reader declared is printed under the result (the reply is still drawn)', m.includes('correctionSeq:NULL_WHILE_CHANGED') && m.includes(T.resultTitle));
    const clean = card(S.correctionExcluded());
    check('a clean reply prints no problem line', !clean.includes('_WHILE_') && !clean.includes('DIFFERS'));
  }
  {
    // the card is on the page when the panel holds a result, and not otherwise
    const read1 = R.readCorrectionResult(S.correctionExcluded());
    check('the page shows the card when it holds a result, and not when it does not', html(render({ [H.result]: read1 }).tree).includes(T.resultTitle) && !html(render({ [H.result]: null }).tree).includes(T.resultTitle));
  }

  // =========================================================================
  // 4. static scans of the new files (comments blanked)
  // =========================================================================
  {
    const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const NEW_FILES = [
      'lib/protocolCorrectionWire.js', 'lib/protocolCorrectionReaders.js', 'lib/protocolCorrectionPatch.js',
      'components/admin/protocol/ProtocolCorrectionPanel.js', 'app/admin/protocol/corrections/page.js',
    ];
    const code = Object.fromEntries(NEW_FILES.map((p) => [p, stripComments(read(p))]));
    const WRITES = /\b(setDoc|updateDoc|deleteDoc|addDoc|writeBatch|runTransaction|deleteField|arrayRemove)\b/;
    check('no direct Firestore write in any new file of the row', NEW_FILES.every((p) => !WRITES.test(code[p])));
    check('no Firestore READ either (the page reads nothing: the contract has no read for it)', NEW_FILES.every((p) => !/\b(getDocs|getDoc|onSnapshot|collection)\b/.test(code[p])));
    check('httpsCallable is not in any new file of the row (it stays in lib/protocolAdminCalls.js)', NEW_FILES.every((p) => !code[p].includes('httpsCallable')));
    const calls = stripComments(read('lib/protocolAdminCalls.js'));
    check('the function name is written once, in lib/protocolCorrectionWire.js, and the calls file takes it from there', NEW_FILES.filter((p) => code[p].includes("'correctProtocolRecord'")).join() === 'lib/protocolCorrectionWire.js' && !calls.includes("'correctProtocolRecord'") && calls.includes('PROTOCOL_CORRECTION_FN.CORRECT'));
    check('the design\'s fifth action is named in the wire file only, and never offered or sent', NEW_FILES.filter((p) => code[p].includes('resolveIdentityConflict')).join() === 'lib/protocolCorrectionWire.js');
    check('no delete action or delete label in the feature', NEW_FILES.every((p) => !/['"`](delete|remove)['"`]/i.test(code[p])) && !Object.values(T).some((v) => typeof v === 'string' && v.includes('حذف') && !['returnReasonsRule', 'techHint'].some((k) => T[k] === v)));
    check('no `placeholder` in the correction panel (no example id)', !code['components/admin/protocol/ProtocolCorrectionPanel.js'].includes('placeholder'));
    check('no scan id, report code or technician name written in the new files (only the form\'s own variable names)', NEW_FILES.every((p) => !/NC-[A-Z0-9]{4,12}/.test(code[p]) && !/FAKE-/.test(code[p])));
    check('the guard literal is not written in the new files (rule 24: lib/featureFlags.js only)', NEW_FILES.every((p) => !/ADMIN_PROTOCOL_TEXTS_APPROVED\s*=/.test(code[p])));
    check('the route mounts the panel through the gate, nothing else', /<ProtocolGate>\s*<ProtocolCorrectionPanel \/>\s*<\/ProtocolGate>/.test(read('app/admin/protocol/corrections/page.js')));
  }

  console.log(`${pass}/${total} assertions passed`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
