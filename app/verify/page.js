'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { useLang } from '@/lib/LanguageContext';
import { functions } from '@/firebase';
import { logGradeProvenance } from '@/lib/reportTelemetry';
import { classifyPipeline, PipelineKind } from '@/lib/pipelineTags';
import {
  pickGrade,
  pickSummary,
  pickIssues,
  readCategoriesForGrid,
  pickPredictedProblems,
  pickBuyerAdvice,
  pickCategoryNotes,
  pickDeviceTier,
  pickEstimatedYear,
  resolveShortId,
  pickDeviceName,
  pickCreatedAt,
} from '@/lib/reportReaders/v6';
import {
  readOverall,
  readCategories,
  readIssues,
  readBuyerAdvice,
  readSummary,
  readNarrativeIncomplete,
  countIssuesByCategory,
  classifyV7Severity,
} from '@/lib/reportReaders/v7';
import HeroCard from '@/components/verify/HeroCard';
import SummaryCard from '@/components/verify/SummaryCard';
import IssuesList from '@/components/verify/IssuesList';
import PredictedProblems from '@/components/verify/PredictedProblems';
import BuyerAdvice from '@/components/verify/BuyerAdvice';
import CategoriesGrid from '@/components/verify/CategoriesGrid';
import V7CategoriesGrid from '@/components/verify/V7CategoriesGrid';
import V7Notices from '@/components/verify/V7Notices';
import NarrativeIncompleteNotice from '@/components/verify/NarrativeIncompleteNotice';
import VerifyActions from '@/components/verify/VerifyActions';
import {
  QrCodeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const VERIFY_URL =
  'https://us-central1-neuralchek-9b6d7.cloudfunctions.net/verifyReport';

// Report field readers live in lib/reportReaders/{v6,v7}.js, chosen by
// lib/pipelineTags.js's classifyPipeline() below — see those files for why
// they are not one shared fallback chain. This file only wires the reader
// output to the presentational components.

// ---------- main page ----------

export default function VerifyPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [scanId, setScanId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const lookup = async (id) => {
    if (!id || !id.trim()) return;
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await fetch(
        `${VERIFY_URL}?scanId=${encodeURIComponent(id.trim())}`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        setError(t.verify.notFound);
      } else {
        const data = await res.json();
        if (!data || data.error || (!data.scanId && !data.id && !data.shortId)) {
          setError(t.verify.notFound);
        } else {
          // Console-only: records how often the pipeline fell back to a
          // derived grade. Never rendered — see lib/reportTelemetry.js.
          logGradeProvenance(data, 'verify');
          setReport(data);
        }
      }
    } catch (e) {
      setError(t.verify.notFound);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('scanId') || params.get('id');
    if (q) {
      setScanId(q);
      lookup(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    lookup(scanId);
  };

  const handleQR = () => {
    router.push('/scan');
  };

  const handleDownloadPdf = async () => {
    const id = report?.scanId || report?.id || scanId;
    if (!id) return;

    setPdfLoading(true);
    setPdfError('');
    try {
      const generate = httpsCallable(functions, 'generateReportPdf');
      const res = await generate({ scanId: id });
      const data = res?.data;
      const url =
        (data && (data.url || data.pdfUrl || data.downloadUrl)) ||
        (typeof data === 'string' ? data : null);
      if (!url) {
        throw new Error('Empty response from generateReportPdf');
      }
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[verify] generateReportPdf failed:', e);
      setPdfError(t.verify.pdfError);
    } finally {
      setPdfLoading(false);
    }
  };

  // Resolved fields — pulled out so JSX stays clean and components
  // receive flat props (no nested `report.*` reads inside children).
  //
  // Pipeline is read FIRST, then the whole rest of this block reads through
  // the matching shape reader — never a fallback chain that tries both
  // shapes at once. See lib/pipelineTags.js and lib/reportReaders/{v6,v7}.js.
  const pipeline = classifyPipeline(report);
  const isV7 = pipeline.kind === PipelineKind.V7;

  if (pipeline.kind === PipelineKind.UNKNOWN_TAG) {
    // Recorded, never silenced — see lib/pipelineTags.js's doc comment.
    // Falls through to the V6 reader below as the safest best-effort: it is
    // defensive by design and already renders "no value found" honestly
    // rather than crashing on a shape it doesn't recognize.
    // eslint-disable-next-line no-console
    console.warn('[verify] unrecognized pipeline tag — using the V6 reader as a best effort', pipeline.tag);
  }

  // Pipeline-agnostic: safe to read unconditionally (see lib/reportReaders/
  // v6.js's doc comment on why these three are shared).
  const resolvedShortId = resolveShortId(report, scanId);
  const resolvedDevice = pickDeviceName(report);
  const resolvedDate = pickCreatedAt(report);

  let resolvedSummary, resolvedIssues, resolvedPredicted,
    resolvedAdvice, v6Categories, categoryNotes, tierRaw, year, grade,
    severityClassifier, gradeUnavailableNote,
    coverageNote, v7Categories, v7IssueCounts, v7Overall, v7NarrativeIncomplete;

  if (isV7) {
    v7Overall = readOverall(report);
    v7Categories = readCategories(report);
    resolvedIssues = readIssues(report);
    v7IssueCounts = countIssuesByCategory(resolvedIssues);
    resolvedSummary = readSummary(report);
    resolvedAdvice = readBuyerAdvice(report);
    v7NarrativeIncomplete = readNarrativeIncomplete(report);
    resolvedPredicted = []; // no predicted_problems field in the V7 payload
    v6Categories = null; // V7 uses V7CategoriesGrid below, not CategoriesGrid
    categoryNotes = null;
    tierRaw = null; // no deviceTier field in the V7 payload
    year = null; // no estimatedReleaseYear field in the V7 payload
    grade = v7Overall.letter;
    // No letter — HeroCard already renders '—' instead of '?' (its own
    // fix), but the buyer still needs the WHY beside it. harnessError (the
    // test harness itself failed, functionalResults=null) and noDataAtAll
    // (zero category reached MEASURED) are mutually exclusive per the
    // contract. Task: Honor sample (e4b65a2f) — letter=null,
    // harnessError=true — 2026-09-24.
    //
    // W6 (2026-10-01, S-13): the harnessError branch used to read
    // harnessErrorReason — a raw backend code
    // ("FUNCTIONAL_RESULTS_UNAVAILABLE" on the real Honor sample), never
    // meant for a buyer. Reads harnessErrorMessage (the human-readable
    // replacement) now, falling back to a buyer-safe generic notice — never
    // the raw code, and never undefined either, since harnessError===true
    // does mean something needs saying even before the backend ships the
    // message field (see lib/reportReaders/v7.js's readOverall comment).
    gradeUnavailableNote = grade
      ? undefined
      : v7Overall.harnessError
        ? v7Overall.harnessErrorMessage || t.verify.v7HarnessErrorMessageUnavailable
        : v7Overall.noDataAtAll
          ? v7Overall.zeroMeasuredMessage || undefined
          : undefined;
    coverageNote =
      v7Overall.partialAssessment && v7Overall.partialAssessmentTag?.text
        ? v7Overall.partialAssessmentTag.text
        : null;
    severityClassifier = classifyV7Severity;
  } else {
    resolvedSummary = pickSummary(report);
    resolvedIssues = pickIssues(report);
    resolvedPredicted = pickPredictedProblems(report);
    resolvedAdvice = pickBuyerAdvice(report);
    // Item 3, ملحق رابع بالقرار ١٠٢ (2026-09-26): readCategoriesForGrid
    // (lib/reportReaders/v6.js) returns an already-filtered, already-sorted,
    // score-free array — CategoriesGrid.js no longer normalizes/filters/
    // sorts raw category_scores itself.
    v6Categories = readCategoriesForGrid(report);
    categoryNotes = pickCategoryNotes(report);
    tierRaw = pickDeviceTier(report);
    year = pickEstimatedYear(report);
    grade = pickGrade(report);
    // Explicit "field genuinely missing" notice rather than a silent '?' —
    // only when the report is actually classified V6, so this never shows
    // on a V7 report mid-transition.
    gradeUnavailableNote = grade ? undefined : t.verify.v6FieldMissing;
    // No scoreUnavailableNote any more — item 4, ملحق رابع بالقرار ١٠٢
    // (2026-09-26) removed it from HeroCard entirely (see that file's
    // comment): the score is hidden either way, present or genuinely
    // missing, so the two cases no longer need to look different.
  }

  // Show "no issues" callout only when we actually have a real report to
  // show — judged by what the page actually DISPLAYS, never by the hidden
  // score (item 4, ملحق سادس بالقرار ١٠٢، 2026-09-26): a report carrying
  // only a score and nothing else (no grade, no categories) shows nothing
  // meaningful either — HeroCard's circle renders '—', CategoriesGrid
  // renders nothing — so treating it as "has content" would render the
  // issues list's "no issues" callout beside an otherwise-empty report,
  // which reads as a real clean device rather than a malformed/near-empty
  // one. `v6Categories` is never empty-but-letterless either: every entry
  // readCategoriesForGrid returns carries a resolved letter, including the
  // legacy bare-number shape (letterForScore fallback, item 3/b24a8a9) — so
  // its mere presence already means "there is at least one displayed
  // letter", with no separate grade check needed here.
  const hasContent =
    (v6Categories && v6Categories.length > 0) ||
    (isV7 && v7Categories && v7Categories.length > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 print:py-0 print:max-w-none">
      {/* Page header (search-mode) */}
      <div className="text-center animate-fade-slide-up print:hidden">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-nc-green/10 border border-nc-green/30 mb-5">
          <ShieldCheckIcon
            className="w-9 h-9 text-nc-green"
            strokeWidth={1.6}
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-outfit font-bold nc-gradient-text leading-[1.15] pb-1">
          {t.verify.title}
        </h1>
        <p className="mt-3 text-nc-text2 max-w-xl mx-auto leading-relaxed">
          {t.verify.subtitle}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-10 flex flex-col sm:flex-row gap-3 animate-fade-slide-up print:hidden"
        style={{ animationDelay: '0.1s' }}
      >
        <div className="flex-1 relative">
          <input
            type="text"
            value={scanId}
            onChange={(e) => setScanId(e.target.value)}
            placeholder={t.verify.placeholder}
            className="w-full px-5 py-4 rounded-xl bg-nc-card border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green focus:ring-2 focus:ring-nc-green/20 transition pe-14 font-mono text-sm"
          />
          <button
            type="button"
            onClick={handleQR}
            className="absolute top-1/2 -translate-y-1/2 end-2 p-2 rounded-lg text-nc-text3 hover:text-nc-green hover:bg-nc-surface transition"
            aria-label={t.verify.scanQR}
            title={t.verify.scanQR}
          >
            <QrCodeIcon className="w-6 h-6" strokeWidth={1.6} />
          </button>
        </div>
        <button
          type="submit"
          disabled={loading || !scanId.trim()}
          className="px-8 py-4 rounded-xl nc-gradient-bg text-nc-bg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-nc-bg/60 border-t-transparent rounded-full animate-spin" />
              <span>{t.verify.loading}</span>
            </>
          ) : (
            t.verify.button
          )}
        </button>
      </form>

      {/* Loading */}
      {loading && !report && (
        <div className="mt-10 p-8 rounded-2xl bg-nc-card border border-nc-border animate-fade-slide-up">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-nc-border border-t-nc-green rounded-full animate-spin" />
              <div
                className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-nc-cyan rounded-full animate-spin"
                style={{
                  animationDuration: '1.2s',
                  animationDirection: 'reverse',
                }}
              />
            </div>
            <p className="text-nc-text2 text-sm">{t.verify.loading}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="mt-8 p-6 rounded-2xl bg-nc-card border border-nc-grade-d/30 animate-fade-slide-up">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-nc-grade-d/10 border border-nc-grade-d/30 flex items-center justify-center">
              <ExclamationTriangleIcon
                className="w-6 h-6 text-nc-grade-d"
                strokeWidth={1.8}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-nc-grade-d font-semibold">{error}</div>
              <p className="mt-1 text-sm text-nc-text2 leading-relaxed">
                {t.verify.notFoundHint}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verified report — full redesign (V2 #50) */}
      {report && !loading && (
        <div className="mt-8 sm:mt-10 flex flex-col gap-5 sm:gap-6 animate-fade-slide-up">
          {/* Verification badge + grade-source caption (W2, أمر 2026-10-01:
              analyzedByAI became the full A2 sentence — too long for the
              rounded-full pill it used to share with reportVerified, so it
              now renders as its own centered caption line beneath the badge,
              still above the grade circle. Styling call made implementing
              this order; open to revision. */}
          {report.verified !== false && (
            <div className="flex flex-col items-center gap-2 print:hidden">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-nc-green/10 border border-nc-green/30 text-nc-green text-xs sm:text-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-nc-green animate-pulse" />
                {t.verify.reportVerified}
              </span>
              <p className="flex items-center gap-1.5 text-center text-xs sm:text-sm text-nc-text2 max-w-md leading-relaxed">
                <SparklesIcon className="w-3.5 h-3.5 text-nc-cyan shrink-0" strokeWidth={2} />
                {t.verify.analyzedByAI}
              </p>
            </div>
          )}

          {/* HERO */}
          <HeroCard
            grade={grade}
            // V6 numeric score is never shown to the buyer (decision 6:
            // "score — لا يُعرض للمستخدم إطلاقاً") — nothing in this file
            // reads pickScore any more at all (item 4, ملحق سادس بالقرار
            // ١٠٢، 2026-09-26 — hasContent above no longer needs it either;
            // see its own comment). No "unavailable" note either when a
            // grade is missing (item 4, ملحق رابع بالقرار ١٠٢، 2026-09-26 —
            // see HeroCard.js's comment): a present-but-hidden score and a
            // genuinely-missing one render identically, nothing.
            score={null}
            deviceName={resolvedDevice}
            tierRaw={tierRaw}
            year={year}
            createdAt={resolvedDate}
            t={t}
            lang={lang}
            gradeUnavailableNote={gradeUnavailableNote}
            coverageNote={coverageNote}
          />

          {/* V7 report-level notices (governing gate, zero-measured, harness
              error, abstention reasons) — no-op for V6 (v7Overall is
              undefined) */}
          {isV7 && <V7Notices overall={v7Overall} t={t} />}

          {/* narrativeIncomplete — coordinator decision 72 (2026-09-23).
              /verify ONLY, deliberately not wired into PrintClient.js
              (PDF/print postponed — see components/verify/
              NarrativeIncompleteNotice.js's top comment). */}
          {isV7 && (
            <NarrativeIncompleteNotice
              status={v7NarrativeIncomplete.status}
              value={v7NarrativeIncomplete.value}
              t={t}
            />
          )}

          {/* SUMMARY + VERDICT */}
          <SummaryCard summary={resolvedSummary} t={t} />

          {/* ISSUES */}
          {hasContent && (
            <IssuesList issues={resolvedIssues} t={t} lang={lang} severityClassifier={severityClassifier} />
          )}

          {/* PREDICTED PROBLEMS */}
          <PredictedProblems items={resolvedPredicted} t={t} />

          {/* BUYER ADVICE */}
          <BuyerAdvice advice={resolvedAdvice} t={t} />

          {/* ALL CATEGORIES */}
          {isV7 ? (
            <V7CategoriesGrid categories={v7Categories} issueCounts={v7IssueCounts} t={t} />
          ) : (
            <CategoriesGrid
              categories={v6Categories}
              categoryNotes={categoryNotes}
              t={t}
            />
          )}

          {/* ACTIONS — extracted to components/verify/VerifyActions.js so
              the PDF-button hide (lib/featureFlags.js's
              PDF_DOWNLOAD_ENABLED, coordinator decision 73) is testable as
              a real component render, not just inline JSX gated on
              internal state (rule 30). */}
          <VerifyActions
            pdfLoading={pdfLoading}
            pdfError={pdfError}
            onDownloadPdf={handleDownloadPdf}
            onPrint={() => {
              if (typeof window !== 'undefined') window.print();
            }}
            t={t}
          />

          {/* FOOTER */}
          <div className="mt-2 pt-4 border-t border-nc-border text-center text-xs text-nc-text3">
            <span dir="ltr" className="font-mono font-bold text-nc-text2 me-1">
              {resolvedShortId}
            </span>
            •
            <span className="mx-1">{t.verify.verifiedFooter}</span>
            <span dir="ltr" className="font-mono">neuralcheck.net</span>
          </div>
        </div>
      )}
    </div>
  );
}
