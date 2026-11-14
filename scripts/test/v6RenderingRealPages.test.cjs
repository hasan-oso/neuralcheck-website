'use strict';

// V6 display, on every page that receives it — decision 83 §1 (2026-09-24):
// this is now a PUBLISH GATE ("الموقع أولاً بشرط أن ينجح اختبار عرض V6 على
// كل صفحة، بالشكل الذي تستقبله. وإلا: توقّف"), because the reader this repo
// is about to ship reads BOTH shapes (V6 and V7), while the currently
// published reader only ever read V6 — so V6, real production traffic
// today, must not have regressed while V7 support was added.
//
// contract-handoff-2cab4d6 vendored the first two REAL V6 golden fixtures
// this repo has ever had: v6-reports-document-sample.json (B — the
// Firestore `reports/{scanId}` shape) and v6-verifyReport-response-
// sample.json (C — the `verifyReport` Cloud Function response shape).
// Before this file, every V6-branch test in this repo used a hand-built
// fixture, not a real document — rule 30's exact warning ("اختبار وحدة
// لملفّ القراءة لا يعادل «الصفحة تعرض صحيحاً»") applies to a synthetic
// fixture just as much as to a reader-only unit test: what matters is
// whether the REAL classifier + REAL reader + REAL component agree on REAL
// data, all the way through.
//
// Every render below uses the REAL production component (react-dom/server,
// via _jsx-require-hook.cjs), same convention as honorNoLetter.test.cjs:
//   - /verify, /print: wiring replicated line-for-line from app/verify/
//     page.js's and PrintClient.js's own V6 branch (not reimplemented
//     independently — see the inline citations below), then the real
//     HeroCard/IssuesList/SummaryCard/PredictedProblems/BuyerAdvice/
//     CategoriesGrid components.
//   - /dashboard, /shop: the REAL ListingEditorCard/DeviceCard (exported
//     from their page files in decision 82 §2 for exactly this purpose).
//   - /tech: the REAL EvaluationForm, plus resolveAppGrade/resolveV7Overall
//     directly.
//   - /admin, /admin/reports: the REAL resolveGrade/ReportModal, loaded via
//     the existing _load-admin-*-internals.cjs pattern (reads the real
//     source from disk, appends one in-memory export line — the shipped
//     file is never modified).
//
// Run: node scripts/test/v6RenderingRealPages.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { classifyPipeline, PipelineKind } = require('@/lib/pipelineTags');
const {
  pickScore,
  pickGrade,
  pickSummary,
  pickIssues,
  pickCategoryScores,
  readCategoriesForGrid,
  pickCategoryNotes,
  pickPredictedProblems,
  pickBuyerAdvice,
  pickDeviceTier,
  pickEstimatedYear,
  pickDeviceName,
  resolveShortId,
  pickCreatedAt,
} = require('@/lib/reportReaders/v6');
const { readOverall } = require('@/lib/reportReaders/v7');
const HeroCard = require('@/components/verify/HeroCard').default;
const SummaryCard = require('@/components/verify/SummaryCard').default;
const { briefSummary } = require('@/components/verify/SummaryCard');
const IssuesList = require('@/components/verify/IssuesList').default;
const PredictedProblems = require('@/components/verify/PredictedProblems').default;
const BuyerAdvice = require('@/components/verify/BuyerAdvice').default;
const CategoriesGrid = require('@/components/verify/CategoriesGrid').default;
const V7Notices = require('@/components/verify/V7Notices').default;
const GradeBadge = require('@/components/GradeBadge').default;
const { translations } = require('@/lib/i18n');
const { loadV6ReportsDocSample, loadV6VerifyReportSample } = require('./_shapes.cjs');
const { resolveAppGrade, resolveV7Overall } = require('@/lib/techEval');

const t = translations.ar;

let pass = 0;
let total = 0;
function check(name, cond) {
  total += 1;
  if (cond) {
    pass += 1;
  } else {
    console.error(`  FAIL: ${name}`);
  }
}

function render(el) {
  return renderToStaticMarkup(el);
}

const v6B = loadV6ReportsDocSample();
const v6C = loadV6VerifyReportSample();

