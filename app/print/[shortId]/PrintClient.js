'use client';

import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import HeroCard from '@/components/verify/HeroCard';
import SummaryCard from '@/components/verify/SummaryCard';
import IssuesList from '@/components/verify/IssuesList';
import PredictedProblems from '@/components/verify/PredictedProblems';
import BuyerAdvice from '@/components/verify/BuyerAdvice';
import CategoriesGrid from '@/components/verify/CategoriesGrid';
import V7CategoriesGrid from '@/components/verify/V7CategoriesGrid';
import V7Notices from '@/components/verify/V7Notices';
import { useLang } from '@/lib/LanguageContext';
import { formatDateLatin, toLatinDigits } from '@/lib/format';
import { classifyPipeline, PipelineKind } from '@/lib/pipelineTags';
import {
  pickGrade,
  pickSummary,
  pickIssues,
  readCategoriesForGrid,
  pickPredictedProblems as pickPredicted,
  pickBuyerAdvice as pickAdvice,
  pickCategoryNotes,
  pickDeviceTier as pickTier,
  pickEstimatedYear as pickYear,
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
  countIssuesByCategory,
  classifyV7Severity,
} from '@/lib/reportReaders/v7';

const VERIFY_URL =
  'https://us-central1-neuralchek-9b6d7.cloudfunctions.net/verifyReport';

// Report field readers live in lib/reportReaders/{v6,v7}.js (mirror of
// /verify — see app/verify/page.js's equivalent comment for why they are
// not one shared fallback chain).

function readShortIdFromPath() {
  if (typeof window === 'undefined') return null;
  const m = window.location.pathname.match(/\/print\/([^/]+)/);
  if (!m) return null;
  const raw = decodeURIComponent(m[1]);
  if (!raw || raw === '_') return null;
  return raw;
}

// ---------- main ----------

