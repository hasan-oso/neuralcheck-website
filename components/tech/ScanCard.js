'use client';

// One scan row in the technician's list.
//
// Tap target is the whole card — on a phone, in a shop, nobody aims for a
// link. Minimum height is set so a thumb lands on it without looking.

import {
  CheckCircleIcon,
  ChevronLeftIcon,
  EyeSlashIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

import GradeBadge from '@/components/GradeBadge';
import { formatDateLatin, toLatinDigits } from '@/lib/format';
import {
  AGREEMENT_OPTIONS,
  REVEAL_APP_GRADE_BEFORE_EVALUATION,
  resolveAppGrade,
  resolveDeviceName,
  resolveScanDate,
  resolveShortId,
} from '@/lib/techEval';

function agreementLabel(value) {
  return AGREEMENT_OPTIONS.find((o) => o.value === value)?.label || null;
}

export default function ScanCard({ report, evaluation, onOpen, lang }) {
  const deviceName = resolveDeviceName(report);
  const appGrade = resolveAppGrade(report);
  const shortId = resolveShortId(report);
  const date = formatDateLatin(resolveScanDate(report), lang);
  const isEvaluated = !!evaluation;

  // App grade stays hidden until an evaluation exists — see the rationale on
  // REVEAL_APP_GRADE_BEFORE_EVALUATION in lib/techEval.js.
  const showAppGrade = isEvaluated || REVEAL_APP_GRADE_BEFORE_EVALUATION;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full text-start p-4 rounded-2xl bg-nc-card border transition-all active:scale-[0.99] min-h-[92px] ${
        isEvaluated
          ? 'border-nc-green/30 hover:border-nc-green/60'
          : 'border-nc-border hover:border-nc-cyan/50'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Grade slot — badge once evaluated, masked placeholder before */}
        <div className="shrink-0">
          {showAppGrade ? (
            <GradeBadge grade={appGrade} size="sm" />
          ) : (
            <div
              className="w-12 h-12 rounded-full bg-nc-surface border border-dashed border-nc-text3/40 flex items-center justify-center"
              title="درجة التطبيق تظهر بعد أن تختار تقييمك"
            >
              <EyeSlashIcon
                className="w-5 h-5 text-nc-text3"
                strokeWidth={1.8}
              />
            </div>
          )}
        </div>

        {/* Device + meta */}
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-nc-text1 leading-snug line-clamp-2 break-words">
            <bdi>{deviceName}</bdi>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-nc-text3">
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span className="num-ltr">{date}</span>
            </span>
            <span className="num-ltr font-mono">{shortId}</span>
          </div>

          {isEvaluated && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-nc-surface border border-nc-border text-nc-text2">
                تقييمك:
                <span className="num-ltr font-bold text-nc-text1">
                  {toLatinDigits(evaluation.technicianGrade || '—')}
                </span>
              </span>
              {agreementLabel(evaluation.agreement) && (
                <span className="px-2 py-0.5 rounded-md bg-nc-surface border border-nc-border text-nc-text2">
                  {agreementLabel(evaluation.agreement)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status / affordance */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          {isEvaluated ? (
            <>
              <CheckCircleIcon
                className="w-6 h-6 text-nc-green"
                strokeWidth={2}
              />
              <span className="text-[10px] text-nc-green font-semibold">
                مُقيَّم
              </span>
            </>
          ) : (
            <ChevronLeftIcon
              className="w-5 h-5 text-nc-text3 rotate-180"
              strokeWidth={2}
            />
          )}
        </div>
      </div>
    </button>
  );
}