// ---------------------------------------------------------------------------
// Fixture + classifier sanity — confirms these really are V6 (not V7, not
// UNKNOWN_TAG) BEFORE judging what renders from them (rule 26).
// ---------------------------------------------------------------------------
{
  const pB = classifyPipeline(v6B);
  const pC = classifyPipeline(v6C);
  check('fixture sanity: B is a real object with a grade', v6B.grade === 'B');
  check('fixture sanity: C is a real object with a grade', v6C.grade === 'B');
  check('classifyPipeline(B).kind is V6 — the V7 branch never captures it', pB.kind === PipelineKind.V6);
  check('classifyPipeline(C).kind is V6 — the V7 branch never captures it', pC.kind === PipelineKind.V6);
  // B carries an explicit root-level `pipeline: "v6_raw_timeseries"` tag
  // (contract/README.md), but classifyPipeline reads through
  // resolveV7Container(), which returns `aiResponse` whenever it exists —
  // and B's `aiResponse` (a legacy V6 sub-object) never got that field
  // retrofitted onto it. So B classifies as V6 correctly, but via the
  // 'field_absent' default path, not by actually reading its own explicit
  // tag. Documented here as an observed fact, not changed: no live V6 vs V7
  // misclassification results from it today (see this task's report).
  check(
    'B classifies as V6 via "field_absent" (its explicit root pipeline tag is not the path actually read) — observed, not assumed',
    pB.reason === 'field_absent'
  );
  check('C classifies as V6 via "field_absent" too (no pipeline field anywhere on C)', pC.reason === 'field_absent');
}

