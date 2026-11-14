'use strict';

// Decision (the user's, 2026-10-14, relayed in the task order): "Before
// delivery: hide «تغيير الباقة» and add the current -> new balance and expiry
// line to «منح فحوصات», «منح اشتراك مجاني» and the bulk grant."
//
// app/admin/users/page.js, three claims:
//
//   1. «تغيير الباقة» is gone — no button, no handler, no window — and nothing
//      on the page ASSIGNS `scansRemaining` any more: every `scansRemaining:`
//      in the code is an `increment(...)` (the reason it was removed: it set
//      the balance outright, 132 became 150).
//   2. «منح فحوصات», «منح اشتراك مجاني» and the bulk window each show, before
//      the confirm button, two lines —
//          المتبقي: <current> ⟵ <new>
//          تاريخ الانتهاء: <current> ⟵ <new>
//      — and «current» is read from Firestore when the window OPENS (getDoc on
//      users/{uid}; one getDocs for the bulk window), not taken from the row the
//      page loaded once. An absent balance shows «—», never «0», and no «new»
//      balance is made up from it.
//   3. «new» is what the writers then persist (rule 30: arrival AND meaning).
//      The test drives the REAL handlers of the page (openGrantModal,
//      openBulkModal, onGrantScans, onGrantPlan, onBulkGrant) and a fake
//      Firestore that applies increment() the way Firestore does, then compares
//      what the window displayed with what is stored. The writers themselves
//      were not changed; their payloads are pinned below.
//
// HOW THE HANDLERS ARE REACHED: they are closures inside the page component,
// and this repo has no DOM — see _call-component.cjs. The page is called under
// a stand-in hook dispatcher, the handlers are taken from the elements it
// returns, and the windows are called the same way and rendered with
// react-dom/server. What is substituted: the Firestore SDK's reads/writes (a
// fake over an in-memory store), the Cloud Functions callable (a recorder), the
// Toast hook (a recorder) and Date.now (fixed). NOT substituted: Timestamp,
// increment and deleteField — the REAL SDK classes, so the sample documents
// carry real Timestamps (rule 41).
//
// SAMPLE DOCUMENTS: there is no golden users/{uid} document in this repo
// (contract/ holds reports and verifyReport samples only). The shape is taken
// from what the site itself reads and writes — scansRemaining (number),
// expiresAt (Timestamp): this page's writers, app/dashboard/page.js:132,170 —
// and is NOT checked against neuralcheck-backend (outside this repo).
//
// Run: node scripts/test/adminUsersGrantPreview.test.cjs
//      PRINT_SNAPSHOT=1 node scripts/test/adminUsersGrantPreview.test.cjs   (also prints the windows as text)

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { callComponent, findAll } = require('./_call-component.cjs');

// ---- the REAL SDK classes, loaded BEFORE the fake replaces the module -------
const realFirestore = require('firebase/firestore');
const { Timestamp } = realFirestore;

const NOW = Date.UTC(2026, 9, 14, 12, 0, 0); // 2026-10-14 12:00 UTC
const DAY = 24 * 60 * 60 * 1000;
const realNow = Date.now;
Date.now = () => NOW;

// ---- fake Firestore over an in-memory store ---------------------------------
let store = {};
const log = { getDoc: [], getDocs: [], updateDoc: [], batchUpdates: [], commits: 0, emails: [] };
const failGetDoc = new Set();
let failGetDocs = false;

