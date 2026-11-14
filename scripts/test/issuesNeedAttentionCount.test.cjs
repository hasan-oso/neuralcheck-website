'use strict';

// W4 (task order, 2026-10-01) — REVISION (rule 23: replaces this file's own
// first version in full, not added alongside it).
//
// Round 1 used a simplified 1 / 2 / 3-10 / 11+ banding. The user's addendum
// (2026-10-01) rejected that: real Arabic CLDR plural rules are keyed on
// n%100, so a number like 103 is "few" (103%100===3), not "many"/"other" —
// the simplified "11+" band would have gotten it wrong. The fix uses
// Intl.PluralRules('ar') directly (components/verify/IssuesList.js's
// issuesNeedAttentionLabel), never a hand-rolled mod-100 reimplementation.
// Confirmed against the real JS engine before writing this file:
//   Intl.PluralRules('ar').select(n) for n in {0,1,2,3,10,11,99,100,102,103}
//     = zero,one,two,few,few,many,many,other,other,few
// ('other' here renders identical text to 'many' per the user's own
// approved strings — both "%d ملاحظة تحتاج انتباهاً" — so no fifth i18n key
// exists; IssuesList.js's PLURAL_CATEGORY_KEY maps 'other' onto the same
// issuesNeedAttentionMany key).
//
// zero is never reached by issuesNeedAttentionLabel at all: IssuesList
// shows t.verify.scanHighlights instead of this whole line when
// concerningCount===0 (hasConcerns gate) — tested directly below.
//
// n=2 uses the REAL v7-verifyReport-response-sample-cpu-c06-downgrade.json
// fixture and n=1 the REAL default v7-verifyReport-response-sample.json
// (rule 41). UPDATE (golden sync to neuralcheck-backend d5b6c29, rule 23):
// this file used to take n=2 from the default sample, which carried one
// WARNING (ISS-S-06) plus one FAIL (ISS-SEC-04). The synced default sample
// has NO warning any more — exactly one FAIL (ISS-SEC-04), so 1 concerning
// issue (checked by dumping every synced shape-C sample: default 1 FAIL;
// security-downgrade 1 FAIL; cpu-c06-downgrade 2 FAIL — ISS-C-06 and
// ISS-SEC-04; Honor and both zero-measured samples none). The "exactly 2
// concerning (1 WARNING + 1 FAIL)" pin was replaced by the cpu-c06 sample's
// real 2 FAIL, and the default sample now gives a real n=1 too. The other
// counts (0,3,10,11,99,100,102,103 — and n=1/n=0 also synthetically) have
// no real fixture with that exact concerning-count, so they use minimal
// synthetic issue arrays
// (only `severity`+`id` populated — the two fields IssuesList/
// classifyV7Severity actually read for this codepath), through the REAL
// IssuesList component via renderToStaticMarkup (rule 30).
//
// Turkish and English: per the user, picked by Intl.PluralRules for each
// language, not assumed. Confirmed before writing this file:
//   Intl.PluralRules('tr').select(n) = 'one' only at n=1, else 'other'.
//   Intl.PluralRules('en').select(n) = 'one' only at n=1, else 'other'.
// Both languages' four i18n keys (One/Two/Few/Many) hold IDENTICAL text
// for every non-'one' bucket (tr: "%d dikkat gerektiren bulgu" always; en:
// "%d issues need attention" for Two/Few/Many), so 'other' always lands on
// text matching what Two/Few/Many already give — verified by the generic
// assertion loop below rather than assumed.
//
// Run: node scripts/test/issuesNeedAttentionCount.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { readIssues, classifyV7Severity } = require('@/lib/reportReaders/v7');
const IssuesList = require('@/components/verify/IssuesList').default;
const { translations } = require('@/lib/i18n');
const { loadVerifyReportSample, loadVerifyReportCpuC06DowngradeSample } = require('./_shapes.cjs');

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

function render(el) {
  return renderToStaticMarkup(el);
}

function syntheticIssues(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `SYN-${i}`, severity: 'WARNING', title: `synthetic ${i}` }));
}

function toLatin(n) {
  return String(n);
}

// CLDR category each language's real Intl.PluralRules actually returns for
// every number this test covers — measured directly from the Node engine
// (rule 16: the tool's answer, not a hand-rolled mod-100 reimplementation)
// before writing this file. Re-measured live below (not hardcoded blindly)
// so a future engine/ICU data change would surface as a failing assertion
// here rather than a silently-stale expectation.
const NUMBERS = [0, 1, 2, 3, 10, 11, 99, 100, 102, 103];
const CATEGORY_KEY = {
  zero: null, // never reached — the "N issues" line isn't shown at all
  one: 'issuesNeedAttentionOne',
  two: 'issuesNeedAttentionTwo',
  few: 'issuesNeedAttentionFew',
  many: 'issuesNeedAttentionMany',
  other: 'issuesNeedAttentionMany', // identical text to 'many' in ar/tr/en
};

