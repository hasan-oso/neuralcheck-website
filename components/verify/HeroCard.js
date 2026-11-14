'use client';

import { toLatinDigits, formatDateLatin } from '@/lib/format';
import { GRADE_BG, letterForScore } from '@/lib/grade';

const TIER_BASE_KEYS = {
  flagship: 'tierFlagship',
  mid_range: 'tierMidRange',
  midrange: 'tierMidRange',
  budget: 'tierBudget',
  entry_level: 'tierBudget',
};

function formatTier(tierKey, t) {
  if (!tierKey) return null;
  const raw = String(tierKey).trim();
  // "flagship_2019" → base="flagship", year="2019"
  const m = raw.toLowerCase().match(/^([a-z][a-z_]*?)(?:_(\d{4}))?$/);
  if (!m) return raw;
  const base = m[1];
  const year = m[2];
  const transKey = TIER_BASE_KEYS[base];
  const label = transKey ? t.verify[transKey] : null;
  if (!label) return raw;
  return year ? `${label} ${toLatinDigits(year)}` : label;
}

function HeroGradeCircle({ grade }) {
  // No grade renders '—', not '?' — see components/GradeBadge.js's matching
  // comment (same convention, same task: Honor sample, 2026-09-24). The
  // "why" (harnessErrorReason / zeroMeasuredMessage) is the caller's
  // gradeUnavailableNote below, read from real overall data — not invented
  // here.
  const full = (grade || '—').toString().toUpperCase();
  const letter = full.charAt(0);
  const colorMap = {
    A: 'bg-nc-grade-a',
    B: 'bg-nc-grade-b',
    C: 'bg-nc-grade-c',
    D: 'bg-nc-grade-d',
  };
  const colorClass = colorMap[letter] || 'bg-nc-text3';
  const sizeClass = full.length > 1 ? 'text-5xl' : 'text-6xl';
  return (
    <div
      className={`w-32 h-32 ${colorClass} nc-grade-glow-${letter} rounded-full flex items-center justify-center font-outfit font-black text-white shadow-lg ring-4 ring-white/10`}
    >
      <span className={sizeClass}>{full}</span>
    </div>
  );
}

// The bar carries a percentage but no letter of its own, so it derives one.
// Thresholds live in lib/grade.js so this and the category fallback cannot
// drift apart. The circle above it is coloured from the server's letter and
// is untouched by these numbers.
function scoreColorClass(score) {
  return GRADE_BG[letterForScore(score)] || 'bg-nc-text3';
}

export default function HeroCard({
  grade,
  score,
  deviceName,
  tierRaw,
  year,
  createdAt,
  t,
  lang,
  // V7 has no numeric quality score — only a coverage percentage, which is
  // not the same thing (see lib/reportReaders/v7.js). `coverageNote` is the
  // server's own ready-made sentence (overall.partialAssessmentTag.text)
  // shown in the score slot instead of a percentage. `gradeUnavailableNote`
  // is for the V6 branch: when the fallback chain in lib/reportReaders/v6.js
  // genuinely finds no grade, the caller passes this so the gap is stated
  // rather than left as a bare '?'. Both are optional and default to the
  // pre-existing behavior when omitted.
  //
  // There is no `scoreUnavailableNote` any more — item 4 of the fourth
  // addendum to decision 102 (2026-09-26) removed it. It used to announce
  // "الحقل غير متاح — تقرير V6" whenever pickScore found nothing, but the
  // score itself is never shown to any buyer now (decision 6) regardless of
  // whether the server sent one — so a report with a real, present-but-
  // hidden score and a report genuinely missing the field looked different
  // from each other for a field neither one displays. Both now render
  // nothing in the score slot, exactly alike.
  gradeUnavailableNote,
  coverageNote,
}) {
  const tierLabel = formatTier(tierRaw, t);
  const hasScore = score !== null && score !== undefined;

  return (
    <div className="p-6 sm:p-8 rounded-2xl bg-nc-card border border-nc-green/30 nc-glow print:break-inside-avoid">
      <div className="grid sm:grid-cols-[auto_1fr] gap-6 sm:gap-8 items-center">
        {/* Left: Grade + Score */}
        <div className="flex flex-col items-center gap-4 mx-auto sm:mx-0">
          <HeroGradeCircle grade={grade} />
          {!grade && gradeUnavailableNote && (
            <div className="text-center text-xs text-nc-text3">
              {gradeUnavailableNote}
            </div>
          )}
          {hasScore && (
            <div className="text-center">
              <div className="leading-none">
                <span
                  dir="ltr"
                  className="text-5xl font-outfit font-black nc-gradient-text tabular-nums"
                >
                  {toLatinDigits(score)}
                </span>
                <span className="text-2xl text-nc-text3 font-bold">%</span>
              </div>
              <div className="mt-2 text-xs text-nc-text3 uppercase tracking-wider">
                {t.verify.score}
              </div>
            </div>
          )}
          {!hasScore && coverageNote && (
            <div className="max-w-[10rem] text-center text-xs text-nc-text2 leading-relaxed">
              {coverageNote}
            </div>
          )}
        </div>

        {/* Right: Device info */}
        <div className="flex flex-col gap-4 min-w-0 text-center sm:text-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1 leading-tight break-words">
              <bdi>{deviceName}</bdi>
            </h2>
            {(tierLabel || year) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                {tierLabel && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-nc-cyan/10 border border-nc-cyan/30 text-nc-cyan font-medium">
                    {tierLabel}
                  </span>
                )}
                {year && !tierLabel && (
                  <span
                    dir="ltr"
                    className="text-xs px-2.5 py-1 rounded-full bg-nc-surface border border-nc-border text-nc-text2 font-mono tabular-nums"
                  >
                    {toLatinDigits(year)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Score progress bar */}
          {score !== null && score !== undefined && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-nc-text3">
                <span>{t.verify.score}</span>
                <span dir="ltr" className="tabular-nums">
                  {toLatinDigits(score)} / 100
                </span>
              </div>
              <div className="h-2 rounded-full bg-nc-surface overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${scoreColorClass(
                    score
                  )}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          )}

          {/* Date (shortId moved to top header / footer to avoid duplication) */}
          {createdAt && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-nc-text3 justify-center sm:justify-start">
              <span className="flex items-center gap-1.5">
                <span className="uppercase tracking-wider">
                  {t.verify.scanDate}:
                </span>
                <span dir="ltr">{formatDateLatin(createdAt, lang)}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
