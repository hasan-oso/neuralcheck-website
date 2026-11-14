'use strict';

// Item 6(a) of the fourth addendum to decision 102 (2026-09-26):
// lib/reportReaders/v7.js:536 has read `evidenceUnit` since it was written,
// but nothing in components/verify/IssuesList.js ever rendered it — grepped
// components/ and app/ for the literal string before this fix: no hits.
// Shown beside the evidence value now, when present; when absent (the far
// more common case in real data), nothing is added.
//
// Real V7 sample (contract/v7-verifyReport-response-sample-cpu-c06-downgrade.json
// — the shape /verify and /print actually fetch), real readIssues, real
// IssuesList via renderToStaticMarkup (rule 30/41). Two real issues from the
// SAME fixture give both cases without any synthetic data: ISS-C-06
// (evidence "9.1", evidenceUnit "%") and ISS-SEC-04 (evidence "مكتشف",
// evidenceUnit null) — confirmed present in the real fixture via a direct
// dump before writing this test.
//
// UPDATE (golden sync to neuralcheck-backend d5b6c29, rule 23): this test used
// to pin ISS-S-06 (evidence "2597", evidenceUnit "IOPS") from the default
// sample v7-verifyReport-response-sample.json. The synced default sample no
// longer carries ISS-S-06 at all (its WARNING issue is gone — checked across
// every synced shape-C sample: none has it), so that pin could never hold
// again. The only synced sample with a real evidenceUnit is the cpu-c06
// downgrade one (ISS-C-06, "9.1" "%"); the no-unit counterpart ISS-SEC-04 is
// in the same file. Same two cases, same assertions, real values swapped.
//
// Run: node scripts/test/issueEvidenceUnit.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { readIssues, classifyV7Severity } = require('@/lib/reportReaders/v7');
const IssuesList = require('@/components/verify/IssuesList').default;
const { translations } = require('@/lib/i18n');
const { loadVerifyReportCpuC06DowngradeSample } = require('./_shapes.cjs');

const t = translations.ar;

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

const report = loadVerifyReportCpuC06DowngradeSample();
const issues = readIssues(report);

const withUnit = issues.find((i) => i.id === 'ISS-C-06');
const withoutUnit = issues.find((i) => i.id === 'ISS-SEC-04');

check('fixture sanity: ISS-C-06 exists with real evidence "9.1" and evidenceUnit "%"', !!withUnit && withUnit.evidence === '9.1' && withUnit.evidenceUnit === '%');
check('fixture sanity: ISS-SEC-04 exists with real evidence "مكتشف" and no evidenceUnit', !!withoutUnit && withoutUnit.evidence === 'مكتشف' && withoutUnit.evidenceUnit === null);

const htmlWithUnit = renderToStaticMarkup(
  React.createElement(IssuesList, { issues: [withUnit], t, severityClassifier: classifyV7Severity })
);
const htmlWithoutUnit = renderToStaticMarkup(
  React.createElement(IssuesList, { issues: [withoutUnit], t, severityClassifier: classifyV7Severity })
);

check('ISS-C-06: shows the real evidence value "9.1"', htmlWithUnit.includes('9.1'));
check('ISS-C-06: shows the real unit "%" beside it, in the same <code> block', htmlWithUnit.includes('9.1') && /9\.1[\s\S]{0,40}%/.test(htmlWithUnit));
check('ISS-SEC-04: shows the real evidence value "مكتشف"', htmlWithoutUnit.includes('مكتشف'));
check('ISS-SEC-04: adds nothing beside it — no unit text, no placeholder (rule 22)', !htmlWithoutUnit.includes('<span class="ms-1">') && !/مكتشف<\/code>\s*<span/.test(htmlWithoutUnit));
// The unit span only exists when there is a unit — its exact class string is
// unique to this addition, so its total absence from the no-unit card is a
// direct structural check, not just a text-content guess.
check('ISS-SEC-04: the unit <span> itself is not rendered at all', !htmlWithoutUnit.includes('<span class="ms-1">'));
check('ISS-C-06: the unit <span> IS rendered', htmlWithUnit.includes('<span class="ms-1">%</span>'));

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
