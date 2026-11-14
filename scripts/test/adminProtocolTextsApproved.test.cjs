'use strict';

// W-P6-14 / W-P6-18 / W-P6-20 — the texts of the protocol admin pages, pinned ONE BY ONE (rules 24, 29, 23), and the guard
// that lets them reach the user.
//
// WHAT IS PROVEN:
//   1. the table below IS the approved set: the 120 keys of ADMIN_PROTOCOL_TEXTS, no more and no fewer; each key's text
//      letter for letter and each key's source letter for letter. 89 are the proposals of the decisions sheet
//      (DECISIONS-FOR-HASAN-2026-10-21.md, section (ج), rows C1-1 .. C3-14), approved 2026-10-23 by the user's order
//      (Hasan's delegation of 2026-10-22: relayed, not checkable from this repo): 84 as proposed (APPROVED:<row>) and 5
//      after a minimal edit (APPROVED_EDITED:<row>; the old text is in the comment of its line); 24 are the plan's own words
//      (P6:<line>) and 7 are strings the site already shows (EXISTING). No source is PROPOSED;
//   2. each of the 89 rows C1-1 .. C3-14 is used exactly once, and the five edited rows are exactly C1-9, C1-32, C2-26,
//      C2-31 and C3-8;
//   3. the guard ADMIN_PROTOCOL_TEXTS_APPROVED is true, written once, and cannot be true while a source is PROPOSED;
//   4. with the REAL flag (not a stub) the four routes mount their panel through ProtocolGate and the sidebar has the
//      entry; each of the four route files is wrapped in the gate;
//   5. content rules of the order of 2026-10-23: no AI provider's name in any text, and no digit in a static text
//      (the numbers the order approves — +100 tests, 8 minutes — belong to other pages; a number here would be unapproved).
//
// NOT proven here: how the pages look in a real browser, and what the deployed callables answer (that is checked by the
// reader tests on synthetic samples and, outside this repo, by running the backend's real handlers in memory).
//
// To change a text: change it in lib/adminProtocolTexts.js AND here, in the same commit, with the reason.
//
// Run: node scripts/test/adminProtocolTextsApproved.test.cjs

require('./_jsx-require-hook.cjs');
const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function install(request, exports) {
  const key = require.resolve(request);
  require.cache[key] = { id: key, filename: key, loaded: true, exports, children: [], paths: [] };
}
install('next/navigation', {
  usePathname: () => '/admin/protocol',
  useRouter: () => ({ replace: () => {}, push: () => {} }),
});
install('next/link', { __esModule: true, default: ({ href, children, ...rest }) => React.createElement('a', { href, ...rest }, children) });
install('firebase/functions', { getFunctions: () => ({}), httpsCallable: () => async () => { throw new Error('no call in this test'); } });
install('firebase/firestore', { getFirestore: () => ({}), collection: () => ({}), getDocs: async () => ({ docs: [] }) });
install('firebase/auth', { getAuth: () => ({}), signOut: async () => {} });
install('@/firebase', { functions: {}, db: {}, auth: {} });

