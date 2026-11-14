'use client';

import { useMemo } from 'react';

const COUNT = 28;

// SSR-safety note: `Math.sin` is one of the few JS Math functions whose result
// is NOT bit-for-bit specified by ECMAScript — implementations can differ in
// the last ULP or two. That difference is invisible until React reconciles the
// SSR-rendered DOM against the client's first render: a value like
//   6.52445800951682  vs  6.5244580096623395
// produces different `style` strings on server (Node V8) and client (Chromium
// V8), and React emits "Prop `style` did not match" hydration warnings.
//
// We round every derived float to 4 decimal places before it reaches the DOM.
// 4dp = 0.0001% / 0.0001px / 0.1ms precision — far below the perception floor
// for a decorative particle field, and identical on both runtimes.
function seedRand(i, salt = 0) {
  const x = Math.sin(i * 9301 + salt * 49297) * 233280;
  return x - Math.floor(x);
}

function r4(v) {
  return Number(v.toFixed(4));
}

export default function Particles({ className = '' }) {
  const particles = useMemo(() => {
    return Array.from({ length: COUNT }, (_, i) => {
      const x = r4(seedRand(i, 1) * 100);
      const y = r4(seedRand(i, 2) * 100);
      const size = r4(2 + seedRand(i, 3) * 3);
      const delay = r4(seedRand(i, 4) * 10);
      const duration = r4(9 + seedRand(i, 5) * 8);
      const isGreen = i % 3 !== 0;
      return { x, y, size, delay, duration, isGreen, key: i };
    });
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {particles.map((p) => (
        <span
          key={p.key}
          className={`absolute rounded-full blur-[1px] nc-float ${
            p.isGreen ? 'bg-nc-green/40' : 'bg-nc-cyan/40'
          }`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