// =============================================================================
// /verify — app/verify/page.js's V6 branch (lines ~215-230), replicated
// exactly, then the real components.
// =============================================================================
{
  const report = v6C;
  const pipeline = classifyPipeline(report);
  const isV7 = pipeline.kind === PipelineKind.V7;
  check('/verify: C does not take the V7 branch', isV7 === false);

  const resolvedDevice = pickDeviceName(report);
  const resolvedDate = pickCreatedAt(report);
  const resolvedScore = pickScore(report);
  const resolvedSummary = pickSummary(report);
  const resolvedIssues = pickIssues(report);
  const resolvedPredicted = pickPredictedProblems(report);
  const resolvedAdvice = pickBuyerAdvice(report);
  // Raw picker — reader-level sanity only (rule 41's "القارئ يبقى يقرأ
  // الحقل"), unrelated to what CategoriesGrid actually receives below.
  const categoryScores = pickCategoryScores(report);
  // Item 3, ملحق رابع بالقرار ١٠٢ (2026-09-26): this is what app/verify/
  // page.js actually passes to <CategoriesGrid> now — already filtered,
  // sorted, letters resolved, score always null.
  const v6Categories = readCategoriesForGrid(report);
  const categoryNotes = pickCategoryNotes(report);
  const tierRaw = pickDeviceTier(report);
  const year = pickEstimatedYear(report);
  const grade = pickGrade(report);
  const gradeUnavailableNote = grade ? undefined : t.verify.v6FieldMissing;
  // No scoreUnavailableNote any more — item 4, ملحق رابع بالقرار ١٠٢
  // (2026-09-26) removed the prop from HeroCard entirely; app/verify/page.js
  // no longer computes it either. See heroScoreNoteRemoved.test.cjs for the
  // dedicated real-fixture proof that a present-but-hidden score and a
  // genuinely-missing one now render identically.

  check('/verify: pickGrade reads the real letter "B"', grade === 'B');
  check('/verify: pickScore reads the real score 78', resolvedScore === 78);
  check('/verify: pickIssues reads all 7 real issues', resolvedIssues.length === 7);
  check('/verify: pickCategoryScores reads all 15 real categories', Object.keys(categoryScores || {}).length === 15);
  check('/verify: readCategoriesForGrid also returns all 15 (none dropped by the filter)', v6Categories.length === 15);
  check('/verify: readCategoriesForGrid never carries a score', v6Categories.every(({ v }) => v.score === null));

  // This task's order — ملحق ثالث بالقرار ١٠٢ البند ٣ (2026-09-26): the V6
  // score never reaches HeroCard from app/verify/page.js (line ~357) any
  // more — `score={null}` there, always, regardless of what pickScore
  // returned above. Replicated exactly here (rule 23: this used to pass
  // `score: resolvedScore`, the real 78, which is what made the pre-fix
  // HeroCard render the number — replaced, not left alongside a new check).
  const heroHtml = render(
    React.createElement(HeroCard, {
      grade,
      score: null,
      deviceName: resolvedDevice,
      tierRaw,
      year,
      createdAt: resolvedDate,
      t,
      lang: 'ar',
      gradeUnavailableNote,
      coverageNote: null,
    })
  );
  check('/verify HeroCard: shows the real grade "B" in the circle', heroHtml.includes('>B<'));
  check('/verify HeroCard: does not render "?" anywhere', !heroHtml.includes('>?<'));
  check('/verify HeroCard: does not fall back to v6FieldMissing (a real grade exists)', !heroHtml.includes(t.verify.v6FieldMissing));
  check('/verify HeroCard: shows the real device name', heroHtml.includes(resolvedDevice));
  // Score hiding (decision 6 + this task's order). Verified against the
  // ACTUAL pre-fix render first (not assumed): with score:78 passed, this
  // fixture's heroHtml contained exactly three occurrences of "78" — the
  // score number span, the "78 / 100" bar text, and the bar's
  // `style="width:78%"` — and two occurrences of the "النقاط" (score) label.
  // None of those come from the device name, date, or tier for this fixture.
  check('/verify HeroCard: does not display the real score number (78) anywhere', !heroHtml.includes('78'));
  check('/verify HeroCard: does not display the score label ("النقاط") — the whole score slot renders nothing, not an unavailable-note either, since the field IS present, just hidden', !heroHtml.includes(t.verify.score));

  // app/verify/page.js's V6 branch never computes v7Overall at all (it stays
  // `undefined` — see the `let` declaration above the isV7 branch, lines
  // ~174-177); `{isV7 && <V7Notices ... />}` (line 372) means the component
  // is not even mounted when isV7 is false. `isV7` itself is already
  // asserted above via classifyPipeline; this just double-checks V7Notices'
  // own guard is not the only thing standing between V6 data and that box.
  check('/verify: isV7 is false, so V7Notices is never mounted for this report', isV7 === false);

  const summaryHtml = render(React.createElement(SummaryCard, { summary: resolvedSummary, t }));
  check('/verify SummaryCard: shows the real (truncated) summary text', summaryHtml.includes(briefSummary(resolvedSummary)));

  const issuesHtml = render(
    React.createElement(IssuesList, { issues: resolvedIssues, t, severityClassifier: undefined })
  );
  check('/verify IssuesList: renders all 7 real issue titles', resolvedIssues.every((iss) => issuesHtml.includes(iss.title)));
  check('/verify IssuesList: the "high" severity issue classifies as danger, not unknown', issuesHtml.includes(t.verify.severityDanger));
  check('/verify IssuesList: does not render the unknown-severity badge (no V7 enum leaked through)', !issuesHtml.includes(t.verify.severityUnknown));
  check('/verify IssuesList: does not render a bare "?" glyph', !issuesHtml.includes('>?<'));

  const predictedHtml = render(React.createElement(PredictedProblems, { items: resolvedPredicted, t }));
  check(
    '/verify PredictedProblems: renders all 3 real predictions verbatim',
    resolvedPredicted.every((p) => predictedHtml.includes(p.prediction))
  );

  const adviceHtml = render(React.createElement(BuyerAdvice, { advice: resolvedAdvice, t }));
  check('/verify BuyerAdvice: renders the real casual-persona advice verbatim', adviceHtml.includes(resolvedAdvice.casual));

  const categoriesHtml = render(
    React.createElement(CategoriesGrid, { categories: v6Categories, categoryNotes, t })
  );
  check('/verify CategoriesGrid: renders all 15 real category cards (V6 shape)', Object.keys(categoryScores).every((name) => categoriesHtml.includes(t.verify[`cat${name.charAt(0).toUpperCase()}${name.slice(1)}`] || name)));
  check('/verify CategoriesGrid: shows a real per-category grade badge ("A" — battery)', categoriesHtml.includes('>A<'));
  check('/verify CategoriesGrid: does not render a bare "?" glyph', !categoriesHtml.includes('>?<'));
  // Per-category score hiding (decision 6 + this task's order). Verified
  // against the ACTUAL pre-fix render first: battery's real score/grade is
  // 100/A, and the deleted span rendered exactly "100%" (className
  // "text-sm font-bold text-nc-text1 tabular-nums"); the deleted bar was the
  // only inline `style="width:...` in this component. The grade badge ("A")
  // above must still show — this only checks the number/bar are gone.
  check('/verify CategoriesGrid: does not display battery\'s real score (100%)', !categoriesHtml.includes('100%'));
  check('/verify CategoriesGrid: no per-category score bar (inline width style) renders anywhere', !categoriesHtml.includes('style="width:'));
}