let pass = 0;
let total = 0;
function check(name, cond) {
  total += 1;
  if (cond) pass += 1;
  else console.error(`  FAIL: ${name}`);
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// key -> [source, text]  (a function text: [source, sample args, text the sample gives])
const APPROVED = {
  navLabel: ["APPROVED:C1-1", "بروتوكول الجمع"],
  settingsTitle: ["APPROVED:C1-2", "إعدادات البروتوكول"],
  shopsTitle: ["P6:787", "التفعيل لكل محلّ"],
  versionLabel: ["APPROVED:C1-3", "الإصدار"],
  updatedAtLabel: ["APPROVED:C1-4", "آخر تحديث"],
  updatedByLabel: ["P6:863", "المشرف مُهشَّراً"],
  settingsAbsent: ["P6:893", "إعدادات غائبة (لم تُكتب بعد)"],
  settingsAbsentEffect: ["P6:893", "الخادم لا يختار تكراراً ولا تقييماً مزدوجاً حينها"],
  settingsVersionUnusable: ["APPROVED:C1-5", "مستند الإعدادات موجود بلا رقم إصدار صالح، فيُقرأ غائباً والدالّة ترفض الكتابة فوقه"],
  replyUnreadable: ["APPROVED:C1-6", "تعذّر فهم ردّ الخادم"],
  fieldRepeatRate: ["APPROVED:C1-7", "نسبة التكرار"],
  fieldDoubleEvalRate: ["APPROVED:C1-8", "نسبة التقييم المزدوج"],
  fieldOpenBeforeValidityHours: ["APPROVED_EDITED:C1-9", "المدّة التي يبقى فيها فحص «قبل» مفتوحاً للربط بفحص «بعد» (ساعات)"],  // was "صلاحية «قبل» المفتوح (ساعات)"
  fieldCollectionPhase: ["P6:780", "مرحلة الجمع"],
  fieldBlindnessAlertBelowPct: ["APPROVED:C1-10", "حدّ تنبيه العمى (%)"],
  fieldReturnReasons: ["APPROVED:C1-11", "أسباب المرتجع"],
  fieldMinAppVersion: ["APPROVED:C1-12", "أدنى إصدار للتطبيق"],
  fieldAbsent: ["APPROVED:C1-13", "غير مضبوط"],
  fieldMalformed: ["APPROVED:C1-14", "القيمة المحفوظة بنوع غير متوقَّع"],
  fieldUnknownKeys: ["APPROVED:C1-15", "حقول غير معروفة للواجهة"],
  returnReasonsRule: ["P6:782", "المفتاح لا يُعدَّل بعد استعماله، والإيقاف بدل الحذف."],
  returnReasonKey: ["APPROVED:C1-16", "المفتاح"],
  returnReasonAr: ["APPROVED:C1-17", "العربية"],
  returnReasonTr: ["APPROVED:C1-18", "التركية"],
  returnReasonActive: ["P6:191", "فعّال"],
  returnReasonAdd: ["APPROVED:C1-19", "إضافة سبب"],
  boolOn: ["P6:780", "مفعَّل"],
  boolOff: ["P6:788", "غير مفعَّل"],
  limitsTitle: ["APPROVED:C1-20", "الحدود المقبولة (كما أرسلها الخادم)"],
  limitsAbsent: ["APPROVED:C1-21", "لم يُرسل الخادم الحدود"],
  cannotClear: ["APPROVED:C1-22", "لا يمكن مسح قيمة محفوظة"],
  invalidNumber: ["APPROVED:C1-23", "رقم غير صالح"],
  save: ["EXISTING", "حفظ"],
  saving: ["EXISTING", "جاري الحفظ..."],
  unsaved: ["EXISTING", "• لم يُحفظ بعد"],
  nothingToSave: ["APPROVED:C1-24", "لا تغيير"],
  saved: ["APPROVED:C1-25", "تم الحفظ"],
  savedVersion: ["APPROVED:C1-26", [7], "تم الحفظ — الإصدار 7"],
  savedNoChange: ["APPROVED:C1-27", "لم يتغيّر شيء"],
  refusedPrefix: ["APPROVED:C1-28", "رُفض الطلب:"],
  unknownRefusalCode: ["APPROVED:C1-29", "رمز غير معروف للواجهة"],
  callFailed: ["APPROVED:C1-30", "تعذّر إتمام الطلب"],
  retry: ["EXISTING", "إعادة المحاولة"],
  shopSearch: ["EXISTING", "بحث بالبريد أو الاسم..."],
  usersLoadFailed: ["EXISTING", "فشل تحميل المستخدمين"],
  noShopSelected: ["APPROVED:C1-31", "اختر محلّاً"],
  noShopMatches: ["EXISTING", "لا يوجد مستخدمون مطابقون"],
  partsTitle: ["APPROVED_EDITED:C1-32", "تفعيل الأجزاء"],  // was "الأجزاء المفعَّلة"
  partsAbsent: ["P6:788", "الغائب «غير مفعَّل»"],
  partUnreadable: ["APPROVED:C1-33", "غير مقروء"],
  partPurposes: ["P6:1044", "غرض الفحص"],
  partBatteryBeforeAfter: ["P6:1046", "أزواج البطارية"],
  partColdRepeat: ["P6:1048", "التكرار البارد"],
  partReturns: ["P6:1047", "عاد الزبون بشكوى"],
  partDoubleEval: ["P6:1051", "التقييم المزدوج"],
  partConsent: ["P6:1053", "الموافقة"],
  techTitle: ["P6:790", "الفنّيون"],
  techHint: ["P6:790", "إضافة اسم، وتعديله، وإيقافه بلا حذف (فتبقى تقييماته القديمة مربوطة باسمه)."],
  techNameLabel: ["P6:191", "الاسم المعروض"],
  techNone: ["APPROVED:C1-34", "لا فنّيين لهذا المحلّ"],
  techAdd: ["APPROVED:C1-35", "إضافة"],
  techRenameSave: ["APPROVED:C1-36", "حفظ الاسم"],
  techActivate: ["APPROVED:C1-37", "تفعيل"],
  techDeactivate: ["P6:790", "إيقاف"],
  techStateActive: ["P6:191", "فعّال"],
  techStateInactive: ["APPROVED:C1-38", "موقوف"],
  techStateUnreadable: ["APPROVED:C1-39", "علم الفعّالية غير مقروء"],
  techUnreadableEntry: ["APPROVED:C1-40", "سجلّ فنّي غير مقروء"],
  correctionsTitle: ["P6:854", "التصحيح: سجلّ بالإلحاق وحده"],
  correctionAction: ["APPROVED:C2-1", "الإجراء"],
  correctionActionUnset: ["APPROVED:C2-2", "اختر الإجراء"],
  actionUnlink: ["APPROVED:C2-3", "فكّ الربط"],
  actionRelink: ["APPROVED:C2-4", "إعادة الربط"],
  actionExclude: ["APPROVED:C2-5", "استبعاد"],
  actionUnexclude: ["APPROVED:C2-6", "إلغاء الاستبعاد"],
  targetShortId: ["P6:867", "رمز التقرير"],
  targetScanId: ["APPROVED:C2-7", "معرّف الفحص"],
  targetHint: ["APPROVED:C2-8", "أدخل أحدهما فقط"],
  toScanIdLabel: ["APPROVED:C2-9", "الفحص المراد الربط به (معرّف الفحص)"],
  reasonLabel: ["APPROVED:C2-10", "سبب الاستبعاد"],
  reasonUnset: ["APPROVED:C2-11", "اختر السبب"],
  reasonTest: ["APPROVED:C2-12", "فحص اختبار"],
  reasonWrong: ["APPROVED:C2-13", "فحص خاطئ"],
  reasonGoldenReference: ["APPROVED:C2-14", "مرجع ذهبي"],
  correctionSend: ["APPROVED:C2-15", "تنفيذ"],
  problemNoTarget: ["APPROVED:C2-16", "أدخل رمز التقرير أو معرّف الفحص"],
  problemBothTargets: ["APPROVED:C2-17", "أدخل أحدهما فقط، لا الاثنين"],
  problemNoToScanId: ["APPROVED:C2-18", "أدخل معرّف الفحص المراد الربط به"],
  problemNoReason: ["APPROVED:C2-19", "اختر سبب الاستبعاد"],
  correctionRecorded: ["APPROVED:C2-20", "تم تسجيل التصحيح"],
  resultTitle: ["APPROVED:C2-21", "نتيجة الإجراء"],
  resultBasis: ["APPROVED:C2-22", "الأساس"],
  basisScanProtocol: ["APPROVED:C2-23", "سجلّ البروتوكول"],
  basisReportOnly: ["APPROVED:C2-24", "التقرير وحده (فحص أقدم من سجلّ البروتوكول)"],
  resultExclusion: ["APPROVED:C2-25", "علامة الاستبعاد"],
  exclusionNone: ["APPROVED_EDITED:C2-26", "لا علامة (لم يُصحَّح استبعاده قطّ)"],  // was "لا علامة (لم يُصحَّح قطّ)"
  exclusionExcluded: ["APPROVED:C2-27", "مستبعَد"],
  exclusionNotExcluded: ["APPROVED:C2-28", "غير مستبعَد"],
  exclusionReasonLabel: ["APPROVED:C2-29", "السبب"],
  resultLinkState: ["APPROVED:C2-30", "حالة الربط"],
  resultLinkedScanId: ["APPROVED_EDITED:C2-31", "الفحص المسجَّل في الربط"],  // was "الفحص المرتبط"
  resultSeq: ["APPROVED:C2-32", "رقم سطر التصحيح"],
  seqNone: ["APPROVED:C2-33", "لا سطر ملحَق"],
  valueNull: ["APPROVED:C2-34", "لا قيمة"],
  valueUnknown: ["APPROVED:C2-35", "قيمة غير معروفة للواجهة"],
  marketingTitle: ["P6:1061", "خريطة الأسماء التجارية بالعربية"],
  marketingAbsent: ["APPROVED:C3-1", "الخريطة غائبة (لم تُدخَل بعد)"],
  marketingStoredUnreadable: ["APPROVED:C3-2", "مستند الخريطة المحفوظ غير مقروء، والدالّة ترفض الكتابة فوقه"],
  marketingEntriesCount: ["APPROVED:C3-3", [3], "3 مدخل"],
  marketingColModel: ["APPROVED:C3-4", "الطراز"],
  marketingColAr: ["APPROVED:C3-5", "العربية"],
  marketingColTr: ["APPROVED:C3-6", "التركية"],
  marketingColEn: ["APPROVED:C3-7", "الإنجليزية"],
  marketingModelHint: ["APPROVED_EDITED:C3-8", "مطابقة الطراز حرفية: حالة الأحرف والمسافات الداخلية كما هي، ولا تُقبل مسافة في طرفيه"],  // was "مطابقة الطراز حرفية: حالة الأحرف والمسافات كما هي"
  marketingAddRow: ["APPROVED:C3-9", "إضافة مدخل"],
  marketingNoEntries: ["APPROVED:C3-10", "لا مداخل"],
  marketingRowIncomplete: ["APPROVED:C3-11", "المدخل ناقص: الطراز والأسماء الثلاثة مطلوبة كلها"],
  marketingModelSaved: ["APPROVED:C3-12", "الطراز محفوظ مسبقاً: عدّل مدخله في القائمة"],
  marketingModelDuplicate: ["APPROVED:C3-13", "الطراز مكرَّر بين المداخل الجديدة"],
  marketingSaved: ["APPROVED:C3-14", [2,1,0], "تم الحفظ — الإصدار 2 (أُضيف 1، حُدِّث 0)"],
};

const { ADMIN_PROTOCOL_TEXTS: T, TEXT_SOURCE } = require('@/lib/adminProtocolTexts');
const FLAGS = require('@/lib/featureFlags');

(async () => {
  // ---- 1. the table is the set ------------------------------------------------------------
  const expectedKeys = Object.keys(APPROVED);
  check('the table has 120 keys (89 + 24 + 7)', expectedKeys.length === 120);
  check('the file has exactly the keys of the table (no text added or dropped without the table)', eq(Object.keys(T).sort(), [...expectedKeys].sort()));
  check('TEXT_SOURCE has exactly the keys of the table', eq(Object.keys(TEXT_SOURCE).sort(), [...expectedKeys].sort()));
  for (const key of expectedKeys) {
    const entry = APPROVED[key];
    const source = entry[0];
    const isFn = entry.length === 3;
    const expectedText = isFn ? entry[2] : entry[1];
    const actual = isFn ? (typeof T[key] === 'function' ? T[key](...entry[1]) : undefined) : T[key];
    check(`text ${key} is letter for letter the approved one`, actual === expectedText);
    check(`source of ${key} is ${source}`, TEXT_SOURCE[key] === source);
  }

  // ---- 2. the rows ------------------------------------------------------------------------
  const sources = Object.values(TEXT_SOURCE);
  const count = (re) => sources.filter((s) => re.test(s)).length;
  check('no source is PROPOSED', count(/^PROPOSED$/) === 0);
  check('84 APPROVED, 5 APPROVED_EDITED, 24 plan lines, 7 EXISTING', count(/^APPROVED:C[123]-\d+$/) === 84 && count(/^APPROVED_EDITED:C[123]-\d+$/) === 5 && count(/^P6:\d+$/) === 24 && count(/^EXISTING$/) === 7);
  const rowsUsed = sources.filter((s) => /^APPROVED/.test(s)).map((s) => s.split(':')[1]).sort();
  const rowsAll = [];
  for (let i = 1; i <= 40; i += 1) rowsAll.push(`C1-${i}`);
  for (let i = 1; i <= 35; i += 1) rowsAll.push(`C2-${i}`);
  for (let i = 1; i <= 14; i += 1) rowsAll.push(`C3-${i}`);
  check('every row C1-1..C1-40, C2-1..C2-35, C3-1..C3-14 is used exactly once (89 rows)', eq(rowsUsed, [...rowsAll].sort()));
  const edited = Object.keys(TEXT_SOURCE).filter((k) => /^APPROVED_EDITED/.test(TEXT_SOURCE[k])).map((k) => TEXT_SOURCE[k].split(':')[1]).sort();
  check('the five edited rows are exactly C1-9, C1-32, C2-26, C2-31, C3-8', eq(edited, ['C1-32', 'C1-9', 'C2-26', 'C2-31', 'C3-8']));

  // ---- 3. the guard -----------------------------------------------------------------------
  const flagsSrc = read('lib/featureFlags.js');
  check('guard: ADMIN_PROTOCOL_TEXTS_APPROVED is true', FLAGS.ADMIN_PROTOCOL_TEXTS_APPROVED === true);
  check('guard: written once, in lib/featureFlags.js, as "= true;"', flagsSrc.split('export const ADMIN_PROTOCOL_TEXTS_APPROVED').length === 2 && /export const ADMIN_PROTOCOL_TEXTS_APPROVED = true;/.test(flagsSrc));
  check('guard: it cannot be true while a source is PROPOSED', FLAGS.ADMIN_PROTOCOL_TEXTS_APPROVED !== true || count(/^PROPOSED$/) === 0);
  const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, e.name);
      if (e.isDirectory()) walk(rel, out);
      else if (/\.(js|mjs|cjs|jsx)$/.test(e.name)) out.push(rel);
    }
    return out;
  };
  // comments are not code (the texts file's header says «ADMIN_PROTOCOL_TEXTS_APPROVED = false» in words): strip them first
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const assigns = [...walk('lib'), ...walk('components'), ...walk('app')].filter((f) => /ADMIN_PROTOCOL_TEXTS_APPROVED\s*=[^=]/.test(stripComments(read(f))));
  check('guard: no file of lib/, components/ or app/ but lib/featureFlags.js assigns it (rule 24)', eq(assigns, ['lib/featureFlags.js']));

  // ---- 4. the routes and the sidebar, with the REAL flag -----------------------------------
  const ROUTES = [
    ['app/admin/protocol/page.js', '@/components/admin/protocol/ProtocolSettingsPanel.js'],
    ['app/admin/protocol/shops/page.js', '@/components/admin/protocol/ShopProtocolPanel.js'],
    ['app/admin/protocol/corrections/page.js', '@/components/admin/protocol/ProtocolCorrectionPanel.js'],
    ['app/admin/protocol/marketing-names/page.js', '@/components/admin/protocol/MarketingNamesPanel.js'],
  ];
  for (const [routeFile, panelModule] of ROUTES) {
    const src = read(routeFile);
    check(`${routeFile}: wrapped in ProtocolGate (imported and used as a tag)`, src.includes("import ProtocolGate from '@/components/admin/protocol/ProtocolGate'") && /<ProtocolGate>/.test(src) && /<\/ProtocolGate>/.test(src));
    const routePath = require.resolve(`@/${routeFile}`);
    const panelPath = require.resolve(panelModule);
    const saved = { route: require.cache[routePath], panel: require.cache[panelPath] };
    delete require.cache[routePath];
    let mounted = 0;
    install(panelModule, { __esModule: true, default: () => { mounted += 1; return React.createElement('div', null, 'PANEL'); } });
    const Page = require(`@/${routeFile}`).default;
    const markup = renderToStaticMarkup(React.createElement(Page));
    delete require.cache[routePath];
    if (saved.route) require.cache[routePath] = saved.route;
    require.cache[panelPath] = saved.panel;
    check(`${routeFile}: with the real flag the panel is mounted`, markup === '<div>PANEL</div>' && mounted === 1);
  }
  {
    const Sidebar = require('@/components/admin/Sidebar.js').default;
    const markup = renderToStaticMarkup(React.createElement(Sidebar, { user: { email: 'admin@example.test' } }));
    check('sidebar, real flag: the entry /admin/protocol with the label of navLabel', markup.includes('href="/admin/protocol"') && markup.includes(T.navLabel));
  }

  // ---- 5. content rules of the order of 2026-10-23 -----------------------------------------
  const PROVIDERS = /gemini|openai|chatgpt|\bgpt\b|claude|anthropic|deepseek|mistral|llama|bard|copilot|جيميني|جيمناي|أوبن ?إيه/i;
  const statics = expectedKeys.filter((k) => APPROVED[k].length === 2);
  check('no text names an AI provider', expectedKeys.every((k) => !PROVIDERS.test(APPROVED[k].length === 2 ? T[k] : T[k](...APPROVED[k][1]))));
  check('no static text carries a digit (Latin or Arabic-Indic)', statics.every((k) => !/[0-9٠-٩]/.test(T[k])));
  check('every text is a non-empty string, or a function that returns one', expectedKeys.every((k) => (typeof T[k] === 'string' && T[k].trim() !== '') || (typeof T[k] === 'function' && typeof T[k](...APPROVED[k][1]) === 'string')));

  // ---- 6. the pages that draw their texts on the first pass show every one of them, and no «undefined» --------
  install('@/components/admin/Toast', { useToast: () => ({ success() {}, error() {}, info() {} }), ToastProvider: ({ children }) => children });
  const CorrectionPanel = require('@/components/admin/protocol/ProtocolCorrectionPanel.js').default;
  const ShopPanel = require('@/components/admin/protocol/ShopProtocolPanel.js').default;
  const Tabs = require('@/components/admin/protocol/ProtocolTabs.js').default;
  const firstPass = [
    ['ProtocolTabs', React.createElement(Tabs), [T.settingsTitle, T.shopsTitle, T.correctionsTitle, T.marketingTitle]],
    ['ProtocolCorrectionPanel', React.createElement(CorrectionPanel), [T.correctionsTitle, T.correctionAction, T.correctionActionUnset, T.actionUnlink, T.actionRelink, T.actionExclude, T.actionUnexclude, T.targetHint, T.targetShortId, T.targetScanId, T.correctionSend]],
    ['ShopProtocolPanel', React.createElement(ShopPanel), [T.shopsTitle, T.shopSearch, T.noShopSelected]],
  ];
  for (const [name, element, mustHave] of firstPass) {
    const markup = renderToStaticMarkup(element);
    check(`${name}: the first pass shows every text it should (${mustHave.length}) and no "undefined"`, mustHave.every((s) => typeof s === 'string' && markup.includes(s)) && !markup.includes('undefined'));
  }

  console.log(`  (table: ${expectedKeys.length} keys — ${count(/^APPROVED:/)} APPROVED, ${count(/^APPROVED_EDITED:/)} APPROVED_EDITED, ${count(/^P6:/)} plan, ${count(/^EXISTING$/)} EXISTING)`);
  console.log(`${pass}/${total} assertions passed`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
