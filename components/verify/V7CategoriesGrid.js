'use client';

import {
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { toLatinDigits } from '@/lib/format';
import { classifyCategoryReason } from '@/lib/reportReaders/v7';

// V7 category cards. Deliberately a separate component from CategoriesGrid
// rather than a shared one with branches: the two payload shapes have
// almost nothing in common past a "category name → object" map. V7 has no
// numeric per-category score (only `coverage`, a fraction of declared tests
// that ran — not a quality number; see lib/reportReaders/v7.js), so there is
// no score bar here, unlike CategoriesGrid's MeasuredCard. Forcing V7 data
// through that component was tried and rejected while building this: with
// score always null it produces "null%" text and an invalid bar width.
//
// `cat.letterSource` (from lib/reportReaders/v7.js's readCategories, via
// classifyLetterSource) IS read and shown here, per decision 42 — see
// scripts/check-render-surface.mjs's comment on why the category-level
// field of this name is no longer forbidden. This is distinct from
// `overall.letterSource` ("GATE:<name>"), which stays unread — see
// lib/reportReaders/v7.js's readOverall doc comment; V7Notices.js renders
// governingGateReason instead for that one.
//
// Only the 'llmAdjusted' case gets a visible marker: 'deterministic' is the
// ordinary, expected path (every category in
// contract/v7-client-payload-sample.json is DETERMINISTIC) and needs no
// callout. adjustmentReason/adjustmentEvidence render alongside it when
// present; neither has ever been observed non-null in this repo's one
// sample, so this path is verified structurally (live, with a fabricated
// payload — see this task's report) but not against a real LLM_ADJUSTED
// report.
//
// `cat.letterCeilingReason` (from readCategories's readLetterCeilingReason,
// lib/reportReaders/v7.js) renders right under the header, beside the
// letter badge — per this field's task: "سبب البوّابة يصل العرض بنصّه"
// (the gate reason reaches the display verbatim). `text` is shown exactly
// as the server built it; this component builds no text and derives
// nothing from `name`. Seven categories in the current sample carry a
// non-null value (all `LOW_CATEGORY_COVERAGE`); the rest are legitimately
// `null` (no gate capped their letter). `letterCeilingReasonStatus` of
// 'missing' or 'invalid' — an absent key or an unrecognized shape on a
// document that should always carry this key per the contract — gets its
// own debug marker below, same convention as `state`/`letterSource`'s
// 'unknown' markers further down this file: visible, not folded into the
// "no ceiling" case.

const GRADE_BADGE = {
  A: 'bg-nc-grade-a/15 text-nc-grade-a border-nc-grade-a/40',
  B: 'bg-nc-grade-b/15 text-nc-grade-b border-nc-grade-b/40',
  C: 'bg-nc-grade-c/15 text-nc-grade-c border-nc-grade-c/40',
  D: 'bg-nc-grade-d/15 text-nc-grade-d border-nc-grade-d/40',
};

const STATE_BADGE = {
  measured: 'bg-nc-green/10 text-nc-green border-nc-green/30',
  partial: 'bg-nc-grade-c/15 text-nc-grade-c border-nc-grade-c/30',
  attestedOnly: 'bg-nc-cyan/10 text-nc-cyan border-nc-cyan/30',
  unmeasured: 'bg-nc-surface text-nc-text3 border-nc-text3/40',
  // Same neutral treatment as 'unmeasured', deliberately not an alarm color:
  // the approved text itself says "ليس حكماً على الجهاز" (decision 82 §1) —
  // a harness failure is not evidence the device is bad.
  harnessError: 'bg-nc-surface text-nc-text3 border-nc-text3/40',
  unknown: 'bg-nc-glow/15 text-nc-glow border-nc-glow/40',
};

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

function stateLabel(state, t) {
  if (state === 'measured') return t.verify.v7StateMeasured;
  if (state === 'partial') return t.verify.v7StatePartial;
  if (state === 'unmeasured') return t.verify.v7StateUnmeasured;
  if (state === 'unknown') return t.verify.v7StateUnknown;
  // attestedOnly / harnessError: no short badge word was given (decision 82
  // §1 approved one full sentence per state, not a label+hint pair like
  // unmeasured/unmeasuredHint). Rather than inventing a short label this
  // repo was never given, the badge goes icon-only for these two (see
  // V7CategoryCard below) and the approved sentence renders in full as body
  // text via stateDetail() — this function intentionally returns null here.
  return null;
}

/**
 * The full decision-82-§1 sentence for a state that has one — currently
 * attestedOnly and harnessError only. Rendered as body prose (see
 * V7CategoryCard), not squeezed into the small header badge.
 */
function stateDetail(state, t) {
  if (state === 'attestedOnly') return t.verify.v7StateAttestedOnly;
  if (state === 'harnessError') return t.verify.v7StateHarnessError;
  return null;
}

function V7CategoryCard({ cat, counts, t }) {
  const label = categoryLabel(cat.name, t);
  const letterKey = cat.letter && GRADE_BADGE[cat.letter] ? cat.letter : null;
  const coveragePct =
    typeof cat.coverage === 'number' ? Math.round(cat.coverage * 100) : null;
  // harnessError joins unmeasured/unknown here: no real measurement exists
  // for this category. attestedOnly does NOT — a technician did provide a
  // real (non-automated) answer, so it keeps a solid border like measured/
  // partial.
  const isDashed = cat.state === 'unmeasured' || cat.state === 'unknown' || cat.state === 'harnessError';
  const detail = stateDetail(cat.state, t);
  const reasonInfo = classifyCategoryReason(cat.state, cat.reason);
  // 'text': curated sentence, but only if THIS language actually has the
  // key (decision 86 §3 withheld tr/en pending translation — see this
  // repo's report). 'unknown': the pair is not in decision 84 §1's table —
  // show the same "unknown state" text the site already has, never the raw
  // code (classifyCategoryReason already logged it). 'hidden'/'none': show
  // nothing for the reason at all.
  const reasonText =
    reasonInfo.kind === 'text'
      ? t.verify[reasonInfo.i18nKey] || null
      : reasonInfo.kind === 'unknown'
        ? t.verify.v7StateUnknown
        : null;
  // decision 87 §4: the (partial, NO_CALIBRATED_THRESHOLD) pair replaces
  // the "تغطية جزئية" badge word with the reason sentence above — showing
  // both would repeat the same fact once truthfully (the reason) and once
  // misleadingly (a coverage-gap word next to a 100% coverage bar). Only
  // fires when the reason text actually resolved to something real (see
  // reasonText above) — never suppress the ordinary label over a language
  // that doesn't have the replacement text yet.
  const badgeLabel = reasonInfo.replacesStateLabel && reasonText ? null : stateLabel(cat.state, t);
  const hasStateIcon =
    cat.state === 'unmeasured' || cat.state === 'unknown' || cat.state === 'attestedOnly' || cat.state === 'harnessError';
  const showStateBadge = hasStateIcon || badgeLabel;

  const c = counts || { danger: 0, warning: 0, positive: 0, unknown: 0 };

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-nc-card border print:break-inside-avoid ${
        isDashed ? 'border-dashed border-nc-text3/30' : 'border-nc-border'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm sm:text-base font-semibold text-nc-text1 truncate">
          {label}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {letterKey && (
            <span
              className={`inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-md border text-xs font-bold ${GRADE_BADGE[letterKey]}`}
            >
              {cat.letter}
            </span>
          )}
          {showStateBadge && (
            <span
              className={`inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${STATE_BADGE[cat.state]}`}
              {...(detail ? { title: detail, 'aria-label': detail } : {})}
            >
              {cat.state === 'unmeasured' && (
                <MinusCircleIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
              )}
              {cat.state === 'unknown' && (
                <QuestionMarkCircleIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
              )}
              {cat.state === 'attestedOnly' && (
                <UserIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
              )}
              {cat.state === 'harnessError' && (
                <ExclamationTriangleIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
              )}
              {badgeLabel}
            </span>
          )}
        </div>
      </div>

      {/* attestedOnly / harnessError — the full decision-82-§1 sentence,
          verbatim (no short badge word exists for either; see stateLabel's
          comment above). Rendered here, right under the header, same
          treatment as letterCeilingReason.text below it. */}
      {detail && (
        <div className="flex items-start gap-1.5 mb-3 text-xs text-nc-text2">
          {cat.state === 'attestedOnly' && (
            <UserIcon className="w-3.5 h-3.5 text-nc-cyan shrink-0 mt-0.5" strokeWidth={1.8} />
          )}
          {cat.state === 'harnessError' && (
            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-nc-text3 shrink-0 mt-0.5" strokeWidth={1.8} />
          )}
          <span className="report-prose leading-relaxed">{detail}</span>
        </div>
      )}

      {/* letterCeilingReason.text — verbatim, beside the letter badge above.
          Only rendered when the key is present AND carries a real object
          AND that object's text is non-null; a present object with a null
          text gets no substitute text (see this file's top comment). */}
      {cat.letterCeilingReasonStatus === 'ok' &&
        cat.letterCeilingReason &&
        cat.letterCeilingReason.text && (
          <div className="flex items-start gap-1.5 mb-3 text-xs text-nc-text2">
            <ArrowTrendingDownIcon
              className="w-3.5 h-3.5 text-nc-grade-c shrink-0 mt-0.5"
              strokeWidth={1.8}
            />
            <span className="report-prose leading-relaxed">{cat.letterCeilingReason.text}</span>
          </div>
        )}

      {coveragePct !== null && (
        <div className="flex items-center justify-between text-xs text-nc-text3 mb-1.5">
          <span>{t.verify.coverageLabel}</span>
          <span dir="ltr" className="tabular-nums">
            {toLatinDigits(coveragePct)}%
          </span>
        </div>
      )}
      {coveragePct !== null && (
        <div className="h-1.5 rounded-full bg-nc-surface overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-nc-cyan/70"
            style={{ width: `${coveragePct}%` }}
          />
        </div>
      )}

      {/* Issue-derived breakdown — counted from issues[] filtered to this
          category, not a field the server sent directly. See
          countIssuesByCategory in lib/reportReaders/v7.js. */}
      {(c.danger > 0 || c.warning > 0 || c.positive > 0 || c.unknown > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px]">
          {c.danger > 0 && (
            <span className="text-nc-grade-d">
              <span dir="ltr" className="tabular-nums font-semibold">
                {toLatinDigits(c.danger)}
              </span>{' '}
              {t.verify.testsFailed}
            </span>
          )}
          {c.warning > 0 && (
            <span className="text-nc-grade-c">
              <span dir="ltr" className="tabular-nums font-semibold">
                {toLatinDigits(c.warning)}
              </span>{' '}
              {t.verify.testsWarning}
            </span>
          )}
          {c.unknown > 0 && (
            <span className="text-nc-glow">
              <span dir="ltr" className="tabular-nums font-semibold">
                {toLatinDigits(c.unknown)}
              </span>{' '}
              {t.verify.severityUnknown}
            </span>
          )}
        </div>
      )}

      {/* decision 84 §1 / 86 §3 — the raw reason code is NEVER rendered on
          screen anymore (it used to be, verbatim, dir="ltr" font-mono,
          right here). classifyCategoryReason looks up the (state, reason)
          pair: a curated sentence, nothing (hidden — the state's own text
          already said it), or the existing "unknown state" text for a pair
          outside the table (the raw pair is logged, never shown). */}
      {reasonText && (
        <p className="report-prose mt-3 pt-3 border-t border-nc-border/60 text-xs text-nc-text2 leading-relaxed">
          {reasonText}
        </p>
      )}

      {/* letterSource: only the model-adjusted case gets a visible marker —
          'deterministic' is the ordinary path and would just be noise on
          every other card. See this file's top comment and decision 42.
          decision 87 §4: also requires cat.letter — "model-adjusted"
          describes how a LETTER was reached, so it must never render for a
          category with no letter at all (e.g. battery's (partial,
          NO_CALIBRATED_THRESHOLD) case above, letter=null). Not observed
          combined with letter=null in any real fixture today (both S10 and
          Honor's battery carry letterSource=DETERMINISTIC), but nothing in
          readCategories ties the two fields together, so this guards the
          combination defensively rather than trusting it never occurs. */}
      {cat.letter && cat.letterSource === 'llmAdjusted' && (
        <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-md border border-nc-cyan/30 bg-nc-cyan/10 text-nc-cyan text-[11px] font-semibold">
          <SparklesIcon className="w-3 h-3" strokeWidth={2} />
          {t.verify.letterSourceAdjustedLabel}
        </span>
      )}

      {cat.adjustmentReason && (
        <p className="report-prose mt-2 text-xs text-nc-text2 leading-relaxed">
          {cat.adjustmentReason}
        </p>
      )}

      {/* DEAD CODE, left in place per explicit instruction (decision 101
          §2, 2026-09-25) rather than deleted: lib/reportReaders/v7.js's
          readCategories now returns `adjustmentEvidence: null`
          unconditionally (decision 99 §4 — this raw internal path is never
          shown, in any shape), so `cat.adjustmentEvidence` can never be
          truthy here and this block cannot render. Kept because removing
          it isn't necessary for correctness and the task order asked not
          to delete it without need; `t.verify.adjustmentEvidenceLabel`
          (lib/i18n.js) is equally unreachable now, for the same reason. */}
      {cat.adjustmentEvidence && (
        <p className="mt-1 text-[11px] text-nc-text3 leading-relaxed">
          <span className="font-semibold">{t.verify.adjustmentEvidenceLabel}:</span>{' '}
          {cat.adjustmentEvidence}
        </p>
      )}

      {cat.state === 'unknown' && (
        <p dir="ltr" className="mt-2 text-[10px] text-nc-glow font-mono">
          state: {cat.stateRaw ?? 'null'}
        </p>
      )}

      {cat.letterSource === 'unknown' && (
        <p dir="ltr" className="mt-2 text-[10px] text-nc-glow font-mono">
          letterSource: {cat.letterSourceRaw ?? 'null'}
        </p>
      )}

      {(cat.letterCeilingReasonStatus === 'missing' ||
        cat.letterCeilingReasonStatus === 'invalid') && (
        <p dir="ltr" className="mt-2 text-[10px] text-nc-glow font-mono">
          letterCeilingReason: {cat.letterCeilingReasonStatus}
        </p>
      )}
    </div>
  );
}

/**
 * @param {Array} categories - from lib/reportReaders/v7.js readCategories()
 * @param {Map} issueCounts - from countIssuesByCategory()
 */
export default function V7CategoriesGrid({ categories, issueCounts, t }) {
  if (!Array.isArray(categories) || categories.length === 0) return null;

  const rank = {
    measured: 0,
    partial: 1,
    attestedOnly: 2,
    unmeasured: 3,
    harnessError: 4,
    unknown: 5,
  };
  const sorted = [...categories].sort((a, b) => rank[a.state] - rank[b.state]);

  return (
    <section className="print:break-inside-avoid">
      <div className="flex items-center gap-2 mb-4">
        <ChartBarIcon className="w-5 h-5 text-nc-green" strokeWidth={1.8} />
        <h2 className="text-lg sm:text-xl font-outfit font-bold text-nc-text1">
          {t.verify.categoriesDetails}
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {sorted.map((cat) => (
          <V7CategoryCard
            key={cat.name}
            cat={cat}
            counts={issueCounts?.get(cat.name)}
            t={t}
          />
        ))}
      </div>
    </section>
  );
}
