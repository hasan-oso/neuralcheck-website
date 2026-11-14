'use strict';

// Decision 7 (the user's, 2026-10-09, relayed in the task order): "صفحة
// المشرف لا تعرض الخامّ، ولا تُخزَّن المستندات الكاملة في المتصفّح."
//
// After neuralcheck-backend@6fa408d (relayed, not verifiable from this repo)
// a `reports` document no longer carries rawFingerprint, sessionId,
// deviceFingerprintSha, timeSeriesStoragePath or aiAudit — but documents
// written before it still do, until production is migrated. So both admin
// pages have to hold for a document that STILL carries them:
//
//   1. app/admin/reports/page.js — the "البيانات الخام (JSON)" view of a
//      report must not show the five keys. Rendered through the REAL
//      ReportModal. The five are removed from the displayed COPY; the
//      document itself (search, filters) keeps them.
//   2. app/admin/page.js — the 5-minute sessionStorage cache must not hold
//      the full documents. Driven through the REAL fetchStats -> writeCache
//      -> readCache path and the REAL table (RecentReportsTable); the only
//      substitutes are the two things outside this repo: the Firestore SDK
//      (a fake that returns the documents below) and sessionStorage (a Map).
//
// Documents under test:
//   - the six V7 samples (contract/v7-reports-document-sample*.json) —
//     real, and without the five keys since 6fa408d;
//   - contract/v6-reports-document-sample.json — a REAL old report that
//     still carries rawFingerprint (asserted below as a precondition);
//   - one of the V7 samples with all five keys added in memory, each with a
//     value that can be found by string — what an un-migrated production
//     document looks like. Nothing on disk is modified (rule 9).
//
// Run: node scripts/test/adminRawKeysHidden.test.cjs

require('./_jsx-require-hook.cjs');
const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const shapes = require('./_shapes.cjs');

// ---- fake Firestore SDK (external; installed BEFORE the pages load) ---------
const FIRESTORE_DOCS = [];
const fakeFirestore = {
  getFirestore: () => ({}),
  collection: (db, name) => ({ name }),
  query: (c, ...clauses) => ({ name: c.name, clauses }),
  where: (...a) => ({ where: a }),
  orderBy: (...a) => ({ orderBy: a }),
  limit: (n) => ({ limit: n }),
  sum: (f) => ({ sum: f }),
  count: () => ({ count: true }),
  Timestamp: { fromDate: (d) => ({ d }), now: () => ({ d: new Date() }) },
  getCountFromServer: async () => ({ data: () => ({ count: 7 }) }),
  getAggregateFromServer: async () => ({ data: () => ({ total: 12.5, n: 3 }) }),
  getDocs: async (q) => {
    const name = q && q.name;
    if (name === 'reports') {
      return {
        docs: FIRESTORE_DOCS.map((d) => ({
          id: d.id,
          data: () => {
            const { id, ...rest } = d;
            return rest;
          },
        })),
      };
    }
    if (name === 'users') {
      return { docs: [{ id: 'u1', data: () => ({ email: 'a@example.test', name: 'Ann' }) }] };
    }
    return { docs: [] };
  },
};
const firestoreKey = require.resolve('firebase/firestore');
require.cache[firestoreKey] = {
  id: firestoreKey,
  filename: firestoreKey,
  loaded: true,
  exports: fakeFirestore,
  children: [],
  paths: [],
};

