'use client';

import { useId } from 'react';

export default function Logo({ size = 40, className = '' }) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');
  const phoneGrad = `phoneGrad-${uid}`;
  const neuronGrad = `neuronGrad-${uid}`;
  const coreGlow = `coreGlow-${uid}`;

  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="NeuralCheck"
    >
      <defs>
        <linearGradient id={phoneGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={neuronGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#a3e635" />
        </linearGradient>
        <radialGradient id={coreGlow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a3e635" stopOpacity="1" />
          <stop offset="40%" stopColor="#4ade80" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect
        x="52" y="28" width="96" height="144" rx="16" ry="16"
        fill="none"
        stroke={`url(#${phoneGrad})`}
        strokeWidth="2.5"
        opacity="0.85"
      />
      <rect
        x="82" y="32" width="36" height="4" rx="2"
        fill={`url(#${phoneGrad})`}
        opacity="0.5"
      />

      <g stroke={`url(#${neuronGrad})`} strokeWidth="2" strokeLinecap="round" opacity="0.9">
        <line x1="100" y1="100" x2="100" y2="52" />
        <line x1="100" y1="100" x2="142" y2="62" />
        <line x1="100" y1="100" x2="148" y2="100" />
        <line x1="100" y1="100" x2="142" y2="138" />
        <line x1="100" y1="100" x2="100" y2="152" />
        <line x1="100" y1="100" x2="58" y2="138" />
        <line x1="100" y1="100" x2="52" y2="100" />
        <line x1="100" y1="100" x2="58" y2="62" />
      </g>

      <g fill={`url(#${neuronGrad})`}>
        <circle cx="100" cy="52" r="5" />
        <circle cx="142" cy="62" r="5" />
        <circle cx="148" cy="100" r="5" />
        <circle cx="142" cy="138" r="5" />
        <circle cx="100" cy="152" r="4.5" />
        <circle cx="58" cy="138" r="5" />
        <circle cx="52" cy="100" r="5" />
        <circle cx="58" cy="62" r="5" />
      </g>

      <circle cx="100" cy="100" r="20" fill={`url(#${coreGlow})`} />
      <circle cx="100" cy="100" r="9" fill="#a3e635" opacity="0.9" />
      <circle cx="100" cy="100" r="4" fill="white" opacity="0.7" />
    </svg>
  );
}
