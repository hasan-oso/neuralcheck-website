'use strict';

// narrativeIncomplete — full-path test (reader + the actual component),
// coordinator decision 72 (2026-09-23). Four cases, matching the order
// exactly: true, false, absent (missing), and an invalid (non-boolean)
// value. Renders the REAL components/verify/NarrativeIncompleteNotice.js
// via lib/reportReaders/v7.js's readNarrativeIncomplete() — no
// reimplementation of either (rule 30, same rationale as
// letterCeilingReason.test.cjs in this directory).
//
// ⚠️ 2026-09-24 (coordinator decision): NarrativeIncompleteNotice is wired
// into /verify only, which fetches the REAL verifyReport response shape
// (C), now vendored at contract/v7-verifyReport-response-sample.json.
// Every fixture below is that real fixture, cloned and overridden on
// exactly `aiResponse.narrativeIncomplete` (scripts/test/_shapes.cjs) —
// never a shape derived from the raw contract-sample shape (A).
//
// ⚠️ 2026-09-25 (decision 91 §3): the notice text is no longer a fixed,
// language-independent constant (NARRATIVE_INCOMPLETE_NOTICE, exported from
// lib/reportReaders/v7.js) — it moved to lib/i18n.js's per-language
// verify.v7NarrativeIncomplete, and the component now takes a `t` prop.
// Rewritten (not left importing the removed export) to test all three
// languages, per rule 41's per-shape testing and the task order's explicit
// "اختبار على /verify باللغات الثلاث".
//
// Run: node scripts/test/narrativeIncomplete.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { readNarrativeIncomplete } = require('@/lib/reportReaders/v7');
const { translations } = require('@/lib/i18n');
const NarrativeIncompleteNotice = require('@/components/verify/NarrativeIncompleteNotice').default;
const { loadVerifyReportSample, withAiResponseOverride, withAiResponseKeyDeleted } = require('./_shapes.cjs');

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

function renderFor(report, t) {
  const result = readNarrativeIncomplete(report);
  const html = renderToStaticMarkup(
    React.createElement(NarrativeIncompleteNotice, { status: result.status, value: result.value, t })
  );
  return { result, html };
}

// ---------------------------------------------------------------------------
// The required notice text itself, per language — content-locked, not just
// "renders whatever the key holds" (decision 91 §3's exact approved text,
// tr/en included). AR must not claim "صحيحة" (unmeasured claim, explicitly
// forbidden by decision 72's order).
// ---------------------------------------------------------------------------
check(
  'ar notice text matches the required sentence exactly',
  translations.ar.verify.v7NarrativeIncomplete === 'الشرح غير مكتمل. الحروف والتغطية محسوبة من القياس.'
);
check('ar notice text does NOT contain "صحيحة"', !translations.ar.verify.v7NarrativeIncomplete.includes('صحيحة'));
check(
  'tr notice text matches NeuralChek\'s committed string (values-tr:193, relayed) exactly',
  translations.tr.verify.v7NarrativeIncomplete === 'Açıklama eksik. Harf notları ve kapsam ölçümden hesaplanmıştır.'
);
check(
  'en notice text matches the approved sentence exactly',
  translations.en.verify.v7NarrativeIncomplete === 'The explanation is incomplete. The grades and coverage are computed from the measurements.'
);

// ---------------------------------------------------------------------------
// Real sample as-is — the vendored verifyReport response carries
// narrativeIncomplete: false today (documented sample limitation,
// contract/README.md — resolveV7Report was never called when it was
// generated), so the real fixture, completely unmodified, must render
// nothing here. Checked once (language-independent: false renders nothing
// regardless of `t`).
// ---------------------------------------------------------------------------
{
  const base = loadVerifyReportSample();
  check('real fixture: narrativeIncomplete is false today (documented gap)', base.aiResponse.narrativeIncomplete === false);
  const { result, html } = renderFor(base, translations.ar);
  check('real fixture: reader status ok, value false', result.status === 'ok' && result.value === false);
  check('real fixture: renders nothing', html === '');
}

// ---------------------------------------------------------------------------
// Cases 1-4, run for each of the three site languages — rule 30: every
// value this key can take, in every language it is shown in, not one.
// ---------------------------------------------------------------------------
for (const lang of ['ar', 'tr', 'en']) {
  const t = translations[lang];

  // Case 1 — real fixture, narrativeIncomplete overridden to true → the
  // notice renders verbatim, in this language.
  {
    const { result, html } = renderFor(withAiResponseOverride(loadVerifyReportSample(), { narrativeIncomplete: true }), t);
    check(`[${lang}] true: reader status ok`, result.status === 'ok');
    check(`[${lang}] true: reader value true`, result.value === true);
    check(`[${lang}] true: component renders the exact notice text for this language`, html.includes(t.verify.v7NarrativeIncomplete));
    check(`[${lang}] true: component does not render a debug marker`, !html.includes('narrativeIncomplete:'));
  }

  // Case 2 — real fixture, narrativeIncomplete explicitly false (same as
  // the real value, kept as its own explicit case) → nothing rendered.
  {
    const { result, html } = renderFor(withAiResponseOverride(loadVerifyReportSample(), { narrativeIncomplete: false }), t);
    check(`[${lang}] false: reader status ok`, result.status === 'ok');
    check(`[${lang}] false: reader value false`, result.value === false);
    check(`[${lang}] false: component renders nothing`, html === '');
  }

  // Case 3 — real fixture, narrativeIncomplete key DELETED entirely →
  // explicit "missing" debug marker (language-independent — a raw dev
  // marker, not user-facing prose), never read as false/"complete".
  {
    const reportNoKey = withAiResponseKeyDeleted(loadVerifyReportSample(), 'narrativeIncomplete');
    check(`[${lang}] missing: fixture truly lacks the key`, !Object.prototype.hasOwnProperty.call(reportNoKey.aiResponse, 'narrativeIncomplete'));
    const { result, html } = renderFor(reportNoKey, t);
    check(`[${lang}] missing: reader status missing`, result.status === 'missing');
    check(`[${lang}] missing: reader value null (not false)`, result.value === null);
    check(`[${lang}] missing: component renders the explicit missing marker`, html.includes('narrativeIncomplete: missing'));
    check(`[${lang}] missing: component does NOT render the notice text (would be wrong: this is not "complete")`, !html.includes(t.verify.v7NarrativeIncomplete));
  }

  // Case 4 — real fixture, narrativeIncomplete overridden to a non-boolean
  // value → explicit "invalid" debug marker.
  {
    const { result, html } = renderFor(withAiResponseOverride(loadVerifyReportSample(), { narrativeIncomplete: 'yes' }), t);
    check(`[${lang}] invalid: reader status invalid`, result.status === 'invalid');
    check(`[${lang}] invalid: reader value null`, result.value === null);
    check(`[${lang}] invalid: component renders the explicit invalid marker`, html.includes('narrativeIncomplete: invalid'));
    check(`[${lang}] invalid: component does NOT render the notice text`, !html.includes(t.verify.v7NarrativeIncomplete));
  }
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
