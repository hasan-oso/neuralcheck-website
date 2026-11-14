'use strict';

// Item 4 of the fourth addendum to decision 102 (2026-09-26): the "الحقل غير
// متاح — تقرير V6" note that used to appear in HeroCard's score slot when
// pickScore found nothing (components/verify/HeroCard.js's former
// scoreUnavailableNote block, lines ~118-122) is deleted outright. The
// matching note for a missing GRADE (gradeUnavailableNote) is untouched.
//
// Reasoning this proves: since decision 6 hides the V6 score from every
// buyer regardless of whether the server actually sent one, a report with a
// real, present-but-hidden score and a report genuinely missing the field
// must render IDENTICALLY in the score slot — nothing, not "hidden" text,
// not "unavailable" text. Before this fix they did not: only the
// score-missing case showed a note.
//
// Real V6 sample (contract/v6-reports-document-sample.json, real score 78)
// vs. the SAME real sample with its score genuinely deleted (both
// aiResponse.score and the root score — pickScore falls back to the root
// field, verified directly: pickScore(real)=78, pickScore(clone)=null) —
// through the real pickScore/pickGrade readers, then the real HeroCard via
// renderToStaticMarkup (rule 30/41).
//
// Run: node scripts/test/heroScoreNoteRemoved.test.cjs

require('./_jsx-require-hook.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { pickScore, pickGrade, pickDeviceName, pickCreatedAt, pickDeviceTier, pickEstimatedYear } = require('@/lib/reportReaders/v6');
const HeroCard = require('@/components/verify/HeroCard').default;
const { translations } = require('@/lib/i18n');
const { loadV6ReportsDocSample } = require('./_shapes.cjs');

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

const withScore = loadV6ReportsDocSample();
const withoutScore = JSON.parse(JSON.stringify(withScore));
delete withoutScore.aiResponse.score;
delete withoutScore.score;

check('fixture sanity: pickScore reads the real score (78) from the unmodified fixture', pickScore(withScore) === 78);
check('fixture sanity: pickScore genuinely finds nothing on the score-deleted clone', pickScore(withoutScore) === null);
check('fixture sanity: both fixtures still carry the real grade "B" — only score was touched', pickGrade(withScore) === 'B' && pickGrade(withoutScore) === 'B');

// Replicates app/verify/page.js's real V6-branch wiring for HeroCard's props
// (score is now ALWAYS null regardless of what pickScore found — item 3/4
// of this addendum — see that file's HeroCard call comment).
function renderHero(report) {
  const grade = pickGrade(report);
  return renderToStaticMarkup(
    React.createElement(HeroCard, {
      grade,
      score: null,
      deviceName: pickDeviceName(report),
      tierRaw: pickDeviceTier(report),
      year: pickEstimatedYear(report),
      createdAt: pickCreatedAt(report),
      t,
      lang: 'ar',
      gradeUnavailableNote: grade ? undefined : t.verify.v6FieldMissing,
      coverageNote: null,
    })
  );
}

const htmlWithScore = renderHero(withScore);
const htmlWithoutScore = renderHero(withoutScore);

check(
  'HeroCard renders BYTE-IDENTICAL output whether the real score was present or genuinely missing (nothing else in the fixture differs between the two)',
  htmlWithScore === htmlWithoutScore
);
check('HeroCard: the real grade "B" shows in both', htmlWithScore.includes('>B<') && htmlWithoutScore.includes('>B<'));
check('HeroCard: neither variant shows the v6FieldMissing text anywhere (grade IS present in both)', !htmlWithScore.includes(t.verify.v6FieldMissing) && !htmlWithoutScore.includes(t.verify.v6FieldMissing));
check('HeroCard: neither variant shows the score label ("النقاط")', !htmlWithScore.includes(t.verify.score) && !htmlWithoutScore.includes(t.verify.score));
check('HeroCard: neither variant displays the real score number (78) anywhere', !htmlWithScore.includes('78') && !htmlWithoutScore.includes('78'));

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
