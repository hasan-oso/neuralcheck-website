'use client';

import { CalendarDaysIcon } from '@heroicons/react/24/outline';

export default function PredictedProblems({ items, t }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  // Filter to keep only items with a real prediction text.
  const valid = items.filter(
    (it) => it && (it.prediction || it.problem || it.text || it.description)
  );
  if (valid.length === 0) return null;

  return (
    <section className="print:break-inside-avoid">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDaysIcon
          className="w-5 h-5 text-nc-cyan"
          strokeWidth={1.8}
        />
        <h2 className="text-lg sm:text-xl font-outfit font-bold text-nc-text1">
          {t.verify.predictedProblems}
        </h2>
      </div>

      <div className="p-6 rounded-2xl bg-nc-card border border-nc-border">
        <ol className="relative flex flex-col gap-6">
          {/* Vertical timeline line */}
          <span
            aria-hidden="true"
            className="absolute top-2 bottom-2 start-[7px] w-px bg-nc-cyan/20"
          />

          {valid.map((item, i) => {
            const timeframe = item.timeframe || item.when || '';
            const prediction =
              item.prediction || item.problem || item.text || item.description || '';
            return (
              <li
                key={i}
                className="relative ps-7"
              >
                {/* Dot */}
                <span
                  aria-hidden="true"
                  className="absolute start-0 top-1.5 w-3.5 h-3.5 rounded-full bg-nc-cyan ring-4 ring-nc-cyan/20"
                />
                {timeframe && (
                  <div className="report-prose text-xs font-bold text-nc-cyan uppercase tracking-wider mb-1">
                    {timeframe}
                  </div>
                )}
                <div className="report-prose text-nc-text1 leading-relaxed">
                  {prediction}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
