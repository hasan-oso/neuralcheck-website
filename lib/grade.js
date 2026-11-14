// Single source of truth for turning a numeric score into a letter.
//
// Aligned with the app: A ≥ 85, B ≥ 70, C ≥ 50, D below that.
//
// This existed as two independent copies — one coloring the score bar in
// HeroCard, one picking a fallback letter for a category card — which is the
// same class of defect we are fixing between the site and the app, only inside
// one codebase. One table, two consumers.
//
// SCOPE NOTE, because it is easy to over-read what this file controls:
// the grade circle and every GradeBadge color themselves from the LETTER the
// server sent, not from these numbers. That is deliberate — the server's
// verdict wins, and the site never re-grades a device. These thresholds are
// used only where no letter is available:
//
//   1. the score progress bar under the hero circle, which has a percentage
//      but no letter of its own;
//   2. a category card whose `grade` field is absent.
//
// So the site and the app agree on the circle as long as they agree on the
// server's letter, and they agree on the bar as long as these numbers match
// the ones the server used to pick that letter.

export const GRADE_THRESHOLDS = [
  { letter: 'A', min: 85 },
  { letter: 'B', min: 70 },
  { letter: 'C', min: 50 },
];

/** Letter for a 0-100 score. Returns 'D' below the lowest threshold. */
export function letterForScore(score) {
  if (typeof score !== 'number' || isNaN(score)) return 'D';
  for (const { letter, min } of GRADE_THRESHOLDS) {
    if (score >= min) return letter;
  }
  return 'D';
}

/** Tailwind background class for a letter. Unknown letters stay neutral. */
export const GRADE_BG = {
  A: 'bg-nc-grade-a',
  B: 'bg-nc-grade-b',
  C: 'bg-nc-grade-c',
  D: 'bg-nc-grade-d',
};
