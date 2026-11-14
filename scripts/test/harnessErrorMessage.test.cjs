'use strict';

// W6 (task order, 2026-10-01, S-13): overall.harnessErrorMessage — the
// human-readable replacement for the raw harnessErrorReason code
// ("FUNCTIONAL_RESULTS_UNAVAILABLE" on the one real sample this repo has).
// lib/reportReaders/v7.js's readOverall reads it; components/verify/
// V7Notices.js, app/verify/page.js, and app/print/[shortId]/PrintClient.js
// show it instead of the raw code, falling back to
// t.verify.v7HarnessErrorMessageUnavailable when it is absent.
//
// REWRITTEN on the real samples (golden sync to neuralcheck-backend d5b6c29,
// rule 23). This file used to be built around the backend NOT having shipped
// the field: the "absent" case used the unmodified Honor fixture and the
// "present" case was a synthetic one-field override. Both premises are gone —
// the synced Honor samples (B and C) NOW CARRY the server's real
// `harnessErrorMessage`:
//   - PRESENT: the real, unmodified Honor samples (C and B), all three
//     languages.
//   - ABSENT: built in memory from the real synced Honor with
//     `harnessErrorMessage` DELETED — "the shape of reports from before the
//     server shipped the field" — no new file in contract/, not a golden
//     sample (the fallback path is real code that real older documents hit).
//   - WRONG TYPE: the same real sample with the field overridden to a number
//     (a contract violation; synthetic by nature).
//
// Why the Arabic "fallback not shown" assertion is not made: the user
// decided the Arabic fallback text matches the server's S-13 sentence, so in
// Arabic the two strings are identical and "shows the message, not the
// fallback" cannot be told apart. That equality is asserted below (it is the
// documented relation; if the server wording ever changes this is where it
// surfaces), and the distinct-language check is made in Turkish and English,
// where the fallback text really does differ from the Arabic server message.
//
// Run: node scripts/test/harnessErrorMessage.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { readOverall } = require('@/lib/reportReaders/v7');
const V7Notices = require('@/components/verify/V7Notices').default;
const { translations } = require('@/lib/i18n');
const {
  loadVerifyReportHonorSample,
  loadReportsDocHonorSample,
  withAiResponseOverride,
  withAiResponseKeyDeleted,
} = require('./_shapes.cjs');

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

const honorC = loadVerifyReportHonorSample();
const honorB = loadReportsDocHonorSample();

// Shape B nests overall under aiResponse.overall; shape C flattens it.
function deleteMessageB(report) {
  const clone = JSON.parse(JSON.stringify(report));
  delete clone.aiResponse.overall.harnessErrorMessage;
  return clone;
}
const olderC = withAiResponseKeyDeleted(honorC, 'harnessErrorMessage'); // the shape of pre-field reports
const olderB = deleteMessageB(honorB); // the shape of pre-field reports

// ---------------------------------------------------------------------------
// PRESENT — the real, unmodified synced Honor (C and B).
// ---------------------------------------------------------------------------
for (const [shape, doc] of [['C', honorC], ['B', honorB]]) {
  const overall = readOverall(doc);
  const MESSAGE = overall.harnessErrorMessage;
  check(`[Honor/${shape}] readOverall: harnessErrorMessage is the real server string`, typeof MESSAGE === 'string' && MESSAGE.length > 0);
  check(`[Honor/${shape}] harnessError is still true and the raw code is still read (it stays in the data)`, overall.harnessError === true && overall.harnessErrorReason === 'FUNCTIONAL_RESULTS_UNAVAILABLE');

  for (const lang of ['ar', 'tr', 'en']) {
    const t = translations[lang];
    const html = render(React.createElement(V7Notices, { overall, t }));
    check(`[${lang}/${shape}] V7Notices: shows the real server message verbatim`, html.includes(MESSAGE));
    check(`[${lang}/${shape}] V7Notices: never shows the raw harnessErrorReason code`, !html.includes(overall.harnessErrorReason));
    if (lang !== 'ar') {
      // In tr/en the fallback text differs from the Arabic server message, so
      // this one is meaningful: the real message wins over the fallback.
      check(`[${lang}/${shape}] V7Notices: the real message is shown INSTEAD of the ${lang} fallback`, !html.includes(t.verify.v7HarnessErrorMessageUnavailable));
    }
  }
}
// The documented relation (the user: the fallback "يطابق نصّ الخادم S-13").
check('Arabic fallback text equals the server\'s real harnessErrorMessage (the documented relation; see header)', translations.ar.verify.v7HarnessErrorMessageUnavailable === readOverall(honorC).harnessErrorMessage);
check('B and C carry the same message', readOverall(honorB).harnessErrorMessage === readOverall(honorC).harnessErrorMessage);

// ---------------------------------------------------------------------------
// ABSENT — the real Honor with the field deleted (the shape of reports from
// before the server shipped it): the fallback, in every language; the raw
// code never.
// ---------------------------------------------------------------------------
for (const [shape, doc] of [['C', olderC], ['B', olderB]]) {
  const overall = readOverall(doc);
  check(`[older Honor/${shape}] readOverall: harnessErrorMessage is null when the field is absent`, overall.harnessErrorMessage === null);
  check(`[older Honor/${shape}] fixture sanity: harnessError is still true`, overall.harnessError === true);
  for (const lang of ['ar', 'tr', 'en']) {
    const t = translations[lang];
    const html = render(React.createElement(V7Notices, { overall, t }));
    check(`[${lang}/${shape} older] V7Notices: shows the buyer-safe fallback notice`, html.includes(t.verify.v7HarnessErrorMessageUnavailable));
    check(`[${lang}/${shape} older] V7Notices: never shows the raw harnessErrorReason code`, !html.includes(overall.harnessErrorReason));
  }
}

// ---------------------------------------------------------------------------
// WRONG TYPE — contract violation: treated as absent, never coerced.
// ---------------------------------------------------------------------------
{
  const t = translations.ar;
  const overall = readOverall(withAiResponseOverride(honorC, { harnessErrorMessage: 42 }));
  check('readOverall: a non-string harnessErrorMessage is read as null, not coerced', overall.harnessErrorMessage === null);
  const html = render(React.createElement(V7Notices, { overall, t }));
  check('V7Notices: falls back to the generic notice when harnessErrorMessage has the wrong type', html.includes(t.verify.v7HarnessErrorMessageUnavailable));
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
