'use client';

import { useEffect, useRef, useState } from 'react';
import { useLang } from '@/lib/LanguageContext';

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function useCounter(target, duration, active) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      setValue(target * easeOutCubic(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, duration]);
  return value;
}

// `undefined` locale meant "system default" which resolved to en-US on the
// Node SSR runtime but to Arabic-Indic numerals on the client (because the
// root layout sets <html lang="ar">). Result: "0" on the server, "٠" on the
// client, every render — a hydration mismatch on the initial useCounter
// value. Pinning to 'en-US' matches the surrounding `tabular-nums` styling
// (which is for Latin glyphs) and stays deterministic across runtimes.
function formatNumber(value, decimals) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function StatCard({ value, suffix = '', decimals = 0, label, active, duration = 1800 }) {
  const current = useCounter(value, duration, active);
  return (
    <div className="text-center p-6 rounded-2xl bg-nc-card border border-nc-border hover:border-nc-green/40 transition">
      <div className="text-4xl sm:text-5xl font-outfit font-extrabold nc-gradient-text tabular-nums">
        {formatNumber(current, decimals)}
        {suffix}
      </div>
      <div className="mt-2 text-sm text-nc-text2">{label}</div>
    </div>
  );
}

export default function Stats() {
  const { t } = useLang();
  const ref = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const items = [
    { value: 100, suffix: '+', decimals: 0, label: t.stats.tests },
    { value: 8, suffix: '', decimals: 0, label: t.stats.minutes },
    { value: 11, suffix: '', decimals: 0, label: t.stats.variables },
    { value: 13, suffix: '', decimals: 0, label: t.stats.categories },
  ];

  return (
    <section ref={ref} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {items.map((item, i) => (
          <StatCard key={i} {...item} active={active} duration={1800 + i * 150} />
        ))}
      </div>
    </section>
  );
}
