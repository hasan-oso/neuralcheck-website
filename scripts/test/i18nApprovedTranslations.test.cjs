'use strict';

// Decision 91 §1/§3 (2026-09-25): tr/en approved for the five v7Reason*
// keys, v7StateUnknown replaced, ceilingLabel's Turkish replaced, and
// NARRATIVE_INCOMPLETE_NOTICE became a per-language key
// (verify.v7NarrativeIncomplete). All approved text is transcribed verbatim
// from <home>\neuralcheck-workspace\evidence\translations-
// approved-2026-09-25.md's "wepsite" section — outside this repo, so this
// file cannot read it directly; the values below are what the task order
// gave, checked into lib/i18n.js by this same commit.
//
// Rule 41: every reader is tested with the shape it actually receives. This
// file replicates app/verify/page.js's OWN V7 wiring (readOverall/
// readCategories/countIssuesByCategory/readIssues — see that file's
// isV7-branch, ~lines 179-214) against the REAL verifyReport response shape
// (C) — the shape /verify actually fetches — not the B/Firestore shape,
// and renders the REAL V7Notices/V7CategoriesGrid/NarrativeIncompleteNotice
// components (rule 30), for all three site languages.
//
// This supersedes the informal assumption that tr/en showed nothing for
// these reason keys (true before this commit, since the keys did not exist
// in those languages at all — see categoryReasonTable.test.cjs and
// V7CategoriesGrid.js's `t.verify[i18nKey] || null` guard, added
// specifically to make that safe). No prior test in this repo asserted that
// absence directly; this file is the first to assert tr/en PRESENCE for
// them, which is the behavior change decision 91 §1 makes real.
//
// UPDATE 2026-10-01 (task order "W5"/#14-#16, relaying A6's simplifications,
// then further simplified by a later user addendum the same day): three of
// the strings locked below changed —
//   - v7ReasonDeclaredButNoneExecuted (#15): round 1 only dropped "status"/
//     "durum"/"حالة"; the user's same-day addendum simplified it further to
//     a bare "this category was not measured in this scan", approved
//     verbatim ar/tr/en.
//   - v7ReasonBatteryUncalibrated (#16): rewritten from "its threshold has
//     not been calibrated yet" to "measured but not graded in this
//     version" — Arabic and English approved verbatim in round 1, Turkish
//     wording tightened slightly in the addendum (dropped "ona").
//   - v7StateAttestedOnly (#14): newly added to this lock — previously not
//     tracked here at all. Approved verbatim ar/tr/en, parentheses and
//     "a tap"/"نقرة"/"tek dokunuş" dropped entirely.
// All three are now USER-APPROVED (not proposals) per the 2026-10-01
// addendum — see lib/i18n.js's own #14/#15/#16 comments next to these keys.
// Per rule 23, the OLD locked strings are replaced here, not kept alongside
// a second assertion.
//
// UPDATE 2026-10-01 §٦ (same day, later order — "قفل الترجمات يُضبط على
// المعتمد كلّه"): the lock widened to cover everything approved so far
// today, not just the five original v7Reason* keys:
//   - `ar` section added to APPROVED below (this lock previously checked
//     tr/en only, on the assumption Arabic needed no lock as the source
//     language — today's Arabic text is itself now explicitly dictated by
//     the user for several keys, so it is locked the same way).
//   - v7HarnessErrorMessageUnavailable (W6/S-13) added, all three languages
//     — matches the backend's own S-13 text exactly now, replacing the
//     agent's round-1 proposal entirely.
//   - APPROVED_CATEGORIES (new, below): all 15 cat* category names, all
//     three languages — the user's 2026-10-01 decision, "التطبيق والموقع
//     وعناوين الخادم ... تأخذ الأسماء من هذه القائمة ... نسخة من قائمة واحدة
//     مرجعها هذا الأمر".
//   - APPROVED_TECHNOLOGY (new, below): W3's three /technology strings
//     (pipeline.body[1], pipeline.body[2], multilingual.body) — these live
//     under `technology.*`, not `verify.*`, so they get their own lock
//     object and loop rather than joining APPROVED.
//
// Run: node scripts/test/i18nApprovedTranslations.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const {
  readOverall,
  readCategories,
  readIssues,
  countIssuesByCategory,
  readNarrativeIncomplete,
} = require('@/lib/reportReaders/v7');
const V7Notices = require('@/components/verify/V7Notices').default;
const V7CategoriesGrid = require('@/components/verify/V7CategoriesGrid').default;
const NarrativeIncompleteNotice = require('@/components/verify/NarrativeIncompleteNotice').default;
const { translations } = require('@/lib/i18n');
const { loadVerifyReportSample, loadVerifyReportHonorSample, withCategoryOverride } = require('./_shapes.cjs');

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

