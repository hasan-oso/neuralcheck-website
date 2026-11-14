'use strict';

// decision 82 §2 (2026-09-24): "/dashboard و/tech و/shop/[slug]: الحالة
// وسببها بالمكوّن نفسه الذي في /verify." — /admin and /admin/reports are
// explicitly exempt ("يكفيهما «—»"), so not covered here.
//
// V7Notices itself is already exercised against real Honor data in
// honorNoLetter.test.cjs; this file confirms it is actually WIRED into the
// three real page-level card/form components (not a reimplementation —
// ListingEditorCard/DeviceCard were exported from their page files purely so
// this test can require and render them directly; EvaluationForm already
// had its own file). Uses the same real Honor B fixture (harnessError=true,
// letter=null) every other harness-error test in this repo uses.
//
// UPDATE (W6, task order, 2026-10-01, S-13): the three assertions below used
// to check that each component "renders the real harnessErrorReason via
// V7Notices" as CORRECT behavior — harnessErrorReason is a raw backend code
// ("FUNCTIONAL_RESULTS_UNAVAILABLE" on this real fixture), never meant for a
// buyer, and V7Notices no longer shows it. Per rule 23, those three
// assertions are replaced (not kept alongside new ones) with checks that the
// raw code is ABSENT and the buyer-safe fallback notice (harnessErrorMessage
// is absent on this real fixture too — the backend hasn't shipped it yet)
// renders instead, through the same three real wired components.
//
// UPDATE (golden sync to neuralcheck-backend d5b6c29, rule 23): the synced
// Honor B sample NOW CARRIES the server's harnessErrorMessage, so the three
// "renders the buyer-safe fallback" assertions below were replaced by
// "renders the REAL server message" — the old ones would now pass vacuously
// in Arabic (the fallback text equals the server's message). The fallback
// path itself (message absent) is tested in harnessErrorMessage.test.cjs.
//
// Run: node scripts/test/v7NoticesWiring.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { readOverall } = require('@/lib/reportReaders/v7');
const { translations } = require('@/lib/i18n');
const { loadReportsDocHonorSample } = require('./_shapes.cjs');

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

function render(el) {
  return renderToStaticMarkup(el);
}

const honorB = loadReportsDocHonorSample();
const overallB = readOverall(honorB);
check('fixture sanity: Honor B has harnessError=true (same fixture honorNoLetter.test.cjs verifies)', overallB.harnessError === true);
check('fixture sanity: Honor B has a real harnessErrorReason string', typeof overallB.harnessErrorReason === 'string' && overallB.harnessErrorReason.length > 0);
check('fixture sanity: Honor B carries the server harnessErrorMessage (d5b6c29 golden sync)', typeof overallB.harnessErrorMessage === 'string' && overallB.harnessErrorMessage.length > 0);

// ---------------------------------------------------------------------------
// /dashboard — ListingEditorCard (app/dashboard/page.js)
// ---------------------------------------------------------------------------
{
  const { ListingEditorCard } = require('@/app/dashboard/page.js');
  const html = render(
    React.createElement(ListingEditorCard, {
      report: { ...honorB, id: 'honor-test' },
      t,
      lang: 'ar',
      onSave: async () => {},
    })
  );
  check('ListingEditorCard: does NOT render the raw harnessErrorReason code via V7Notices', !html.includes(overallB.harnessErrorReason));
  check('ListingEditorCard: renders the REAL server message (harnessErrorMessage) via V7Notices', html.includes(overallB.harnessErrorMessage));
}

// ---------------------------------------------------------------------------
// /shop/[slug] — DeviceCard (app/shop/[slug]/ShopClient.js)
// ---------------------------------------------------------------------------
{
  const { DeviceCard } = require('@/app/shop/[slug]/ShopClient.js');
  const html = render(
    React.createElement(DeviceCard, {
      report: { ...honorB, id: 'honor-test', scanId: 'honor-test' },
      t,
      lang: 'ar',
    })
  );
  check('DeviceCard: does NOT render the raw harnessErrorReason code via V7Notices', !html.includes(overallB.harnessErrorReason));
  check('DeviceCard: renders the REAL server message (harnessErrorMessage) via V7Notices', html.includes(overallB.harnessErrorMessage));
}

// ---------------------------------------------------------------------------
// /tech — EvaluationForm (components/tech/EvaluationForm.js). `revealed`
// (and therefore V7Notices, placed after the reveal gate) only shows once
// technicianGrade is set — same evaluation shape resolveAppGrade.test.cjs
// already uses to reach this state.
// ---------------------------------------------------------------------------
{
  const EvaluationForm = require('@/components/tech/EvaluationForm').default;
  const evaluation = { technicianGrade: 'B', agreement: 'agree' };
  const html = render(
    React.createElement(EvaluationForm, {
      report: { ...honorB, id: 'honor-test' },
      evaluation,
      technicianName: 'Test Tech',
      onSaved: () => {},
      onBack: () => {},
      lang: 'ar',
    })
  );
  check('EvaluationForm: does NOT render the raw harnessErrorReason code via V7Notices once revealed', !html.includes(overallB.harnessErrorReason));
  check('EvaluationForm: renders the REAL server message (harnessErrorMessage) via V7Notices once revealed', html.includes(overallB.harnessErrorMessage));
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
