'use client';

import {
  ChartBarIcon,
  BeakerIcon,
  MinusCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toLatinDigits } from '@/lib/format';

// ---------------------------------------------------------------------------
// A category can arrive in three shapes on the server — a plain number
// (legacy), an object with score/grade/counts (current), or an object
// marked unmeasured (every test was not_tested/unavailable, so grade is "?").
// Shape 3 is the one that needs care: a category nobody could test is not a
// category that failed. That normalization — and the score itself — no
// longer happens here: item 3 of the fourth addendum to decision 102
// (2026-09-26) moved readCategory/the filter/the sort/the legacy-shape
// letter fallback into lib/reportReaders/v6.js's readCategoriesForGrid,
// unchanged in logic ("لا نموذج عرض يحمل الدرجة" — no display model carries
// the score, same rule already applied on the app side). This component now
// receives an already-filtered, already-sorted `categories` array, by
// letter, with no score field ever populated.
// ---------------------------------------------------------------------------

/** Fill `{n}` / `{total}` in a localized template. */
function fill(template, vars) {
  if (typeof template !== 'string') return '';
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, toLatinDigits(v)),
    template
  );
}

const GRADE_BADGE = {
  A: 'bg-nc-grade-a/15 text-nc-grade-a border-nc-grade-a/40',
  B: 'bg-nc-grade-b/15 text-nc-grade-b border-nc-grade-b/40',
  C: 'bg-nc-grade-c/15 text-nc-grade-c border-nc-grade-c/40',
  D: 'bg-nc-grade-d/15 text-nc-grade-d border-nc-grade-d/40',
};

function categoryLabel(name, t) {
  if (!name) return '—';
  const norm = String(name).trim();
  // Build i18n key: "battery" → "catBattery"
  const key = `cat${norm.charAt(0).toUpperCase()}${norm.slice(1).toLowerCase()}`;
  if (t.verify[key]) return t.verify[key];
  // Fallback: prettify (e.g. battery_health → "Battery Health")
  return norm
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Cards
//
// Each `v` below arrives already normalized from lib/reportReaders/v6.js's
// readCategoriesForGrid (see this file's top comment) — no raw score/grade
// object reaches this component.
// ---------------------------------------------------------------------------

/**
 * A category nothing was measured on.
 *
 * No percentage, no bar, no grade letter, and above all no colour that carries
 * a verdict — grey only. The previous card printed "0%" beside a green tick
 * reading "0/0 tests passed", which managed to look like both a total failure
 * and a success at once.
 */
function UnmeasuredCard({ label, v, t }) {
  const note = v.note || t.verify.unmeasuredHint;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-nc-card border border-dashed border-nc-text3/30 print:break-inside-avoid">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm sm:text-base font-semibold text-nc-text2 truncate">
          {label}
        </h3>
        <span className="inline-flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-md border border-nc-text3/40 bg-nc-surface text-nc-text3 text-xs font-semibold">
          <MinusCircleIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
          {t.verify.unmeasured}
        </span>
      </div>

      {/* An empty track where the score bar would be — holds the card's shape
          in the grid without implying a value of zero. */}
      <div
        aria-hidden="true"
        className="h-2 rounded-full bg-nc-surface/60 border border-dashed border-nc-text3/20 mb-3"
      />

      {v.declared !== null && v.declared > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-nc-text3">
          <MinusCircleIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
          <span>{fill(t.verify.testsNotRunAll, { total: v.declared })}</span>
        </div>
      )}

      {note && (
        <p className="report-prose mt-3 pt-3 border-t border-nc-border/60 text-xs text-nc-text3 leading-relaxed">
          {note}
        </p>
      )}
    </div>
  );
}