// ---- fake sessionStorage ----------------------------------------------------
function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _values: () => Array.from(m.values()),
    _keys: () => Array.from(m.keys()),
  };
}
function installStorage(storage) {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

const {
  REPORT_DOC_RAW_KEYS,
  RECENT_REPORT_ROW_KEYS,
  withoutRawKeys,
  toRecentReportRow,
} = require('@/lib/adminReportView');
const { formatDateShort, reportCode } = require('@/lib/admin');
const { ReportModal } = require('./_load-admin-reports-internals.cjs');
const page = require('./_load-admin-page-internals.cjs');

let pass = 0;
let total = 0;
function check(name, cond) {
  total += 1;
  if (cond) {
    pass += 1;
  } else {
    console.error(`  FAIL: ${name}`);
  }
}
const sameSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

const FIVE = ['rawFingerprint', 'sessionId', 'deviceFingerprintSha', 'timeSeriesStoragePath', 'aiAudit'];

// ---- documents --------------------------------------------------------------
const SENTINELS = {
  rawFingerprint: { SENTINEL_RAW: 'SENTINEL-RAW-FINGERPRINT-VALUE' },
  sessionId: 'SENTINEL-SESSION-ID-VALUE',
  deviceFingerprintSha: 'SENTINEL-DEVICE-SHA-VALUE',
  timeSeriesStoragePath: 'SENTINEL/time-series/path.json.gz',
  aiAudit: { SENTINEL_AUDIT: 'SENTINEL-AI-AUDIT-VALUE' },
};
const SENTINEL_STRINGS = [
  'SENTINEL-RAW-FINGERPRINT-VALUE',
  'SENTINEL-SESSION-ID-VALUE',
  'SENTINEL-DEVICE-SHA-VALUE',
  'SENTINEL/time-series/path.json.gz',
  'SENTINEL-AI-AUDIT-VALUE',
];

const SIX = [
  ['v7-reports-document-sample', shapes.loadReportsDocSample()],
  ['honor', shapes.loadReportsDocHonorSample()],
  ['security-downgrade', shapes.loadReportsDocSecurityDowngradeSample()],
  ['cpu-c06-downgrade', shapes.loadReportsDocCpuC06DowngradeSample()],
  ['zero-measured', shapes.loadReportsDocZeroMeasuredSample()],
  ['zero-measured-battery-harness-error', shapes.loadReportsDocZeroMeasuredBatteryHarnessErrorSample()],
];
const v6Real = shapes.loadV6ReportsDocSample();
const OLD_STYLE_V7 = { id: 'old-style-v7', ...shapes.loadReportsDocSample(), ...SENTINELS };
const REAL_V6 = { id: 'real-v6', ...v6Real };

// ---------------------------------------------------------------------------
// The list itself — one source (rule 24).
// ---------------------------------------------------------------------------
check('REPORT_DOC_RAW_KEYS is exactly the five keys of the order, in order', JSON.stringify(REPORT_DOC_RAW_KEYS) === JSON.stringify(FIVE));
check('REPORT_DOC_RAW_KEYS is frozen', Object.isFrozen(REPORT_DOC_RAW_KEYS));
check('userId is NOT in the list (the server kept it; admin/reports reads it)', !REPORT_DOC_RAW_KEYS.includes('userId'));
for (const rel of ['app/admin/page.js', 'app/admin/reports/page.js']) {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
  check(`${rel} holds no second copy of the five names (they live in lib/adminReportView.js only)`, !FIVE.some((k) => src.includes(k)));
}
check('withoutRawKeys passes null through untouched', withoutRawKeys(null) === null);
check('withoutRawKeys passes an array through untouched', Array.isArray(withoutRawKeys([1])));

// ---------------------------------------------------------------------------
// 1. app/admin/reports/page.js — the JSON view, through the real ReportModal.
// ---------------------------------------------------------------------------
function decode(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
function renderModal(report) {
  return renderToStaticMarkup(React.createElement(ReportModal, { report, usersMap: new Map(), onClose: () => {} }));
}
/** The text of the <pre> under "البيانات الخام (JSON)", parsed. */
function rawJsonOf(html) {
  const at = html.indexOf('البيانات الخام (JSON)');
  if (at < 0) return null;
  const preStart = html.indexOf('<pre', at);
  const open = html.indexOf('>', preStart) + 1;
  const close = html.indexOf('</pre>', open);
  return JSON.parse(decode(html.slice(open, close)));
}

for (const [label, doc, mustCarry] of [
  ['un-migrated V7 document (all five keys present)', OLD_STYLE_V7, FIVE],
  ['REAL V6 sample (carries rawFingerprint)', REAL_V6, ['rawFingerprint']],
]) {
  for (const k of mustCarry) check(`[${label}] precondition: the document really carries ${k}`, k in doc);
  const before = JSON.stringify(doc);
  const html = renderModal(doc);
  const parsed = rawJsonOf(html);
  check(`[${label}] the JSON view is present and parses`, parsed !== null && typeof parsed === 'object');
  for (const k of FIVE) check(`[${label}] the JSON view has no "${k}" key`, !(k in parsed));
  check(
    `[${label}] the JSON view keeps every OTHER top-level key (nothing else dropped)`,
    sameSet(Object.keys(parsed), Object.keys(doc).filter((k) => !FIVE.includes(k)))
  );
  if ('userId' in doc) check(`[${label}] userId is still shown`, 'userId' in parsed);
  for (const s of SENTINEL_STRINGS) check(`[${label}] the modal's markup does not contain ${s}`, !html.includes(s));
  check(`[${label}] the document itself is unchanged by rendering (removal is from the displayed copy)`, JSON.stringify(doc) === before);
  check(`[${label}] the rest of the modal still renders (grade badge and Scan ID block)`, html.includes('Scan ID') && html.includes('الجهاز'));
}

for (const [label, sample] of SIX) {
  const doc = { id: `six-${label}`, ...sample };
  const parsed = rawJsonOf(renderModal(doc));
  check(`[${label}] a document without the five keys: the JSON view equals the document exactly`, JSON.stringify(parsed) === JSON.stringify(doc));
}

// ---------------------------------------------------------------------------
// 2. app/admin/page.js — fetchStats -> writeCache -> readCache -> the table.
// ---------------------------------------------------------------------------
const created = (n) => ({ seconds: 1790000000 + n * 86400, nanoseconds: 0, toDate() { return new Date((1790000000 + n * 86400) * 1000); } });
const dashboardDocs = [
  OLD_STYLE_V7,
  REAL_V6,
  ...SIX.map(([label, sample]) => ({ id: `six-${label}`, ...sample })),
  { id: 'legacy-timestamp-string', grade: 'b', deviceModel: 'MODEL-ONLY', shortId: 'nc-lower1', scanId: 'SCANID-FIELD', timestamp: '2026-10-01T10:00:00Z' },
  { id: 'empty-document' },
].map((d, i) => (d.id === 'legacy-timestamp-string' || d.id === 'empty-document' ? d : { ...d, createdAt: created(i) }));

(async () => {
  FIRESTORE_DOCS.length = 0;
  FIRESTORE_DOCS.push(...dashboardDocs);
  const storage = makeStorage();
  installStorage(storage);

  const stats = await page.fetchStats();
  const rows = stats.recentReports;

  check('fetchStats returns one row per document read', Array.isArray(rows) && rows.length === dashboardDocs.length);
  check(
    'every row has exactly RECENT_REPORT_ROW_KEYS — nothing else rides along',
    rows.every((r) => sameSet(Object.keys(r), RECENT_REPORT_ROW_KEYS))
  );
  check(
    'every row value is a string, a number or null — no nested object can carry a document fragment',
    rows.every((r) => Object.values(r).every((v) => v === null || typeof v === 'string' || typeof v === 'number'))
  );

  page.writeCache(stats, Date.now());
  const stored = storage.getItem(page.CACHE_KEY);
  check('the cache entry was written under CACHE_KEY', typeof stored === 'string' && stored.length > 0);
  const everythingStored = storage._values().join('\n');
  for (const k of FIVE) check(`stored cache does not contain the key ${k} (anywhere in sessionStorage)`, !everythingStored.includes(k));
  check('stored cache does not contain rawFingerprint (explicit, as the order names it)', !everythingStored.includes('rawFingerprint'));
  check('stored cache does not contain aiAudit (explicit, as the order names it)', !everythingStored.includes('aiAudit'));
  for (const s of SENTINEL_STRINGS) check(`stored cache does not contain ${s}`, !everythingStored.includes(s));
  for (const k of ['aiResponse', 'v5Metrics', 'deviceFingerprint', 'userId', 'serverSamplesStoragePath']) {
    check(`stored cache holds no field of the full document (${k})`, !everythingStored.includes(k));
  }

  const cached = page.readCache();
  check('readCache returns the entry just written', cached && cached.data && Array.isArray(cached.data.recentReports));
  check('the cached rows equal the fresh rows', JSON.stringify(cached.data.recentReports) === JSON.stringify(rows));

  const fresh = renderToStaticMarkup(React.createElement(page.RecentReportsTable, { rows }));
  const fromCache = renderToStaticMarkup(React.createElement(page.RecentReportsTable, { rows: cached.data.recentReports }));
  check('the table renders the same markup from fresh rows and from the cache', fresh === fromCache);

  // Each row of the table shows what the table showed for the DOCUMENT before
  // this change: device name chain, the computed letter, the code, the date.
  const trs = fresh.split('<tr ').slice(2); // [0] = before the header row, [1] = header row
  check('the table has one body row per document', trs.length === dashboardDocs.length);
  dashboardDocs.forEach((doc, i) => {
    const tr = trs[i] || '';
    const device = doc.deviceMarketingName || doc.deviceModel || doc.device || doc.model || '—';
    const letter = ((page.resolveGrade(doc) || '—') + '').toUpperCase().charAt(0);
    const code = reportCode(doc).display;
    const date = formatDateShort(doc.createdAt || doc.timestamp);
    check(`[${doc.id}] device name cell`, tr.includes(`>${device}</td>`));
    check(`[${doc.id}] grade badge shows "${letter}"`, tr.includes(`>${letter}</div>`));
    check(`[${doc.id}] code ${code}`, tr.includes(`>${code}</span>`));
    check(`[${doc.id}] date cell ${date}`, tr.includes(`>${date}</td>`));
  });

  const empty = renderToStaticMarkup(React.createElement(page.RecentReportsTable, { rows: [] }));
  check('no rows: the empty state still shows', empty.includes('لا توجد فحوصات بعد') && !empty.includes('<table'));

  // The v1 entry the previous build left in the browser: full documents.
  const storage2 = makeStorage();
  installStorage(storage2);
  const legacyKey = page.LEGACY_CACHE_KEYS[0];
  storage2.setItem(legacyKey, JSON.stringify({ ts: Date.now(), data: { recentReports: [OLD_STYLE_V7, REAL_V6] } }));
  check('precondition: the legacy v1 entry holds full documents', storage2.getItem(legacyKey).includes('rawFingerprint'));
  check('the cache key was bumped — v2 is not the legacy key', page.CACHE_KEY !== legacyKey && page.LEGACY_CACHE_KEYS.length >= 1);
  const miss = page.readCache();
  check('readCache does not read the legacy entry as the new shape', miss === null);
  check('readCache deletes the legacy v1 entry (full documents leave the browser)', storage2.getItem(legacyKey) === null);
  check('no sessionStorage value left holds rawFingerprint', !storage2._values().join('\n').includes('rawFingerprint'));

  // sessionStorage that throws on removeItem must not break the page.
  installStorage({ getItem: () => null, setItem: () => {}, removeItem: () => { throw new Error('blocked'); } });
  let threw = false;
  try {
    page.readCache();
  } catch {
    threw = true;
  }
  check('a sessionStorage that throws on removeItem does not make readCache throw', !threw);

  // toRecentReportRow on its own: absence stays absence (rule 22).
  const bare = toRecentReportRow({}, null);
  check('toRecentReportRow of an empty document: every field null, nothing invented', RECENT_REPORT_ROW_KEYS.every((k) => bare[k] === null));
  const honorRow = toRecentReportRow({ id: 'h', ...shapes.loadReportsDocHonorSample() }, page.resolveGrade({ id: 'h', ...shapes.loadReportsDocHonorSample() }));
  check('Honor sample (no letter): grade is null, not a placeholder', honorRow.grade === null);

  console.log(`${pass}/${total} assertions passed`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
