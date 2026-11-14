'use strict';

// W-P6-14 — the protocol admin pages: /admin/protocol (the settings) and
// /admin/protocol/shops (the six parts per shop, the technicians), their
// sidebar entry, and the static guard that keeps all of it invisible until the
// texts are approved.
//
// WHAT IS PROVEN (and what is not, at the end):
//   1. the guard: ADMIN_PROTOCOL_TEXTS_APPROVED is true since 2026-10-23 (all
//      89 proposed texts approved) and cannot be true while a text is still
//      PROPOSED; it is written once; with it false (stubbed here) the sidebar
//      has no entry, the four routes render nothing, redirect to /admin, and the
//      panels are never mounted; with it true they are;
//   2. the settings page, by the REAL component under a stand-in hook
//      dispatcher (_call-component.cjs): the four states of
//      (state × anomaly) show the right banner and nothing of the others; every
//      field shows an absence as an absence (no 0, no default); the two fields
//      with no meaning never show; save sends the exact patch, shows what the
//      server answers, reads the server again, and shows a refusal by its code;
//   3. the shop page: picker, the six parts in each state (on, off, absent
//      document, unreadable), the technicians in each activeState, no delete
//      anywhere, no name typed in by the code, each write's exact payload,
//      refusals by their code, a stale reply dropped, a reply for another shop
//      shown as a failure;
//   4. static scans of the new files: no direct Firestore write, the only read
//      is the picker's `users`, no `batteryPairs`, no names, no symptomChips /
//      targets; every text has a source and the EXISTING ones exist.
//
// HOW: components are called under the stand-in dispatcher (state presets,
// recording setters), handlers are taken from the elements they return and
// called, and the markup of the same tree is rendered with react-dom/server.
// NOT substituted: the readers, the patch builders, the texts, the components.
// Substituted: the SDK (recorders), next/link and next/navigation (stubs), the
// Toast hook (a recorder).
//
// NOT proven here: that the five functions behave as the contract says on the
// real server (they are in the production list at neuralcheck-backend@488e3ee
// and were run only in memory, outside this repo), nor how the pages look and
// behave in a real browser.
//
// SAMPLES: scripts/test/_protocol-admin-wire-samples.cjs — «اصطناعية من العقد،
// لا من مُنتِج حقيقي».
//
// Run: node scripts/test/adminProtocolPanels.test.cjs

require('./_jsx-require-hook.cjs');
const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { callComponent, findAll: findAllShallow } = require('./_call-component.cjs');

/**
 * Every element in `node`, FUNCTION COMPONENTS EXPANDED: the shared findAll looks
 * only at the elements a component returned, and these pages keep their rows in
 * small hook-free components (FieldHead, ReturnReasonsEditor, PartsCard,
 * TechnicianRow, CallFailure, ProtocolTabs). Each is called with its props and
 * what it returns is searched too, in document order.
 */
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
void findAllShallow;

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ---- fakes ------------------------------------------------------------------
function install(request, exports) {
  const key = require.resolve(request);
  require.cache[key] = { id: key, filename: key, loaded: true, exports, children: [], paths: [] };
}
const routerCalls = [];
let pathnameNow = '/admin/protocol';
install('next/navigation', {
  usePathname: () => pathnameNow,
  useRouter: () => ({ replace: (p) => routerCalls.push(['replace', p]), push: (p) => routerCalls.push(['push', p]) }),
});
install('next/link', { __esModule: true, default: ({ href, children, ...rest }) => React.createElement('a', { href, ...rest }, children) });
install('firebase/functions', { getFunctions: () => ({}), httpsCallable: () => async () => { throw new Error('the panels must be given their calls by props in this test'); } });
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

const S = require('./_protocol-admin-wire-samples.cjs');
const R = require('@/lib/protocolAdminReaders');
const W = require('@/lib/protocolAdminWire');
const PA = require('@/lib/protocolAdminPatch');
const { ADMIN_PROTOCOL_TEXTS: T, TEXT_SOURCE, SETTINGS_FIELD_LABEL_KEY, PART_LABEL_KEY, TECH_STATE_LABEL_KEY, CORRECTION_ACTION_LABEL_KEY, EXCLUDE_REASON_LABEL_KEY, CORRECTION_BASIS_LABEL_KEY, CORRECTION_PROBLEM_TEXT_KEY, MARKETING_PROBLEM_TEXT_KEY } = require('@/lib/adminProtocolTexts');
const SettingsPanel = require('@/components/admin/protocol/ProtocolSettingsPanel.js').default;
const ShopPanel = require('@/components/admin/protocol/ShopProtocolPanel.js').default;
const CallFailureModule = require('@/components/admin/protocol/CallFailure.js');
const CallFailure = CallFailureModule.default;

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
function nodeText(node) {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  return nodeText(node.props && node.props.children);
}
const html = (tree) => renderToStaticMarkup(tree);
const count = (haystack, needle) => haystack.split(needle).length - 1;

/** The names and order of a component's useState hooks, read from the real source. */
function hookIndex(src, startMarker, endMarker) {
  const a = src.indexOf(startMarker);
  if (a < 0) throw new Error(`marker not found: ${startMarker}`);
  const b = endMarker ? src.indexOf(endMarker, a) : src.length;
  const names = [...src.slice(a, b === -1 ? src.length : b).matchAll(/const \[(\w+), set\w+\]\s*=\s*useState/g)].map((m) => m[1]);
  return Object.fromEntries(names.map((n, i) => [n, i]));
}
const SETTINGS_SRC = read('components/admin/protocol/ProtocolSettingsPanel.js');
const SHOP_SRC = read('components/admin/protocol/ShopProtocolPanel.js');
const SI = hookIndex(SETTINGS_SRC, 'export default function ProtocolSettingsPanel(');
const HI = hookIndex(SHOP_SRC, 'export default function ShopProtocolPanel(');
check('settings panel hooks: the ones this test drives exist, in the declared order',
  eq(Object.keys(SI), ['loading', 'loadFailure', 'read', 'form', 'saving', 'saveFailure']));
check('shop panel hooks: the ones this test drives exist, in the declared order',
  eq(Object.keys(HI), ['shopsStatus', 'shops', 'search', 'ownerId', 'configStatus', 'config', 'configFailure', 'partsDraft', 'busy', 'actionFailure', 'newName', 'renameDrafts']));