function MeasuredCard({ label, v, t }) {
  // `v.letter` is already the final, resolved letter — the server's own
  // grade when it sent a recognized one, else the lib/grade.js threshold
  // fallback — computed once in lib/reportReaders/v6.js's
  // normalizeGridCategory (item 3, ملحق رابع بالقرار ١٠٢، 2026-09-26) rather
  // than here. `v.score` no longer exists on this object at all (always
  // null, see this file's top comment) — nothing here reads it.
  const badgeCls =
    GRADE_BADGE[v.letter] || 'bg-nc-surface text-nc-text2 border-nc-border';

  const hasCoverageGap = v.notRun !== null && v.notRun > 0;
  const showBreakdown =
    (v.failCount !== null && v.failCount > 0) ||
    (v.warningCount !== null && v.warningCount > 0);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-nc-card border border-nc-border print:break-inside-avoid">
      {/* Header: name + grade badge */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm sm:text-base font-semibold text-nc-text1 truncate">
          {label}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {v.grade && (
            <span
              className={`inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-md border text-xs font-bold ${badgeCls}`}
            >
              {v.grade}
            </span>
          )}
        </div>
      </div>

      {/* Expected range */}
      {v.expectedRange && (
        <div className="flex items-start gap-2 mt-2">
          <BeakerIcon
            className="w-3.5 h-3.5 text-nc-text3 shrink-0 mt-0.5"
            strokeWidth={1.8}
          />
          <div className="text-xs text-nc-text2">
            <span className="text-nc-text3 me-1">{t.verify.expected}:</span>
            <span dir="auto">{v.expectedRange}</span>
          </div>
        </div>
      )}

      {/* Pass count ("N/M اختبار ناجح") deliberately not shown — this task's
          order (ملحق رابع بالقرار ١٠٢ البند ١، 2026-09-26): decision 6 lists
          what /verify shows as "الحرف · التغطية · سبب البوّابة إن أطلقت", and
          a pass ratio is none of those. `v.passCount`/`v.totalCount` are
          still computed above (readCategory) — nothing reads them now, but
          removing the fields themselves is item 3's concern (moving
          readCategory/filter/sort into the reader), not this one. The
          coverage-gap block right below (a DIFFERENT fact — tests never run
          at all, not a pass/fail ratio of tests that did) is unaffected. */}

      {/* Coverage gap — the score above is out of the tests that RAN, not out
          of the tests this category has. "2/2 passed" on a category with five
          declared tests is true and misleading at the same time, so the gap is
          stated in amber rather than left for the reader to infer. */}
      {hasCoverageGap && (
        <div className="flex items-start gap-1.5 mt-2 text-xs text-nc-grade-c">
          <ExclamationTriangleIcon
            className="w-3.5 h-3.5 shrink-0 mt-0.5"
            strokeWidth={1.8}
          />
          <span>
            {v.declared !== null
              ? fill(t.verify.testsNotRun, {
                  n: v.notRun,
                  total: v.declared,
                })
              : fill(t.verify.testsNotRun, {
                  n: v.notRun,
                  total: (v.totalCount ?? 0) + v.notRun,
                })}
          </span>
        </div>
      )}

      {/* Fail / warning breakdown — same pass count can hide very different
          outcomes (3 failures vs 1 failure and 2 warnings). */}
      {showBreakdown && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]">
          {v.failCount > 0 && (
            <span className="text-nc-grade-d">
              <span dir="ltr" className="tabular-nums font-semibold">
                {toLatinDigits(v.failCount)}
              </span>{' '}
              {t.verify.testsFailed}
            </span>
          )}
          {v.warningCount > 0 && (
            <span className="text-nc-grade-c">
              <span dir="ltr" className="tabular-nums font-semibold">
                {toLatinDigits(v.warningCount)}
              </span>{' '}
              {t.verify.testsWarning}
            </span>
          )}
        </div>
      )}

      {/* Note */}
      {v.note && (
        <p className="report-prose mt-3 pt-3 border-t border-nc-border/60 text-xs text-nc-text2 leading-relaxed">
          {v.note}
        </p>
      )}
    </div>
  );
}

function CategoryCard({ name, v, t }) {
  const label = categoryLabel(name, t);
  if (v.unmeasured) return <UnmeasuredCard label={label} v={v} t={t} />;
  return <MeasuredCard label={label} v={v} t={t} />;
}

function CategoryNotesSection({ notes, t }) {
  if (!notes || typeof notes !== 'object') return null;
  const entries = Object.entries(notes).filter(
    ([, v]) => typeof v === 'string' && v.trim()
  );
  if (entries.length === 0) return null;

  return (
    <div className="mt-6 p-5 rounded-2xl bg-nc-surface border border-nc-border print:break-inside-avoid">
      <div className="text-xs text-nc-text3 uppercase tracking-wider mb-3">
        {t.verify.technicalNotes}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {entries.map(([cat, text]) => (
          <div
            key={cat}
            className="p-3 rounded-lg bg-nc-card border border-nc-border"
          >
            <div className="text-xs font-bold text-nc-text2 uppercase tracking-wider mb-1">
              {categoryLabel(cat, t)}
            </div>
            <p className="report-prose text-xs text-nc-text2 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// `categories`: the array lib/reportReaders/v6.js's readCategoriesForGrid
// returns (already filtered, sorted, letters resolved, score always null —
// see this file's top comment) — item 3, ملحق رابع بالقرار ١٠٢ (2026-09-26).
// This component no longer normalizes, filters, or sorts anything itself.
export default function CategoriesGrid({ categories, categoryNotes, t }) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="print:break-inside-avoid">
      <div className="flex items-center gap-2 mb-4">
        <ChartBarIcon
          className="w-5 h-5 text-nc-green"
          strokeWidth={1.8}
        />
        <h2 className="text-lg sm:text-xl font-outfit font-bold text-nc-text1">
          {t.verify.categoriesDetails}
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {categories.map(({ name, v }) => (
          <CategoryCard key={name} name={name} v={v} t={t} />
        ))}
      </div>

      <CategoryNotesSection notes={categoryNotes} t={t} />
    </section>
  );
}