// react-dom/server HTML-escapes text content — a plain `'` in EN strings
// like "this category's" comes out as `&#x27;` in the rendered markup, so a
// raw `html.includes(expectedText)` false-negatives on any English sentence
// with an apostrophe. Normalize both sides the same way before comparing —
// this is a rendering-format fact, not a translation or component bug
// (confirmed by inspecting the actual rendered HTML before adding this).
function htmlHasText(html, text) {
  return html.includes(text.replace(/'/g, '&#x27;'));
}

const c = loadVerifyReportSample();
const honorC = loadVerifyReportHonorSample();

// ---------------------------------------------------------------------------
// Content lock — the exact approved strings, per language, as transcribed
// from the evidence file (not just "renders whatever the key holds").
// ---------------------------------------------------------------------------
const APPROVED = {
  // Added 2026-10-01 §٦ — see UPDATE comment above. Widened 2026-10-07 by the
  // user's decision "فكل نصّ معتمد مقفل بلغاته الثلاث": every key below that
  // tr/en already locked (decision 91) now has its approved Arabic locked
  // too — v7ReasonBatteryUnmeasured, then v7ReasonNoHealthBearingDeclared,
  // v7ReasonHarnessErrorUnmeasured, v7StateUnknown (each added verbatim after
  // a codepoint-by-codepoint comparison with lib/i18n.js).
  //
  // 2026-10-07 (W1, the user's decision البند ١ و٢): the one key that had
  // been locked in tr/en only — the gate badge's label (decision 91's
  // 'Üst sınır' / 'Ceiling'; its Arabic was never approved) — was DELETED
  // from lib/i18n.js in all three languages once the badge left V7Notices
  // (no reader — grep audit in that task's report), so its tr/en lock
  // entries are REMOVED here (rule 23: the lock of a deleted key is
  // replaced, not left behind; the render test that pinned the badge is
  // replaced further below). Every key in APPROVED is now locked in all
  // three languages. governingGateLabel (the card's title) is new in the
  // lock, all three languages.
  ar: {
    v7StateAttestedOnly: 'بشهادة الفنّي فقط، بلا قياس آلي.',
    v7ReasonDeclaredButNoneExecuted: 'لم تُقَس هذه الفئة في هذا الفحص.',
    v7ReasonBatteryUncalibrated: 'تُقاس البطارية ولا يُعطى لها حرف في هذا الإصدار.',
    // 2026-10-07 (user's decision): Arabic added so the key is locked in all
    // three languages like tr/en already were (decision 91). Verbatim.
    v7ReasonBatteryUnmeasured: 'لم تُقَس صحّة البطارية: لم يستوفِ أيّ من مؤشّراتها شروط القياس في هذا الفحص.',
    // 2026-10-07 (user's decision) — the same, verbatim.
    v7ReasonNoHealthBearingDeclared: 'لم تُقَس: لم يصل في هذا الفحص اختبار يُحتسب لحالة هذه الفئة.',
    v7ReasonHarnessErrorUnmeasured: 'لم تُقَس: لم تصل بيانات هذه الفئة من أداة الفحص. ليس حكماً على الجهاز.',
    v7StateUnknown: 'حالة قياس هذه الفئة غير معروفة',
    v7HarnessErrorMessageUnavailable: 'تعذّر تجهيز نتائج الاختبارات لهذا الفحص، وهذا ليس حكماً على الجهاز.',
    // W1 (2026-10-07, البند ٢) — the gate card's title, approved verbatim.
    governingGateLabel: 'سبب الحرف العامّ',
  },
  tr: {
    v7ReasonNoHealthBearingDeclared: 'Ölçülmedi: Bu taramada bu kategorinin durumu için sayılan hiçbir test yok.',
    // #14/#15/#16 (2026-10-01) — user-approved verbatim; see file header.
    v7StateAttestedOnly: 'Yalnızca teknisyen beyanıyla, otomatik ölçüm olmadan.',
    v7ReasonDeclaredButNoneExecuted: 'Bu kategori bu taramada ölçülmedi.',
    v7ReasonBatteryUncalibrated: 'Pil ölçülür, ancak bu sürümde harf notu verilmez.',
    v7ReasonBatteryUnmeasured: 'Pil sağlığı ölçülmedi: göstergelerinden hiçbiri bu taramada ölçüm koşullarını karşılamadı.',
    v7ReasonHarnessErrorUnmeasured: 'Ölçülmedi: Bu kategorinin verileri tarama aracından gelmedi. Cihaz hakkında bir yargı değildir.',
    v7StateUnknown: 'Bu kategorinin ölçüm durumu bilinmiyor',
    // W6/S-13 (2026-10-01 §٦) — user-approved verbatim, matches the
    // backend's own text exactly.
    v7HarnessErrorMessageUnavailable: 'Bu taramanın test sonuçları hazırlanamadı; bu, cihaz hakkında bir değerlendirme değildir.',
    // W1 (2026-10-07, البند ٢) — approved verbatim.
    governingGateLabel: 'Genel harf notunun nedeni',
  },
  en: {
    v7ReasonNoHealthBearingDeclared: "Not measured: this scan contains no test that counts toward this category's status.",
    // #14/#15/#16 (2026-10-01) — user-approved verbatim; see file header.
    v7StateAttestedOnly: 'Technician attestation only, with no automatic measurement.',
    v7ReasonDeclaredButNoneExecuted: 'This category was not measured in this scan.',
    v7ReasonBatteryUncalibrated: 'The battery is measured, but is not given a grade in this version.',
    v7ReasonBatteryUnmeasured: 'Battery health not measured: none of its indicators met the measurement conditions in this scan.',
    v7ReasonHarnessErrorUnmeasured: "Not measured: this category's data did not arrive from the scanning tool. Not a verdict on the device.",
    v7StateUnknown: "This category's measurement state is unknown",
    // W6/S-13 (2026-10-01 §٦) — user-approved verbatim, matches the
    // backend's own text exactly.
    v7HarnessErrorMessageUnavailable: 'The test results for this scan could not be prepared; this is not a verdict on the device.',
    // W1 (2026-10-07, البند ٢) — approved verbatim.
    governingGateLabel: 'Reason for the overall grade',
  },
};

for (const lang of ['ar', 'tr', 'en']) {
  const t = translations[lang];
  for (const [key, expected] of Object.entries(APPROVED[lang])) {
    check(`content lock: ${lang}.verify.${key} matches the approved text exactly`, t.verify[key] === expected);
  }
}
for (const lang of ['tr', 'en']) {
  check(`content lock: ${lang}.verify.v7StateUnknown has no trailing period (matches Arabic)`, !translations[lang].verify.v7StateUnknown.endsWith('.'));
}

// ---------------------------------------------------------------------------
// Category names (2026-10-01, user's full §٣ decision) — all 15 cat* keys,
// all three languages. Values pulled verbatim from the live lib/i18n.js via
// a direct `node -e` dump before writing this block (rule 40: tool output,
// not retyped from memory), not retranscribed from the chat order by hand.
// ---------------------------------------------------------------------------
const APPROVED_CATEGORIES = {
  ar: {
    catDisplay: 'الشاشة',
    catMemory: 'الذاكرة',
    catStorage: 'التخزين',
    catBattery: 'البطارية',
    catThermal: 'الحرارة',
    catCpu: 'المعالج',
    catGpu: 'معالج الرسومات',
    catSensors: 'المستشعرات',
    catCamera: 'الكاميرا',
    catGps: 'الموقع (GPS)',
    catCellular: 'الشبكة الخلوية',
    catWireless: 'الاتصال اللاسلكي',
    catSecurity: 'الأمان',
    catAudio: 'الصوت',
    catInput: 'اللمس والأزرار',
  },
  tr: {
    catDisplay: 'Ekran',
    catMemory: 'Bellek',
    catStorage: 'Depolama',
    catBattery: 'Pil',
    catThermal: 'Isı',
    catCpu: 'İşlemci',
    catGpu: 'Grafik İşlemci',
    catSensors: 'Sensörler',
    catCamera: 'Kamera',
    catGps: 'Konum (GPS)',
    catCellular: 'Hücresel Ağ',
    catWireless: 'Kablosuz Bağlantı',
    catSecurity: 'Güvenlik',
    catAudio: 'Ses',
    catInput: 'Dokunma ve Tuşlar',
  },
  en: {
    catDisplay: 'Display',
    catMemory: 'Memory',
    catStorage: 'Storage',
    catBattery: 'Battery',
    catThermal: 'Thermal',
    catCpu: 'CPU',
    catGpu: 'GPU',
    catSensors: 'Sensors',
    catCamera: 'Camera',
    catGps: 'Location (GPS)',
    catCellular: 'Cellular Network',
    catWireless: 'Wireless Connection',
    catSecurity: 'Security',
    catAudio: 'Audio',
    catInput: 'Touch & buttons',
  },
};

for (const lang of ['ar', 'tr', 'en']) {
  const t = translations[lang];
  for (const [key, expected] of Object.entries(APPROVED_CATEGORIES[lang])) {
    check(`content lock: ${lang}.verify.${key} (category name) matches the approved text exactly`, t.verify[key] === expected);
  }
}

// ---------------------------------------------------------------------------
// W3 /technology strings (2026-10-01 §٦) — these live under `technology.*`,
// not `verify.*`. pipelineBody1/pipelineBody2 are technology.pipeline.
// body[1]/[2]; multilingualBody is technology.multilingual.body. Values
// pulled verbatim from the live lib/i18n.js the same way as the category
// names above.
// ---------------------------------------------------------------------------
const APPROVED_TECHNOLOGY = {
  ar: {
    pipelineBody1: 'في الخادم تُحسب من هذه البيانات الخام القياساتُ والنتائج، ثم يقرؤها الذكاء الاصطناعي.',
    pipelineBody2: 'في كلّ فئة يُعطى لها حرف، يُحسب الحرف من نتائج القياس بقواعد ثابتة. والذكاء الاصطناعي يحلّل هذه النتائج، فيكتب الملخّص ونصائح المشتري ويشرح كلّ ملاحظة، كما يقرأ مهندس عتاد خبير نتائج أجهزة القياس. وله أن يقترح تعديل الحرف، ولا يُقبل التعديل إلا بدليل مُثبَت من نتائج الفحص نفسه، وإلا بقي الحرف المحسوب.',
    multilingualBody: 'كلّ تقرير يجمع حروفاً محسوبة من القياس وتحليلاً يكتبه الذكاء الاصطناعي. المخرجات هجينة: الأرقام التقنية تأتي مع شرح مبسّط بلغة عاديّة. التقرير نفسه يخدم مهندساً يتحقّق من الأرقام ومشترياً يقرأ النصّ.',
  },
  tr: {
    pipelineBody1: 'Sunucuda bu ham verilerden ölçümler ve bulgular hesaplanır; ardından yapay zekâ bunları okur.',
    pipelineBody2: 'Harf notu verilen her kategoride, harf notu ölçüm sonuçlarından sabit kurallarla hesaplanır. Yapay zekâ bu sonuçları analiz eder; özeti ve alıcıya yönelik önerileri yazar, her bulguyu açıklar — tıpkı uzman bir donanım mühendisinin ölçüm cihazlarının sonuçlarını okuması gibi. Harf notunda değişiklik önerebilir, ancak bu değişiklik yalnızca taramanın kendi sonuçlarından kanıtlanmış bir delille kabul edilir; aksi halde hesaplanan harf notu geçerli kalır.',
    multilingualBody: 'Her rapor, ölçümden hesaplanan harf notlarını ve yapay zekânın yazdığı analizi bir araya getirir. Çıktı hibrittir: teknik sayılar sade dille açıklanır. Aynı rapor hem sayıları doğrulayan bir mühendise hem de metni okuyan bir alıcıya hizmet eder.',
  },
  en: {
    pipelineBody1: 'On the server, measurements and findings are computed from this raw data, and the AI then reads them.',
    pipelineBody2: "In every category that receives a grade, the grade is computed from the measurement results using fixed rules. The AI analyzes these results to write the summary and buyer advice and to explain each finding — the way an expert hardware engineer reads the results from measurement instruments. It may propose a grade adjustment, but the adjustment is accepted only with proven evidence from the scan's own results; otherwise the computed grade stands.",
    multilingualBody: 'Every report brings together grades computed from the measurements and an analysis written by the AI. Output is hybrid: technical numbers come with a plain-language explanation. The same report serves an engineer verifying the numbers and a buyer reading the prose.',
  },
};

for (const lang of ['ar', 'tr', 'en']) {
  const tech = translations[lang].technology;
  check(`content lock: ${lang}.technology.pipeline.body[1] matches the approved text exactly`, tech.pipeline.body[1] === APPROVED_TECHNOLOGY[lang].pipelineBody1);
  check(`content lock: ${lang}.technology.pipeline.body[2] matches the approved text exactly`, tech.pipeline.body[2] === APPROVED_TECHNOLOGY[lang].pipelineBody2);
  check(`content lock: ${lang}.technology.multilingual.body matches the approved text exactly`, tech.multilingual.body === APPROVED_TECHNOLOGY[lang].multilingualBody);
}

// ---------------------------------------------------------------------------
// /verify's real V7 wiring, replicated from app/verify/page.js, against the
// real C sample — for all three languages.
// ---------------------------------------------------------------------------
for (const lang of ['ar', 'tr', 'en']) {
  const t = translations[lang];

  // -- V7Notices' gate card. REPLACED 2026-10-07 (W1, rule 23): this block
  // used to assert the card showed t.verify.ceilingLabel (the "السقف: C"
  // badge) for the real gate. The badge was removed and its key deleted from
  // all three languages (the user's decision البند ١), so that assertion
  // would now be pinning a deleted behavior. Its correct counterpart: the
  // card shows its approved TITLE (governingGateLabel) when the gate carries
  // the server's sentence, the key is really gone, and the data still
  // carries ceilingLetter (readOverall keeps reading it — only the display
  // went). A second replacement the same day (البند ٤): a gate with NO
  // sentence — which is exactly the real vendored (older) sample — renders
  // no card at all, so the title is asserted ABSENT for it, not present.
  // The sentence/name/source/absent-text behavior lives in
  // governingGateText.test.cjs.
  {
    const overall = readOverall(c);
    check(`[${lang}] fixture sanity: real C has a governingGateReason with ceilingLetter "C" (still read — it stays in the data)`, overall.governingGateReason?.ceilingLetter === 'C');
    // UPDATE (golden sync to neuralcheck-backend d5b6c29, rule 23): the real
    // sample NOW carries the server's `text`, so the previous premise —
    // "the real (older) gate has no sentence, no card" — no longer holds for
    // the file as it is. The real sample as it is: the card shows its
    // approved title in this language. The no-card case is built in memory
    // from the same real sample with `text` deleted («the shape of
    // pre-a92d503 reports»; nothing written to contract/).
    check(`[${lang}] fixture sanity: the real C gate carries the server's sentence`, typeof overall.governingGateReason?.text === 'string' && overall.governingGateReason.text.length > 0);
    const sentenceHtml = render(React.createElement(V7Notices, { overall, t }));
    check(`[${lang}] V7Notices: the real gate (it carries the sentence) shows its title (governingGateLabel)`, htmlHasText(sentenceHtml, t.verify.governingGateLabel));
    const olderShape = JSON.parse(JSON.stringify(c));
    delete olderShape.aiResponse.governingGateReason.text;
    const noTextHtml = render(React.createElement(V7Notices, { overall: readOverall(olderShape), t }));
    check(`[${lang}] V7Notices: the pre-a92d503 shape (in memory, no sentence) renders no card — its title is absent`, !htmlHasText(noTextHtml, t.verify.governingGateLabel));
    check(`[${lang}] the gate badge's label key is deleted from this language (no reader left)`, !Object.prototype.hasOwnProperty.call(t.verify, 'ceilingLabel'));
  }

  // -- V7CategoriesGrid: the five reason texts, from the real C categories --
  {
    const categories = readCategories(c);
    const issues = readIssues(c);
    const counts = countIssuesByCategory(issues);
    const battery = categories.find((cat) => cat.name === 'battery');
    const thermal = categories.find((cat) => cat.name === 'thermal');
    const audio = categories.find((cat) => cat.name === 'audio');

    function renderOne(cat) {
      return render(React.createElement(V7CategoriesGrid, { categories: [cat], issueCounts: counts, t }));
    }

    if (t.verify.v7ReasonBatteryUncalibrated) {
      check(`[${lang}] battery (partial, uncalibrated): shows the reason text in this language`, htmlHasText(renderOne(battery), t.verify.v7ReasonBatteryUncalibrated));
    }
    if (t.verify.v7ReasonDeclaredButNoneExecuted) {
      check(`[${lang}] thermal (unmeasured, declared-none-executed): shows the reason text in this language`, htmlHasText(renderOne(thermal), t.verify.v7ReasonDeclaredButNoneExecuted));
    }
    if (t.verify.v7ReasonNoHealthBearingDeclared) {
      check(`[${lang}] audio (unmeasured, no-health-bearing): shows the reason text in this language`, htmlHasText(renderOne(audio), t.verify.v7ReasonNoHealthBearingDeclared));
    }

    // Synthetic UNMEASURED+NO_CALIBRATED_THRESHOLD (no real C sample has it
    // yet — see categoryReasonTable.test.cjs) and a genuinely unknown pair,
    // both in this language.
    const { REASON_NO_CALIBRATED_THRESHOLD } = require('@/lib/reportReaders/v7');
    const batteryUnmeasured = readCategories(
      withCategoryOverride(c, 'battery', { state: 'UNMEASURED', reason: REASON_NO_CALIBRATED_THRESHOLD })
    ).find((cat) => cat.name === 'battery');
    if (t.verify.v7ReasonBatteryUnmeasured) {
      check(`[${lang}] synthetic battery (unmeasured, uncalibrated): shows the reason text in this language`, htmlHasText(renderOne(batteryUnmeasured), t.verify.v7ReasonBatteryUnmeasured));
    }

    const trulyUnknown = readCategories(withCategoryOverride(c, 'gps', { state: 'MEASURED', reason: 'DEAD_VALUE' })).find(
      (cat) => cat.name === 'gps'
    );
    check(`[${lang}] out-of-table pair: shows v7StateUnknown text in this language, never the raw code`, htmlHasText(renderOne(trulyUnknown), t.verify.v7StateUnknown) && !renderOne(trulyUnknown).includes('DEAD_VALUE'));
  }

  // -- NarrativeIncompleteNotice: C (false, renders nothing) and Honor C
  //    (true, renders the real per-language notice) --
  {
    const incC = readNarrativeIncomplete(c);
    check(`[${lang}] fixture sanity: real C has narrativeIncomplete=false`, incC.status === 'ok' && incC.value === false);
    const htmlC = render(React.createElement(NarrativeIncompleteNotice, { status: incC.status, value: incC.value, t }));
    check(`[${lang}] NarrativeIncompleteNotice: C (false) renders nothing`, htmlC === '');

    const incHonor = readNarrativeIncomplete(honorC);
    check(`[${lang}] fixture sanity: real Honor C has narrativeIncomplete=true`, incHonor.status === 'ok' && incHonor.value === true);
    const htmlHonor = render(React.createElement(NarrativeIncompleteNotice, { status: incHonor.status, value: incHonor.value, t }));
    check(`[${lang}] NarrativeIncompleteNotice: Honor C (true) shows the real notice text in this language`, htmlHasText(htmlHonor, t.verify.v7NarrativeIncomplete));
  }
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
