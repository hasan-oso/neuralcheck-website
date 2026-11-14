'use client';

import GradeBadge from '@/components/GradeBadge';
import { useLang } from '@/lib/LanguageContext';

export default function PhoneMockup() {
  const { t } = useLang();
  const m = t.mockup;

  return (
    <div className="relative mx-auto w-64 h-[500px] select-none">
      {/* Glow halo */}
      <div className="absolute -inset-10 bg-nc-green/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -inset-10 bg-nc-cyan/10 rounded-full blur-3xl pointer-events-none" />

      {/* Phone body */}
      <div className="relative h-full rounded-[2.75rem] bg-gradient-to-b from-nc-card via-nc-surface to-nc-bg border-[3px] border-nc-border shadow-2xl overflow-hidden">
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-6 rounded-full bg-nc-bg border border-nc-border z-10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-nc-border" />
        </div>

        {/* Screen */}
        <div className="absolute inset-2 mt-10 rounded-[2rem] bg-gradient-to-br from-nc-bg to-nc-card flex flex-col items-center gap-4 p-5 overflow-hidden">
          {/* Tiny status bar */}
          <div className="w-full flex items-center justify-between text-[10px] text-nc-text3">
            <span dir="ltr">9:41</span>
            <span className="nc-gradient-text font-bold">NeuralCheck</span>
            <span>▮▮▮</span>
          </div>

          {/* Grade */}
          <div className="mt-2 relative">
            <div className="absolute inset-0 rounded-full bg-nc-grade-a/30 blur-2xl" />
            <div className="relative">
              <GradeBadge grade="A" size="md" />
            </div>
          </div>

          <div className="text-center">
            <div dir="ltr" className="text-xs text-nc-text3">
              {m.device}
            </div>
            <div className="text-[11px] text-nc-green mt-0.5 font-semibold">
              {m.condition}
            </div>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-2 gap-2 w-full mt-1">
            <MiniStat label={m.stats.battery} value="96%" color="text-nc-green" />
            <MiniStat label={m.stats.cpu} value="100%" color="text-nc-cyan" />
            <MiniStat label={m.stats.display} value="A+" color="text-nc-green" />
            <MiniStat label={m.stats.camera} value="OK" color="text-nc-neon" />
          </div>

          {/* Waveform graphic */}
          <div className="w-full flex items-end gap-0.5 h-10 mt-auto">
            {[4, 8, 6, 10, 14, 9, 12, 16, 11, 14, 18, 13, 10, 15, 20, 14, 12, 16, 9, 6].map(
              (h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-sm nc-gradient-bg opacity-80"
                  style={{ height: `${h * 1.6}px` }}
                />
              )
            )}
          </div>

          {/* CTA */}
          <div className="w-full py-2 rounded-xl nc-gradient-bg text-nc-bg text-xs font-bold text-center">
            {m.viewReport}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="p-2 rounded-lg bg-nc-surface/80 border border-nc-border">
      <div className="text-[9px] text-nc-text3 uppercase tracking-wide">{label}</div>
      <div dir="ltr" className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}
