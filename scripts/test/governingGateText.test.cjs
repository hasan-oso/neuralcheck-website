'use strict';

// W1 / A1 — the user's order (2026-09-30/10-01, relayed from the plan) +
// decision S1: "لكل بوّابة جملة عربية للعرض في governingGateReason
// وletterCeilingReason. ولا يُعرض الاسم … ولا المصدر … ويبقى الاسم والمصدر
// في البيانات للّوحة."
//
//   - lib/reportReaders/v7.js's readOverall reads governingGateReason.text
//     with the same type check as its siblings (name/ceilingLetter/source are
//     STILL read — they stay in the data for the admin panel).
//   - components/verify/V7Notices.js's gate card shows that sentence under
//     its title and renders NONE of name / source / the old badge, on every
//     route that mounts it (/verify, /print, /shop/[slug], /tech,
//     /dashboard).
//   - 2026-10-07, البند ١ و٢: the "السقف: C" badge is removed (the server's
//     sentence already says "أعلى حرف C") and its i18n label key deleted in
//     all three languages; the card's title (governingGateLabel) is now
//     "سبب الحرف العامّ" / "Genel harf notunun nedeni" / "Reason for the
//     overall grade" (locked in i18nApprovedTranslations.test.cjs).
//   - 2026-10-07, البند ٤: when `text` is absent (or empty, or not a string —
//     a report from before a92d503, or an unmatched gate) V7Notices renders
//     NO gate card at all: not its title alone, no marker attribute, no empty
//     container, no name/source substitute, no invented wording. The state
//     stays explicit in the data (text: null) and the console warning
//     (rule 22). The overall letter and the partial-assessment tag are
//     rendered by HeroCard — not by V7Notices — and must stay exactly as they
//     are; proven below through the real /verify and /print wiring
//     (HeroCard + V7Notices), not just the card.
//
// REPLACED ON THE REAL SAMPLES 2026-10-07 (golden sync to neuralcheck-backend
// d5b6c29). This file used to be marked «NOT A GOLDEN SAMPLE»: the vendored
// copies had no `text`, so "text present" was a relayed object placed on a
// deep clone, and "text absent" used the stale sample as it was. After the
// sync every gate-bearing real sample carries the server's `text`:
//   - TEXT PRESENT: the REAL, unmodified synced samples — default,
//     security-downgrade and cpu-c06-downgrade, in shape C (/verify, /print)
//     and shape B (the Firestore document /shop, /dashboard, /tech read).
//   - TEXT ABSENT: no golden sample lacks it any more, so it is BUILT IN
//     MEMORY from the synced real sample with `text` deleted — marked «the
//     shape of pre-a92d503 reports». No new file in contract/. (The
//     contract-violation cases — a non-string, empty or whitespace `text` —
//     are synthetic by nature, built on the same real sample.)
//   - HONOR: governingGateReason is a real null, as before.
//
// Run: node scripts/test/governingGateText.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { readOverall } = require('@/lib/reportReaders/v7');
const V7Notices = require('@/components/verify/V7Notices').default;
const HeroCard = require('@/components/verify/HeroCard').default;
const { translations } = require('@/lib/i18n');
const {
  loadVerifyReportSample,
  loadReportsDocSample,
  loadVerifyReportSecurityDowngradeSample,
  loadReportsDocSecurityDowngradeSample,
  loadVerifyReportCpuC06DowngradeSample,
  loadReportsDocCpuC06DowngradeSample,
  loadVerifyReportHonorSample,
  loadReportsDocHonorSample,
  withAiResponseOverride,
} = require('./_shapes.cjs');

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

// react-dom/server separates adjacent text nodes with <!-- -->; strip them so
// adjacent text nodes never read as separate fragments.
function render(el) {
  return renderToStaticMarkup(el).replace(/<!-- -->/g, '');
}
// The text the buyer actually reads: every text node, in order.
function visibleTexts(html) {
  return html.replace(/<[^>]+>/g, '\u0000').split('\u0000').map((s) => s.trim()).filter(Boolean);
}
function captureWarnings(fn) {
  const original = console.warn;
  const seen = [];
  console.warn = (...args) => { seen.push(args.map(String).join(' ')); };
  try {
    return { result: fn(), warnings: seen };
  } finally {
    console.warn = original;
  }
}
const GATE_WARNING = 'governingGateReason has no usable `text`';