export default function PrintClient() {
  const { t, lang, mounted } = useLang();
  const [shortIdFromUrl, setShortIdFromUrl] = useState(null);
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | not_found | error
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    setShortIdFromUrl(readShortIdFromPath());
  }, []);

  // Wait for web fonts (Outfit + Tajawal) to fully load before signalling
  // print-ready — Puppeteer otherwise races font loading and renders the
  // first frame with a fallback font.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) {
      setFontsReady(true);
      return;
    }
    document.fonts.ready
      .then(() => setFontsReady(true))
      .catch(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    if (shortIdFromUrl === null) return; // mount not done yet
    if (!shortIdFromUrl) {
      setStatus('not_found');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${VERIFY_URL}?scanId=${encodeURIComponent(shortIdFromUrl)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) {
          if (!cancelled) setStatus('not_found');
          return;
        }
        const data = await res.json();
        if (
          !data ||
          data.error ||
          (!data.scanId && !data.id && !data.shortId)
        ) {
          if (!cancelled) setStatus('not_found');
          return;
        }
        if (!cancelled) {
          setReport(data);
          setStatus('ok');
        }
      } catch (e) {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shortIdFromUrl]);

  // ---------- render states ----------

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-nc-text2">
        <div className="w-10 h-10 border-4 border-nc-border border-t-nc-green rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'not_found' || status === 'error' || !report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="text-nc-grade-d font-semibold mb-2">
          {t.verify.notFound}
        </div>
        <div className="text-sm text-nc-text3">{t.verify.notFoundHint}</div>
      </div>
    );
  }

  // ---------- resolved data ----------
  //
  // Pipeline read first, then everything below reads through the matching
  // shape reader — mirror of app/verify/page.js's equivalent block (see its
  // comments for the full rationale).
  const pipeline = classifyPipeline(report);
  const isV7 = pipeline.kind === PipelineKind.V7;

  if (pipeline.kind === PipelineKind.UNKNOWN_TAG) {
    // eslint-disable-next-line no-console
    console.warn('[print] unrecognized pipeline tag — using the V6 reader as a best effort', pipeline.tag);
  }

  const shortId = resolveShortId(report, shortIdFromUrl);
  const deviceName = pickDeviceName(report);
  const createdAt = pickCreatedAt(report);

  let grade, summary, issues, predicted, advice, v6Categories, catNotes,
    tier, year, severityClassifier, gradeUnavailableNote,
    coverageNote, v7Categories, v7IssueCounts, v7Overall;

  if (isV7) {
    v7Overall = readOverall(report);
    v7Categories = readCategories(report);
    issues = readIssues(report);
    v7IssueCounts = countIssuesByCategory(issues);
    summary = readSummary(report);
    advice = readBuyerAdvice(report);
    predicted = [];
    v6Categories = null;
    catNotes = null;
    tier = null;
    year = null;
    grade = v7Overall.letter;
    // Mirrors app/verify/page.js's identical wiring (see its comment for the
    // full rationale, including the W6/2026-10-01 harnessErrorMessage
    // change) — same HeroCard, same task: Honor sample (e4b65a2f),
    // 2026-09-24.
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
    grade = pickGrade(report);
    tier = pickTier(report);
    year = pickYear(report);
    summary = pickSummary(report);
    issues = pickIssues(report);
    predicted = pickPredicted(report);
    advice = pickAdvice(report);
    // Item 3, ملحق رابع بالقرار ١٠٢ (2026-09-26): mirrors app/verify/page.js's
    // identical wiring (see its comment for the full rationale).
    v6Categories = readCategoriesForGrid(report);
    catNotes = pickCategoryNotes(report);
    gradeUnavailableNote = grade ? undefined : t.verify.v6FieldMissing;
    // No scoreUnavailableNote any more (item 4, ملحق رابع بالقرار ١٠٢،
    // 2026-09-26 — see HeroCard.js's comment). Nothing else in this file
    // reads pickScore's result, so the `score` variable and the pickScore
    // import are removed outright rather than left computing an unused
    // value — this page never had an app/verify/page.js-style hasContent
    // gate to keep it alive for.
  }

  // Footer/header date for the page (current generation time vs scan time).
  const printDate = formatDateLatin(createdAt || new Date(), lang);

  // Only signal print-ready once the report data, web fonts, and the
  // language-context mount cycle have all completed. Puppeteer waits on
  // this attribute before calling page.pdf().
  const isReady = !!report && fontsReady && mounted;

  return (
    <div
      data-print-ready={isReady ? 'true' : undefined}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="print-shell max-w-4xl mx-auto px-6 sm:px-8 py-8 print:py-0 print:px-0 print:max-w-none"
    >
      {/* PDF header — shown both on screen + in print */}
      <header className="flex items-center justify-between gap-4 pb-5 mb-6 border-b border-nc-border">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <div>
            <div className="font-outfit font-extrabold nc-gradient-text text-xl leading-none">
              NeuralCheck
            </div>
            <div className="text-xs text-nc-text3 mt-1">
              {t.verify.reportVerified}
            </div>
          </div>
        </div>
        <div className="text-end">
          <div
            dir="ltr"
            className="font-mono font-bold text-nc-text2 text-sm"
          >
            {shortId}
          </div>
          <div dir="ltr" className="text-[11px] text-nc-text3 mt-0.5">
            neuralcheck.net
          </div>
        </div>
      </header>

      {/* Body — same components as /verify */}
      <div className="flex flex-col gap-5 sm:gap-6">
        <HeroCard
          grade={grade}
          // V6 numeric score hidden from the buyer/print view — same decision
          // as app/verify/page.js's HeroCard call. Nothing computes a score
          // for this page at all any more (item 4, ملحق رابع بالقرار ١٠٢،
          // 2026-09-26 — pickScore/scoreUnavailableNote removed outright,
          // see the V6 branch above): there is no HeroCard prop left that
          // could carry a real value here, hidden or not.
          score={null}
          deviceName={deviceName}
          tierRaw={tier}
          year={year}
          createdAt={createdAt}
          t={t}
          lang={lang}
          gradeUnavailableNote={gradeUnavailableNote}
          coverageNote={coverageNote}
        />

        {isV7 && <V7Notices overall={v7Overall} t={t} />}

        <SummaryCard summary={summary} t={t} />

        <IssuesList issues={issues} t={t} lang={lang} severityClassifier={severityClassifier} />

        <PredictedProblems items={predicted} t={t} />

        <BuyerAdvice advice={advice} t={t} />

        {isV7 ? (
          <V7CategoriesGrid categories={v7Categories} issueCounts={v7IssueCounts} t={t} />
        ) : (
          <CategoriesGrid
            categories={v6Categories}
            categoryNotes={catNotes}
            t={t}
          />
        )}
      </div>

      {/* On-screen footer — Puppeteer adds page numbers via footerTemplate */}
      <footer className="mt-10 pt-4 border-t border-nc-border text-center text-xs text-nc-text3 print:hidden">
        <span dir="ltr" className="font-mono font-bold text-nc-text2 me-1">
          {shortId}
        </span>
        •
        <span className="mx-1">{t.verify.verifiedFooter}</span>
        <span dir="ltr" className="font-mono">neuralcheck.net</span>
        {createdAt && (
          <>
            <span className="mx-1">•</span>
            <span dir="ltr">{printDate}</span>
          </>
        )}
      </footer>
    </div>
  );
}
