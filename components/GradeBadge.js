const COLORS = {
  A: 'bg-nc-grade-a',
  B: 'bg-nc-grade-b',
  C: 'bg-nc-grade-c',
  D: 'bg-nc-grade-d',
};

const SIZES = {
  sm: 'w-12 h-12 text-xl',
  md: 'w-20 h-20 text-4xl',
  lg: 'w-32 h-32 text-6xl',
};

export default function GradeBadge({ grade, size = 'md' }) {
  // No grade (null/undefined/'') renders '—', not '?' — a neutral "no value"
  // placeholder, the same convention lib/techEval.js and this component's
  // other call sites already use elsewhere (resolveDeviceName/resolveShortId
  // fallbacks). '?' reads as "unknown/confused"; a report can legitimately
  // carry no letter at all (V7 harnessError, or a report awaiting analysis)
  // without anything being unknown about it — the reason, when there is one,
  // is shown by the caller alongside this badge, not invented here. Task:
  // Honor sample (e4b65a2f, overall.letter=null, harnessError=true) —
  // 2026-09-24.
  const letter = (grade || '—').toString().toUpperCase().charAt(0);
  const colorClass = COLORS[letter] || 'bg-nc-text3';
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <div
      className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center font-outfit font-black text-white shadow-lg ring-4 ring-white/10`}
    >
      {letter}
    </div>
  );
}