// Shape C (verifyReport response — /verify, /print): the overall fields are
// flattened directly onto aiResponse. Shape B (Firestore reports document —
// /shop, /tech, /dashboard, admin): nested under aiResponse.overall.
const gateOfC = (doc) => doc.aiResponse.governingGateReason;
const gateOfB = (doc) => doc.aiResponse.overall.governingGateReason;

// «the shape of pre-a92d503 reports»: the REAL synced sample with the gate's
// `text` deleted, in memory only (nothing written to contract/).
function withoutGateText(doc, shape) {
  const clone = JSON.parse(JSON.stringify(doc));
  delete (shape === 'C' ? gateOfC(clone) : gateOfB(clone)).text;
  return clone;
}
// A contract-violation `text` (synthetic by nature) on the real sample.
function withGateTextValue(doc, shape, value) {
  const clone = JSON.parse(JSON.stringify(doc));
  (shape === 'C' ? gateOfC(clone) : gateOfB(clone)).text = value;
  return clone;
}

const REAL_GATES = {
  'default C': { shape: 'C', doc: loadVerifyReportSample() },
  'default B': { shape: 'B', doc: loadReportsDocSample() },
  'security-downgrade C': { shape: 'C', doc: loadVerifyReportSecurityDowngradeSample() },
  'security-downgrade B': { shape: 'B', doc: loadReportsDocSecurityDowngradeSample() },
  'cpu-c06-downgrade C': { shape: 'C', doc: loadVerifyReportCpuC06DowngradeSample() },
  'cpu-c06-downgrade B': { shape: 'B', doc: loadReportsDocCpuC06DowngradeSample() },
};
const realC = REAL_GATES['default C'].doc;
const realB = REAL_GATES['default B'].doc;
const gateText = (entry) => (entry.shape === 'C' ? gateOfC(entry.doc) : gateOfB(entry.doc)).text;
const SENTENCE = gateText(REAL_GATES['default C']); // the server's sentence, as the sample carries it
const olderC = withoutGateText(realC, 'C'); // the shape of pre-a92d503 reports
const olderB = withoutGateText(realB, 'B'); // the shape of pre-a92d503 reports

// The /verify and /print wiring for V7 (app/verify/page.js ~:210-218 and
// :368-403; app/print/[shortId]/PrintClient.js ~:177-191 and :260-276): the
// hero gets the overall letter and the partial-assessment tag's sentence
// (coverageNote); V7Notices gets the same readOverall object. Replicated
// line-for-line as honorNoLetter.test.cjs does — the real components, the
// real wiring, never a reimplementation of the components themselves.
function verifyLikeRender(report, t, lang) {
  const overall = readOverall(report);
  const grade = overall.letter;
  const coverageNote =
    overall.partialAssessment && overall.partialAssessmentTag?.text ? overall.partialAssessmentTag.text : null;
  const hero = render(
    React.createElement(HeroCard, {
      grade, score: null, deviceName: 'Test device', tierRaw: null, year: null, createdAt: null,
      t, lang, gradeUnavailableNote: undefined, coverageNote,
    })
  );
  const notices = render(React.createElement(V7Notices, { overall, t }));
  return { overall, hero, notices, page: hero + notices };
}

