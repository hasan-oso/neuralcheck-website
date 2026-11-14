'use client';

import { DocumentTextIcon } from '@heroicons/react/24/outline';

// The verify page is a certificate, not a report. It answers "is this scan
// real, and what did it conclude" in a glance — anything longer and the buyer
// standing in a shop stops reading, which costs more than the detail gains.
//
// So `verdict` is gone and `summary` is cut to its opening. The full prose
// lives in the PDF and in the app, both of which are documents someone sits
// down with.

const MAX_SENTENCES = 2;
const MAX_CHARS = 320;

// Latin and Arabic terminators. `؟` and `۔` are the ones a naive /[.!?]/
// would walk straight past, leaving an Arabic summary uncut.
const SENTENCE_SPLIT = /[^.!?؟۔…]+[.!?؟۔…]+|[^.!?؟۔…]+$/g;

/**
 * First couple of sentences, with a hard character ceiling behind them for
 * prose that runs on without punctuation.
 */
export function briefSummary(text, maxSentences = MAX_SENTENCES, maxChars = MAX_CHARS) {
  if (typeof text !== 'string') return '';
  const clean = text.trim();
  if (!clean) return '';

  const sentences = clean.match(SENTENCE_SPLIT);
  let out = (sentences ? sentences.slice(0, maxSentences).join('') : clean).trim();

  if (out.length > maxChars) {
    // Cut on a word boundary so the ellipsis does not land mid-word.
    const cut = out.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(' ');
    out = (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd();
  }

  // Only add the ellipsis when something was actually dropped.
  return out.length < clean.length ? `${out}…` : out;
}

export default function SummaryCard({ summary, t }) {
  const brief = briefSummary(summary);
  if (!brief) return null;

  return (
    <div className="p-6 sm:p-7 rounded-2xl bg-nc-card border border-nc-border print:break-inside-avoid">
      <div className="flex gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-nc-cyan/10 border border-nc-cyan/30 flex items-center justify-center">
          <DocumentTextIcon
            className="w-4.5 h-4.5 text-nc-cyan"
            strokeWidth={1.8}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-nc-text3 uppercase tracking-wider">
            {t.verify.summary}
          </div>
          <p className="report-prose mt-2 text-nc-text1 leading-relaxed">
            {brief}
          </p>
        </div>
      </div>
    </div>
  );
}
