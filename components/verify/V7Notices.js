'use client';

import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { classifyAbstentionReason } from '@/lib/reportReaders/v7';

// Same cat* lookup formula as components/verify/{CategoriesGrid,
// V7CategoriesGrid}.js and IssuesList.js's own local categoryLabel — none of
// those four are exported/shared (rule-24 duplication this task did not
// introduce and was not asked to consolidate; flagged in this task's report
// for the user, not fixed unilaterally here).
function categoryLabel(name, t) {
  if (!name) return '—';
  const norm = String(name).trim();
  const key = `cat${norm.charAt(0).toUpperCase()}${norm.slice(1).toLowerCase()}`;
  if (t.verify[key]) return t.verify[key];
  return norm
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Report-level V7 notices: why the grade was capped (governingGateReason),
// and the three top-level failure/abstention explanations
// (zeroMeasuredMessage, harnessErrorMessage, abstentionReasons). All are
// read from `overall` by lib/reportReaders/v7.js's readOverall, which
// already type-checks every field, so this component only decides how to
// show them.
//
// W6 (task order, 2026-10-01, S-13): `harnessErrorReason` used to be shown
// here directly — it is a raw backend code ("FUNCTIONAL_RESULTS_UNAVAILABLE"
// on the one real sample this repo has, not prose), despite this file's own
// former comment grouping it with zeroMeasuredMessage as if it were already
// buyer-facing text. It is never rendered to the buyer now.
// `harnessErrorMessage` (the human-readable replacement) is shown when
// present; when harnessError is true but the message hasn't arrived yet
// (true of every real fixture today — the backend has not shipped this
// field, see readOverall's own comment), a fallback notice renders instead
// — still never the raw code, and never silence either, since harnessError
// true does mean something needs saying.
//
// `overall.letterSource` (e.g. "GATE:ROOT_DETECTED") is not read or shown
// here — see readOverall's doc comment. `governingGateReason` is the
// buyer-facing structured explanation of the same gate and is what this
// component renders instead.

export default function V7Notices({ overall, t }) {
  if (!overall) return null;

  const {
    zeroMeasuredMessage,
    harnessError,
    harnessErrorMessage,
    governingGateReason,
    abstentionReasons,
  } = overall;

  // The gate card's ONLY content is the server's sentence (W1). A gate with
  // no usable sentence — absent, null, empty/whitespace, or not a string
  // (an older report from before the server change, or an unmatched gate) —
  // renders NO card at all: neither its title alone nor any marker attribute
  // that would leave an empty container (the user's decision, 2026-10-07,
  // البند ٤). The state stays explicit in the data and the console
  // (readOverall returns text: null and warns — rule 22), not on screen.
  const gateText =
    governingGateReason && typeof governingGateReason.text === 'string' && governingGateReason.text.trim()
      ? governingGateReason.text
      : null;

  // harnessError alone is enough now (not `harnessError && harnessErrorReason`
  // as before) — W6: a buyer-safe fallback notice renders even when the
  // human-readable message hasn't arrived yet, so this box must appear
  // whenever harnessError is true, not only when a specific field is also
  // present. A text-less gate does NOT count (gateText, above), so a report
  // whose only notice would have been that card gets no empty wrapper.
  const hasAny = zeroMeasuredMessage || harnessError || gateText || abstentionReasons;
  if (!hasAny) return null;

  return (
    <div className="flex flex-col gap-3 print:break-inside-avoid">
      {zeroMeasuredMessage && (
        <div className="p-4 rounded-2xl bg-nc-grade-d/5 border border-nc-grade-d/30 flex items-start gap-3">
          <ExclamationTriangleIcon
            className="w-5 h-5 text-nc-grade-d shrink-0 mt-0.5"
            strokeWidth={1.8}
          />
          <p className="report-prose text-sm text-nc-text1 leading-relaxed">
            {zeroMeasuredMessage}
          </p>
        </div>
      )}

      {harnessError && (
        <div className="p-4 rounded-2xl bg-nc-grade-c/5 border border-nc-grade-c/30 flex items-start gap-3">
          <WrenchScrewdriverIcon
            className="w-5 h-5 text-nc-grade-c shrink-0 mt-0.5"
            strokeWidth={1.8}
          />
          <p className="report-prose text-sm text-nc-text1 leading-relaxed">
            {harnessErrorMessage || t.verify.v7HarnessErrorMessageUnavailable}
          </p>
        </div>
      )}

      {/* W1 / A1 (the user's order, 2026-09-30/10-01; decision S1): the card
          shows the SERVER'S display sentence (governingGateReason.text) under
          its title, and no longer shows the gate's `name` ("ROOT_DETECTED")
          or `source` ("SEC-04=fail") at all — raw server codes, formerly
          rendered here in monospace. Both stay in the data for the admin
          panel (readOverall still reads them); only this card stopped
          showing them, on every route that mounts V7Notices (/verify,
          /print, /shop/[slug], /tech, /dashboard).
          The "السقف: C" badge is GONE (the user's decision, 2026-10-07,
          البند ١): the server's sentence already says "أعلى حرف C" itself.
          Its i18n label key was deleted with it (all three languages) — the
          grep audit found no other reader, static or dynamic.
          The card's title is governingGateLabel, now "سبب الحرف العامّ"
          (tr/en in lib/i18n.js).
          When `text` is absent (an older V7 document from before the server
          change, or an unmatched gate) the WHOLE card is hidden — not its
          title alone (the user's decision, 2026-10-07, البند ٤): no name /
          source substitute, no client-invented wording, no marker attribute
          and no empty container. The overall letter and the partial-
          assessment tag are NOT rendered here at all (HeroCard, from
          readOverall's letter / partialAssessmentTag), so hiding this card
          cannot touch them. */}
      {gateText && (
        <div className="p-4 rounded-2xl bg-nc-card border border-nc-border">
          <div className="flex items-start gap-3">
            <ShieldExclamationIcon
              className="w-5 h-5 text-nc-cyan shrink-0 mt-0.5"
              strokeWidth={1.8}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-nc-text3 uppercase tracking-wider mb-1.5">
                {t.verify.governingGateLabel}
              </div>
              <p className="report-prose text-sm text-nc-text1 leading-relaxed">
                {gateText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* abstentionReasons (task order, 2026-10-01): each entry is a real
          {category, reason} object now (readOverall used to filter these
          down to an empty array and silently drop the whole list — see that
          function's comment). Format per the user: category name as a bold
          heading, the approved sentence beneath it — the same two-line
          shape components/verify/V7CategoriesGrid.js's own category cards
          use (name heading, then the reason/state sentence below), not the
          flat bulleted list this used to render. */}
      {abstentionReasons && abstentionReasons.length > 0 && (
        <div className="p-4 rounded-2xl bg-nc-card border border-nc-border flex flex-col gap-3">
          {abstentionReasons.map((item, i) => (
            <div key={i}>
              <h4 className="text-sm sm:text-base font-semibold text-nc-text1">
                {categoryLabel(item.category, t)}
              </h4>
              <p className="report-prose text-sm text-nc-text2 leading-relaxed mt-1">
                {t.verify[classifyAbstentionReason(item.reason)]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
