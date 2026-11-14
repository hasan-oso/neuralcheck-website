'use strict';

// readCategories' adjustmentEvidence warning — decision 100 §3, updated
// decision 101 §2 (2026-09-25).
//
// A prior version of lib/reportReaders/v7.js's doc comment called the
// array-of-strings shape "undocumented" and warned on it via console.warn
// ("unexpected shape") — wrong: it IS the documented contract shape
// (V7_DISPLAY_SHAPE_CONTRACT.md:14, relayed — this repo has no local copy
// to cross-check, rule 29), and the warning fired on every ordinary
// LLM_ADJUSTED-adjusted category, including the real cpu-c06-downgrade
// sample. Decision 100 §3 fixed the warning to fire only for shapes that
// actually violate the documented contract (not `null`, not an array of
// strings).
//
// Decision 101 §2 went further: `adjustmentEvidence` is now `null`
// UNCONDITIONALLY (see lib/reportReaders/v7.js's doc comment) — a bare
// STRING used to be treated as valid (no warning, passed straight through
// to display, decision 99 §4's "never shown" rule having only been applied
// to the array case). A bare string is not the documented array shape
// either, so it now warns too — added to the violating-shapes list below.
//
// This file proves both directions with the REAL reader (not a
// reimplementation) by capturing console.warn — the real cpu sample must
// stay silent; a shape that genuinely violates the contract (including a
// bare string) must still warn, and adjustmentEvidence must read as `null`
// regardless of shape.
//
// Run: node scripts/test/adjustmentEvidenceWarning.test.cjs

require('./_jsx-require-hook.cjs');
const { readCategories } = require('@/lib/reportReaders/v7');
const { loadVerifyReportCpuC06DowngradeSample, withCategoryOverride } = require('./_shapes.cjs');

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

/** Runs `fn`, capturing every console.warn call made during it (real
 * console.warn is restored immediately after, whether fn throws or not). */
function captureWarnings(fn) {
  const calls = [];
  const original = console.warn;
  console.warn = (...args) => {
    calls.push(args);
  };
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return calls;
}

const cCpu = loadVerifyReportCpuC06DowngradeSample();

// ---------------------------------------------------------------------------
// The real, documented shape — the actual cpu-c06-downgrade sample's
// adjustmentEvidence (an array of strings) — must never warn.
// ---------------------------------------------------------------------------
{
  const rawEvidence = cCpu.aiResponse.categories.cpu.adjustmentEvidence;
  check('fixture sanity: real cpu.adjustmentEvidence is an array of strings', Array.isArray(rawEvidence) && rawEvidence.every((x) => typeof x === 'string') && rawEvidence.length > 0);

  let result;
  const warnings = captureWarnings(() => {
    result = readCategories(cCpu);
  });
  const adjustmentEvidenceWarnings = warnings.filter((args) => String(args[0]).includes('adjustmentEvidence'));

  check('real cpu sample: readCategories does NOT warn about adjustmentEvidence (documented shape)', adjustmentEvidenceWarnings.length === 0);
  check(
    'real cpu sample: adjustmentEvidence still reads as null (display unchanged, decision 99 §4)',
    result.find((c) => c.name === 'cpu').adjustmentEvidence === null
  );
}

// ---------------------------------------------------------------------------
// Two more documented-shape edge cases the contract's text does not spell
// out explicitly (empty array; array containing an empty string) — decided
// here as still "an array of strings" by the type-only reading of the
// contract, not by inventing a non-emptiness requirement it never states.
// Flagged in this task's report as a judgment call, not silently assumed.
// ---------------------------------------------------------------------------
{
  const emptyArrayDoc = withCategoryOverride(cCpu, 'cpu', { adjustmentEvidence: [] });
  const w1 = captureWarnings(() => readCategories(emptyArrayDoc));
  check('edge case: an empty array does not warn (vacuously an array of strings)', w1.filter((a) => String(a[0]).includes('adjustmentEvidence')).length === 0);

  const emptyStringDoc = withCategoryOverride(cCpu, 'cpu', { adjustmentEvidence: [''] });
  const w2 = captureWarnings(() => readCategories(emptyStringDoc));
  check('edge case: an array containing an empty string does not warn (still string-typed)', w2.filter((a) => String(a[0]).includes('adjustmentEvidence')).length === 0);

  // A real null (the security-downgrade sample's actual current value,
  // post decision 98) must not warn either — unchanged from before.
  const { loadVerifyReportSecurityDowngradeSample } = require('./_shapes.cjs');
  const cSecurity = loadVerifyReportSecurityDowngradeSample();
  check('fixture sanity: real security sample has adjustmentEvidence null today', cSecurity.aiResponse.categories.security.adjustmentEvidence === null);
  const w3 = captureWarnings(() => readCategories(cSecurity));
  check('real security sample (null): does not warn', w3.filter((a) => String(a[0]).includes('adjustmentEvidence')).length === 0);
}

// ---------------------------------------------------------------------------
// Shapes that genuinely violate the documented contract — must still warn,
// per the user's own examples: a number, an object, an array containing a
// non-string element.
// ---------------------------------------------------------------------------
{
  const cases = [
    ['a number', 42],
    ['an object', { path: 'categoryStates.x' }],
    ['an array containing a non-string element', ['categoryStates.testResults[13].outcome', 5]],
    ['an array containing null', ['categoryStates.testResults[13].outcome', null]],
    // decision 101 §2 (2026-09-25): a bare string used to be accepted as
    // valid (no warning, and passed straight through to display) — the
    // contract documents an ARRAY of strings, never a lone string, so this
    // now warns too. This is exactly the shape that was reaching the
    // screen before this fix.
    ['a bare string (no longer accepted — the contract says array, not string)', 'categoryStates.testResults[13].outcome'],
  ];
  for (const [label, value] of cases) {
    const doc = withCategoryOverride(cCpu, 'cpu', { adjustmentEvidence: value });
    const warnings = captureWarnings(() => readCategories(doc));
    const matched = warnings.filter((a) => String(a[0]).includes('adjustmentEvidence'));
    check(`still warns for a shape that violates the contract (${label})`, matched.length === 1);
    check(`(${label}) warning message no longer calls it "unexpected" — names the documented shape instead`, matched[0] && String(matched[0][0]).includes('documented contract shape'));
  }
}

console.log(`${pass}/${total} assertions passed`);
if (pass !== total) process.exit(1);
