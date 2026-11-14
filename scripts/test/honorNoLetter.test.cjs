'use strict';

// "Honor" (scanId e4b65a2f) — full-path test for the one real sample this
// repo has of overall.letter===null WITH harnessError===true (the test
// harness itself failed — functionalResults=null — not "nothing measured").
// Task order, item 2 (2026-09-24): "الصفحة تعرض الحالة وسببها، لا «?» ولا
// خانة فارغة." Fixtures: contract/v7-reports-document-sample-honor.json (B)
// and contract/v7-verifyReport-response-sample-honor.json (C) —
// contract-handoff-77b710a, sha256-verified on receipt (see contract/
// README.md). Every page tested with the shape it actually receives, per
// this file's own convention (see scripts/test/_shapes.cjs's header):
//   - /verify, /print receive C — exercised below via the REAL HeroCard,
//     V7Notices, IssuesList, NarrativeIncompleteNotice components, wired
//     exactly as app/verify/page.js / app/print/[shortId]/PrintClient.js
//     wire them (including this task's gradeUnavailableNote fix — see
//     those two files' matching comments).
//   - admin/reports, app/admin/page.js, app/dashboard/page.js,
//     app/shop/[slug]/ShopClient.js all read B directly and feed
//     readOverall(report).letter into the shared components/GradeBadge.js
//     — exercised below via that REAL component, not a reimplementation.
//   - components/tech/ScanCard.js / EvaluationForm.js: UPDATE (task order
//     "W4", 2026-10-01) — this comment used to say these were NOT covered
//     here because lib/techEval.js's resolveAppGrade() deliberately returned
//     the literal string '?', out of an earlier task's scope. That exception
//     is closed: resolveAppGrade now returns null on absence, like every
//     other reader on this page, and both components render "—" for it.
//     The Honor full-render coverage for these two components lives in
//     scripts/test/resolveAppGrade.test.cjs (which already owns
//     resolveAppGrade's contract) rather than duplicated here — see that
//     file's own "W4" section, same Honor fixture.
//
// Run: node scripts/test/honorNoLetter.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const {
  readOverall,
  readCategories,
  readIssues,
  readNarrativeIncomplete,
  countIssuesByCategory,
  classifyV7Severity,
} = require('@/lib/reportReaders/v7');
const HeroCard = require('@/components/verify/HeroCard').default;
const V7Notices = require('@/components/verify/V7Notices').default;
const V7CategoriesGrid = require('@/components/verify/V7CategoriesGrid').default;
const IssuesList = require('@/components/verify/IssuesList').default;
const NarrativeIncompleteNotice = require('@/components/verify/NarrativeIncompleteNotice').default;
const GradeBadge = require('@/components/GradeBadge').default;
const { translations } = require('@/lib/i18n');
const { loadReportsDocHonorSample, loadVerifyReportHonorSample } = require('./_shapes.cjs');

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

// ---------------------------------------------------------------------------
// Fixture sanity — confirms this really is the letter=null/harnessError=true
// state on BOTH real shapes before testing what renders from it (rule 26:
// verify the input matches what the task says before judging the output).
// ---------------------------------------------------------------------------
const honorC = loadVerifyReportHonorSample();
const honorB = loadReportsDocHonorSample();
const overallC = readOverall(honorC);
const overallB = readOverall(honorB);

check('Honor C: letter is null', overallC.letter === null);
check('Honor C: harnessError is true', overallC.harnessError === true);
check('Honor C: harnessErrorReason is the real payload string', overallC.harnessErrorReason === 'FUNCTIONAL_RESULTS_UNAVAILABLE');
check('Honor B: letter is null', overallB.letter === null);
check('Honor B: harnessError is true', overallB.harnessError === true);
check('Honor B: harnessErrorReason matches C (same underlying report)', overallB.harnessErrorReason === overallC.harnessErrorReason);

