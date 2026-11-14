'use strict';

// VerifyActions (components/verify/VerifyActions.js) — coordinator decision
// 73, 2026-09-23, س٧: the "تحميل التقرير (PDF)" button must be hidden
// (PDF/print not ready for the second field-test round), the
// "طباعة التقرير" button must stay (it never touches /print — see
// lib/featureFlags.js's PDF_DOWNLOAD_ENABLED doc comment).
//
// Renders the REAL production component via react-dom/server (rule 30) —
// this is the actual file app/verify/page.js imports and renders, not a
// reimplementation. (app/verify/page.js's top-level VerifyPage component
// itself cannot be rendered this way — `report`/`pdfLoading` are internal
// useState, never reachable by a plain server render without a browser;
// that is exactly why this block was extracted into its own props-driven
// component. See this task's report for the live-browser confirmation of
// the full page on top of this.)
//
// Run: node scripts/test/verifyActions.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const VerifyActions = require('@/components/verify/VerifyActions').default;
const { PDF_DOWNLOAD_ENABLED } = require('@/lib/featureFlags');
const { translations } = require('@/lib/i18n');

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

const t = translations.ar;

check('precondition: PDF_DOWNLOAD_ENABLED is false today (decision 73)', PDF_DOWNLOAD_ENABLED === false);

// ---------------------------------------------------------------------------
// Default state (not loading, no error) — the common case a buyer sees.
// ---------------------------------------------------------------------------
{
  let downloadCalled = false;
  let printCalled = false;
  const html = renderToStaticMarkup(
    React.createElement(VerifyActions, {
      pdfLoading: false,
      pdfError: '',
      onDownloadPdf: () => {
        downloadCalled = true;
      },
      onPrint: () => {
        printCalled = true;
      },
      t,
    })
  );

  check('PDF download label text is absent from the rendered HTML', !html.includes(t.verify.downloadPdf));
  check('print button label text IS present', html.includes(t.verify.printReport));
  check('exactly one <button> element renders (PDF button structurally absent, not just visually hidden)', (html.match(/<button/g) || []).length === 1);
  check('onDownloadPdf/onPrint props are unused during render (no click simulated — just confirming render did not throw wiring them)', downloadCalled === false && printCalled === false);
}

// ---------------------------------------------------------------------------
// pdfLoading=true, pdfError set — proves the hidden button's OWN states
// (spinner text, error box) don't leak into the tree either, since the
// whole button (and its error box, same flag) is gone.
// ---------------------------------------------------------------------------
{
  const html = renderToStaticMarkup(
    React.createElement(VerifyActions, {
      pdfLoading: true,
      pdfError: 'PDF error placeholder text',
      onDownloadPdf: () => {},
      onPrint: () => {},
      t,
    })
  );
  check('pdfLoading=true: "preparingPdf" spinner text does not appear (button gone entirely)', !html.includes(t.verify.preparingPdf));
  check('pdfError set: the error message text does not render', !html.includes('PDF error placeholder text'));
  check('print button still renders even with pdfError set', html.includes(t.verify.printReport));
  check('still exactly one <button> element', (html.match(/<button/g) || []).length === 1);
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