// ---------------------------------------------------------------------------
// Fixture sanity — the premises, on the REAL synced samples.
// ---------------------------------------------------------------------------
for (const [name, entry] of Object.entries(REAL_GATES)) {
  const gate = entry.shape === 'C' ? gateOfC(entry.doc) : gateOfB(entry.doc);
  check(`fixture sanity: the real ${name} sample carries a gate WITH the server's \`text\` sentence`, typeof gate.text === 'string' && gate.text.trim().length > 0);
  check(`fixture sanity: the real ${name} sample's sentence opens with «أعلى حرف»`, gate.text.startsWith('أعلى حرف'));
  check(`fixture sanity: the real ${name} sample still carries the gate's name and source (they stay in the data)`, gate.name === 'ROOT_DETECTED' && gate.source === 'SEC-04=fail');
}
check('fixture sanity: B and C of the default sample carry the very same sentence', gateText(REAL_GATES['default B']) === gateText(REAL_GATES['default C']));
check('fixture sanity: the in-memory pre-a92d503 copies really lack `text` (and only that)', !('text' in gateOfC(olderC)) && !('text' in gateOfB(olderB)) && gateOfC(olderC).name === 'ROOT_DETECTED' && gateOfC(olderC).ceilingLetter === 'C');
{
  const o = readOverall(realC);
  check('fixture sanity: the real default C sample carries an overall letter ("C")', o.letter === 'C');
  check('fixture sanity: …and a partial-assessment tag sentence (partialAssessment=true)', o.partialAssessment === true && typeof o.partialAssessmentTag?.text === 'string' && o.partialAssessmentTag.text.length > 0);
}

// ---------------------------------------------------------------------------
// Reader — text is read (all four fields, both shapes), same type check; a
// gate with no usable text is warned about (rule 22), never silent.
// ---------------------------------------------------------------------------
{
  const gC = readOverall(realC).governingGateReason;
  const gB = readOverall(realB).governingGateReason;
  check('readOverall (C): reads the sentence in `text`', gC.text === SENTENCE);
  check('readOverall (B): reads the sentence in `text`', gB.text === SENTENCE);
  check('readOverall (C): name/ceilingLetter/source are STILL read (they stay in the data for the admin panel)', gC.name === 'ROOT_DETECTED' && gC.ceilingLetter === 'C' && gC.source === 'SEC-04=fail');
  check('readOverall: B and C read the gate identically', JSON.stringify(gB) === JSON.stringify(gC));

  const { result: absent, warnings: w1 } = captureWarnings(() => readOverall(olderC).governingGateReason);
  check('readOverall: the pre-a92d503 shape (no `text` key) reads text as null', absent.text === null);
  check('readOverall: …and warns, once per read', w1.filter((m) => m.includes(GATE_WARNING)).length === 1);

  const { result: badType, warnings: w2 } = captureWarnings(() => readOverall(withGateTextValue(realC, 'C', 42)).governingGateReason);
  check('readOverall: a non-string `text` (contract violation) reads as null, not coerced', badType.text === null);
  check('readOverall: …and is warned about, not silent (rule 22)', w2.some((m) => m.includes(GATE_WARNING)));

  const { warnings: w3 } = captureWarnings(() => readOverall(withGateTextValue(realC, 'C', '   ')));
  check('readOverall: a whitespace-only `text` warns too (nothing usable to show)', w3.some((m) => m.includes(GATE_WARNING)));

  const { warnings: w4 } = captureWarnings(() => readOverall(realC));
  check('readOverall: no warning when `text` is present (the real sample)', !w4.some((m) => m.includes(GATE_WARNING)));
}

