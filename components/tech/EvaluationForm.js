'use client';

// The evaluation screen. Two mandatory taps, one save, under 15 seconds.
//
// ORDER IS THE WHOLE POINT. The technician commits his own grade before he is
// allowed to see ours. If we showed our grade first, most of what we'd collect
// back is our own grade reflected at us — the measurement would be worthless
// precisely when it matters most (when we're wrong).
//
// Consequences of that rule, implemented below:
//   - our grade is not in the DOM at all until `technicianGrade` is set;
//   - the three agreement buttons are pixel-identical until one is chosen,
//     so "أتفق" is never the path of least resistance;
//   - everything optional sits below the save button's reach and never blocks
//     completion.

import { useEffect, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

import { functions } from '@/firebase';
import Spinner from '@/components/admin/Spinner';
import { useToast } from '@/components/admin/Toast';
import V7Notices from '@/components/verify/V7Notices';
import { formatDateLatin, toLatinDigits } from '@/lib/format';
import { translations } from '@/lib/i18n';
import {
  AGREEMENT_OPTIONS,
  DISPUTED_CATEGORIES,
  ERROR_MAGNITUDES,
  GRADES,
  SUBMIT_EVALUATION_FN,
  buildEvaluationPayload,
  describeSubmitError,
  resolveAppGrade,
  resolveDeviceName,
  resolveScanDate,
  resolveScanId,
  resolveShortId,
  resolveV7Overall,
} from '@/lib/techEval';

// /tech is Arabic-only by design (every other string in this file is
// hardcoded Arabic, not routed through lib/i18n.js's `t` — see
// components/tech/TechnicianName.js and app/tech/layout.js for the same).
// V7Notices needs a `t` for its governingGateReason labels; passed literally
// as translations.ar here rather than threading a real `lang` prop through
// a page that has never had one.
const TECH_T = translations.ar;

// Static class maps — Tailwind only sees class names it can read literally,
// so these cannot be built from template strings.
const GRADE_TEXT_CLS = {
  A: 'text-nc-grade-a',
  B: 'text-nc-grade-b',
  C: 'text-nc-grade-c',
  D: 'text-nc-grade-d',
};
const GRADE_FILL_CLS = {
  A: 'bg-nc-grade-a border-nc-grade-a',
  B: 'bg-nc-grade-b border-nc-grade-b',
  C: 'bg-nc-grade-c border-nc-grade-c',
  D: 'bg-nc-grade-d border-nc-grade-d',
};
const AGREEMENT_SELECTED_CLS = {
  agree: 'bg-nc-green/15 border-nc-green text-nc-green',
  app_lenient: 'bg-nc-grade-c/15 border-nc-grade-c text-nc-grade-c',
  app_harsh: 'bg-nc-cyan/15 border-nc-cyan text-nc-cyan',
};

export default function EvaluationForm({
  report,
  evaluation,
  technicianName,
  onSaved,
  onBack,
  lang,
}) {
  const toast = useToast();

  const scanId = resolveScanId(report);
  const deviceName = resolveDeviceName(report);
  const appGrade = resolveAppGrade(report);
  const v7Overall = resolveV7Overall(report);
  const shortId = resolveShortId(report);
  const scanDate = formatDateLatin(resolveScanDate(report), lang);

  const isEdit = !!evaluation;

  // Prior values pre-loaded on re-evaluation.
  const [technicianGrade, setTechnicianGrade] = useState(
    evaluation?.technicianGrade || null
  );
  const [agreement, setAgreement] = useState(evaluation?.agreement || null);
  const [errorMagnitude, setErrorMagnitude] = useState(
    evaluation?.errorMagnitude || null
  );
  const [disputedCategories, setDisputedCategories] = useState(
    Array.isArray(evaluation?.disputedCategories)
      ? evaluation.disputedCategories
      : []
  );

  const hadPriorDetail =
    !!evaluation?.errorMagnitude ||
    (Array.isArray(evaluation?.disputedCategories) &&
      evaluation.disputedCategories.length > 0);
  const [detailOpen, setDetailOpen] = useState(hadPriorDetail);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Friction clock: opening this screen → pressing save.
  const openedAtRef = useRef(Date.now());

  // Our grade is revealed only once the technician has committed his own.
  // On a re-evaluation the prior grade is already set, so it reveals at once —
  // nothing left to anchor, and hiding it would be pointless friction.
  const revealed = !!technicianGrade;

  const agreementRef = useRef(null);
  const hasScrolledRef = useRef(isEdit);

  // Bring the second question into view the moment it appears, so the
  // technician's thumb doesn't have to hunt for it.
  useEffect(() => {
    if (!revealed || hasScrolledRef.current) return;
    hasScrolledRef.current = true;
    const id = window.setTimeout(() => {
      agreementRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 80);
    return () => window.clearTimeout(id);
  }, [revealed]);

  const disagreed = agreement === 'app_lenient' || agreement === 'app_harsh';
  const canSave = !!technicianGrade && !!agreement && !saving;

  const toggleCategory = (value) => {
    setDisputedCategories((prev) =>
      prev.includes(value)
        ? prev.filter((c) => c !== value)
        : [...prev, value]
    );
  };

  const handleSave = async () => {
    if (!canSave) return;
    if (!scanId) {
      setError('هذا الفحص بلا معرّف صالح — لا يمكن حفظ تقييمه.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = buildEvaluationPayload({
      scanId,
      technicianGrade,
      agreement,
      errorMagnitude,
      disputedCategories,
      technicianName,
      durationMs: Date.now() - openedAtRef.current,
    });

    try {
      const submit = httpsCallable(functions, SUBMIT_EVALUATION_FN);
      await submit(payload);
      toast.success('تم حفظ التقييم ✓');
      onSaved(scanId, payload);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[tech] submitEvaluation failed:', e);
      const msg = describeSubmitError(e);
      setError(msg);
      toast.error(msg);
      setSaving(false);
    }
  };

  return (
    <div className="pb-32">
      {/* Sticky header — back stays reachable while scrolling */}
      <header className="sticky top-0 z-20 bg-nc-bg/95 backdrop-blur-xl border-b border-nc-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="رجوع إلى القائمة"
            className="shrink-0 p-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text2 hover:text-nc-text1 active:scale-95 transition"
          >
            <ArrowRightIcon className="w-5 h-5" strokeWidth={2} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-nc-text1 truncate">
              <bdi>{deviceName}</bdi>
            </div>
            <div className="text-[11px] text-nc-text3 flex items-center gap-2">
              <span className="num-ltr font-mono">{shortId}</span>
              <span>•</span>
              <span className="num-ltr">{scanDate}</span>
            </div>
          </div>
          {isEdit && (
            <span className="shrink-0 text-[10px] px-2 py-1 rounded-md bg-nc-green/10 border border-nc-green/30 text-nc-green font-semibold">
              تعديل
            </span>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-5 flex flex-col gap-5">
        {/* ---------- STEP 1 — the technician's own grade, first ---------- */}
        <section className="p-5 rounded-2xl bg-nc-card border border-nc-border">
          <div className="flex items-center gap-2 mb-1">
            <StepDot n={1} done={!!technicianGrade} />
            <h2 className="text-lg font-bold text-nc-text1">
              ما تقييمك أنت لهذا الجهاز؟
            </h2>
          </div>
          <p className="text-xs text-nc-text3 mb-4 ms-8">
            احكم من خبرتك أولاً — درجة التطبيق تظهر بعد اختيارك.
          </p>

          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {GRADES.map((g) => {
              const active = technicianGrade === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setTechnicianGrade(g)}
                  aria-pressed={active}
                  className={`min-h-[88px] rounded-2xl border-2 font-outfit font-black text-4xl transition-all active:scale-95 ${
                    active
                      ? `${GRADE_FILL_CLS[g]} text-white shadow-lg`
                      : `bg-nc-surface border-nc-border ${GRADE_TEXT_CLS[g]} hover:border-nc-text3/50`
                  }`}
                >
                  <span className="num-ltr">{g}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------- REVEAL + STEP 2 ---------- */}
        {revealed && (
          <div
            ref={agreementRef}
            className="flex flex-col gap-5 animate-fade-slide-up"
          >
            {/* Our grade, finally */}
            <section className="p-5 rounded-2xl bg-nc-surface border border-nc-cyan/30">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-nc-text3 uppercase tracking-wider">
                    تقييم التطبيق
                  </div>
                  <div className="mt-1 text-sm text-nc-text2">
                    تقييمك:
                    <span className="num-ltr font-bold text-nc-text1 ms-1">
                      {toLatinDigits(technicianGrade)}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-outfit font-black text-3xl text-white ${
                    GRADE_FILL_CLS[appGrade] || 'bg-nc-text3 border-nc-text3'
                  }`}
                >
                  {/* W4 (2026-10-01): appGrade is null, not '?', when the
                      report carries no letter (lib/techEval.js's
                      resolveAppGrade) — this component renders it directly
                      (unlike ScanCard.js, which goes through GradeBadge and
                      gets '—' for free from that component's own `||`
                      fallback), so the same '—' placeholder is applied here
                      explicitly. */}
                  <span className="num-ltr">{appGrade || '—'}</span>
                </div>
              </div>
            </section>

            {/* decision 82 §2 — same V7Notices component /verify uses: the
                state and its reason (e.g. why appGrade above is "—"). Placed
                after the reveal gate like everything else in this block, so
                it never leaks before the technician commits their own
                grade. Renders nothing when v7Overall has nothing to show. */}
            {v7Overall && <V7Notices overall={v7Overall} t={TECH_T} />}

            {/* The comparison question */}
            <section className="p-5 rounded-2xl bg-nc-card border border-nc-border">
              <div className="flex items-center gap-2 mb-4">
                <StepDot n={2} done={!!agreement} />
                <h2 className="text-lg font-bold text-nc-text1">
                  هل تتفق مع تقييم التطبيق؟
                </h2>
              </div>

              {/* Three options, identical geometry and weight until chosen. */}
              <div className="flex flex-col gap-3">
                {AGREEMENT_OPTIONS.map((opt) => {
                  const active = agreement === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAgreement(opt.value)}
                      aria-pressed={active}
                      className={`w-full min-h-[72px] px-5 py-4 rounded-2xl border-2 text-start transition-all active:scale-[0.98] ${
                        active
                          ? AGREEMENT_SELECTED_CLS[opt.value]
                          : 'bg-nc-surface border-nc-border text-nc-text1 hover:border-nc-text3/50'
                      }`}
                    >
                      <div className="text-lg font-bold leading-tight">
                        {opt.label}
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${
                          active ? 'opacity-80' : 'text-nc-text3'
                        }`}
                      >
                        {opt.hint}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* ---------- OPTIONAL DETAIL — never blocks the save ---------- */}
        {disagreed && (
          <section className="rounded-2xl bg-nc-card border border-nc-border overflow-hidden animate-fade-slide-up">
            <button
              type="button"
              onClick={() => setDetailOpen((v) => !v)}
              aria-expanded={detailOpen}
              className="w-full px-5 py-4 flex items-center justify-between gap-3 text-start"
            >
              <div>
                <div className="text-sm font-semibold text-nc-text2">
                  تفاصيل إضافية
                  <span className="text-nc-text3 font-normal"> — اختياري</span>
                </div>
                <div className="text-xs text-nc-text3 mt-0.5">
                  يمكنك الحفظ مباشرة بدون تعبئتها
                </div>
              </div>
              <ChevronDownIcon
                className={`w-5 h-5 text-nc-text3 shrink-0 transition-transform ${
                  detailOpen ? 'rotate-180' : ''
                }`}
                strokeWidth={2}
              />
            </button>

            {detailOpen && (
              <div className="px-5 pb-5 pt-1 flex flex-col gap-5 border-t border-nc-border/60">
                {/* Error magnitude */}
                <div>
                  <div className="text-sm text-nc-text2 mb-2.5 mt-4">
                    ما حجم الخطأ؟
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {ERROR_MAGNITUDES.map((m) => {
                      const active = errorMagnitude === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() =>
                            setErrorMagnitude(active ? null : m.value)
                          }
                          aria-pressed={active}
                          className={`min-h-[52px] rounded-xl border-2 text-sm font-semibold transition active:scale-95 ${
                            active
                              ? 'bg-nc-glow/15 border-nc-glow text-nc-glow'
                              : 'bg-nc-surface border-nc-border text-nc-text2 hover:border-nc-text3/50'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Disputed categories */}
                <div>
                  <div className="text-sm text-nc-text2 mb-2.5">
                    أي قسم كان خاطئاً؟
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DISPUTED_CATEGORIES.map((c) => {
                      const active = disputedCategories.includes(c.value);
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => toggleCategory(c.value)}
                          aria-pressed={active}
                          className={`min-h-[44px] px-4 rounded-xl border-2 text-sm font-medium transition active:scale-95 ${
                            active
                              ? 'bg-nc-cyan/15 border-nc-cyan text-nc-cyan'
                              : 'bg-nc-surface border-nc-border text-nc-text2 hover:border-nc-text3/50'
                          }`}
                        >
                          {active && (
                            <CheckIcon
                              className="w-3.5 h-3.5 inline-block me-1.5 -mt-0.5"
                              strokeWidth={2.5}
                            />
                          )}
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ---------- Failure ---------- */}
        {error && (
          <div className="p-4 rounded-2xl bg-nc-grade-d/10 border border-nc-grade-d/40 flex items-start gap-3">
            <ExclamationTriangleIcon
              className="w-5 h-5 text-nc-grade-d shrink-0 mt-0.5"
              strokeWidth={2}
            />
            <div className="flex-1 text-sm text-nc-text1 leading-relaxed">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* ---------- Sticky save — always under the thumb ---------- */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-nc-bg/95 backdrop-blur-xl border-t border-nc-border">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full min-h-[60px] rounded-2xl nc-gradient-bg text-nc-bg font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Spinner size="sm" className="border-nc-bg/50 border-t-nc-bg" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <span>{isEdit ? 'حفظ التعديل' : 'حفظ التقييم'}</span>
            )}
          </button>
          {!canSave && !saving && (
            <p className="mt-2 text-center text-xs text-nc-text3">
              {!technicianGrade
                ? 'اختر تقييمك أولاً'
                : 'اختر مدى اتفاقك مع التطبيق'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDot({ n, done }) {
  return (
    <span
      className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
        done
          ? 'bg-nc-green border-nc-green text-nc-bg'
          : 'bg-nc-surface border-nc-text3/40 text-nc-text3'
      }`}
    >
      {done ? (
        <CheckIcon className="w-3.5 h-3.5" strokeWidth={3} />
      ) : (
        <span className="num-ltr">{n}</span>
      )}
    </span>
  );
}
