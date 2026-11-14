'use strict';

// Rule 24 ("لا نسخة في كل ملفّ") — coordinator order, 2026-10-01.
//
// lib/techEval.js's DISPUTED_CATEGORIES used to be a second, independently
// hardcoded copy of (a subset of) lib/i18n.js's cat* category names. It had
// already drifted: three of the ten (gpu/sensors/gps) still held the OLD
// names (كرت الشاشة / الحساسات / GPS) after the user's 2026-10-01 category
// name decision changed lib/i18n.js's list — a mismatch no test caught,
// only found by eye while auditing for duplicates.
//
// lib/techEval.js now builds DISPUTED_CATEGORIES by reading
// translations.ar.verify directly (the same single source
// components/verify/CategoriesGrid.js and V7CategoriesGrid.js already read
// through `t.verify.cat*`), so drift of this kind is no longer possible by
// construction — but this test exists so a FUTURE change to either side
// (e.g. someone reverting techEval.js back to a hardcoded copy, or a typo in
// the explicit value→i18nKey mapping) fails loudly here rather than being
// caught "by eye" again.
//
// Run: node scripts/test/disputedCategoriesMatchI18n.test.cjs

require('./_jsx-require-hook.cjs');
const { DISPUTED_CATEGORIES } = require('@/lib/techEval');
const { translations } = require('@/lib/i18n');

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

// Explicit value -> lib/i18n.js key map, independent of techEval.js's own
// internal mapping (DISPUTED_CATEGORY_I18N_KEYS is not exported) — this
// test re-derives the expectation itself rather than importing the thing
// it is meant to check, so a bug in that internal mapping cannot hide
// itself from this test by construction.
const EXPECTED_I18N_KEY = {
  battery: 'catBattery',
  thermal: 'catThermal',
  cpu: 'catCpu',
  gpu: 'catGpu',
  memory: 'catMemory',
  storage: 'catStorage',
  security: 'catSecurity',
  sensors: 'catSensors',
  gps: 'catGps',
  cellular: 'catCellular',
};

check(
  'DISPUTED_CATEGORIES has exactly the 10 expected values, in order',
  JSON.stringify(DISPUTED_CATEGORIES.map((c) => c.value)) === JSON.stringify(Object.keys(EXPECTED_I18N_KEY))
);

for (const entry of DISPUTED_CATEGORIES) {
  const i18nKey = EXPECTED_I18N_KEY[entry.value];
  check(`DISPUTED_CATEGORIES has a known i18n key mapping for "${entry.value}"`, typeof i18nKey === 'string');
  if (!i18nKey) continue;

  const arValue = translations.ar.verify[i18nKey];
  check(
    `DISPUTED_CATEGORIES "${entry.value}" label ("${entry.label}") equals lib/i18n.js's ar.verify.${i18nKey} ("${arValue}")`,
    entry.label === arValue
  );
  check(`DISPUTED_CATEGORIES "${entry.value}" label is non-empty`, typeof entry.label === 'string' && entry.label.length > 0);
}

// Spot-check the three that were actually found drifted before this fix —
// confirms the NEW names specifically, not just "equals whatever i18n.js
// currently says" (which would pass even if i18n.js itself regressed back
// to the old names).
check('gpu label is the current approved name, not the old "كرت الشاشة"', DISPUTED_CATEGORIES.find((c) => c.value === 'gpu').label === 'معالج الرسومات');
check('sensors label is the current approved name, not the old "الحساسات"', DISPUTED_CATEGORIES.find((c) => c.value === 'sensors').label === 'المستشعرات');
check('gps label is the current approved name, not the old bare "GPS"', DISPUTED_CATEGORIES.find((c) => c.value === 'gps').label === 'الموقع (GPS)');

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
