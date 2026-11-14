'use strict';

// resolveAppGrade (lib/techEval.js) — used by components/tech/EvaluationForm.js
// and components/tech/ScanCard.js to show "our" grade on the technician
// panel. Before this task it read only report.grade / report.aiResponse.
// overallGrade (V6-only), so every V7 report showed '?'. Fixed to branch via
// the same shared readers already used by app/shop/[slug]/ShopClient.js
// (ff5a139), app/admin/page.js (ba46c00), and app/admin/reports/page.js
// (76c25fa) — lib/pipelineTags.js + lib/reportReaders/{v6,v7}.js.
//
// ⚠️ 2026-09-24 (coordinator decision, tools-website-v7-shape-probe.cjs,
// rule 37 incident): /tech reads reports straight from Firestore
// (app/tech/page.js's load(): `{id: d.id, ...d.data()}`) — the SAME shape
// admin/reports/admin-dashboard/dashboard/shop read (shape B), now vendored
// at contract/v7-reports-document-sample.json. The full V7 display shape
// lives under `aiResponse`, NOT the document's own top level. Every V7
// fixture below is that real fixture (spread with a synthetic `id`, exactly
// matching the real `{id: d.id, ...d.data()}` construction — `id` itself is
// never part of the stored document).
//
// Run: node scripts/test/resolveAppGrade.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { resolveAppGrade } = require('@/lib/techEval');
const ScanCard = require('@/components/tech/ScanCard').default;
const EvaluationForm = require('@/components/tech/EvaluationForm').default;
const { loadReportsDocSample, loadReportsDocHonorSample, withAiResponseOverride } = require('./_shapes.cjs');

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

function realReportsDoc(overrides) {
  const base = loadReportsDocSample();
  return { id: 'x', ...(overrides ? withAiResponseOverride(base, overrides) : base) };
}

// ---------------------------------------------------------------------------
// V7 report — the real, unmodified vendored Firestore document.
// ---------------------------------------------------------------------------
{
  const v7Report = realReportsDoc();
  check(
    'V7 report (real Firestore doc shape) resolves to its real aiResponse.overall.letter ("C") — was "?" before this task',
    resolveAppGrade(v7Report) === 'C'
  );
}

// ---------------------------------------------------------------------------
// V6 report — no `pipeline` field at all, exactly every report in today's
// inventory per lib/pipelineTags.js's doc comment. Behavior must be
// unchanged from before this task. (V6 has no real vendored fixture in
// this repo yet — see this task's report — so this remains a plain
// fixture matching the documented pre-task V6 shape.)
// ---------------------------------------------------------------------------
{
  const v6Report = { grade: 'A' };
  check('V6 report (no pipeline field) with grade="A" resolves to "A" — unchanged', resolveAppGrade(v6Report) === 'A');

  const v6ReportViaAiResponse = { aiResponse: { overallGrade: 'd' } };
  check(
    'V6 report via aiResponse.overallGrade fallback (lowercase) still uppercases to "D" — unchanged',
    resolveAppGrade(v6ReportViaAiResponse) === 'D'
  );
}

// ---------------------------------------------------------------------------
// No letter anywhere — must be null, not a guess, and (W4, 2026-10-01) no
// longer the literal '?' this file used to require: that was a deliberate,
// documented exception to how every other page treats a missing grade
// (GradeBadge.js's own '—' convention, already tested end-to-end by
// scripts/test/honorNoLetter.test.cjs), closed by this task. Real fixture
// with aiResponse.overall.letter overridden to null.
// ---------------------------------------------------------------------------
{
  check('report with no grade field at all resolves to null', resolveAppGrade({}) === null);
  check('null report resolves to null', resolveAppGrade(null) === null);

  const base = loadReportsDocSample();
  const v7NoLetter = { id: 'x', ...base, aiResponse: { ...base.aiResponse, overall: { ...base.aiResponse.overall, letter: null } } };
  check('V7 report (real doc shape) with overall.letter=null resolves to null (not invented)', resolveAppGrade(v7NoLetter) === null);
}

// ---------------------------------------------------------------------------
// Unrecognized pipeline tag — falls back to the V6 reader as best effort,
// matching app/admin/reports/page.js's classifyReportPipeline behavior.
// ---------------------------------------------------------------------------
{
  const base = loadReportsDocSample();
  const unknownTag = {
    id: 'x',
    ...base,
    pipeline: 'some_future_pipeline',
    grade: 'B',
    aiResponse: { ...base.aiResponse, pipeline: 'some_future_pipeline' },
  };
  check('unrecognized pipeline tag (real doc shape) falls back to V6 reader (grade="B")', resolveAppGrade(unknownTag) === 'B');
}

// ---------------------------------------------------------------------------
// Full path through the actual component (rule 30 — a reader/resolver-only
// test does not prove the value reaches the screen correctly; render the
// real components/tech/ScanCard.js, which is what EvaluationForm.js and
// ScanCard.js actually call resolveAppGrade() from).
// ---------------------------------------------------------------------------
{
  const v7Report = realReportsDoc();
  // Grade is masked until an evaluation exists (REVEAL_APP_GRADE_BEFORE_
  // EVALUATION in lib/techEval.js) — an evaluation is required to reveal it.
  const evaluation = { technicianGrade: 'B', agreement: 'agree' };
  const html = renderToStaticMarkup(
    React.createElement(ScanCard, { report: v7Report, evaluation, onOpen: () => {}, lang: 'ar' })
  );
  check('ScanCard renders the real V7 grade letter "C" in the DOM (was "?" before this task)', html.includes('>C<'));
  check('ScanCard uses the correct grade-C color class', html.includes('bg-nc-grade-c'));
  check('ScanCard does NOT render "?"  for a V7 report with a real letter', !html.includes('>?<'));
}

// ---------------------------------------------------------------------------
// W4 (task order, 2026-10-01) — the fix itself: full path for the NO-LETTER
// case, through both real /tech components. Uses the real Honor fixture
// (scanId e4b65a2f, overall.letter=null — the same one scripts/test/
// honorNoLetter.test.cjs uses for every other page), which that file's own
// header comment explicitly named as NOT covering /tech, deferring it as
// out of that task's scope. This closes that gap.
// ---------------------------------------------------------------------------
{
  const honorReport = { id: 'x', ...loadReportsDocHonorSample() };
  check('fixture sanity: Honor (real doc shape) resolveAppGrade is null, not "?"', resolveAppGrade(honorReport) === null);

  const evaluation = { technicianGrade: 'B', agreement: 'agree' };

  const scanCardHtml = renderToStaticMarkup(
    React.createElement(ScanCard, { report: honorReport, evaluation, onOpen: () => {}, lang: 'ar' })
  );
  check('ScanCard (Honor, no letter): renders "—" in the grade slot', scanCardHtml.includes('>—<'));
  check('ScanCard (Honor, no letter): does NOT render a bare "?"', !scanCardHtml.includes('>?<'));

  const evalFormHtml = renderToStaticMarkup(
    React.createElement(EvaluationForm, {
      report: honorReport,
      evaluation,
      technicianName: 'Test Tech',
      onSaved: () => {},
      onBack: () => {},
      lang: 'ar',
    })
  );
  check('EvaluationForm (Honor, no letter): renders "—" in the app-grade tile', evalFormHtml.includes('>—<'));
  check('EvaluationForm (Honor, no letter): does NOT render a bare "?"', !evalFormHtml.includes('>?<'));
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
