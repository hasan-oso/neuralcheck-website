'use client';

// Report-level `narrativeIncomplete` notice — coordinator decision 72
// (2026-09-23). Deliberately wired into app/verify/page.js ONLY, not
// app/print/[shortId]/PrintClient.js: PDF and /print are postponed per
// that same decision ("PDF و/print مؤجّلان، فلا تعمل على /print"). Unlike
// letterCeilingReason/V7CategoriesGrid (a category-level component both
// pages already shared before this task), this is a NEW report-level
// component — kept out of components/verify/V7Notices.js on purpose so it
// does not reach /print as a side effect of shared wiring. It can be added
// to PrintClient.js later, when print/PDF work resumes, without touching
// this file.
//
// Renders lib/reportReaders/v7.js's readNarrativeIncomplete() output:
//   status 'ok', value true   → the notice text, verbatim, from
//                                t.verify.v7NarrativeIncomplete (decision 91
//                                §3, 2026-09-25 — a real per-language key
//                                now, not a fixed Arabic-only constant; see
//                                that key's comment in lib/i18n.js for the
//                                rule-29 source citation).
//   status 'ok', value false  → nothing.
//   status 'missing'/'invalid' → the same debug-marker convention already
//                                used for state/letterSource/
//                                letterCeilingReason's off-contract cases
//                                (components/verify/V7CategoriesGrid.js) —
//                                visible, never folded into the "complete"
//                                (false) case.

import { InformationCircleIcon } from '@heroicons/react/24/outline';

export default function NarrativeIncompleteNotice({ status, value, t }) {
  if (status === 'ok' && value === true) {
    return (
      <div className="p-4 rounded-2xl bg-nc-card border border-nc-border flex items-start gap-3 print:break-inside-avoid">
        <InformationCircleIcon
          className="w-5 h-5 text-nc-cyan shrink-0 mt-0.5"
          strokeWidth={1.8}
        />
        <p className="report-prose text-sm text-nc-text1 leading-relaxed">
          {t.verify.v7NarrativeIncomplete}
        </p>
      </div>
    );
  }

  if (status === 'ok' && value === false) {
    return null;
  }

  if (status === 'missing' || status === 'invalid') {
    return (
      <p dir="ltr" className="text-[10px] text-nc-glow font-mono">
        narrativeIncomplete: {status}
      </p>
    );
  }

  return null;
}
