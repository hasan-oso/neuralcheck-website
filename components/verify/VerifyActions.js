'use client';

// The "تحميل التقرير (PDF)" / "طباعة التقرير" action row on /verify.
// Extracted out of app/verify/page.js (coordinator decision 73,
// 2026-09-23, س٧) into its own props-driven component for one reason:
// app/verify/page.js's `report`/`pdfLoading`/`pdfError` are internal
// useState, unreachable by a plain react-dom/server render — this
// component takes them as props instead, so scripts/test/
// verifyActions.test.cjs can render the REAL production component (rule
// 30) and assert the PDF button is actually absent from the tree, not
// merely styled invisible.
//
// PDF_DOWNLOAD_ENABLED (lib/featureFlags.js) is the single source for
// whether the PDF button renders at all — see that file for the decision
// this hides. The print button (window.print() on the already-rendered
// /verify page, passed in as `onPrint`) is NEVER gated by this flag: it
// has nothing to do with the /print route or generateReportPdf.

import {
  PrinterIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { PDF_DOWNLOAD_ENABLED } from '@/lib/featureFlags';

export default function VerifyActions({ pdfLoading, pdfError, onDownloadPdf, onPrint, t }) {
  return (
    <>
      <div className="mt-2 flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center print:hidden">
        {PDF_DOWNLOAD_ENABLED && (
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={pdfLoading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl nc-gradient-bg text-nc-bg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition text-sm min-w-[200px]"
          >
            {pdfLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-nc-bg/60 border-t-transparent rounded-full animate-spin" />
                <span>{t.verify.preparingPdf}</span>
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="w-4 h-4" strokeWidth={2} />
                <span>{t.verify.downloadPdf}</span>
              </>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 hover:border-nc-green/50 hover:text-nc-green transition text-sm font-medium"
        >
          <PrinterIcon className="w-4 h-4" strokeWidth={1.8} />
          {t.verify.printReport}
        </button>
      </div>

      {/* PDF error message — only reachable when the button above exists;
          gated by the same flag so no dead error UI lingers while the
          button that could ever set pdfError is hidden. */}
      {PDF_DOWNLOAD_ENABLED && pdfError && (
        <div className="mx-auto max-w-md p-3 rounded-xl bg-nc-grade-d/10 border border-nc-grade-d/30 text-center print:hidden">
          <div className="flex items-center justify-center gap-2 text-nc-grade-d text-sm font-semibold">
            <ExclamationTriangleIcon className="w-4 h-4" strokeWidth={2} />
            {pdfError}
          </div>
          <p className="mt-1 text-xs text-nc-text3">{t.verify.pdfErrorHint}</p>
        </div>
      )}
    </>
  );
}