// =============================================================================
// /print — app/print/[shortId]/PrintClient.js's V6 branch (lines ~195-208),
// replicated exactly (pickTier/pickYear there are aliases of
// pickDeviceTier/pickEstimatedYear — see that file's import list).
// =============================================================================
{
  const report = v6C;
  const pipeline = classifyPipeline(report);
  check('/print: C does not take the V7 branch', pipeline.kind !== PipelineKind.V7);

  const grade = pickGrade(report);
  const tier = pickDeviceTier(report);
  const year = pickEstimatedYear(report);
  const summary = pickSummary(report);
  const issues = pickIssues(report);
  const predicted = pickPredictedProblems(report);
  const advice = pickBuyerAdvice(report);
  // Item 3, ملحق رابع بالقرار ١٠٢ (2026-09-26): mirrors PrintClient.js's own
  // wiring (see its comment) — this, not the raw pickCategoryScores object,
  // is what reaches <CategoriesGrid> now.
  const v6Categories = readCategoriesForGrid(report);
  const catNotes = pickCategoryNotes(report);
  const gradeUnavailableNote = grade ? undefined : t.verify.v6FieldMissing;
  // No score/pickScore/scoreUnavailableNote at all any more — item 4, ملحق
  // رابع بالقرار ١٠٢ (2026-09-26) removed all three from PrintClient.js
  // outright (nothing else in that file read pickScore's result once the
  // note was gone). Mirrored here for the same reason.

  const heroHtml = render(
    React.createElement(HeroCard, {
      grade,
      score: null,
      deviceName: pickDeviceName(report),
      tierRaw: tier,
      year,
      createdAt: pickCreatedAt(report),
      t,
      lang: 'ar',
      gradeUnavailableNote,
      coverageNote: null,
    })
  );
  check('/print HeroCard: shows the real grade "B"', heroHtml.includes('>B<'));
  check('/print HeroCard: does not render "?" anywhere', !heroHtml.includes('>?<'));
  // Score hiding — same verified-against-real-render basis as /verify above
  // (this fixture's HeroCard render otherwise contains "78" exactly 3 times
  // and the "النقاط" label exactly twice, all score-related).
  check('/print HeroCard: does not display the real score number (78) anywhere', !heroHtml.includes('78'));
  check('/print HeroCard: does not display the score label ("النقاط")', !heroHtml.includes(t.verify.score));

  const issuesHtml = render(React.createElement(IssuesList, { issues, t, severityClassifier: undefined }));
  check('/print IssuesList: renders all 7 real issue titles', issues.every((iss) => issuesHtml.includes(iss.title)));

  const categoriesHtml = render(React.createElement(CategoriesGrid, { categories: v6Categories, categoryNotes: catNotes, t }));
  check('/print CategoriesGrid: renders real category data (V6 shape), not blank', categoriesHtml.length > 0);
  check('/print CategoriesGrid: does not render a bare "?" glyph', !categoriesHtml.includes('>?<'));
  check('/print CategoriesGrid: shows a real per-category grade badge ("A" — battery)', categoriesHtml.includes('>A<'));
  check('/print CategoriesGrid: does not display battery\'s real score (100%)', !categoriesHtml.includes('100%'));
  check('/print CategoriesGrid: no per-category score bar (inline width style) renders anywhere', !categoriesHtml.includes('style="width:'));

  const predictedHtml = render(React.createElement(PredictedProblems, { items: predicted, t }));
  check('/print PredictedProblems: renders real predictions', predicted.every((p) => predictedHtml.includes(p.prediction)));

  const adviceHtml = render(React.createElement(BuyerAdvice, { advice, t }));
  check('/print BuyerAdvice: renders real advice text', adviceHtml.includes(advice.casual));
}

// =============================================================================
// /dashboard — the REAL ListingEditorCard (app/dashboard/page.js, exported
// in decision 82 §2 for this exact purpose).
// =============================================================================
{
  const { ListingEditorCard } = require('@/app/dashboard/page.js');
  const report = { ...v6B, id: 'v6-test-id' };
  const html = render(
    React.createElement(ListingEditorCard, { report, t, lang: 'ar', onSave: async () => {} })
  );
  check('/dashboard ListingEditorCard: shows the real grade "B", not V7\'s "—"', html.includes('>B<'));
  check('/dashboard ListingEditorCard: does not render a bare "?" glyph', !html.includes('>?<'));
  check(
    '/dashboard ListingEditorCard: no V7Notices content leaks in for a V6 report (no harnessError-style text)',
    !html.includes(t.verify.governingGateLabel)
  );
  // Score hiding — this task's order (ملحق ثالث بالقرار ١٠٢ البند ٣،
  // 2026-09-26). app/dashboard/page.js's ListingEditorCard now hardcodes
  // `score = null` (no longer calls pickScore at all). Checked as the exact
  // compound pattern the deleted span produced (`>78%</span>` — verified
  // against the ACTUAL pre-fix render first, not assumed: a bare "78" also
  // appears once, coincidentally, inside an unrelated SVG icon's path data
  // ("...9.581c.699.699 1.78.872..."), so a bare `!html.includes('78')` would
  // be an unreliable assertion — rule 26).
  check('/dashboard ListingEditorCard: does not display the real score (78%)', !html.includes('>78%<'));
}