// ---------------------------------------------------------------------------
// zero — the line is not shown at all (scanHighlights renders instead).
// ---------------------------------------------------------------------------
{
  const issues = [{ id: 'INFO-1', severity: 'INFO', title: 'informational only' }];
  for (const lang of ['ar', 'tr', 'en']) {
    const t = translations[lang];
    const html = render(React.createElement(IssuesList, { issues, t, lang, severityClassifier: classifyV7Severity }));
    check(`[${lang}] n=0 concerning: shows scanHighlights, not an issuesNeedAttention* line`, html.includes(t.verify.scanHighlights));
    for (const key of ['issuesNeedAttentionOne', 'issuesNeedAttentionTwo', 'issuesNeedAttentionFew', 'issuesNeedAttentionMany']) {
      const template = t.verify[key];
      const rendered = typeof template === 'string' ? template.replace('%d', '0') : template;
      check(`[${lang}] n=0: does not render ${key}`, !html.includes(rendered));
    }
  }
}

// ---------------------------------------------------------------------------
// n=1 and n=2 — real fixtures (rule 41), all three languages.
// ---------------------------------------------------------------------------
function concerningOf(issues) {
  return issues.filter((iss) => {
    const level = classifyV7Severity(iss.severity);
    return level === 'warning' || level === 'danger' || level === 'unknown';
  });
}
for (const [n, label, load] of [
  [1, 'default C sample (1 FAIL: ISS-SEC-04)', loadVerifyReportSample],
  [2, 'cpu-c06-downgrade C sample (2 FAIL: ISS-C-06 + ISS-SEC-04)', loadVerifyReportCpuC06DowngradeSample],
]) {
  const issues = readIssues(load());
  check(`fixture sanity: the real ${label} has exactly ${n} concerning issue(s)`, concerningOf(issues).length === n);

  for (const lang of ['ar', 'tr', 'en']) {
    const t = translations[lang];
    const category = new Intl.PluralRules(lang).select(n);
    const key = CATEGORY_KEY[category];
    const expected = t.verify[key].replace('%d', toLatin(n));
    const html = render(React.createElement(IssuesList, { issues, t, lang, severityClassifier: classifyV7Severity }));
    check(`[${lang}] n=${n} (real fixture): Intl.PluralRules category is "${category}", renders "${expected}"`, html.includes(expected));
  }
}

// ---------------------------------------------------------------------------
// Every other number in NUMBERS (synthetic, minimal shape, real component),
// all three languages, category picked by each language's OWN
// Intl.PluralRules — not assumed to be the Arabic category.
// ---------------------------------------------------------------------------
for (const n of NUMBERS) {
  if (n === 0 || n === 2) continue; // covered above
  const issues = syntheticIssues(n);
  for (const lang of ['ar', 'tr', 'en']) {
    const t = translations[lang];
    const category = new Intl.PluralRules(lang).select(n);
    const key = CATEGORY_KEY[category];
    const expected = t.verify[key].replace('%d', toLatin(n));
    const html = render(React.createElement(IssuesList, { issues, t, lang, severityClassifier: classifyV7Severity }));
    check(`[${lang}] n=${n}: Intl.PluralRules category is "${category}", renders "${expected}"`, html.includes(expected));
  }
}

// ---------------------------------------------------------------------------
// Arabic-specific grammar spot checks — the exact bugs the task order named.
// ---------------------------------------------------------------------------
{
  const t = translations.ar;
  const html2 = render(React.createElement(IssuesList, { issues: syntheticIssues(2), t, lang: 'ar', severityClassifier: classifyV7Severity }));
  check('[ar] n=2: no leading digit before the dual noun (old behavior was "2 ملاحظات")', !html2.includes('>2<') && html2.includes('ملاحظتان'));

  const html103 = render(React.createElement(IssuesList, { issues: syntheticIssues(103), t, lang: 'ar', severityClassifier: classifyV7Severity }));
  check('[ar] n=103: CLDR "few" (103%100===3), not "many"/"other" — renders plural "ملاحظات", not singular "ملاحظة"', html103.includes('103 ملاحظات تحتاج انتباهاً'));

  const html1 = render(React.createElement(IssuesList, { issues: syntheticIssues(1), t, lang: 'ar', severityClassifier: classifyV7Severity }));
  check('[ar] n=1: no digit shown at all, just "ملاحظة واحدة"', !html1.includes('>1<') && html1.includes('ملاحظة واحدة تحتاج انتباهاً'));
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