// ---------------------------------------------------------------------------
// /verify, /print — HeroCard. Mirrors app/verify/page.js's V7 wiring
// (including this task's and W6's fixes) exactly, then renders the REAL
// component.
//
// W6 (2026-10-01, S-13) update: harnessErrorReason used to be shown
// verbatim here — a raw backend code ("FUNCTIONAL_RESULTS_UNAVAILABLE" on
// this real sample), never meant for a buyer. This now reads
// harnessErrorMessage with a buyer-safe fallback, matching the real page
// wiring exactly. Per rule 23, the old assertion asserting the raw code as
// CORRECT behavior is replaced, not kept alongside a new one.
//
// UPDATE (golden sync to neuralcheck-backend d5b6c29, rule 23): the synced
// Honor samples NOW CARRY the server's `harnessErrorMessage` («تعذّر تجهيز
// نتائج الاختبارات لهذا الفحص، وهذا ليس حكماً على الجهاز.»), so the sanity
// assertion "Honor has no harnessErrorMessage yet (backend has not shipped
// it)" is replaced by its truth, and the "renders the fallback note"
// assertions — which would now pass VACUOUSLY in Arabic, because the
// fallback text equals the server's message — are replaced by assertions on
// the REAL message the sample carries. (The fallback itself, for a report
// that lacks the message, is tested in harnessErrorMessage.test.cjs on the
// real Honor with the field deleted.)
// ---------------------------------------------------------------------------
{
  const grade = overallC.letter;
  const gradeUnavailableNote = grade
    ? undefined
    : overallC.harnessError
      ? overallC.harnessErrorMessage || t.verify.v7HarnessErrorMessageUnavailable
      : overallC.noDataAtAll
        ? overallC.zeroMeasuredMessage || undefined
        : undefined;

  const html = render(
    React.createElement(HeroCard, {
      grade,
      score: null,
      deviceName: 'Unknown',
      tierRaw: null,
      year: null,
      createdAt: null,
      t,
      lang: 'ar',
      gradeUnavailableNote,
      scoreUnavailableNote: undefined,
      coverageNote: null,
    })
  );

  check('fixture sanity: the real Honor C sample carries the server\'s harnessErrorMessage (a non-empty string)', typeof overallC.harnessErrorMessage === 'string' && overallC.harnessErrorMessage.length > 0);
  check('HeroCard: does not render a bare "?" glyph for Honor', !html.includes('>?<'));
  check('HeroCard: renders "—" in the grade circle instead', html.includes('>—<'));
  check('HeroCard: does NOT render the raw harnessErrorReason code to the buyer', !html.includes('FUNCTIONAL_RESULTS_UNAVAILABLE'));
  check('HeroCard: renders the REAL server message (harnessErrorMessage) as the "why" note', html.includes(overallC.harnessErrorMessage));
}

// ---------------------------------------------------------------------------
// V7Notices — already wired before this task; confirms no regression and
// that the harness-error box shows the server's real message, never the raw
// code (W6, 2026-10-01; real message since the d5b6c29 golden sync).
// ---------------------------------------------------------------------------
{
  const html = render(React.createElement(V7Notices, { overall: overallC, t }));
  check('V7Notices: renders for Honor (harnessError true)', html.length > 0);
  check('V7Notices: does NOT render the raw harnessErrorReason code to the buyer', !html.includes(overallC.harnessErrorReason));
  check('V7Notices: shows the REAL server message (harnessErrorMessage) in the harness-error box', html.includes(overallC.harnessErrorMessage));
  check('V7Notices: does not render a bare "?" glyph', !html.includes('>?<'));
}

// ---------------------------------------------------------------------------
// IssuesList — Honor's one real issue (DISC-HARNESS_ERROR, severity INFO)
// carries genuine human-readable Arabic prose explaining the same state in
// buyer-facing language, distinct from the raw enum harnessErrorReason
// above. Confirms it actually reaches the screen, not just the reader.
// ---------------------------------------------------------------------------
{
  const issues = readIssues(honorC);
  check('Honor C: exactly one issue (DISC-HARNESS_ERROR)', issues.length === 1 && issues[0].id === 'DISC-HARNESS_ERROR');
  check('Honor C: issue severity is INFO (raw, pre-classification)', issues[0].severity === 'INFO');

  const html = render(
    React.createElement(IssuesList, { issues, t, severityClassifier: classifyV7Severity })
  );
  check('IssuesList: renders the real issue title verbatim', html.includes(issues[0].title));
  check('IssuesList: classifies it as info, not unknown', html.includes(t.verify.severityInfo) && !html.includes(t.verify.severityUnknown));
}