// =============================================================================
// /shop — the REAL DeviceCard (app/shop/[slug]/ShopClient.js, exported in
// decision 82 §2).
// =============================================================================
{
  const { DeviceCard } = require('@/app/shop/[slug]/ShopClient.js');
  const report = { ...v6B, id: 'v6-test-id', scanId: 'v6-test-id' };
  const html = render(React.createElement(DeviceCard, { report, t, lang: 'ar' }));
  check('/shop DeviceCard: shows the real grade "B"', html.includes('>B<'));
  check('/shop DeviceCard: does not render a bare "?" glyph', !html.includes('>?<'));
  check(
    '/shop DeviceCard: no V7Notices content leaks in for a V6 report',
    !html.includes(t.verify.governingGateLabel)
  );
  // Score hiding — this task's order (ملحق ثالث بالقرار ١٠٢ البند ٣،
  // 2026-09-26). app/shop/[slug]/ShopClient.js's DeviceCard now hardcodes
  // `score = null` (no longer calls pickScore). Verified against the ACTUAL
  // pre-fix render first: this fixture's DeviceCard html contained exactly
  // one occurrence of "78", the score span itself (">78<span...").
  check('/shop DeviceCard: does not display the real score (78)', !html.includes('>78<'));
}

// =============================================================================
// /tech — resolveAppGrade/resolveV7Overall directly, then the REAL
// EvaluationForm once revealed (same pattern as v7NoticesWiring.test.cjs).
// =============================================================================
{
  const report = { ...v6B, id: 'v6-test-id' };
  check('/tech resolveAppGrade: returns the real letter "B", not "?"', resolveAppGrade(report) === 'B');
  check('/tech resolveV7Overall: returns null for a V6 report (never misreads it as V7)', resolveV7Overall(report) === null);

  const EvaluationForm = require('@/components/tech/EvaluationForm').default;
  const evaluation = { technicianGrade: 'B', agreement: 'agree' };
  const html = render(
    React.createElement(EvaluationForm, {
      report,
      evaluation,
      technicianName: 'Test Tech',
      onSaved: () => {},
      onBack: () => {},
      lang: 'ar',
    })
  );
  check('/tech EvaluationForm: shows the real app grade "B" once revealed', html.includes('>B<'));
  check(
    '/tech EvaluationForm: no V7Notices content leaks in for a V6 report',
    !html.includes(t.verify.governingGateLabel)
  );
}

// =============================================================================
// /admin — the REAL resolveGrade (app/admin/page.js, loaded via the same
// disk-read-plus-one-export-line technique as the admin/reports loader).
// =============================================================================
{
  const { resolveGrade } = require('./_load-admin-page-internals.cjs');
  const report = { ...v6B, id: 'v6-test-id' };
  check('/admin resolveGrade: returns the real letter "B", not "?"', resolveGrade(report) === 'B');

  const html = render(React.createElement(GradeBadge, { grade: resolveGrade(report), size: 'sm' }));
  check('/admin GradeBadge: shows "B"', html.includes('>B<'));
  check('/admin GradeBadge: does not show a bare "?"', !html.includes('>?<'));
}

// =============================================================================
// /admin/reports — the REAL resolveGrade/isV7Report/ReportModal, loaded via
// the existing _load-admin-reports-internals.cjs. Supplements (does not
// replace) adminReportsParity.test.cjs's synthetic V6 fixture — that file
// tests V6/V7 field-parity logic with a controlled minimal shape; this
// exercises the same modal against the real, full vendored document.
// =============================================================================
{
  const { ReportModal, resolveGrade, isV7Report } = require('./_load-admin-reports-internals.cjs');
  const report = { id: 'v6-test-id', ...v6B };

  check('/admin/reports isV7Report: classifies the real V6 document as NOT V7', isV7Report(report) === false);
  check('/admin/reports resolveGrade: returns the real letter "B"', resolveGrade(report) === 'B');

  const html = render(React.createElement(ReportModal, { report, usersMap: new Map(), onClose: () => {} }));
  check('/admin/reports ReportModal: grade badge shows "B"', html.includes('>B<'));
  check('/admin/reports ReportModal: does not render a bare "?" glyph', !html.includes('>?<'));
  check(
    '/admin/reports ReportModal: shows the real V6 verdict text, not the V7 narrative chain',
    html.includes(v6B.aiResponse.verdict)
  );
  check(
    '/admin/reports ReportModal: does not render the V7-only "فئات V7" categories block for a V6 report',
    !html.includes('فئات V7')
  );
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