function snapshotOf(id) {
  const d = store[id];
  return { id, exists: () => d !== undefined, data: () => (d === undefined ? undefined : { ...d }) };
}
// Firestore semantics: increment on an absent or non-number field SETS the field
// to the operand; deleteField removes it.
function applyFields(id, fields) {
  const doc = store[id];
  for (const [k, v] of Object.entries(fields)) {
    if (v && v.__operand !== undefined) doc[k] = (typeof doc[k] === 'number' ? doc[k] : 0) + v.__operand;
    else if (v && v.__delete) delete doc[k];
    else doc[k] = v;
  }
}
const fakeFirestore = {
  ...realFirestore,
  getFirestore: () => ({}),
  collection: (db, name) => ({ kind: 'collection', name }),
  doc: (db, coll, id) => ({ kind: 'doc', coll, id }),
  query: (c) => c,
  orderBy: () => ({}),
  // wrap the REAL SDK sentinels so the fake store can read their operand
  increment: (n) => {
    const fv = realFirestore.increment(n);
    Object.defineProperty(fv, '__operand', { value: n });
    return fv;
  },
  deleteField: () => {
    const fv = realFirestore.deleteField();
    Object.defineProperty(fv, '__delete', { value: true });
    return fv;
  },
  getDoc: async (ref) => {
    log.getDoc.push(ref.id);
    if (failGetDoc.has(ref.id)) throw new Error('unavailable');
    return snapshotOf(ref.id);
  },
  getDocs: async (q) => {
    log.getDocs.push(q.name);
    if (failGetDocs) throw new Error('unavailable');
    return { docs: Object.keys(store).map((id) => ({ id, data: () => ({ ...store[id] }) })) };
  },
  updateDoc: async (ref, fields) => {
    log.updateDoc.push({ id: ref.id, fields });
    applyFields(ref.id, fields);
  },
  writeBatch: () => {
    const pending = [];
    return {
      update: (ref, fields) => pending.push({ id: ref.id, fields }),
      commit: async () => {
        log.commits += 1;
        for (const op of pending) {
          log.batchUpdates.push(op);
          applyFields(op.id, op.fields);
        }
      },
    };
  },
};
function install(request, exports) {
  const key = require.resolve(request);
  require.cache[key] = { id: key, filename: key, loaded: true, exports, children: [], paths: [] };
}
install('firebase/firestore', fakeFirestore);
install('firebase/functions', {
  getFunctions: () => ({}),
  httpsCallable: () => async (data) => {
    log.emails.push(data);
    return {};
  },
});
const toasts = [];
install('@/components/admin/Toast', {
  useToast: () => ({
    success: (m) => toasts.push(['success', m]),
    error: (m) => toasts.push(['error', m]),
    info: (m) => toasts.push(['info', m]),
  }),
  ToastProvider: ({ children }) => children,
});

const page = require('./_load-admin-users-internals.cjs')();
const { formatDateShort } = require('@/lib/admin');

// ---- bookkeeping ------------------------------------------------------------
let pass = 0;
let total = 0;
function check(name, cond) {
  total += 1;
  if (cond) pass += 1;
  else console.error(`  FAIL: ${name}`);
}
const printSnapshot = !!process.env.PRINT_SNAPSHOT;

