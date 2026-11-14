'use strict';

// The LLM-adjusted-letter reader/display — decision 95 §2, updated decision
// 98/99 (2026-09-25). Two real golden pairs now:
//
//   - security-downgrade (contract-handoff-057cf43, REPLACING the
//     90fb816 version): the backend's real rule (commit 49c0e40) writes
//     LLM_ADJUSTED only when the letter actually changes. security's
//     deterministic letter was already "D", so this sample now shows
//     letterSource="DETERMINISTIC" (adjustmentReason/adjustmentEvidence
//     null, audit records "ACCEPTED_NO_EFFECT") — this is now the NEGATIVE
//     case: proves the marker correctly does NOT show.
//   - cpu-c06-downgrade (contract-handoff-057cf43, new): C-06 (thermal
//     throttling) flipped pass->fail on real S10 input; cpu's deterministic
//     letter was "B", adjusted to "C", letterSource="LLM_ADJUSTED", a real
//     adjustmentReason sentence, adjustmentEvidence an ARRAY. This is now
//     the POSITIVE case.
//
// User's own words for this file: "يظهر الوسم في الأولى، ولا يظهر في عيّنة
// security" (the marker shows in the first [cpu], not in the security
// sample) — both are exercised below, through the real components (rule
// 30), all three languages for the C shape.
//
// ---------------------------------------------------------------------------
// Evidence reference — INTENTIONAL non-display (decision 99 §4), not a bug.
// ---------------------------------------------------------------------------
// A prior version of this file labeled the missing "مرجع الدليل"
// (adjustmentEvidenceLabel) block a "BUG (reported, not fixed)": readCategories
// only accepts a STRING for adjustmentEvidence, and the real payload sends
// an ARRAY, so the reader drops it and the block never renders. The user's
// decision 99 §4: "مسار الدليل الخام (evidenceRefs) لا يُعرض في شاشة
// التقرير ولا في الـPDF، كما لا يعرضه الموقع اليوم" — the app doesn't show
// this raw path on its report screen or in the PDF either, so the website
// not showing it is the INTENDED behavior, not a gap. Re-labeled below on
// both samples (this file's own instruction: prove it on cpu too, which
// now actually HAS real evidence data available to withhold).
//
// Left unfixed, per instruction — but worth naming precisely: lib/
// reportReaders/v7.js:355's doc comment calls the array shape
// "undocumented", and its console.warn calls it an "unexpected shape". Per
// this task's order, that array IS the documented shape in the contract
// since 2026-09-22 — so the comment/warning text is arguably describing
// something the contract already specifies, not something unforeseen. Not
// changed here (not a display bug — readCategories itself is not touched
// this round); named in this task's report for the user to decide.
//
// ---------------------------------------------------------------------------
// B-shape enumeration (rule 25 — every reader of a shape gets named, not
// assumed): grep for "letterSource" across the whole repo turns up exactly
// two consumers — lib/reportReaders/v7.js (the reader) and
// components/verify/V7CategoriesGrid.js (the only renderer). V7CategoriesGrid
// is wired into /verify (app/verify/page.js) and /print
// (app/print/[shortId]/PrintClient.js) — both read shape C. Among B-shape
// (Firestore reports document) consumers — app/dashboard/page.js,
// app/shop/[slug]/ShopClient.js, app/admin/page.js, app/admin/reports/
// page.js, components/tech/EvaluationForm.js — NONE render letterSource or
// an adjusted-letter marker:
//   - /dashboard (ListingEditorCard), /shop (DeviceCard), /admin
//     (resolveGrade), /tech (resolveAppGrade/EvaluationForm): only ever
//     show the report-level letter via GradeBadge — no per-category detail
//     at all, so no letterSource surface exists to test.
//   - /admin/reports (ReportModal): DOES render a per-category detail block
//     (letter/stateRaw/coverage/letterCeilingReason.text) — but it is a
//     SEPARATE hand-built block, NOT components/verify/V7CategoriesGrid
//     (V7CategoriesGrid is not imported there at all). It does not read or
//     render letterSource/adjustmentReason/adjustmentEvidence in any form
//     in its structured display — only its raw JSON debug dump (by design)
//     shows the underlying fields.
// So for B: only the correct LETTER is checked (the user's own words: "فالحرف
// الصحيح وحده في العيّنتين" — the correct letter alone, in both samples). No
// new display added anywhere.
//
// Run: node scripts/test/letterSourceAdjusted.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { readCategories, readIssues, countIssuesByCategory } = require('@/lib/reportReaders/v7');
const V7CategoriesGrid = require('@/components/verify/V7CategoriesGrid').default;
const GradeBadge = require('@/components/GradeBadge').default;
const { translations } = require('@/lib/i18n');
const { resolveAppGrade } = require('@/lib/techEval');
const {
  loadReportsDocSecurityDowngradeSample,
  loadVerifyReportSecurityDowngradeSample,
  loadReportsDocCpuC06DowngradeSample,
  loadVerifyReportCpuC06DowngradeSample,
  withCategoryOverride,
} = require('./_shapes.cjs');