// ---------------------------------------------------------------------------
// CASE 1 — `text` present, on the REAL synced samples as they are: the real
// V7Notices render shows the title and the sentence; no name, no source, no
// badge. All three languages, all six gate-bearing real samples (C and B).
// ---------------------------------------------------------------------------
for (const [name, entry] of Object.entries(REAL_GATES)) {
  const sentence = gateText(entry);
  for (const lang of ['ar', 'tr', 'en']) {
    const t = translations[lang];
    const html = render(React.createElement(V7Notices, { overall: readOverall(entry.doc), t }));
    const tag = `[${lang}/${name} text present]`;
    check(`${tag} the server's sentence is shown`, html.includes(sentence));
    check(`${tag} the sentence sits in its own paragraph under the title`, new RegExp(`${t.verify.governingGateLabel}</div>.*<p[^>]*>${sentence.replace(/[()]/g, '\\$&')}</p>`).test(html));
    check(`${tag} the title (governingGateLabel) is shown`, html.includes(t.verify.governingGateLabel));
    check(`${tag} the card shows exactly: title, sentence — nothing else`, JSON.stringify(visibleTexts(html)) === JSON.stringify([t.verify.governingGateLabel, sentence]));
    check(`${tag} "ROOT_DETECTED" (the gate's name) does not appear`, !html.includes('ROOT_DETECTED'));
    check(`${tag} "SEC-04=fail" (the gate's source) does not appear — nor any "SEC-04" fragment`, !html.includes('SEC-04'));
    // The removed badge rendered "<label>: C" in a bordered bold chip.
    check(`${tag} the old badge chip is gone (no bordered bold span)`, !html.includes('rounded-md border border-nc-border bg-nc-surface text-nc-text1 font-bold'));
    check(`${tag} no marker attribute on the card (data-gate-text is gone)`, !html.includes('data-gate-text'));
  }
}

// ---------------------------------------------------------------------------
// CASE 2 — `text` absent: «the shape of pre-a92d503 reports», built in
// memory from the real synced default sample with `text` deleted (no golden
// sample lacks it any more). Through the real /verify-/print path (HeroCard +
// V7Notices): NO gate card at all — nothing from V7Notices, no title, no
// container, no marker, no name/source — while the overall letter and the
// partial-assessment tag stay in the hero, untouched.
// ---------------------------------------------------------------------------
for (const lang of ['ar', 'tr', 'en']) {
  const t = translations[lang];
  const tag = `[${lang} /verify-/print path, pre-a92d503 shape (in memory), no text]`;
  const { result: older } = captureWarnings(() => verifyLikeRender(olderC, t, lang));
  const withSentence = verifyLikeRender(realC, t, lang);

  check(`${tag} V7Notices renders NOTHING at all (empty output — no container, no card)`, older.notices === '');
  check(`${tag} the card's title appears nowhere on the page`, !older.page.includes(t.verify.governingGateLabel));
  check(`${tag} no marker attribute and no leftover container`, !older.page.includes('data-gate-text'));
  check(`${tag} name/source do not appear as a substitute`, !older.page.includes('ROOT_DETECTED') && !older.page.includes('SEC-04'));
  check(`${tag} no sentence is invented in its place (the page has no gate paragraph: it is exactly the hero)`, older.page === older.hero);

  // The overall letter and the partial-assessment tag remain.
  check(`${tag} the overall letter "C" is still shown in the hero`, older.hero.includes('>C<'));
  check(`${tag} the partial-assessment tag sentence is still shown in the hero ("${older.overall.partialAssessmentTag.text}")`, older.hero.includes(older.overall.partialAssessmentTag.text));
  // …and hiding the card did not alter the hero by a single byte: the hero of
  // the real sample WITH the gate sentence is identical to the hero without.
  check(`${tag} the hero is byte-identical with and without the gate sentence (hiding the card touches neither letter nor tag)`, older.hero === withSentence.hero);
  check(`${tag} (control) with the sentence the card IS rendered — so the empty output above is the absence's doing`, withSentence.notices !== '' && withSentence.notices.includes(SENTENCE));
}