(async () => {
  // =========================================================================
  // 1. the guard
  // =========================================================================
  {
    const flags = read('lib/featureFlags.js');
    // 2026-10-23, replaces «the guard is false» (rule 23): all 89 proposed texts are approved, so the guard is true — and it cannot be
    // true while any text is still PROPOSED (the invariant the flag exists for).
    check('guard: ADMIN_PROTOCOL_TEXTS_APPROVED is true, and no text is still PROPOSED (it cannot be true while one is)', require('@/lib/featureFlags').ADMIN_PROTOCOL_TEXTS_APPROVED === true && Object.values(TEXT_SOURCE).every((s) => s !== 'PROPOSED'));
    check('guard: written once, in lib/featureFlags.js (rule 24)', count(flags, 'export const ADMIN_PROTOCOL_TEXTS_APPROVED') === 1);
    // every other file only imports it: no second literal anywhere in the new code
    const files = ['components/admin/Sidebar.js', 'components/admin/protocol/ProtocolGate.js', 'app/admin/protocol/page.js', 'app/admin/protocol/shops/page.js'];
    check('guard: no other file assigns it', files.every((f) => !/ADMIN_PROTOCOL_TEXTS_APPROVED\s*=/.test(read(f))));

    // the Sidebar, flag false and flag true
    const sidebarPath = require.resolve('@/components/admin/Sidebar.js');
    const flagsPath = require.resolve('@/lib/featureFlags.js');
    const renderSidebar = (flagValue) => {
      const saved = { sidebar: require.cache[sidebarPath], flags: require.cache[flagsPath] };
      delete require.cache[sidebarPath];
      install('@/lib/featureFlags.js', { ADMIN_PROTOCOL_TEXTS_APPROVED: flagValue, PDF_DOWNLOAD_ENABLED: false });
      try {
        const Sidebar = require('@/components/admin/Sidebar.js').default;
        return html(React.createElement(Sidebar, { user: { email: 'admin@example.test' } }));
      } finally {
        delete require.cache[sidebarPath];
        if (saved.sidebar) require.cache[sidebarPath] = saved.sidebar;
        require.cache[flagsPath] = saved.flags;
      }
    };
    const off = renderSidebar(false);
    const on = renderSidebar(true);
    check('sidebar, flag false: no entry for the protocol pages, no label', !off.includes('/admin/protocol') && !off.includes(T.navLabel));
    check('sidebar, flag false: the seven existing entries are all still there', ['/admin"', '/admin/users', '/admin/payments', '/admin/reports', '/admin/promos', '/admin/settings'].every((h) => off.includes(h)) && off.includes('الرسائل'));
    check('sidebar, flag true: the entry and its label', on.includes('href="/admin/protocol"') && on.includes(T.navLabel));

    // the gate and the two routes
    const gatePath = require.resolve('@/components/admin/protocol/ProtocolGate.js');
    const gateWith = (flagValue) => {
      const saved = { gate: require.cache[gatePath], flags: require.cache[flagsPath] };
      delete require.cache[gatePath];
      install('@/lib/featureFlags.js', { ADMIN_PROTOCOL_TEXTS_APPROVED: flagValue, PDF_DOWNLOAD_ENABLED: false });
      const Gate = require('@/components/admin/protocol/ProtocolGate.js').default;
      const restore = () => {
        delete require.cache[gatePath];
        if (saved.gate) require.cache[gatePath] = saved.gate;
        require.cache[flagsPath] = saved.flags;
      };
      return { Gate, restore };
    };
    // a dispatcher that keeps the effects (the shared helper drops them)
    const REACT_DISPATCHER = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
    const runWithEffects = (Comp, props) => {
      const effects = [];
      const previous = REACT_DISPATCHER.current;
      REACT_DISPATCHER.current = {
        useState: (i) => [typeof i === 'function' ? i() : i, () => {}],
        useEffect: (fn, deps) => effects.push({ fn, deps }),
        useRef: (i) => ({ current: i }),
        useContext: () => undefined,
        useMemo: (fn) => fn(),
        useCallback: (fn) => fn,
      };
      try {
        const tree = Comp(props);
        effects.forEach((e) => e.fn());
        return tree;
      } finally {
        REACT_DISPATCHER.current = previous;
      }
    };
    for (const [flagValue, label] of [[false, 'false'], [true, 'true']]) {
      routerCalls.length = 0;
      const { Gate, restore } = gateWith(flagValue);
      const child = React.createElement('p', null, 'CHILD');
      const tree = runWithEffects(Gate, { children: child });
      restore();
      if (flagValue === false) {
        check('gate, flag false: renders NOTHING (null), not a message', tree === null);
        check('gate, flag false: sends the visitor to /admin', eq(routerCalls, [['replace', '/admin']]));
      } else {
        check('gate, flag true: renders its children', tree === child);
        check('gate, flag true: no redirect', routerCalls.length === 0);
      }
    }
    // the routes mount their panel only through the gate: a spy in place of each panel
    for (const [routeFile, panelModule] of [
      ['app/admin/protocol/page.js', '@/components/admin/protocol/ProtocolSettingsPanel.js'],
      ['app/admin/protocol/shops/page.js', '@/components/admin/protocol/ShopProtocolPanel.js'],
      // 2026-10-23: the two routes of W-P6-18 / W-P6-20 join (they are mounted through the same gate)
      ['app/admin/protocol/corrections/page.js', '@/components/admin/protocol/ProtocolCorrectionPanel.js'],
      ['app/admin/protocol/marketing-names/page.js', '@/components/admin/protocol/MarketingNamesPanel.js'],
    ]) {
      for (const flagValue of [false, true]) {
        const routePath = require.resolve(`@/${routeFile}`);
        const gatePath2 = require.resolve('@/components/admin/protocol/ProtocolGate.js');
        const panelPath = require.resolve(panelModule);
        const saved = { route: require.cache[routePath], gate: require.cache[gatePath2], panel: require.cache[panelPath], flags: require.cache[flagsPath] };
        delete require.cache[routePath];
        delete require.cache[gatePath2];
        install('@/lib/featureFlags.js', { ADMIN_PROTOCOL_TEXTS_APPROVED: flagValue, PDF_DOWNLOAD_ENABLED: false });
        let mounted = 0;
        install(panelModule, { __esModule: true, default: () => { mounted += 1; return React.createElement('div', null, 'PANEL'); } });
        const Page = require(`@/${routeFile}`).default;
        const markup = html(React.createElement(Page));
        delete require.cache[routePath];
        delete require.cache[gatePath2];
        if (saved.route) require.cache[routePath] = saved.route;
        if (saved.gate) require.cache[gatePath2] = saved.gate;
        require.cache[panelPath] = saved.panel;
        require.cache[flagsPath] = saved.flags;
        if (flagValue === false) {
          check(`${routeFile}, flag false: empty markup and the panel is never mounted`, markup === '' && mounted === 0);
        } else {
          check(`${routeFile}, flag true: the panel is mounted`, markup === '<div>PANEL</div>' && mounted === 1);
        }
      }
    }
  }

  // =========================================================================
  // 2. the settings page
  // =========================================================================
  const renderSettings = (readResult, extra = {}, props = {}) => {
    const form = readResult ? PA.initialSettingsForm(readResult) : null;
    return callComponent(SettingsPanel, props, { [SI.loading]: false, [SI.read]: readResult, [SI.form]: form, ...extra });
  };
  const fieldBlock = (tree, name) => findAll(tree, (n) => n.key === name)[0];
  const inputIn = (block) => findAll(block, (n) => n.type === 'input' || n.type === 'select')[0];
  const saveButton = (tree) => findAll(tree, (n) => n.type === 'button' && nodeText(n) === T.save)[0];

  // ---- the four (state × anomaly) combinations at page level (rule 30) -------
  {
    const cases = [
      { name: 'PRESENT × none', mk: () => S.settingsPresent(), has: [T.versionLabel], lacks: [T.settingsAbsent, T.replyUnreadable, 'VERSION_UNUSABLE', T.settingsVersionUnusable] },
      { name: 'ABSENT × none', mk: () => S.settingsAbsent(), has: ['SETTINGS_ABSENT', T.settingsAbsent, T.settingsAbsentEffect], lacks: [T.versionLabel, T.replyUnreadable, 'VERSION_UNUSABLE'] },
      { name: 'ABSENT × VERSION_UNUSABLE', mk: () => S.settingsVersionUnusable(), has: ['SETTINGS_ABSENT', T.settingsAbsent, 'VERSION_UNUSABLE', T.settingsVersionUnusable], lacks: [T.versionLabel, T.replyUnreadable] },
      { name: 'PRESENT × VERSION_UNUSABLE (contradiction)', mk: () => { const d = S.settingsPresent(); d.anomaly = 'VERSION_UNUSABLE'; return d; }, has: [T.replyUnreadable, 'state:PRESENT_WITH_ANOMALY'], lacks: [T.versionLabel, T.settingsAbsent] },
      { name: 'unknown state', mk: () => { const d = S.settingsAbsent(); d.state = 'WEIRD'; return d; }, has: [T.replyUnreadable, 'state:UNKNOWN_VALUE'], lacks: [T.versionLabel, T.settingsAbsent] },
      { name: 'unknown anomaly', mk: () => { const d = S.settingsAbsent(); d.anomaly = 'WEIRD'; return d; }, has: [T.replyUnreadable, 'anomaly:UNKNOWN_VALUE'], lacks: [T.versionLabel] },
      { name: 'state missing', mk: () => { const d = S.settingsPresent(); delete d.state; return d; }, has: [T.replyUnreadable, 'state:MISSING'], lacks: [T.versionLabel] },
    ];
    for (const c of cases) {
      const { tree } = renderSettings(R.readProtocolSettings(c.mk()));
      const m = html(tree);
      check(`settings page, ${c.name}: shows ${c.has.map((s) => `«${s}»`).join(' ')}`, c.has.every((s) => m.includes(s)));
      check(`settings page, ${c.name}: does not show ${c.lacks.map((s) => `«${s}»`).join(' ')}`, c.lacks.every((s) => !m.includes(s)));
    }
  }

  // ---- PRESENT: what is on screen ---------------------------------------------
  {
    const { tree } = renderSettings(R.readProtocolSettings(S.settingsPresent()));
    const m = html(tree);
    check('present: every one of the seven labels and wire names is shown', W.SETTINGS_FIELDS.every((n) => m.includes(T[SETTINGS_FIELD_LABEL_KEY[n]]) && m.includes(`>${n}<`)));
    const vals = { repeatRate: '0.37', doubleEvalRate: '0.11', openBeforeValidityHours: '24', blindnessAlertBelowPct: '61', minAppVersion: '0.0.1' };
    check('present: the saved values are the inputs\' values', Object.entries(vals).every(([n, v]) => inputIn(fieldBlock(tree, n)).props.value === v));
    check('present: collectionPhase shows «مفعَّل» selected, and has no «not set» option', inputIn(fieldBlock(tree, 'collectionPhase')).props.value === 'true' && !html(fieldBlock(tree, 'collectionPhase')).includes('value="unset"'));
    check('present: no «غير مضبوط» badge anywhere except none', count(m, T.fieldAbsent) === 0);
    check('present: the version, the date and the hashed admin are shown', m.includes('>3<') && m.includes('FAKE-HASH-ADMIN-1'));
    check('present: the limits are printed as sent, verbatim', m.includes(T.limitsTitle) && m.includes('SYNTHETIC_UNSPECIFIED_SHAPE'));
    check('present: symptomChips and targets are not on the page', !m.includes('symptomChips') && !m.includes('targets'));
    check('present: the plan\'s rule for the return-reason keys is shown, verbatim', m.includes(T.returnReasonsRule) && T.returnReasonsRule === 'المفتاح لا يُعدَّل بعد استعماله، والإيقاف بدل الحذف.');
    const rows = findAll(fieldBlock(tree, 'returnReasons'), (n) => n.type === 'input' && n.props.type === 'text');
    check('present: the two saved reasons: their keys are read-only', rows.filter((n) => n.props.dir === 'ltr' && n.props.readOnly === true).length === 2);
    check('present: the save button is disabled when nothing changed, and «لا تغيير» is shown', saveButton(tree).props.disabled === true && m.includes(T.nothingToSave));
  }

  // ---- ABSENT: an absence is an absence ----------------------------------------
  {
    const { tree } = renderSettings(R.readProtocolSettings(S.settingsAbsent()));
    const m = html(tree);
    check('absent: all seven fields carry the «غير مضبوط» badge (the select\'s option makes eight)', count(m, T.fieldAbsent) === 8);
    const numeric = ['repeatRate', 'doubleEvalRate', 'openBeforeValidityHours', 'blindnessAlertBelowPct', 'minAppVersion'];
    check('absent: the five text inputs are EMPTY — not 0, not a proposed value', numeric.every((n) => inputIn(fieldBlock(tree, n)).props.value === ''));
    check('absent: the switch is on «not set», not off', inputIn(fieldBlock(tree, 'collectionPhase')).props.value === 'unset');
    check('absent: no return-reason row', findAll(fieldBlock(tree, 'returnReasons'), (n) => n.type === 'input').length === 0);
    check('absent: nothing of the plan\'s proposed values (0.25, 0.10, 168, 80) is on the page as a value', !/value="(0\.25|0\.1|0\.10|168|80)"/.test(m));
    check('absent: the save button is disabled', saveButton(tree).props.disabled === true);
  }

  // ---- unusable version, malformed, unreadable, unknown ------------------------
  {
    const { tree } = renderSettings(R.readProtocolSettings(S.settingsVersionUnusable()));
    check('unusable version: the one saved field is shown, the rest are «غير مضبوط»', inputIn(fieldBlock(tree, 'repeatRate')).props.value === '0.37' && count(html(tree), T.fieldAbsent) === 7);
  }
  {
    const d = S.settingsPresent();
    d.settings.doubleEvalRate = 'oops';
    d.settings.someFutureField = 1;
    const { tree } = renderSettings(R.readProtocolSettings(d));
    const m = html(tree);
    check('malformed field: the badge and the raw value are shown, the input is empty', m.includes(T.fieldMalformed) && m.includes('oops') && inputIn(fieldBlock(tree, 'doubleEvalRate')).props.value === '');
    check('unknown settings key: listed', m.includes(T.fieldUnknownKeys) && m.includes('someFutureField'));
    check('malformed field alone does not block the page: view still PRESENT', m.includes(T.versionLabel));
  }
  {
    const { tree } = renderSettings(R.readProtocolSettings(null));
    const m = html(tree);
    check('unreadable reply: the sentence and the problem code, and no save', m.includes(T.replyUnreadable) && m.includes('response:NOT_AN_OBJECT') && saveButton(tree).props.disabled === true);
  }
  {
    const d = S.settingsPresent();
    d.settings.symptomChips = ['x'];
    d.settings.targets = { a: 1 };
    d.notSpecified = ['symptomChips', 'targets'];
    const { tree } = renderSettings(R.readProtocolSettings(d));
    check('symptomChips / targets present in the reply: still not on the page', !html(tree).includes('symptomChips') && !html(tree).includes('targets'));
  }
  {
    const d = S.settingsPresent();
    delete d.limits;
    const m = html(renderSettings(R.readProtocolSettings(d)).tree);
    check('limits missing: the page says so and declares the key', m.includes(T.limitsAbsent) && m.includes('limits:MISSING'));
  }

  // ---- editing and saving -------------------------------------------------------
  {
    const readResult = R.readProtocolSettings(S.settingsPresent());
    const calls = { save: [], load: 0 };
    const reload = async () => { calls.load += 1; return S.settingsPresent(); };
    const props = (saveImpl) => ({ loadSettings: reload, saveSettings: async (patch) => { calls.save.push(clone(patch)); return saveImpl(patch); } });
    const first = renderSettings(readResult, {}, props(async () => S.setSettingsChanged()));
    // typing in a field records a form update; apply it and render again
    const rateInput = inputIn(fieldBlock(first.tree, 'repeatRate'));
    rateInput.props.onChange({ target: { value: '0.5' } });
    const updater = first.setters[SI.form].calls[0];
    const form1 = updater(PA.initialSettingsForm(readResult));
    check('typing in a field changes only that field of the form', form1.repeatRate === '0.5' && form1.doubleEvalRate === '0.11');
    const second = renderSettings(readResult, { [SI.form]: form1 }, props(async () => S.setSettingsChanged()));
    check('after an edit: the save button is enabled and «• لم يُحفظ بعد» is shown', saveButton(second.tree).props.disabled === false && html(second.tree).includes(T.unsaved));
    toasts.length = 0;
    await saveButton(second.tree).props.onClick();
    check('save: setProtocolSettings gets exactly the changed field', eq(calls.save, [{ repeatRate: 0.5 }]));
    check('save: the toast says what the SERVER answered (version 4)', eq(toasts, [['success', T.savedVersion(4)]]));
    check('save: the server is read again afterwards', calls.load === 1);
    check('save: saving is switched on then off', eq(second.setters[SI.saving].calls, [true, false]));

    // changed:false → its own toast
    calls.save.length = 0; calls.load = 0; toasts.length = 0;
    const third = renderSettings(readResult, { [SI.form]: form1 }, props(async () => S.setSettingsUnchanged()));
    await saveButton(third.tree).props.onClick();
    check('save, changed:false: the toast says nothing changed, and the server is read again', eq(toasts, [['success', T.savedNoChange]]) && calls.load === 1);

    // a refusal: shown by its code; no reload; the form is left as typed
    calls.save.length = 0; calls.load = 0; toasts.length = 0;
    const refused = S.refusal('SETTINGS_FIELD_INVALID', 'repeatRate');
    refused.message = 'a sentence that must never be shown';
    const fourth = renderSettings(readResult, { [SI.form]: form1 }, props(async () => { throw refused; }));
    const origError = console.error;
    console.error = () => {};
    await saveButton(fourth.tree).props.onClick();
    console.error = origError;
    const failure = fourth.setters[SI.saveFailure].calls.filter((c) => c !== null)[0];
    check('refusal: the failure kept is { refused, code, field, known } from details.reasonCode', eq(failure, { refused: true, code: 'SETTINGS_FIELD_INVALID', field: 'repeatRate', known: true }));
    check('refusal: no success toast, no reload, no change to the form', toasts.length === 0 && calls.load === 0 && fourth.setters[SI.form].calls.length === 0);
    const shown = html(renderSettings(readResult, { [SI.form]: form1, [SI.saveFailure]: failure }).tree);
    check('refusal: the code and the field are on screen; the exception\'s text is not', shown.includes('SETTINGS_FIELD_INVALID') && shown.includes('(repeatRate)') && !shown.includes('a sentence that must never be shown'));

    // a reply that cannot be read: said so, and the server is read again
    calls.load = 0; toasts.length = 0;
    const fifth = renderSettings(readResult, { [SI.form]: form1 }, props(async () => ({ nonsense: true })));
    await saveButton(fifth.tree).props.onClick();
    const rf = fifth.setters[SI.saveFailure].calls.filter((c) => c !== null)[0];
    check('unreadable reply: reported as a reply failure with the missing keys, no success toast', rf && rf.reply === true && rf.problems.includes('changed:NOT_A_BOOLEAN') && toasts.length === 0);
    check('unreadable reply: the server is read again (the write may have happened)', calls.load === 1);

    // nothing to send → nothing sent, even if the handler is called
    calls.save.length = 0;
    const idle = renderSettings(readResult, {}, props(async () => S.setSettingsChanged()));
    await saveButton(idle.tree).props.onClick();
    check('nothing changed: the handler sends nothing', calls.save.length === 0);
    // an invalid number → nothing sent
    const bad = PA.initialSettingsForm(readResult);
    bad.repeatRate = 'abc';
    const badRender = renderSettings(readResult, { [SI.form]: bad }, props(async () => S.setSettingsChanged()));
    await saveButton(badRender.tree).props.onClick();
    check('an invalid number: nothing is sent, the button is disabled, the page names the problem', calls.save.length === 0 && saveButton(badRender.tree).props.disabled === true && html(badRender.tree).includes(T.invalidNumber));
    // emptied saved value
    const empt = PA.initialSettingsForm(readResult);
    empt.minAppVersion = '';
    const emptRender = renderSettings(readResult, { [SI.form]: empt }, props(async () => S.setSettingsChanged()));
    check('a saved value emptied: «لا يمكن مسح قيمة محفوظة» and no save', html(emptRender.tree).includes(T.cannotClear) && saveButton(emptRender.tree).props.disabled === true);
    // unreadable view never saves
    const unreadable = renderSettings(R.readProtocolSettings({}), {}, props(async () => S.setSettingsChanged()));
    check('unreadable view: the save button is disabled', saveButton(unreadable.tree).props.disabled === true);

    // return reasons: add starts inactive and removable; saved rows cannot be removed
    const rr = renderSettings(readResult, {}, props(async () => S.setSettingsChanged()));
    const addBtn = findAll(fieldBlock(rr.tree, 'returnReasons'), (n) => n.type === 'button' && nodeText(n) === T.returnReasonAdd)[0];
    addBtn.props.onClick();
    const added = rr.setters[SI.form].calls[0](PA.initialSettingsForm(readResult));
    check('add a reason: a new row, key and texts empty, INACTIVE, not saved', added.returnReasons.length === 3 && eq(added.returnReasons[2], { key: '', ar: '', tr: '', active: false, saved: false }));
    const withNew = renderSettings(readResult, { [SI.form]: added }, props(async () => S.setSettingsChanged()));
    const removers = findAll(fieldBlock(withNew.tree, 'returnReasons'), (n) => n.type === 'button' && nodeText(n) === '✕');
    check('only the unsaved row has a remove button', removers.length === 1);
    removers[0].props.onClick();
    const removed = withNew.setters[SI.form].calls[0](added);
    check('remove: the new row goes, the two saved stay', removed.returnReasons.length === 2 && removed.returnReasons.every((r) => r.saved));
    // even if the handler were called for a SAVED row, it would not remove it
    const editor = findAll(rr.tree, (n) => n.props && typeof n.props.onRemove === 'function')[0];
    editor.props.onRemove(0);
    const afterTry = rr.setters[SI.form].calls[rr.setters[SI.form].calls.length - 1](PA.initialSettingsForm(readResult));
    check('the remove handler called for a SAVED row (index 0) leaves it in place', afterTry.returnReasons.length === 2 && afterTry.returnReasons[0].key === 'fake_reason_a');
    // a row's text is edited by index
    const rowInputs = findAll(fieldBlock(rr.tree, 'returnReasons'), (n) => n.type === 'input' && n.props.type === 'text');
    rowInputs[1].props.onChange({ target: { value: 'FAKE-AR-A2' } });
    const edited = rr.setters[SI.form].calls[rr.setters[SI.form].calls.length - 1](PA.initialSettingsForm(readResult));
    check('editing a row\'s text changes that row only', edited.returnReasons[0].ar === 'FAKE-AR-A2' && edited.returnReasons[1].ar === 'FAKE-AR-B');
  }

  // ---- load failure and retry ---------------------------------------------------
  {
    let loads = 0;
    const err = S.refusal('SETTINGS_CURRENT_VERSION_INVALID');
    const props = { loadSettings: async () => { loads += 1; throw err; }, saveSettings: async () => ({}) };
    const r1 = callComponent(SettingsPanel, props, { [SI.loading]: false, [SI.loadFailure]: { refused: true, code: 'SETTINGS_CURRENT_VERSION_INVALID', field: null, known: true } });
    const retry = findAll(r1.tree, (n) => n.type === 'button' && nodeText(n) === T.retry)[0];
    const origError = console.error;
    console.error = () => {};
    await retry.props.onClick();
    console.error = origError;
    check('retry: calls loadSettings again', loads === 1);
    check('retry, a failure: the failure is kept by its code, loading is switched on then off', eq(r1.setters[SI.loadFailure].calls[0], { refused: true, code: 'SETTINGS_CURRENT_VERSION_INVALID', field: null, known: true }) && eq(r1.setters[SI.loading].calls, [true, false]));
    check('a load failure with no document yet: the page shows the failure and no form', (() => { const m = html(r1.tree); return m.includes('SETTINGS_CURRENT_VERSION_INVALID') && !m.includes('repeatRate'); })());
    // a successful load builds the read and the form
    const okProps = { loadSettings: async () => S.settingsAbsent(), saveSettings: async () => ({}) };
    const r2 = callComponent(SettingsPanel, okProps, { [SI.loading]: false, [SI.loadFailure]: { refused: false, code: 'functions/not-found', field: null, known: false } });
    await findAll(r2.tree, (n) => n.type === 'button' && nodeText(n) === T.retry)[0].props.onClick();
    check('retry, a success: the read is the reader\'s result and the form starts from it', r2.setters[SI.read].calls[0].view === 'ABSENT' && r2.setters[SI.form].calls[0].repeatRate === '' && r2.setters[SI.loadFailure].calls[0] === null);
  }

  // =========================================================================
  // 3. the CallFailure display
  // =========================================================================
  {
    const m = (failure) => html(React.createElement(CallFailure, { failure }));
    check('failure, a known refusal: the prefix and the code, no «unknown» note', (() => { const s = m({ refused: true, code: 'SHOP_NOT_FOUND', field: null, known: true }); return s.includes(T.refusedPrefix) && s.includes('SHOP_NOT_FOUND') && !s.includes(T.unknownRefusalCode); })());
    check('failure, an unknown refusal code: shown, with the «unknown to the page» note', (() => { const s = m({ refused: true, code: 'SOMETHING_NEW', field: null, known: false }); return s.includes('SOMETHING_NEW') && s.includes(T.unknownRefusalCode); })());
    check('failure, no reason code: the generic sentence and the SDK code', (() => { const s = m({ refused: false, code: 'functions/not-found', field: null, known: false }); return s.includes(T.callFailed) && s.includes('functions/not-found') && !s.includes(T.refusedPrefix) && !s.includes(T.unknownRefusalCode); })());
    check('failure, nothing at all: the generic sentence alone', m({ refused: false, code: null, field: null, known: false }).includes(T.callFailed));
    check('failure, an unreadable reply: its sentence and the keys', (() => { const s = m(CallFailureModule.replyFailure(['x:MISSING', 'y:NOT_A_BOOLEAN'])); return s.includes(T.replyUnreadable) && s.includes('x:MISSING · y:NOT_A_BOOLEAN'); })());
    check('failure, a field: shown in brackets', m({ refused: true, code: 'SETTINGS_FIELD_INVALID', field: 'repeatRate', known: true }).includes('(repeatRate)'));
    check('failure: null renders nothing', m(null) === '');
    check('toFailure of a thrown refusal / of a plain error', eq(CallFailureModule.toFailure(S.refusal('SHOP_NOT_FOUND')), { refused: true, code: 'SHOP_NOT_FOUND', field: null, known: true }) && eq(CallFailureModule.toFailure(new Error('boom')), { refused: false, code: null, field: null, known: false }));
  }

  // =========================================================================
  // 4. the shop page
  // =========================================================================
  const shopProps = (over = {}) => ({
    loadShops: async () => [],
    loadConfig: async () => S.shopPresent(),
    saveParts: async () => S.setPartsChanged(),
    manage: async () => S.manageChanged(),
    ...over,
  });
  const CANDIDATES = [
    { id: 'fake-owner-1', name: 'FAKE-SHOP-ONE', email: 'one@example.test' },
    { id: 'fake-owner-2', name: null, email: 'two@example.test' },
    { id: 'fake-owner-3', name: null, email: null },
  ];
  const renderShop = (states = {}, props = shopProps()) =>
    callComponent(ShopPanel, props, { [HI.shopsStatus]: 'ready', [HI.shops]: CANDIDATES, ...states });
  const configOf = (d) => R.readShopConfig(d);
  const buttonByText = (tree, text) => findAll(tree, (n) => n.type === 'button' && nodeText(n) === text);

  // ---- picker -------------------------------------------------------------------
  {
    const { tree } = renderShop();
    const m = html(tree);
    check('picker: an account is listed by name, else e-mail, else id', m.includes('FAKE-SHOP-ONE') && m.includes('two@example.test') && m.includes('fake-owner-3'));
    check('picker: nothing selected → the «choose a shop» sentence, no parts card, no technicians card', m.includes(T.noShopSelected) && !m.includes(T.partsTitle) && !m.includes(T.techTitle));
    const filtered = html(renderShop({ [HI.search]: 'two@' }).tree);
    check('picker: the search filters by e-mail', filtered.includes('two@example.test') && !filtered.includes('FAKE-SHOP-ONE'));
    const none = html(renderShop({ [HI.search]: 'zzz' }).tree);
    check('picker: no match → the existing «no matching users» sentence', none.includes(T.noShopMatches));
    check('picker: loading and failed states do not list accounts', !html(renderShop({ [HI.shopsStatus]: 'loading' }).tree).includes('FAKE-SHOP-ONE') && !html(renderShop({ [HI.shopsStatus]: 'failed' }).tree).includes('FAKE-SHOP-ONE'));
  }

  // ---- selecting a shop -----------------------------------------------------------
  {
    const asked = [];
    const props = shopProps({ loadConfig: async (id) => { asked.push(id); return { ...S.shopPresent(), ownerId: id }; } });
    const r = renderShop({}, props);
    const pick = findAll(r.tree, (n) => n.type === 'button' && n.props['aria-pressed'] !== undefined)[0];
    pick.props.onClick();
    await new Promise((res) => setTimeout(res, 0));
    check('select: loadConfig is called with the account\'s id', eq(asked, ['fake-owner-1']));
    check('select: the owner is set, the reply is read and kept, the drafts are reset', r.setters[HI.ownerId].calls[0] === 'fake-owner-1' && r.setters[HI.config].calls[0].ok === true && r.setters[HI.config].calls[0].ownerId === 'fake-owner-1' && r.setters[HI.configStatus].calls.join() === 'loading,ready');
    check('select: the partsDraft is the six untouched parts and the rename drafts are empty', Object.values(r.setters[HI.partsDraft].calls[0]).every((v) => v === null) && eq(r.setters[HI.renameDrafts].calls[0], {}));

    // a reply for another shop is a failure, never drawn
    const mismatch = shopProps({ loadConfig: async () => ({ ...S.shopPresent(), ownerId: 'someone-else' }) });
    const r2 = renderShop({}, mismatch);
    findAll(r2.tree, (n) => n.type === 'button' && n.props['aria-pressed'] !== undefined)[0].props.onClick();
    await new Promise((res) => setTimeout(res, 0));
    check('select: a reply for another shop is a reply failure and no config is kept', r2.setters[HI.configFailure].calls.some((c) => c && c.reply && c.problems.includes('ownerId:DOES_NOT_MATCH_THE_REQUEST')) && r2.setters[HI.config].calls.every((c) => c === null));

    // an unreadable reply
    const bad = shopProps({ loadConfig: async () => ({}) });
    const r3 = renderShop({}, bad);
    findAll(r3.tree, (n) => n.type === 'button' && n.props['aria-pressed'] !== undefined)[0].props.onClick();
    await new Promise((res) => setTimeout(res, 0));
    check('select: an unreadable reply is a failure naming the keys', r3.setters[HI.configFailure].calls.some((c) => c && c.reply && c.problems.some((p) => p.startsWith('ownerId:'))));

    // a refusal on read
    const origError = console.error;
    console.error = () => {};
    const refuse = shopProps({ loadConfig: async () => { throw S.refusal('SHOP_NOT_FOUND'); } });
    const r4 = renderShop({}, refuse);
    findAll(r4.tree, (n) => n.type === 'button' && n.props['aria-pressed'] !== undefined)[0].props.onClick();
    await new Promise((res) => setTimeout(res, 0));
    console.error = origError;
    check('select: a refusal on read is kept by its code', r4.setters[HI.configFailure].calls.some((c) => c && c.code === 'SHOP_NOT_FOUND' && c.refused === true));

    // stale reply: the first request resolves AFTER the second one
    const pending = {};
    const slow = shopProps({ loadConfig: (id) => new Promise((resolve) => { pending[id] = () => resolve({ ...S.shopPresent(), ownerId: id }); }) });
    const r5 = renderShop({}, slow);
    const buttons = findAll(r5.tree, (n) => n.type === 'button' && n.props['aria-pressed'] !== undefined);
    buttons[0].props.onClick(); // fake-owner-1
    buttons[1].props.onClick(); // fake-owner-2
    pending['fake-owner-2']();
    await new Promise((res) => setTimeout(res, 0));
    pending['fake-owner-1']();
    await new Promise((res) => setTimeout(res, 0));
    const kept = r5.setters[HI.config].calls.filter((c) => c);
    check('stale reply: only the reply of the LAST selection is kept', kept.length === 1 && kept[0].ownerId === 'fake-owner-2');
  }

  // ---- the six parts, in every state ----------------------------------------------
  {
    const cfg = configOf(S.shopPresent());
    const { tree } = renderShop({ [HI.ownerId]: 'fake-owner-1', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.partsDraft]: PA.initialPartsDraft() });
    const m = html(tree);
    check('parts: the six labels (the plan\'s item names) and the six wire names', W.PROTOCOL_PARTS.every((k) => m.includes(T[PART_LABEL_KEY[k]]) && m.includes(`>${k}<`)));
    check('parts: the label of the battery pair is the plan\'s, its key is batteryBeforeAfter', m.includes('أزواج البطارية') && m.includes('>batteryBeforeAfter<') && !m.includes('batteryPairs'));
    const SAVED = S.SIX_PARTS_MIXED();
    const radios = (key) => findAll(findAll(tree, (n) => n.type === 'div' && n.props.role === 'radiogroup')[W.PROTOCOL_PARTS.indexOf(key)], (n) => n.type === 'button');
    check('parts: each part shows its saved choice — «on» checked or «off» checked, never both',
      W.PROTOCOL_PARTS.every((k) => { const [on, off] = radios(k); return on.props['aria-checked'] === SAVED[k] && off.props['aria-checked'] === !SAVED[k]; }));
    check('parts: nothing to save, the button is disabled', buttonByText(tree, T.save)[0].props.disabled === true);
    check('parts: no «document absent» sentence for a PRESENT shop', !m.includes(T.partsAbsent) && !m.includes('>ABSENT<'));
    // choosing records a draft
    const r = renderShop({ [HI.ownerId]: 'fake-owner-1', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.partsDraft]: PA.initialPartsDraft() });
    findAll(r.tree, (n) => n.type === 'div' && n.props.role === 'radiogroup')[2].props.children[1].props.onClick();
    const draftNow = r.setters[HI.partsDraft].calls[0](PA.initialPartsDraft());
    check('parts: clicking «off» on coldRepeat records exactly that draft', draftNow.coldRepeat === false && Object.entries(draftNow).filter(([, v]) => v !== null).length === 1);
  }
  {
    // an absent parts document
    const cfg = configOf(S.shopAbsent());
    const { tree } = renderShop({ [HI.ownerId]: 'fake-owner-2', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.partsDraft]: PA.initialPartsDraft() });
    const m = html(tree);
    check('absent parts document: ABSENT and the plan\'s «الغائب «غير مفعَّل»» are shown', m.includes('>ABSENT<') && m.includes(T.partsAbsent));
    check('absent parts document: every part shows «off» checked', findAll(tree, (n) => n.type === 'div' && n.props.role === 'radiogroup').every((g) => findAll(g, (n) => n.type === 'button')[1].props['aria-checked'] === true));
    check('no technicians: the empty sentence', m.includes(T.techNone));
  }
  {
    // unreadable parts are not drawn as off
    const d = S.shopPresent();
    delete d.parts.consent;
    d.parts.returns = 'maybe';
    const cfg = configOf(d);
    const { tree } = renderShop({ [HI.ownerId]: 'fake-owner-1', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.partsDraft]: PA.initialPartsDraft() });
    const groups = findAll(tree, (n) => n.type === 'div' && n.props.role === 'radiogroup');
    const idx = (k) => W.PROTOCOL_PARTS.indexOf(k);
    const pair = (k) => findAll(groups[idx(k)], (n) => n.type === 'button').map((b) => b.props['aria-checked']);
    const badges = (t) => findAll(t, (n) => n.type === 'span' && nodeText(n) === T.partUnreadable).length;
    check('unreadable parts (missing, malformed): NEITHER choice is checked, and the badge is shown on each', eq(pair('consent'), [false, false]) && eq(pair('returns'), [false, false]) && badges(tree) === 2);
    // once the admin chooses, the badge goes
    check('an unreadable part the admin chose: one badge left', badges(renderShop({ [HI.ownerId]: 'fake-owner-1', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.partsDraft]: { ...PA.initialPartsDraft(), consent: true } }).tree) === 1);
  }

  // ---- saving the parts --------------------------------------------------------------
  {
    const cfg = configOf(S.shopPresent());
    const log = { parts: [], configs: 0 };
    toasts.length = 0;
    const props = shopProps({
      saveParts: async (owner, patch) => { log.parts.push([owner, clone(patch)]); return S.setPartsChanged(); },
      loadConfig: async () => { log.configs += 1; return S.shopPresent(); },
    });
    const draft = { ...PA.initialPartsDraft(), coldRepeat: false, consent: true };
    const r = renderShop({ [HI.ownerId]: 'fake-owner-1', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.partsDraft]: draft }, props);
    const save = buttonByText(r.tree, T.save)[0];
    check('parts: with a change, the save button is enabled and «• لم يُحفظ بعد» shown', save.props.disabled === false && html(r.tree).includes(T.unsaved));
    await save.props.onClick();
    check('parts: setShopProtocolParts gets the owner and ONLY the two changed parts', eq(log.parts, [['fake-owner-1', { coldRepeat: false, consent: true }]]));
    check('parts: the toast says saved, the shop is read again, busy goes on then off', eq(toasts, [['success', T.saved]]) && log.configs === 1 && eq(r.setters[HI.busy].calls, ['parts', null]));
    // nothing changed → nothing sent
    log.parts.length = 0;
    const idle = renderShop({ [HI.ownerId]: 'fake-owner-1', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.partsDraft]: PA.initialPartsDraft() }, props);
    await buttonByText(idle.tree, T.save)[0].props.onClick();
    check('parts: nothing chosen → nothing sent', log.parts.length === 0);
    // a refusal
    const origError = console.error;
    console.error = () => {};
    toasts.length = 0;
    const refuse = shopProps({ saveParts: async () => { throw S.refusal('SHOP_PARTS_KEY_UNKNOWN'); }, loadConfig: async () => { log.configs += 1; return S.shopPresent(); } });
    log.configs = 0;
    const rr = renderShop({ [HI.ownerId]: 'fake-owner-1', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.partsDraft]: draft }, refuse);
    await buttonByText(rr.tree, T.save)[0].props.onClick();
    console.error = origError;
    check('parts: a refusal is kept by its code, busy is released, no success toast, no reload', rr.setters[HI.actionFailure].calls.some((c) => c && c.code === 'SHOP_PARTS_KEY_UNKNOWN' && c.refused) && eq(rr.setters[HI.busy].calls, ['parts', null]) && toasts.length === 0 && log.configs === 0);
    // unreadable reply: said, and the shop read again
    log.configs = 0;
    const odd = shopProps({ saveParts: async () => ({ x: 1 }), loadConfig: async () => { log.configs += 1; return S.shopPresent(); } });
    const ro = renderShop({ [HI.ownerId]: 'fake-owner-1', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.partsDraft]: draft }, odd);
    await buttonByText(ro.tree, T.save)[0].props.onClick();
    check('parts: an unreadable reply is a reply failure and the shop is read again', ro.setters[HI.actionFailure].calls.some((c) => c && c.reply) && log.configs === 1);
  }

  // ---- technicians: display ------------------------------------------------------------
  {
    const cfg = configOf(S.shopPresent());
    const { tree } = renderShop({ [HI.ownerId]: 'fake-owner-1', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.partsDraft]: PA.initialPartsDraft() });
    const m = html(tree);
    check('technicians: title and hint are the plan\'s', m.includes('الفنّيون') && m.includes(T.techHint) && T.techHint === 'إضافة اسم، وتعديله، وإيقافه بلا حذف (فتبقى تقييماته القديمة مربوطة باسمه).');
    const nameInputs = findAll(tree, (n) => n.type === 'input' && n.props['aria-label'] === T.techNameLabel);
    check('technicians: one name input per technician plus the add box; names as the server sent them', nameInputs.length === 4 && eq(nameInputs.slice(0, 3).map((n) => n.props.value), ['FAKE-TECH-A', 'FAKE-TECH-B', 'FAKE-TECH-C']) && nameInputs[3].props.value === '');
    check('technicians: the add box is empty and carries NO placeholder (no example name)', nameInputs[3].props.placeholder === undefined);
    check('technicians: the three states are labelled — فعّال / موقوف / علم الفعّالية غير مقروء', [T.techStateActive, T.techStateInactive, T.techStateUnreadable].every((s) => m.includes(s)));
    // which buttons each state offers
    const rows = findAll(tree, (n) => n.type === 'div' && typeof n.props.className === 'string' && n.props.className.includes('py-3 flex flex-wrap items-center gap-3'));
    const labels = (row) => findAll(row, (n) => n.type === 'button').map(nodeText);
    check('ACTIVE: offers «إيقاف» only (and the rename)', eq(labels(rows[0]), [T.techRenameSave, T.techDeactivate]));
    check('INACTIVE: offers «تفعيل» only (and the rename)', eq(labels(rows[1]), [T.techRenameSave, T.techActivate]));
    check('ACTIVE_FLAG_UNREADABLE: offers BOTH, and is not drawn as active', eq(labels(rows[2]), [T.techRenameSave, T.techActivate, T.techDeactivate]));
    const mNoQuotes = m.split(T.techHint).join('');
    check('no delete anywhere on the page: no «حذف» outside the plan sentence, no delete/remove button', !mNoQuotes.includes('حذف') && !/delet|remov/i.test(m.replace(/aria-label="[^"]*"/g, '')));
    check('rename is disabled until the text differs', rows.every((row) => findAll(row, (n) => n.type === 'button')[0].props.disabled === true));
    const a = html(renderShop({ [HI.ownerId]: 'fake-owner-1', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.renameDrafts]: { 'fake-tech-id-a': 'FAKE-TECH-A2' } }).tree);
    check('a rename draft is shown in the input', a.includes('value="FAKE-TECH-A2"'));
  }
  {
    // an unreadable technician entry has no buttons
    const d = S.shopPresent();
    delete d.technicians[1].technicianId;
    const cfg = configOf(d);
    const { tree } = renderShop({ [HI.ownerId]: 'fake-owner-1', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.partsDraft]: PA.initialPartsDraft() });
    const m = html(tree);
    check('a technician with no id: shown as an unreadable entry with its problem, and no actions', m.includes(T.techUnreadableEntry) && m.includes('technicianId:MISSING') && count(m, T.techRenameSave) === 2);
  }
  {
    // an unknown activeState is shown raw, with both actions
    const d = S.shopPresent();
    d.technicians[0].activeState = 'WEIRD';
    const cfg = configOf(d);
    const { tree } = renderShop({ [HI.ownerId]: 'fake-owner-1', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.partsDraft]: PA.initialPartsDraft() });
    const m = html(tree);
    check('an unknown activeState: shown as UNKNOWN, not as active', m.includes('>UNKNOWN<'));
  }

  // ---- technicians: the writes --------------------------------------------------------------
  {
    const cfg = configOf(S.shopPresent());
    const log = { manage: [], configs: 0 };
    const everyPayload = [];
    toasts.length = 0;
    const props = shopProps({
      manage: async (payload) => { log.manage.push(clone(payload)); everyPayload.push(clone(payload)); return S.manageChanged(); },
      loadConfig: async () => { log.configs += 1; return S.shopPresent(); },
    });
    const base = { [HI.ownerId]: 'fake-owner-1', [HI.configStatus]: 'ready', [HI.config]: cfg, [HI.partsDraft]: PA.initialPartsDraft() };
    // add
    const addR = renderShop({ ...base, [HI.newName]: '  FAKE-TECH-X ' }, props);
    await buttonByText(addR.tree, T.techAdd)[0].props.onClick();
    check('add: manageTechnician gets { ownerId, action: add, displayName } with the name trimmed', eq(log.manage, [{ ownerId: 'fake-owner-1', action: 'add', displayName: 'FAKE-TECH-X' }]));
    check('add: the box is cleared, the toast says saved, the shop is read again', eq(addR.setters[HI.newName].calls, ['']) && eq(toasts, [['success', T.saved]]) && log.configs === 1);
    // add with an empty name → nothing
    log.manage.length = 0;
    const emptyAdd = renderShop({ ...base, [HI.newName]: '   ' }, props);
    check('add: the button is disabled for a blank name', buttonByText(emptyAdd.tree, T.techAdd)[0].props.disabled === true);
    await buttonByText(emptyAdd.tree, T.techAdd)[0].props.onClick();
    check('add: a blank name sends nothing', log.manage.length === 0);
    // rename
    log.manage.length = 0;
    const renR = renderShop({ ...base, [HI.renameDrafts]: { 'fake-tech-id-a': ' FAKE-TECH-A2 ' } }, props);
    const renBtn = buttonByText(renR.tree, T.techRenameSave)[0];
    check('rename: enabled once the text differs', renBtn.props.disabled === false);
    await renBtn.props.onClick();
    check('rename: { ownerId, action: rename, technicianId, displayName } exactly', eq(log.manage, [{ ownerId: 'fake-owner-1', action: 'rename', technicianId: 'fake-tech-id-a', displayName: 'FAKE-TECH-A2' }]));
    // set_active on each state
    log.manage.length = 0;
    const act = renderShop(base, props);
    await buttonByText(act.tree, T.techDeactivate)[0].props.onClick(); // the ACTIVE one
    await buttonByText(act.tree, T.techActivate)[0].props.onClick(); // the INACTIVE one
    check('set_active: deactivate the ACTIVE one (active:false), activate the INACTIVE one (active:true)',
      eq(log.manage, [
        { ownerId: 'fake-owner-1', action: 'set_active', technicianId: 'fake-tech-id-a', active: false },
        { ownerId: 'fake-owner-1', action: 'set_active', technicianId: 'fake-tech-id-b', active: true },
      ]));
    log.manage.length = 0;
    const unr = buttonByText(act.tree, T.techActivate);
    const unr2 = buttonByText(act.tree, T.techDeactivate);
    await unr[1].props.onClick();
    await unr2[1].props.onClick();
    check('set_active on the UNREADABLE one: both directions are sendable', eq(log.manage.map((p) => [p.technicianId, p.active]), [['fake-tech-id-c', true], ['fake-tech-id-c', false]]));
    check('no payload ever has an action other than add / rename / set_active (and each carries the owner)', everyPayload.length === 6 && everyPayload.every((p) => ['add', 'rename', 'set_active'].includes(p.action) && p.ownerId === 'fake-owner-1'));
    // refusal
    const origError = console.error;
    console.error = () => {};
    toasts.length = 0;
    log.configs = 0;
    const refuse = shopProps({ manage: async () => { throw S.refusal('TECHNICIAN_OWNER_MISMATCH'); }, loadConfig: async () => { log.configs += 1; return S.shopPresent(); } });
    const rr = renderShop({ ...base, [HI.newName]: 'FAKE-TECH-X' }, refuse);
    await buttonByText(rr.tree, T.techAdd)[0].props.onClick();
    console.error = origError;
    check('technician refusal: kept by its code, busy released, no success toast, name box NOT cleared, no reload',
      rr.setters[HI.actionFailure].calls.some((c) => c && c.code === 'TECHNICIAN_OWNER_MISMATCH' && c.known) && eq(rr.setters[HI.busy].calls, ['add', null]) && toasts.length === 0 && rr.setters[HI.newName].calls.length === 0 && log.configs === 0);
    // buttons are disabled while busy
    const busy = renderShop({ ...base, [HI.busy]: 'add' }, props);
    check('while a write is in flight every write button is disabled', [T.techDeactivate, T.techActivate].every((t) => buttonByText(busy.tree, t).every((b) => b.props.disabled === true)) && buttonByText(busy.tree, T.saving)[0] !== undefined);
    const busyParts = renderShop({ ...base, [HI.busy]: 'parts', [HI.newName]: 'FAKE-TECH-X', [HI.renameDrafts]: { 'fake-tech-id-a': 'FAKE-TECH-A2' }, [HI.partsDraft]: { ...PA.initialPartsDraft(), consent: true } }, props);
    check('while the parts are being saved, the add, rename and save buttons are disabled too, with names typed and a change pending',
      buttonByText(busyParts.tree, T.techAdd)[0].props.disabled === true && buttonByText(busyParts.tree, T.techRenameSave)[0].props.disabled === true && buttonByText(busyParts.tree, T.saving)[0].props.disabled === true);
    check('while a technician is being added, the add button itself is disabled', buttonByText(busy.tree, T.saving)[0].props.disabled === true);
  }

  // =========================================================================
  // 5. static scans of the new files (comments blanked)
  // =========================================================================
  {
    const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const NEW_FILES = [
      'lib/protocolAdminWire.js', 'lib/protocolAdminReaders.js', 'lib/protocolAdminPatch.js', 'lib/protocolAdminCalls.js',
      'lib/protocolAdminShops.js', 'lib/adminProtocolTexts.js',
      'components/admin/protocol/ProtocolGate.js', 'components/admin/protocol/ProtocolTabs.js', 'components/admin/protocol/CallFailure.js',
      'components/admin/protocol/ProtocolSettingsPanel.js', 'components/admin/protocol/ShopProtocolPanel.js',
      'app/admin/protocol/page.js', 'app/admin/protocol/shops/page.js',
    ];
    const code = Object.fromEntries(NEW_FILES.map((f) => [f, stripComments(read(f))]));
    const WRITES = /\b(setDoc|updateDoc|deleteDoc|addDoc|writeBatch|runTransaction|deleteField|arrayRemove)\b/;
    check('no direct Firestore write in any new file', NEW_FILES.every((f) => !WRITES.test(code[f])));
    const readers = NEW_FILES.filter((f) => /\b(getDocs|getDoc|onSnapshot|collection)\b/.test(code[f]));
    check('the only Firestore read is the picker\'s, in lib/protocolAdminShops.js', eq(readers, ['lib/protocolAdminShops.js']));
    check('…and it reads `users`, nothing else', /collection\(db, 'users'\)/.test(code['lib/protocolAdminShops.js']) && count(code['lib/protocolAdminShops.js'], 'collection(') === 1);
    check('httpsCallable appears only in lib/protocolAdminCalls.js', NEW_FILES.filter((f) => code[f].includes('httpsCallable')).join() === 'lib/protocolAdminCalls.js');
    check('the five function names are written once, in lib/protocolAdminWire.js', ['getProtocolSettings', 'setProtocolSettings', 'getShopProtocolConfig', 'setShopProtocolParts', 'manageTechnician'].every((n) => NEW_FILES.filter((f) => code[f].includes(`'${n}'`)).join() === 'lib/protocolAdminWire.js'));
    check('the old part name is not in any code of the feature', NEW_FILES.every((f) => !code[f].includes('batteryPairs')));
    check('symptomChips / targets are in the wire file only (the «not specified» list)', NEW_FILES.filter((f) => /symptomChips|\btargets\b/.test(code[f])).join() === 'lib/protocolAdminWire.js');
    check('no delete action or delete label in the feature', NEW_FILES.every((f) => !/['"`](delete|remove)['"`]/i.test(code[f])) && !Object.values(T).some((v) => typeof v === 'string' && v.includes('حذف') && v !== T.returnReasonsRule && v !== T.techHint));
    check('no technician name in any new file (the owner of the project types them)', NEW_FILES.every((f) => !/FAKE-TECH|displayName:\s*['"`]/.test(code[f])));
    check('the only `placeholder` in the shop panel is the picker\'s search; none in the technician inputs', count(code['components/admin/protocol/ShopProtocolPanel.js'], 'placeholder') === 1 && code['components/admin/protocol/ShopProtocolPanel.js'].includes('placeholder={T.shopSearch}'));
    check('no hidden default for a technician\'s flag: `active` is never defaulted in the panel or the readers\' output', !/active:\s*true/.test(code['components/admin/protocol/ShopProtocolPanel.js']) && !/\|\|\s*true/.test(code['lib/protocolAdminReaders.js']));
    // the three entry points that were edited are exactly the ones expected
    const sidebar = read('components/admin/Sidebar.js');
    check('the sidebar imports the flag and builds the entry from it', sidebar.includes("import { ADMIN_PROTOCOL_TEXTS_APPROVED } from '@/lib/featureFlags'") && sidebar.includes('ADMIN_PROTOCOL_TEXTS_APPROVED') );
  }

  // =========================================================================
  // 6. the texts
  // =========================================================================
  {
    const keys = Object.keys(T);
    const srcKeys = Object.keys(TEXT_SOURCE);
    check('texts: every text has a source and every source has a text', eq([...keys].sort(), [...srcKeys].sort()));
    // 2026-10-23, replaces «every source is PROPOSED, EXISTING or a plan line» (rule 23): PROPOSED is no longer a value.
    check('texts: every source is APPROVED:<row>, APPROVED_EDITED:<row>, EXISTING or a plan line (P6:n) — never PROPOSED', Object.values(TEXT_SOURCE).every((s) => /^APPROVED(_EDITED)?:C[123]-\d+$/.test(s) || s === 'EXISTING' || /^P6:\d+$/.test(s)));
    // every `T.x` used by the components exists
    const used = new Set();
    // W-P6-18 / W-P6-20: the two new panels join the list of files whose use of the texts is counted
    for (const f of ['components/admin/protocol/ProtocolSettingsPanel.js', 'components/admin/protocol/ShopProtocolPanel.js', 'components/admin/protocol/ProtocolCorrectionPanel.js', 'components/admin/protocol/MarketingNamesPanel.js', 'components/admin/protocol/CallFailure.js', 'components/admin/protocol/ProtocolTabs.js', 'components/admin/Sidebar.js']) {
      for (const m of read(f).matchAll(/\bT\.(\w+)|ADMIN_PROTOCOL_TEXTS\.(\w+)/g)) used.add(m[1] || m[2]);
    }
    check('texts: every T.x the components use is defined', [...used].every((k) => k in T));
    check('texts: every defined text is used by a component (or by a label map)', (() => {
      const viaMaps = new Set([...Object.values(SETTINGS_FIELD_LABEL_KEY), ...Object.values(PART_LABEL_KEY), ...Object.values(TECH_STATE_LABEL_KEY), ...Object.values(CORRECTION_ACTION_LABEL_KEY), ...Object.values(EXCLUDE_REASON_LABEL_KEY), ...Object.values(CORRECTION_BASIS_LABEL_KEY), ...Object.values(CORRECTION_PROBLEM_TEXT_KEY), ...Object.values(MARKETING_PROBLEM_TEXT_KEY)]);
      return keys.every((k) => used.has(k) || viaMaps.has(k));
    })());
    check('texts: the label maps cover every field, part and state of the wire', W.SETTINGS_FIELDS.every((n) => SETTINGS_FIELD_LABEL_KEY[n] in T) && W.PROTOCOL_PARTS.every((k) => PART_LABEL_KEY[k] in T) && Object.values(W.TECH_ACTIVE_STATE).every((s) => TECH_STATE_LABEL_KEY[s] in T));
    // W-P6-18 / W-P6-20: the new label maps cover every value of their wire / patch enums, and name a text that exists
    const WC = require('@/lib/protocolCorrectionWire');
    const PC = require('@/lib/protocolCorrectionPatch');
    const PM = require('@/lib/marketingNamesPatch');
    check('texts: the correction label maps cover every action, reason, basis and form problem, each naming a text that exists', WC.CORRECTION_ACTIONS.every((a) => CORRECTION_ACTION_LABEL_KEY[a] in T) && WC.EXCLUDE_REASONS.every((r) => EXCLUDE_REASON_LABEL_KEY[r] in T) && Object.values(WC.CORRECTION_BASIS).every((b) => CORRECTION_BASIS_LABEL_KEY[b] in T) && Object.values(PC.CORRECTION_FORM_PROBLEM).every((q) => CORRECTION_PROBLEM_TEXT_KEY[q] in T));
    check('texts: the marketing row problems are all covered, each naming a text that exists', Object.values(PM.MARKETING_ROW_PROBLEM).every((q) => MARKETING_PROBLEM_TEXT_KEY[q] in T));
    // the EXISTING texts really exist where they are said to
    const EXISTING_IN = {
      save: 'app/admin/settings/page.js', saving: 'app/admin/settings/page.js', unsaved: 'app/admin/settings/page.js',
      retry: 'components/admin/AiModelCard.js',
      shopSearch: 'app/admin/users/page.js', usersLoadFailed: 'app/admin/users/page.js', noShopMatches: 'app/admin/users/page.js',
    };
    const existingKeys = keys.filter((k) => TEXT_SOURCE[k] === 'EXISTING');
    check('texts: the EXISTING list is the one this test knows', eq(existingKeys.sort(), Object.keys(EXISTING_IN).sort()));
    check('texts: each EXISTING text is found verbatim in the file it is said to come from', existingKeys.every((k) => read(EXISTING_IN[k]).includes(T[k])));
    // the report's inventory: counted by the tool
    const proposed = keys.filter((k) => TEXT_SOURCE[k] === 'PROPOSED');
    const approved = keys.filter((k) => /^APPROVED:/.test(TEXT_SOURCE[k]));
    const approvedEdited = keys.filter((k) => /^APPROVED_EDITED:/.test(TEXT_SOURCE[k]));
    const planned = keys.filter((k) => /^P6:/.test(TEXT_SOURCE[k]));
    console.log(`  (texts: ${keys.length} in all — ${proposed.length} PROPOSED, ${approved.length} APPROVED, ${approvedEdited.length} APPROVED_EDITED, ${planned.length} from the plan, ${existingKeys.length} EXISTING)`);
    if (process.env.PRINT_TEXTS) {
      for (const k of [...approved, ...approvedEdited]) console.log(`${TEXT_SOURCE[k]} ${k}: ${typeof T[k] === 'function' ? T[k]('{n}', '{added}', '{updated}') : T[k]}`);
    }
  }

  console.log(`${pass}/${total} assertions passed`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
