'use strict';

// app/admin/reports/page.js — V6/V7 field parity in the report-detail
// modal (this task, item 4). Renders the REAL ReportModal component (see
// scripts/test/_load-admin-reports-internals.cjs for how it is exposed
// without changing the shipped file) via react-dom/server, not a
// reimplementation — rule 30's "full path to the component" requirement,
// same as the other two test files in this directory.
//
// Two fixtures:
//   - a V7 report: the REAL vendored Firestore `reports` document
//     (contract/v7-reports-document-sample.json) this page actually reads
//     — see the 2026-09-24 note below.
//   - a V6 report: a plain fixture matching the pre-task shape this modal
//     already handled, to prove the V6 branch is untouched.
//
// ⚠️ 2026-09-24 (coordinator decision, tools-website-v7-shape-probe.cjs,
// rule 37 incident): admin/reports reads Firestore documents directly
// (`{id: d.id, ...d.data()}`) — the full V7 display shape lives under
// `aiResponse`, not the document's own top level. This file used to spread
// a sample directly at the fixture's root (`{id, ...sample}`) — that
// matched the raw contract-sample shape, which this page never actually
// receives. The V7 fixture is now the REAL vendored Firestore-document
// sample (contract/v7-reports-document-sample.json, from
// contract-handoff-27bacd3 — `git show 27bacd3:functions/test/fixtures/
// golden/v7-reports-document-sample.json`, sha256 verified on receipt),
// not a derived/wrapped one. The V6 fixture is untouched — this page's V6
// reads were already correct and remain root-level, unchanged by this task.
//
// Run: node scripts/test/adminReportsParity.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { ReportModal, resolveGrade, isV7Report } = require('./_load-admin-reports-internals.cjs');
const { loadReportsDocSample } = require('./_shapes.cjs');

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

function render(report) {
  return renderToStaticMarkup(
    React.createElement(ReportModal, { report, usersMap: new Map(), onClose: () => {} })
  );
}

// ---------------------------------------------------------------------------
// V7 fixture — the real vendored Firestore reports-document sample,
// unmodified (only `id` added, exactly matching the real `{id: d.id,
// ...d.data()}` construction admin/reports/page.js's load() uses).
// ---------------------------------------------------------------------------
{
  const sample = loadReportsDocSample();
  const report = { id: 'v7-fixture', ...sample };

  check('isV7Report classifies the real fixture as V7', isV7Report(report) === true);
  check('resolveGrade reads aiResponse.overall.letter ("C")', resolveGrade(report) === 'C');

  const html = render(report);

  check('grade badge shows "C" (letter unified across pipelines)', html.includes('>C<'));
  check(
    '"الدرجة" field shows the explicit V7 no-numeric-score label, not a number or blank',
    html.includes('لا يحمل نقاطاً رقمية لكل تقرير')
  );
  check(
    'verdict section shows narrative.verdict verbatim (the real V7 counterpart, not the V6 chain)',
    html.includes(sample.aiResponse.narrative.verdict)
  );
  check(
    'details section shows narrative.details verbatim',
    html.includes(sample.aiResponse.narrative.details.slice(0, 60))
  );
  check(
    'V7 categories block renders (the declared substitute for the missing numeric category_scores map)',
    html.includes('فئات V7')
  );
  check(
    'gpu.letterCeilingReason.text (the real fixture text) renders verbatim inside the V7 categories block',
    html.includes(sample.aiResponse.categories.gpu.letterCeilingReason.text)
  );
  check(
    'the old V6 "تقييم الفئات" (numeric) block is NOT shown for a V7 report — no invented numbers',
    !html.includes('تقييم الفئات')
  );
  check(
    'at least one issue renders with an explicit severity tag (readIssues + classifyV7Severity, not raw duck-typing)',
    /\[(danger|warning|info|positive|unknown)\]/.test(html)
  );
  check(
    'the SEC-04 fail issue title is present',
    html.includes('فشل في الاختبار SEC-04') || html.includes('صلاحيات الجذر مكتشَفة')
  );
}

// ---------------------------------------------------------------------------
// V6 fixture — proves the V6 branch is untouched (byte-identical reads to
// before this task): report.grade / report.verdict / report.issues (raw
// array) / report.details / report.category_scores.
// ---------------------------------------------------------------------------
{
  const v6Report = {
    id: 'v6-fixture',
    grade: 'B',
    verdict: 'حكم تقرير V6 القديم',
    issues: [{ title: 'مشكلة V6 القديمة', message: 'وصف' }],
    details: 'تفاصيل نصية V6',
    category_scores: { cpu: 88, gpu: 70 },
    score: 82,
  };

  check('isV7Report classifies this fixture as V6 (no pipeline field)', isV7Report(v6Report) === false);
  check('resolveGrade reads report.grade ("B") — unchanged', resolveGrade(v6Report) === 'B');

  const html = render(v6Report);

  check('grade badge shows "B"', html.includes('>B<'));
  check('numeric score "82" shown in the "الدرجة" field — unchanged', html.includes('82'));
  check('V6 verdict chain (report.verdict) still renders verbatim — untouched by this task', html.includes('حكم تقرير V6 القديم'));
  check('V6 category_scores (numeric map) still renders — untouched by this task', html.includes('88') && html.includes('70'));
  check('V6 raw issues array still renders via title — untouched by this task', html.includes('مشكلة V6 القديمة'));
  check('V6 details (report.details) still renders — untouched by this task', html.includes('تفاصيل نصية V6'));
  check('no V7 categories block on a V6 report', !html.includes('فئات V7'));
  check('no V7-only "no numeric score" label on a V6 report', !html.includes('لا يحمل نقاطاً رقمية لكل تقرير'));
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