// The same on shape B (the one /shop, /dashboard and /tech receive) through
// the real wired components — the letter still renders, no gate card, no
// leftover; and with the real sentence present they show it (name/source
// never).
{
  const t = translations.ar;
  const { ListingEditorCard } = require('@/app/dashboard/page.js');
  const { DeviceCard } = require('@/app/shop/[slug]/ShopClient.js');
  const EvaluationForm = require('@/components/tech/EvaluationForm').default;
  const evaluation = { technicianGrade: 'B', agreement: 'agree' };

  const mounts = {
    '/dashboard (ListingEditorCard)': (report) =>
      React.createElement(ListingEditorCard, { report: { ...report, id: 'gate-test' }, t, lang: 'ar', onSave: async () => {} }),
    '/shop/[slug] (DeviceCard)': (report) =>
      React.createElement(DeviceCard, { report: { ...report, id: 'gate-test', scanId: 'gate-test' }, t, lang: 'ar' }),
    '/tech (EvaluationForm, revealed)': (report) =>
      React.createElement(EvaluationForm, { report: { ...report, id: 'gate-test' }, evaluation, technicianName: 'Test Tech', onSaved: () => {}, onBack: () => {}, lang: 'ar' }),
  };

  for (const [route, make] of Object.entries(mounts)) {
    const { result: withText } = captureWarnings(() => render(make(realB)));
    check(`${route}: text present (real sample) — shows the server's sentence and the title`, withText.includes(SENTENCE) && withText.includes(t.verify.governingGateLabel));
    check(`${route}: text present — never shows the gate's name or source`, !withText.includes('ROOT_DETECTED') && !withText.includes('SEC-04'));

    const { result: noText } = captureWarnings(() => render(make(olderB)));
    check(`${route}: text absent (pre-a92d503 shape, in memory) — no gate card: its title appears nowhere`, !noText.includes(t.verify.governingGateLabel));
    check(`${route}: text absent — name/source never appear, no marker attribute`, !noText.includes('ROOT_DETECTED') && !noText.includes('SEC-04') && !noText.includes('data-gate-text'));
    check(`${route}: text absent — the overall letter "C" is still rendered`, noText.includes('>C<'));
  }
}

// ---------------------------------------------------------------------------
// "Absent" in every flavor, straight into the component (bypassing the
// reader, which would already have normalized a non-string to null): empty,
// whitespace-only, non-string, null — each renders no card and no wrapper.
// Component-level unit cases with explicit values (contract violations) —
// synthetic by nature, not golden samples.
// ---------------------------------------------------------------------------
{
  const t = translations.ar;
  const base = { zeroMeasuredMessage: null, harnessError: false, harnessErrorMessage: null, abstentionReasons: null };
  for (const [label, text] of [['empty string', ''], ['whitespace only', '   \n '], ['number', 42], ['null', null], ['object', { a: 1 }], ['undefined', undefined]]) {
    const html = render(React.createElement(V7Notices, { overall: { ...base, governingGateReason: { name: 'ROOT_DETECTED', ceilingLetter: 'C', source: 'SEC-04=fail', text } }, t }));
    check(`V7Notices, gate text is ${label}: renders nothing at all (no card, no title, no wrapper, no name/source)`, html === '');
  }

  // A text-less gate must not suppress or distort the OTHER notices: only the
  // card disappears; the zero-measured notice still renders alone.
  const withOther = render(React.createElement(V7Notices, {
    overall: { ...base, zeroMeasuredMessage: 'ZERO-MEASURED-SENTENCE', governingGateReason: { name: 'ROOT_DETECTED', ceilingLetter: 'C', source: 'SEC-04=fail', text: null } },
    t,
  }));
  check('a text-less gate next to another notice: that notice still renders', withOther.includes('ZERO-MEASURED-SENTENCE'));
  check('…and the gate card is absent beside it (no title, no name/source)', !withOther.includes(t.verify.governingGateLabel) && !withOther.includes('ROOT_DETECTED') && !withOther.includes('SEC-04'));
}

// ---------------------------------------------------------------------------
// Honor — governingGateReason is a real null: no gate card, none of it.
// ---------------------------------------------------------------------------
for (const [shapeName, doc] of [['C', loadVerifyReportHonorSample()], ['B', loadReportsDocHonorSample()]]) {
  const t = translations.ar;
  const overall = readOverall(doc);
  const { result: html } = captureWarnings(() => render(React.createElement(V7Notices, { overall, t })));
  check(`[Honor/${shapeName}] the gate is null in the reader`, overall.governingGateReason === null);
  check(`[Honor/${shapeName}] no gate card is rendered (no title, no marker)`, !html.includes(t.verify.governingGateLabel) && !html.includes('data-gate-text'));
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