function textOf(html) {
  return html
    .replace(/<\/(div|button|label|h3|p|th|td|tr)>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}
function nodeText(node) {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  return nodeText(node.props && node.props.children);
}

// ---- sample documents (production shape, real Timestamps) -------------------
const EXPIRY_A = Timestamp.fromDate(new Date(Date.UTC(2026, 9, 20, 9, 0, 0)));
const EXPIRY_STALE = Timestamp.fromDate(new Date(Date.UTC(2026, 9, 15, 9, 0, 0)));
const created = Timestamp.fromDate(new Date(Date.UTC(2026, 8, 1, 8, 0, 0)));
const DOCS = {
  // the balance the app moved after the page loaded: the row holds 140, Firestore holds 132
  'u-balance':   { email: 'shop.one@example.test', displayName: 'Shop One', plan: 'shop_basic', scansRemaining: 132, scansTotal: 200, isActive: true, expiresAt: EXPIRY_A, createdAt: created, lastLoginAt: created },
  // no balance and no expiry at all
  'u-bare':      { email: 'bare@example.test', plan: 'free', isActive: true, createdAt: created },
  // a real zero is not an absence
  'u-zero':      { email: 'zero@example.test', name: 'Zero', plan: 'single', scansRemaining: 0, scansTotal: 1, isActive: true, expiresAt: EXPIRY_A, createdAt: created },
  // legacy field the table falls back to; the writers increment scansRemaining only
  'u-credits':   { email: 'legacy@example.test', plan: 'free', credits: 7, isActive: true, createdAt: created },
  'u-unlimited': { email: 'unl@example.test', displayName: 'Unlimited', plan: 'shop_pro', scansRemaining: 999999, scansTotal: 999999, isActive: true, expiresAt: EXPIRY_A, createdAt: created },
  // not a number
  'u-string':    { email: 'str@example.test', plan: 'free', scansRemaining: '50', isActive: true, expiresAt: EXPIRY_A, createdAt: created },
  // no name, no email
  'u-nameless':  { plan: 'free', isActive: true, createdAt: created },
};
const UIDS = Object.keys(DOCS);
function resetStore() {
  store = {};
  for (const [id, d] of Object.entries(DOCS)) store[id] = { ...d };
  for (const k of Object.keys(log)) {
    if (Array.isArray(log[k])) log[k].length = 0;
    else log[k] = 0;
  }
  failGetDoc.clear();
  failGetDocs = false;
  toasts.length = 0;
}
// What the page loaded once (stale on two fields of one account).
function pageRows() {
  const rows = UIDS.map((id) => ({ id, ...DOCS[id] }));
  const r = rows.find((x) => x.id === 'u-balance');
  r.scansRemaining = 140;
  r.expiresAt = EXPIRY_STALE;
  return rows;
}

// Independent oracle for the balance line (not the page's own function).
const disp = (n) => (n >= 999999 ? '∞' : String(n));
const balanceOracle = (doc, add) =>
  typeof doc.scansRemaining === 'number' ? `${disp(doc.scansRemaining)} ⟵ ${disp(doc.scansRemaining + add)}` : '— ⟵ —';
// The oracle for the new expiry does NOT go through the page's formatter path: a first version of the page passed a
// plain Date to formatDateShort, which only reads Timestamps/seconds/strings/numbers and returned «—» — and an oracle built
// the same way agreed with it. So: format the date directly, and require it to be a real date.
const NEW_EXPIRY = new Date(NOW + 30 * DAY).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
check('oracle: the new expiry is a real formatted date, not «—»', NEW_EXPIRY !== '—' && /[٠-٩]/.test(NEW_EXPIRY));
check('oracle: formatDateShort of the Timestamp the writers build gives the same text', formatDateShort(Timestamp.fromDate(new Date(NOW + 30 * DAY))) === NEW_EXPIRY);

// ---- hook positions, derived from the real source ---------------------------
const bodyStart = page.SOURCE.indexOf('export default function AdminUsersPage() {');
const bodyEnd = page.SOURCE.indexOf('\nfunction EvaluationToggle', bodyStart);
const stateNames = [...page.SOURCE.slice(bodyStart, bodyEnd).matchAll(/const \[(\w+), set\w+\]\s*=\s*useState/g)].map((m) => m[1]);
const IDX = Object.fromEntries(stateNames.map((n, i) => [n, i]));
check('page state hooks: the ones this test drives exist', ['loading', 'users', 'working', 'scanModal', 'planModal', 'bulkModal'].every((n) => n in IDX));
check('page state hooks: no typeModal, no bulkOpen any more', !('typeModal' in IDX) && !('bulkOpen' in IDX));

function renderPage(extra = {}) {
  return callComponent(page.AdminUsersPage, {}, { [IDX.loading]: false, [IDX.users]: pageRows(), ...extra });
}
function rowButton(tree, uid, title) {
  const tr = findAll(tree, (n) => n.type === 'tr' && n.key === uid)[0];
  return tr ? findAll(tr, (n) => n.props && n.props.title === title)[0] : undefined;
}
function confirmButtonOf(modalTree) {
  return findAll(modalTree, (n) => n.type === 'button' && nodeText(n).includes('تأكيد المنح'))[0];
}

(async () => {
  // =========================================================================
  // 1. «تغيير الباقة» is gone, and nothing assigns scansRemaining
  // =========================================================================
  const src = page.SOURCE;
  for (const word of ['ChangeTypeModal', 'onChangeType', 'typeModal', 'setTypeModal', 'AdjustmentsHorizontalIcon', 'PLAN_SCANS']) {
    check(`source: no "${word}" left`, !src.includes(word));
  }
  check('source: no title="تغيير الباقة" (the comment that explains the removal is allowed to name it)', !/title\s*[=:]\s*\{?\s*['"]تغيير الباقة/.test(src));
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('source: every `scansRemaining:` in the code is an increment(...) — nothing assigns the balance', !/scansRemaining\s*:(?!\s*increment\()/.test(code));
  check('source: exactly the three writers increment scansRemaining', (code.match(/scansRemaining:\s*increment\(/g) || []).length === 3);

  resetStore();
  {
    const { tree } = renderPage();
    const titles = findAll(tree, (n) => n.props && typeof n.props.title === 'string').map((n) => n.props.title);
    check('rendered page: no element titled «تغيير الباقة»', !titles.includes('تغيير الباقة'));
    check('rendered page: «منح فحوصات» and «منح اشتراك مجاني» are still there for every row', titles.filter((t) => t === 'منح فحوصات').length === UIDS.length && titles.filter((t) => t === 'منح اشتراك مجاني').length === UIDS.length);
    check('rendered page: the filter select still offers the four plan types (TYPE_OPTIONS stays)', findAll(tree, (n) => n.type === 'option').filter((o) => /مجاني|فردي|أساسي|احترافي/.test(nodeText(o))).length >= 4);
    const html = renderToStaticMarkup(tree);
    check('rendered page markup: «تغيير الباقة» appears nowhere', !html.includes('تغيير الباقة'));
  }

  // =========================================================================
  // 2 + 3. The two single-account windows, through the real handlers
  // =========================================================================
  const WINDOWS = [
    {
      name: 'منح فحوصات',
      title: 'منح فحوصات',
      stateKey: 'scanModal',
      Component: page.GrantScansModal,
      // [state at hook 0 of the window, the increment the writer will use]
      variants: page.SCAN_OPTIONS.map((n) => ({ label: `${n} scans`, state: n, add: n, payload: (f) => f })),
      expectedKeys: ['scansRemaining', 'scansTotal', 'isActive', 'expiresAt', 'subExpiredNotified', 'subExpiryEmailSent', 'subExpiryFcmDate'],
    },
    {
      name: 'منح اشتراك مجاني',
      title: 'منح اشتراك مجاني',
      stateKey: 'planModal',
      Component: page.GrantPlanModal,
      variants: Object.entries(page.PLAN_GRANTS).map(([key, g]) => ({ label: `plan ${key}`, state: key, add: g.scans, plan: key })),
      expectedKeys: ['plan', 'scansRemaining', 'scansTotal', 'isActive', 'expiresAt', 'subExpiredNotified', 'subExpiryEmailSent', 'subExpiryFcmDate'],
    },
  ];

  for (const W of WINDOWS) {
    for (const uid of UIDS) {
      for (const v of W.variants) {
        const tag = `[${W.name} · ${uid} · ${v.label}]`;
        resetStore();

        // -- open through the real handler, off the page's stale row --------
        const first = renderPage();
        const btn = rowButton(first.tree, uid, W.title);
        check(`${tag} the row has the button`, !!btn);
        await btn.props.onClick();
        const opened = first.setters[IDX[W.stateKey]].calls;
        check(`${tag} opening read users/${uid} once with getDoc`, log.getDoc.length === 1 && log.getDoc[0] === uid && log.getDocs.length === 0);
        check(`${tag} the window opened with {user, current}`, opened.length === 1 && opened[0].user.id === uid && 'current' in opened[0]);
        check(`${tag} the row is marked working while it reads, then released`, JSON.stringify(first.setters[IDX.working].calls) === JSON.stringify([uid, null]));
        check(`${tag} opening writes nothing`, log.updateDoc.length === 0 && log.commits === 0 && log.emails.length === 0);
        if (!(opened.length === 1)) continue;

        // -- the window as the page builds it, then rendered ---------------
        const second = renderPage({ [IDX[W.stateKey]]: opened[0] });
        const el = findAll(second.tree, (n) => n.type === W.Component)[0];
        check(`${tag} the page renders the window with the fresh {current}`, !!el && el.props.current === opened[0].current && el.props.user.id === uid);
        const win = callComponent(W.Component, el.props, { 0: v.state });
        const html = renderToStaticMarkup(win.tree);
        const lines = textOf(html);
        const doc = DOCS[uid];

        // balance line
        const wantBalance = `المتبقي: ${balanceOracle(doc, v.add)}`;
        check(`${tag} balance line is exactly «${wantBalance}»`, lines.filter((l) => l.startsWith('المتبقي:')).join('|') === wantBalance);
        // expiry line: current from Firestore (never the stale row), new = clock + 30 days
        const wantExpiry = `تاريخ الانتهاء: ${doc.expiresAt ? formatDateShort(doc.expiresAt) : '—'} ⟵ ${NEW_EXPIRY}`;
        check(`${tag} expiry line is exactly «${wantExpiry}»`, lines.filter((l) => l.startsWith('تاريخ الانتهاء:')).join('|') === wantExpiry);
        check(`${tag} absent balance is «—», never «0»`, typeof doc.scansRemaining === 'number' || !/المتبقي:[^\n]*(?<![\d.])0(?![\d.])/.test(lines.join('\n')));

        // the two lines sit before the confirm button
        const iLine = html.indexOf('المتبقي:');
        const iBtn = html.indexOf('تأكيد المنح');
        check(`${tag} both lines come before the confirm button`, iLine > 0 && html.indexOf('تاريخ الانتهاء:') > iLine && html.indexOf('تاريخ الانتهاء:') < iBtn);

        if (printSnapshot && uid === 'u-balance' && v === W.variants[1]) {
          console.log(`\n--- snapshot: ${W.name} · ${uid} (page row says 140, Firestore says 132) · ${v.label} ---\n${lines.join('\n')}`);
        }
        if (printSnapshot && uid === 'u-bare' && v === W.variants[1]) {
          console.log(`\n--- snapshot: ${W.name} · ${uid} (no balance, no expiry) · ${v.label} ---\n${lines.join('\n')}`);
        }

        // -- confirm through the real handler; «new» must be what is stored --
        const confirm = confirmButtonOf(win.tree);
        check(`${tag} the confirm button exists`, !!confirm);
        Date.now = () => NOW + 90 * 1000; // the admin takes a minute and a half to press confirm
        await confirm.props.onClick();
        Date.now = () => NOW;
        check(`${tag} exactly one updateDoc, on users/${uid}`, log.updateDoc.length === 1 && log.updateDoc[0].id === uid);
        const f = log.updateDoc[0] && log.updateDoc[0].fields;
        if (!f) continue;
        // the writers are unchanged: same keys, same increments, same expiry rule
        check(`${tag} the payload keys are unchanged`, JSON.stringify(Object.keys(f).sort()) === JSON.stringify([...W.expectedKeys].sort()));
        check(`${tag} scansRemaining is increment(${v.add}) and scansTotal is increment(${v.add})`, f.scansRemaining.__operand === v.add && f.scansTotal.__operand === v.add);
        check(`${tag} isActive true; the three reminder flags are deleteField()`, f.isActive === true && ['subExpiredNotified', 'subExpiryEmailSent', 'subExpiryFcmDate'].every((k) => f[k] && f[k].__delete === true));
        check(`${tag} expiresAt is a real Timestamp, clock + 30 days`, f.expiresAt instanceof Timestamp && f.expiresAt.toMillis() === NOW + 90 * 1000 + 30 * DAY);
        if (v.plan) check(`${tag} plan is written as ${v.plan}`, f.plan === v.plan);

        // «new» === what the writer stored
        const after = store[uid];
        const shownNewBalance = (lines.find((l) => l.startsWith('المتبقي:')) || '').split(' ⟵ ')[1];
        if (typeof doc.scansRemaining === 'number') {
          check(`${tag} displayed new balance (${shownNewBalance}) equals the stored one (${disp(after.scansRemaining)})`, shownNewBalance === disp(after.scansRemaining));
        } else {
          // Not derived from an absence: the window says «—». (Firestore's increment on a missing / non-numeric field
          // creates it as the operand — the writer is unchanged — so the stored value is just the increment.)
          check(`${tag} absent balance: displayed new is «—» and the write is the unchanged increment (stored ${after.scansRemaining})`, shownNewBalance === '—' && after.scansRemaining === v.add);
        }
        const shownNewExpiry = (lines.find((l) => l.startsWith('تاريخ الانتهاء:')) || '').split(' ⟵ ')[1];
        check(`${tag} displayed new expiry equals the stored one`, shownNewExpiry === formatDateShort(after.expiresAt));
        check(`${tag} the page asked for the notification e-mail as before`, log.emails.length === 1 && log.emails[0].userId === uid && log.emails[0].templateName === 'grantSubscription');
      }
    }
  }

  // The freshness proof, stated on its own: the row says 140 / EXPIRY_STALE.
  resetStore();
  {
    const first = renderPage();
    await rowButton(first.tree, 'u-balance', 'منح فحوصات').props.onClick();
    const modal = first.setters[IDX.scanModal].calls[0];
    check('fresh read: the window\'s current balance is 132 (Firestore), not 140 (the loaded row)', modal.current.scansRemaining === 132);
    check('fresh read: the window\'s current expiry is the stored Timestamp, not the loaded row\'s', modal.current.expiresAt === DOCS['u-balance'].expiresAt && modal.current.expiresAt !== EXPIRY_STALE);
    check('fresh read: the user object handed on is the loaded row (name/e-mail), only «current» is fresh', modal.user.scansRemaining === 140);
  }

  // =========================================================================
  // Read failures: no window, no invented numbers
  // =========================================================================
  for (const [label, arrange] of [
    ['getDoc throws', () => failGetDoc.add('u-balance')],
    ['the document does not exist', () => delete store['u-balance']],
  ]) {
    resetStore();
    arrange();
    const first = renderPage();
    await rowButton(first.tree, 'u-balance', 'منح فحوصات').props.onClick();
    check(`[${label}] no window is opened`, first.setters[IDX.scanModal].calls.length === 0);
    check(`[${label}] the existing load-failure toast is shown`, toasts.length === 1 && toasts[0][0] === 'error' && toasts[0][1] === 'فشل تحميل المستخدمين');
    check(`[${label}] the row is released`, JSON.stringify(first.setters[IDX.working].calls) === JSON.stringify(['u-balance', null]));
    check(`[${label}] nothing was written`, log.updateDoc.length === 0);
  }

  // =========================================================================
  // 2 + 3. The bulk window
  // =========================================================================
  const openBulk = async () => {
    const first = renderPage();
    const header = findAll(first.tree, (n) => n.type === 'button' && nodeText(n).includes('منح اشتراك جماعي'))[0];
    check('bulk: the header button exists', !!header);
    await header.props.onClick();
    return first;
  };
  resetStore();
  {
    const first = await openBulk();
    const calls = first.setters[IDX.bulkModal].calls;
    check('bulk: opening takes exactly one getDocs of users and no getDoc', log.getDocs.length === 1 && log.getDocs[0] === 'users' && log.getDoc.length === 0);
    check('bulk: the window opened with {current}', calls.length === 1 && calls[0] && typeof calls[0].current === 'object');
    check('bulk: opening writes nothing', log.updateDoc.length === 0 && log.commits === 0 && log.batchUpdates.length === 0);
    check('bulk: working is held while it reads and released', JSON.stringify(first.setters[IDX.working].calls) === JSON.stringify(['bulk', null]));
    const cur = calls[0].current;
    check('bulk: every account has an entry', UIDS.every((u) => u in cur));
    check('bulk: the balance is the fresh 132, not the loaded row\'s 140', cur['u-balance'].scansRemaining === 132);
    check('bulk: an absent balance stays undefined — no 0, no null', cur['u-bare'].scansRemaining === undefined && cur['u-bare'].expiresAt === undefined && cur['u-credits'].scansRemaining === undefined);
    check('bulk: a real zero stays 0', cur['u-zero'].scansRemaining === 0);

    const SELECTED = ['u-balance', 'u-bare', 'u-zero', 'u-unlimited', 'u-nameless', 'u-string'];
    for (const [planKey, g] of Object.entries(page.PLAN_GRANTS)) {
      const tag = `[bulk · ${planKey} · ${SELECTED.length} selected]`;
      // each plan starts from the original store and a fresh open
      resetStore();
      const reopened = await openBulk();
      calls[0] = reopened.setters[IDX.bulkModal].calls[0];
      // the page passes the fresh map to the window
      const second = renderPage({ [IDX.bulkModal]: calls[0] });
      const el = findAll(second.tree, (n) => n.type === page.BulkGrantModal)[0];
      check(`${tag} the page renders the window with the fresh map`, !!el && el.props.current === calls[0].current);
      const win = callComponent(page.BulkGrantModal, el.props, { 0: planKey, 1: SELECTED });
      const html = renderToStaticMarkup(win.tree);
      const lines = textOf(html);
      const at = lines.findIndex((l) => l.startsWith('المتبقي:'));
      check(`${tag} the preview exists`, at > 0);
      const labels = lines.filter((l) => l.startsWith('المتبقي:') || l.startsWith('تاريخ الانتهاء:'));
      check(`${tag} two lines per selected account (${SELECTED.length * 2})`, labels.length === SELECTED.length * 2);
      // blocks: name, balance line, expiry line — in selection-independent page order
      const rows = pageRows().filter((r) => SELECTED.includes(r.id));
      let ok = true;
      let cursor = at - 1;
      for (const r of rows) {
        const doc = DOCS[r.id];
        const name = r.name || r.displayName || (r.email ? r.email.split('@')[0] : undefined) || '—';
        const want = [name, `المتبقي: ${balanceOracle(doc, g.scans)}`, `تاريخ الانتهاء: ${doc.expiresAt ? formatDateShort(doc.expiresAt) : '—'} ⟵ ${NEW_EXPIRY}`];
        const got = lines.slice(cursor, cursor + 3);
        if (JSON.stringify(got) !== JSON.stringify(want)) {
          ok = false;
          console.error(`  FAIL ${tag} block for ${r.id}: wanted ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
        }
        cursor += 3;
      }
      check(`${tag} each block is name, then «المتبقي», then «تاريخ الانتهاء», with the right values`, ok);
      const iLine = html.lastIndexOf('المتبقي:');
      const iBtn = html.indexOf('تأكيد المنح');
      check(`${tag} all the lines come before the confirm button`, iLine > 0 && iLine < iBtn);

      if (printSnapshot && planKey === 'shop_pro') {
        console.log(`\n--- snapshot: bulk · plan shop_pro (150) · ${SELECTED.length} selected ---\n${lines.slice(Math.max(0, at - 3)).join('\n')}`);
      }

      // confirm through the real handler; «new» must be what is stored
      const before = Object.fromEntries(SELECTED.map((u) => [u, { ...store[u] }]));
      const confirm = confirmButtonOf(win.tree);
      Date.now = () => NOW + 90 * 1000;
      await confirm.props.onClick();
      Date.now = () => NOW;
      check(`${tag} one batch, ${SELECTED.length} updates, on the selected accounts`, log.commits === 1 && log.batchUpdates.length === SELECTED.length && SELECTED.every((u) => log.batchUpdates.some((o) => o.id === u)));
      const k = ['plan', 'scansRemaining', 'scansTotal', 'isActive', 'expiresAt', 'subExpiredNotified', 'subExpiryEmailSent', 'subExpiryFcmDate'].sort();
      check(`${tag} the payload keys are unchanged`, log.batchUpdates.every((o) => JSON.stringify(Object.keys(o.fields).sort()) === JSON.stringify(k)));
      check(`${tag} each update: plan ${planKey}, increment(${g.scans}) twice, expiry clock + 30 days`, log.batchUpdates.every((o) => o.fields.plan === planKey && o.fields.scansRemaining.__operand === g.scans && o.fields.scansTotal.__operand === g.scans && o.fields.expiresAt instanceof Timestamp && o.fields.expiresAt.toMillis() === NOW + 90 * 1000 + 30 * DAY));
      let same = true;
      for (const [i, r] of rows.entries()) {
        const shownBalanceLine = labels[i * 2];
        const shownExpiryLine = labels[i * 2 + 1];
        const stored = store[r.id];
        const shownNew = shownBalanceLine.split(' ⟵ ')[1];
        if (typeof before[r.id].scansRemaining === 'number') {
          if (shownNew !== disp(stored.scansRemaining)) {
            same = false;
            console.error(`  FAIL ${tag} ${r.id}: shows new ${shownNew}, stored ${disp(stored.scansRemaining)}`);
          }
        } else if (shownNew !== '—' || stored.scansRemaining !== g.scans) {
          same = false;
          console.error(`  FAIL ${tag} ${r.id}: absent balance should show «—» and store the plain increment`);
        }
        if (shownExpiryLine.split(' ⟵ ')[1] !== formatDateShort(stored.expiresAt)) {
          same = false;
          console.error(`  FAIL ${tag} ${r.id}: expiry shown differs from stored`);
        }
      }
      check(`${tag} for every selected account the displayed «new» equals what the batch stored`, same);
      check(`${tag} the page asked for one notification e-mail per account, as before`, log.emails.length === SELECTED.length);
    }
    resetStore();
    {
      const again = await openBulk();
      calls[0] = again.setters[IDX.bulkModal].calls[0];
    }

    // no selection: no preview block, no stray labels
    {
      const second = renderPage({ [IDX.bulkModal]: calls[0] });
      const el = findAll(second.tree, (n) => n.type === page.BulkGrantModal)[0];
      const win = callComponent(page.BulkGrantModal, el.props, {});
      const lines = textOf(renderToStaticMarkup(win.tree));
      check('bulk: with nothing selected there are no «المتبقي» / «تاريخ الانتهاء» lines', !lines.some((l) => l.startsWith('المتبقي:') || l.startsWith('تاريخ الانتهاء:')));
    }

    // long selection scrolls
    {
      const many = Array.from({ length: 60 }, (_, i) => ({ id: `m${i}`, email: `m${i}@example.test`, name: `M${i}` }));
      const html = renderToStaticMarkup(React.createElement(page.BulkGrantPreview, { users: many, selected: many.map((m) => m.id), current: {}, add: 50, nowMs: NOW }));
      check('bulk: a long selection sits in a scrolling box (max height + overflow-y-auto)', /max-h-\d+/.test(html) && html.includes('overflow-y-auto'));
      check('bulk: an account missing from the fresh read shows «—» on every side', (html.match(/المتبقي: — ⟵ —/g) || []).length === 60 && (html.match(/تاريخ الانتهاء: — ⟵ /g) || []).length === 60);
    }
  }

  // bulk read failure
  resetStore();
  failGetDocs = true;
  {
    const first = renderPage();
    const header = findAll(first.tree, (n) => n.type === 'button' && nodeText(n).includes('منح اشتراك جماعي'))[0];
    await header.props.onClick();
    check('[bulk read fails] no window is opened', first.setters[IDX.bulkModal].calls.length === 0);
    check('[bulk read fails] the existing load-failure toast is shown', toasts.length === 1 && toasts[0][1] === 'فشل تحميل المستخدمين');
    check('[bulk read fails] working is released and nothing written', JSON.stringify(first.setters[IDX.working].calls) === JSON.stringify(['bulk', null]) && log.updateDoc.length === 0 && log.commits === 0);
  }

  // =========================================================================
  // the preview function on its own: the boundary cases
  // =========================================================================
  const gp = page.grantPreview;
  check('grantPreview: no current at all → every side «—» except the new expiry', JSON.stringify(gp(undefined, 5, NOW)) === JSON.stringify({ balanceFrom: '—', balanceTo: '—', expiryFrom: '—', expiryTo: NEW_EXPIRY }));
  check('grantPreview: NaN and Infinity are not balances', gp({ scansRemaining: NaN }, 5, NOW).balanceFrom === '—' && gp({ scansRemaining: Infinity }, 5, NOW).balanceFrom === '—');
  check('grantPreview: null is not a balance', gp({ scansRemaining: null }, 5, NOW).balanceTo === '—');
  check('grantPreview: 0 is a balance', gp({ scansRemaining: 0 }, 5, NOW).balanceFrom === 0 && gp({ scansRemaining: 0 }, 5, NOW).balanceTo === 5);
  check('page.GRANT_VALIDITY_MS is thirty days', page.GRANT_VALIDITY_MS === 30 * DAY);

  Date.now = realNow;
  console.log(`${pass}/${total} assertions passed`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => {
  Date.now = realNow;
  console.error(e);
  process.exit(1);
});