const bSecurity = loadReportsDocSecurityDowngradeSample();
const cSecurity = loadVerifyReportSecurityDowngradeSample();
const bCpu = loadReportsDocCpuC06DowngradeSample();
const cCpu = loadVerifyReportCpuC06DowngradeSample();

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

function htmlHasText(html, text) {
  return html.includes(text.replace(/'/g, '&#x27;'));
}

// ---------------------------------------------------------------------------
// Fixture sanity — confirms the real values BEFORE judging what renders
// from them (rule 26), on both shapes, both samples.
// ---------------------------------------------------------------------------
for (const [label, doc] of [['security B', bSecurity], ['security C', cSecurity]]) {
  const sec = readCategories(doc).find((c) => c.name === 'security');
  check(`${label} fixture: security.letter is "D"`, sec.letter === 'D');
  check(`${label} fixture: letterSource is now the real "DETERMINISTIC" (not LLM_ADJUSTED)`, sec.letterSourceRaw === 'DETERMINISTIC');
  check(`${label} fixture: classifyLetterSource reads it as "deterministic"`, sec.letterSource === 'deterministic');
  check(`${label} fixture: adjustmentReason is null`, sec.adjustmentReason === null);
  check(`${label} fixture: adjustmentEvidence is null`, sec.adjustmentEvidence === null);
}

for (const [label, doc] of [['cpu B', bCpu], ['cpu C', cCpu]]) {
  const cpu = readCategories(doc).find((c) => c.name === 'cpu');
  check(`${label} fixture: cpu.letter is "C" (deterministic was "B")`, cpu.letter === 'C');
  check(`${label} fixture: letterSourceRaw is the real "LLM_ADJUSTED"`, cpu.letterSourceRaw === 'LLM_ADJUSTED');
  check(`${label} fixture: classifyLetterSource reads it as "llmAdjusted"`, cpu.letterSource === 'llmAdjusted');
  check(`${label} fixture: adjustmentReason names C-06`, cpu.adjustmentReason.includes('C-06'));
  const rawEvidence = doc.aiResponse.categories.cpu.adjustmentEvidence;
  check(`${label} fixture: the RAW payload's adjustmentEvidence is an array`, Array.isArray(rawEvidence) && rawEvidence.length > 0);
  check(`${label} fixture: readCategories reads that array as null (string-only field, per its own doc comment)`, cpu.adjustmentEvidence === null);
}

// ---------------------------------------------------------------------------
// C shape — /verify and /print's real wiring (readCategories on the
// verifyReport response, then the real V7CategoriesGrid), all three
// languages. Mirrors app/verify/page.js / PrintClient.js: both pages pass
// `categories`/`issueCounts`/`t` and nothing else.
// ---------------------------------------------------------------------------
for (const lang of ['ar', 'tr', 'en']) {
  const t = translations[lang];

  // Positive case — cpu (cpu-c06-downgrade).
  {
    const categories = readCategories(cCpu);
    const counts = countIssuesByCategory(readIssues(cCpu));
    const cpu = categories.find((c) => c.name === 'cpu');
    const html = render(React.createElement(V7CategoriesGrid, { categories: [cpu], issueCounts: counts, t }));

    check(`[${lang}] cpu: shows letter "C"`, html.includes('>C<'));
    check(
      `[${lang}] cpu: shows the letterSourceAdjustedLabel marker ("${t.verify.letterSourceAdjustedLabel}")`,
      htmlHasText(html, t.verify.letterSourceAdjustedLabel)
    );
    check(`[${lang}] cpu: shows the real adjustmentReason text (C-06) verbatim`, html.includes(cpu.adjustmentReason));
    // Intentional non-display (decision 99 §4), proven on the sample that
    // actually has evidence data available to withhold.
    check(
      `[${lang}] cpu: adjustmentEvidenceLabel ("${t.verify.adjustmentEvidenceLabel}") does NOT render — INTENTIONAL per decision 99 §4 (evidenceRefs is not shown in the app or PDF either), not a gap`,
      !htmlHasText(html, t.verify.adjustmentEvidenceLabel)
    );
  }

  // Negative case — security (security-downgrade, now DETERMINISTIC).
  {
    const categories = readCategories(cSecurity);
    const counts = countIssuesByCategory(readIssues(cSecurity));
    const security = categories.find((c) => c.name === 'security');
    const html = render(React.createElement(V7CategoriesGrid, { categories: [security], issueCounts: counts, t }));

    check(`[${lang}] security: shows letter "D"`, html.includes('>D<'));
    check(
      `[${lang}] security: does NOT show the letterSourceAdjustedLabel marker (letterSource is DETERMINISTIC now)`,
      !htmlHasText(html, t.verify.letterSourceAdjustedLabel)
    );
    check(`[${lang}] security: does NOT render adjustmentEvidenceLabel either (nothing to show)`, !htmlHasText(html, t.verify.adjustmentEvidenceLabel));
  }
}

// ---------------------------------------------------------------------------
// Decision 101 §2: the evidence path must stay hidden regardless of shape —
// not just the documented array. Proven here on a CLONE of the real cpu
// sample (_shapes.cjs's withCategoryOverride — every other byte stays the
// real vendored data) with adjustmentEvidence converted to a single STRING
// (the shape that used to slip through to display before this fix), run
// through the real V7CategoriesGrid component.
// ---------------------------------------------------------------------------
{
  const t = translations.ar;
  const rawArrayEvidence = cCpu.aiResponse.categories.cpu.adjustmentEvidence;
  const singleStringEvidence = rawArrayEvidence[0];
  const cpuAsString = withCategoryOverride(cCpu, 'cpu', { adjustmentEvidence: singleStringEvidence });

  check(
    'fixture sanity: the test copy\'s cpu.adjustmentEvidence is now a single string, not the real array',
    typeof cpuAsString.aiResponse.categories.cpu.adjustmentEvidence === 'string'
  );

  const cpu = readCategories(cpuAsString).find((c) => c.name === 'cpu');
  check('cpu (evidence converted to a single string): readCategories still reads it as null', cpu.adjustmentEvidence === null);

  const counts = countIssuesByCategory(readIssues(cpuAsString));
  const html = render(React.createElement(V7CategoriesGrid, { categories: [cpu], issueCounts: counts, t }));

  check('cpu (evidence as a single string): the raw evidence path text does NOT appear anywhere on screen', !html.includes(singleStringEvidence));
  check('cpu (evidence as a single string): adjustmentEvidenceLabel does NOT render either', !htmlHasText(html, t.verify.adjustmentEvidenceLabel));
  // The rest of the card is unaffected — this is a targeted fix, not a
  // regression in the parts that were already correct.
  check('cpu (evidence as a single string): letter "C" and the adjusted marker still show normally', html.includes('>C<') && htmlHasText(html, t.verify.letterSourceAdjustedLabel));
}

// ---------------------------------------------------------------------------
// B shape — every real B-consuming component, with BOTH samples. Only the
// correct overall letter is checked (no B-reader has a letterSource
// surface at all — see the file header). Both samples' overall letter is
// "C" (unaffected by either category's letterSource change).
// ---------------------------------------------------------------------------
for (const [label, bDoc, categoryName, categoryLetter] of [
  ['security-downgrade', bSecurity, 'security', 'D'],
  ['cpu-c06-downgrade', bCpu, 'cpu', 'C'],
]) {
  const report = { ...bDoc, id: `${label}-test` };
  const t = translations.ar; // these pages are unaffected by language choice for this check

  // /dashboard
  {
    const { ListingEditorCard } = require('@/app/dashboard/page.js');
    const html = render(React.createElement(ListingEditorCard, { report, t, lang: 'ar', onSave: async () => {} }));
    check(`[${label}] /dashboard: renders the real overall letter "C", not "?"`, html.includes('>C<') && !html.includes('>?<'));
    check(`[${label}] /dashboard: no letterSource marker anywhere`, !htmlHasText(html, t.verify.letterSourceAdjustedLabel));
  }

  // /shop
  {
    const { DeviceCard } = require('@/app/shop/[slug]/ShopClient.js');
    const html = render(React.createElement(DeviceCard, { report: { ...report, scanId: report.id }, t, lang: 'ar' }));
    check(`[${label}] /shop: renders the real overall letter "C", not "?"`, html.includes('>C<') && !html.includes('>?<'));
    check(`[${label}] /shop: no letterSource marker anywhere`, !htmlHasText(html, t.verify.letterSourceAdjustedLabel));
  }

  // /admin (list)
  {
    const { resolveGrade } = require('./_load-admin-page-internals.cjs');
    const grade = resolveGrade(report);
    check(`[${label}] /admin: resolveGrade reads the real overall letter "C"`, grade === 'C');
    const html = render(React.createElement(GradeBadge, { grade, size: 'sm' }));
    check(`[${label}] /admin: GradeBadge shows "C", not "?"`, html.includes('>C<') && !html.includes('>?<'));
  }

  // /admin/reports (detail modal — the one B-reader with per-category
  // detail; confirms it shows the category's own real letter, but never a
  // letterSource-adjusted MARKER in the rendered UI text, for either
  // sample).
  {
    const { ReportModal, resolveGrade } = require('./_load-admin-reports-internals.cjs');
    check(`[${label}] /admin/reports: resolveGrade reads the real overall letter "C"`, resolveGrade(report) === 'C');
    const html = render(React.createElement(ReportModal, { report, usersMap: new Map(), onClose: () => {} }));
    // The V7 category block renders letter+coverage as one text run
    // ("D · 90%"/"C · ...%", app/admin/reports/page.js's own template).
    check(
      `[${label}] /admin/reports: ${categoryName} category shows its real letter "${categoryLetter}" in the V7 category block`,
      html.includes(`>${categoryName}</span><span class="text-sm font-semibold text-nc-text1">${categoryLetter}`)
    );
    check(
      `[${label}] /admin/reports: no letterSourceAdjustedLabel UI marker text anywhere`,
      !htmlHasText(html, t.verify.letterSourceAdjustedLabel)
    );
  }

  // /tech
  {
    check(`[${label}] /tech: resolveAppGrade reads the real overall letter "C", not "?"`, resolveAppGrade(report) === 'C');
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
    check(`[${label}] /tech EvaluationForm: shows the real overall letter "C" once revealed`, html.includes('>C<'));
    check(`[${label}] /tech EvaluationForm: no letterSource marker anywhere`, !htmlHasText(html, t.verify.letterSourceAdjustedLabel));
  }
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
