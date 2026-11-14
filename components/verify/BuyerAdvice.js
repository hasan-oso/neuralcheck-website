'use client';

import { useState } from 'react';
import {
  BriefcaseIcon,
  UserIcon,
  PuzzlePieceIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';

const PERSONAS = [
  { key: 'casual', Icon: UserIcon },
  { key: 'gamer', Icon: PuzzlePieceIcon },
  { key: 'photographer', Icon: CameraIcon },
];

export default function BuyerAdvice({ advice, t }) {
  // Find which personas have non-empty advice text.
  const available = PERSONAS.filter(
    (p) => advice && typeof advice[p.key] === 'string' && advice[p.key].trim()
  );

  // Hooks must be called unconditionally — fallback to first persona if none.
  const initial = available[0]?.key || 'casual';
  const [active, setActive] = useState(initial);

  if (available.length === 0) return null;

  const labelFor = (key) => t.verify[key];
  const headingFor = (key) => {
    if (key === 'casual') return t.verify.forCasual;
    if (key === 'gamer') return t.verify.forGamer;
    if (key === 'photographer') return t.verify.forPhotographer;
    return labelFor(key);
  };

  const activeText = advice?.[active] || '';

  return (
    <section className="print:break-inside-avoid">
      <div className="flex items-center gap-2 mb-4">
        <BriefcaseIcon
          className="w-5 h-5 text-nc-glow"
          strokeWidth={1.8}
        />
        <h2 className="text-lg sm:text-xl font-outfit font-bold text-nc-text1">
          {t.verify.buyerAdvice}
        </h2>
      </div>

      <div className="p-6 rounded-2xl bg-nc-card border border-nc-border">
        {/* Tabs */}
        <div
          role="tablist"
          aria-label={t.verify.buyerAdvice}
          className="flex flex-wrap gap-2 mb-5 print:hidden"
        >
          {available.map(({ key, Icon }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition border ${
                  isActive
                    ? 'bg-nc-glow/10 border-nc-glow/50 text-nc-glow'
                    : 'bg-nc-surface border-nc-border text-nc-text2 hover:text-nc-text1 hover:border-nc-text3/40'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.8} />
                {labelFor(key)}
              </button>
            );
          })}
        </div>

        {/* Active advice (interactive — hidden in print, stacked block below shows all) */}
        <div
          role="tabpanel"
          className="p-4 rounded-xl bg-nc-surface border-s-4 border-nc-glow print:hidden"
        >
          <div className="text-xs text-nc-text3 uppercase tracking-wider mb-2">
            {headingFor(active)}
          </div>
          <p className="report-prose text-nc-text1 leading-relaxed">{activeText}</p>
        </div>

        {/* Print-friendly: show all personas stacked */}
        <div className="hidden print:flex flex-col gap-3 mt-4">
          {available.map(({ key }) => (
            <div key={key} className="p-3 rounded-lg bg-nc-surface">
              <div className="text-xs font-bold text-nc-text2 mb-1">
                {headingFor(key)}
              </div>
              <p className="report-prose text-sm text-nc-text1 leading-relaxed">
                {advice[key]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