// ---------------------------------------------------------------------------
// NarrativeIncompleteNotice — Honor has narrativeIncomplete=true (no
// narrative fields were produced for a harness-error scan). Confirms the
// already-wired notice actually fires for this real state.
//
// Item 91.3 of the open-items log (قرار ١٠٤ البند ٩١.٣، 2026-09-26): this
// was AR-only (this file's module-level `t = translations.ar`, line ~50),
// unlike decision 91 §3's original order for this same key
// ("اختبار على /verify باللغات الثلاث") — narrativeIncomplete.test.cjs
// already loops ar/tr/en, but only on the S10 sample with
// narrativeIncomplete FORCED via withAiResponseOverride, never on the
// Honor sample's naturally-real narrativeIncomplete=true. Widened HERE
// (this file), not narrativeIncomplete.test.cjs's loop, because the real,
// unforced value is specific to Honor — the other four sections of this
// file (HeroCard, V7Notices, IssuesList, V7CategoriesGrid, GradeBadge)
// were not named by this item and stay AR-only.
// ---------------------------------------------------------------------------
{
  const inc = readNarrativeIncomplete(honorC);
  check('Honor C: narrativeIncomplete reads as ok/true', inc.status === 'ok' && inc.value === true);

  for (const lang of ['ar', 'tr', 'en']) {
    const tLang = translations[lang];
    // decision 91 §3 (2026-09-25): the notice text moved to lib/i18n.js's
    // verify.v7NarrativeIncomplete (was NARRATIVE_INCOMPLETE_NOTICE, a fixed
    // export from lib/reportReaders/v7.js) — the component now takes `t`.
    const html = render(React.createElement(NarrativeIncompleteNotice, { status: inc.status, value: inc.value, t: tLang }));
    // Checked against lib/i18n.js's own live value (not a hardcoded literal
    // duplicated here) — the exact-string content lock for all three
    // languages already lives in narrativeIncomplete.test.cjs:61-73; this
    // check is about the real Honor payload actually reaching the render
    // in each language, verbatim, not about re-asserting the sentence text.
    check(`[${lang}] NarrativeIncompleteNotice: shows the real notice text for Honor, verbatim from lib/i18n.js`, html.includes(tLang.verify.v7NarrativeIncomplete));
  }
}

// ---------------------------------------------------------------------------
// V7CategoriesGrid — 14 of 15 categories carry state="HARNESS_ERROR", a
// real value this repo has observed since Honor arrived. Superseded
// 2026-09-24 (decision 82 §1): classifyCategoryState now recognizes
// HARNESS_ERROR as its own bucket (relayed backend enum,
// categoryStates.js:70-72 — this repo's agent could not verify that file
// directly). It used to fall into 'unknown' and render a raw debug marker
// (`state: HARNESS_ERROR`) — this test previously asserted exactly that,
// which would now be WRONG (rule: replace the test that proved the old
// behavior, don't leave it alongside a new one). It now asserts the
// corrected classification AND that the approved decision-82-§1 sentence
// (lib/i18n.js's v7StateHarnessError) renders verbatim, and that the old
// debug marker is gone for this now-recognized state.
// ---------------------------------------------------------------------------
{
  const cats = readCategories(honorC);
  const harnessErrorCats = cats.filter((c) => c.stateRaw === 'HARNESS_ERROR');
  check('Honor C: 14 categories carry the real HARNESS_ERROR state', harnessErrorCats.length === 14);
  check('Honor C: all 14 classify as "harnessError", not "unknown"', harnessErrorCats.every((c) => c.state === 'harnessError'));

  const html = render(
    React.createElement(V7CategoriesGrid, { categories: cats, issueCounts: countIssuesByCategory(readIssues(honorC)), t })
  );
  check(
    'V7CategoriesGrid: renders the approved harnessError sentence verbatim',
    html.includes(t.verify.v7StateHarnessError)
  );
  check('V7CategoriesGrid: no longer shows the raw debug marker for this now-recognized state', !html.includes('state: HARNESS_ERROR'));
  check('V7CategoriesGrid: does not render a bare "?" glyph (icon only, no literal character)', !html.includes('>?<'));
}

// ---------------------------------------------------------------------------
// admin/reports, admin dashboard, /dashboard, /shop — all four feed
// readOverall(report).letter into the shared components/GradeBadge.js.
// Exercises that REAL shared component with Honor's real null letter.
// ---------------------------------------------------------------------------
{
  const htmlSm = render(React.createElement(GradeBadge, { grade: overallB.letter, size: 'sm' }));
  const htmlLg = render(React.createElement(GradeBadge, { grade: overallB.letter, size: 'lg' }));
  check('GradeBadge (sm): does not render a bare "?" for Honor\'s null letter', !htmlSm.includes('>?<'));
  check('GradeBadge (sm): renders "—" instead', htmlSm.includes('>—<'));
  check('GradeBadge (lg): does not render a bare "?" for Honor\'s null letter', !htmlLg.includes('>?<'));
  check('GradeBadge (lg): renders "—" instead', htmlLg.includes('>—<'));
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
