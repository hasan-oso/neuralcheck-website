'use client';

import Link from 'next/link';
import { useLang } from '@/lib/LanguageContext';
import Reveal from '@/components/Reveal';
import {
  BeakerIcon,
  BoltIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  CircleStackIcon,
  Battery100Icon,
  GlobeAltIcon,
  ArrowDownTrayIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

export default function TechnologyPage() {
  const { t } = useLang();
  const tech = t.technology;

  return (
    <div className="relative overflow-hidden">
      {/* ---------- Hero ---------- */}
      <section className="relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 start-1/4 w-[500px] h-[500px] bg-nc-green/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 end-1/4 w-[500px] h-[500px] bg-nc-cyan/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nc-surface/70 border border-nc-border text-xs text-nc-text2 mb-6">
              <BeakerIcon className="w-3.5 h-3.5 text-nc-green" strokeWidth={2} />
              {tech.hero.badge}
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-outfit font-black leading-[1.1] tracking-tight">
              <span className="nc-gradient-text nc-hero-title-glow">
                {tech.hero.title}
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-nc-text2 max-w-3xl mx-auto leading-relaxed">
              {tech.hero.subtitle}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Section 2: 8-phase protocol ---------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Reveal>
          <SectionHeading
            Icon={BoltIcon}
            iconBg="bg-nc-green/10"
            iconColor="text-nc-green"
            title={tech.protocol.title}
          />
          <p className="mt-4 text-nc-text2 leading-relaxed max-w-3xl">
            {tech.protocol.intro}
          </p>
        </Reveal>

        {/* Quick-glance numeric strip */}
        <Reveal delay={120}>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <NumStrip value="~480" unit="s" />
            <NumStrip value="1,600" unit="samples" />
            <NumStrip value="11" unit="channels" />
            <NumStrip value="8" unit="phases" />
          </div>
        </Reveal>

        {/* Phase grid */}
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tech.protocol.phases.map((phase, i) => (
            <Reveal key={phase.num} delay={Math.min(i * 60, 360)}>
              <PhaseCard phase={phase} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Section 3: AI Camouflage ---------- */}
      <section className="relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 -translate-y-1/2 start-0 w-[400px] h-[400px] bg-nc-cyan/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Reveal>
            <SectionHeading
              Icon={CpuChipIcon}
              iconBg="bg-nc-cyan/10"
              iconColor="text-nc-cyan"
              title={tech.camouflage.title}
            />
          </Reveal>

          <div className="mt-6 flex flex-col gap-4 max-w-3xl">
            {tech.camouflage.body.map((para, i) => (
              <Reveal key={i} delay={i * 100}>
                <p className="text-nc-text2 leading-relaxed">{para}</p>
              </Reveal>
            ))}
          </div>

          {/* Validated devices callout */}
          <Reveal delay={200}>
            <div className="mt-10 p-6 sm:p-8 rounded-2xl bg-nc-card border border-nc-green/30 nc-glow">
              <div className="flex items-center gap-2.5 mb-2">
                <CheckBadgeIcon
                  className="w-5 h-5 text-nc-green"
                  strokeWidth={1.8}
                />
                <h3 className="text-base sm:text-lg font-semibold text-nc-text1">
                  {tech.camouflage.validatedTitle}
                </h3>
              </div>
              <p className="text-sm text-nc-text3 mb-4">
                {tech.camouflage.validatedNote}
              </p>
              <ul className="flex flex-col gap-2.5">
                {tech.camouflage.validatedDevices.map((device, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-nc-text2"
                  >
                    <ShieldCheckIcon
                      className="w-4 h-4 text-nc-green flex-shrink-0 mt-0.5"
                      strokeWidth={2}
                    />
                    <span dir="ltr" className="leading-relaxed">
                      {device}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Section 4: V6 pipeline ---------- */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Reveal>
          <SectionHeading
            Icon={CircleStackIcon}
            iconBg="bg-nc-neon/10"
            iconColor="text-nc-neon"
            title={tech.pipeline.title}
          />
        </Reveal>

        <div className="mt-6 flex flex-col gap-4 max-w-3xl">
          {tech.pipeline.body.map((para, i) => (
            <Reveal key={i} delay={i * 100}>
              <p className="text-nc-text2 leading-relaxed">{para}</p>
            </Reveal>
          ))}
        </div>

        {/* AI stack tiles */}
        <Reveal delay={250}>
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {tech.pipeline.stack.map((item, i) => (
              <div
                key={i}
                className="p-4 sm:p-5 rounded-xl bg-nc-card border border-nc-border"
              >
                <div className="text-xs text-nc-text3 uppercase tracking-wider">
                  {item.label}
                </div>
                <div
                  dir="ltr"
                  className="mt-2 text-base sm:text-lg font-semibold nc-gradient-text break-words"
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ---------- Section 5: Battery indicators ---------- */}
      <section className="relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 end-1/4 w-[400px] h-[400px] bg-nc-green/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Reveal>
            <SectionHeading
              Icon={Battery100Icon}
              iconBg="bg-nc-glow/10"
              iconColor="text-nc-glow"
              title={tech.battery.title}
            />
          </Reveal>

          <div className="mt-6 flex flex-col gap-4 max-w-3xl">
            {tech.battery.body.map((para, i) => (
              <Reveal key={i} delay={i * 100}>
                <p className="text-nc-text2 leading-relaxed">{para}</p>
              </Reveal>
            ))}
          </div>

          {/* 6 indicators */}
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tech.battery.indicators.map((ind, i) => (
              <Reveal key={i} delay={Math.min(i * 60, 300)}>
                <IndicatorCard num={i + 1} ind={ind} />
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <p className="mt-8 text-sm sm:text-base text-nc-text2 italic max-w-2xl">
              {tech.battery.closing}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Section 6: Multilingual ---------- */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Reveal>
          <SectionHeading
            Icon={GlobeAltIcon}
            iconBg="bg-nc-cyan/10"
            iconColor="text-nc-cyan"
            title={tech.multilingual.title}
          />
          <p className="mt-6 text-nc-text2 leading-relaxed max-w-3xl">
            {tech.multilingual.body}
          </p>
        </Reveal>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <Reveal>
          <div className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-nc-card to-nc-surface border border-nc-border nc-glow overflow-hidden text-center">
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none opacity-30"
            >
              <div className="absolute -top-20 -start-20 w-64 h-64 bg-nc-green rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -end-20 w-64 h-64 bg-nc-cyan rounded-full blur-3xl" />
            </div>

            <h2 className="relative text-2xl sm:text-3xl md:text-4xl font-outfit font-bold nc-gradient-text leading-[1.2] pb-1">
              {tech.cta.title}
            </h2>
            <a
              href="/download/NeuralCheck.apk"
              download
              className="relative inline-flex items-center gap-2 mt-6 px-8 py-4 rounded-xl nc-gradient-bg text-nc-bg font-semibold hover:shadow-[0_0_32px_rgba(0,255,140,0.4)] transition"
            >
              <ArrowDownTrayIcon className="w-5 h-5" strokeWidth={2} />
              {tech.cta.button}
            </a>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

// ---------- subcomponents ----------

function SectionHeading({ Icon, iconBg, iconColor, title }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-11 h-11 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center flex-shrink-0`}
      >
        <Icon className="w-5 h-5" strokeWidth={1.8} />
      </div>
      <h2 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1 leading-tight">
        {title}
      </h2>
    </div>
  );
}

function NumStrip({ value, unit }) {
  return (
    <div className="p-3 sm:p-4 rounded-xl bg-nc-card border border-nc-border text-center">
      <div
        dir="ltr"
        className="text-xl sm:text-2xl font-outfit font-extrabold nc-gradient-text tabular-nums leading-none"
      >
        {value}
      </div>
      <div className="mt-1.5 text-[10px] sm:text-xs text-nc-text3 uppercase tracking-wider">
        {unit}
      </div>
    </div>
  );
}

function PhaseCard({ phase }) {
  return (
    <div className="h-full p-5 rounded-2xl bg-nc-card border border-nc-border hover:border-nc-green/40 transition">
      <div className="flex items-center justify-between mb-3">
        <span
          dir="ltr"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-nc-surface border border-nc-border text-sm font-mono font-bold nc-gradient-text"
        >
          {phase.num}
        </span>
        <span
          dir="ltr"
          className="text-[11px] text-nc-text3 font-mono tabular-nums"
        >
          {phase.duration}
        </span>
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-nc-text1">
        {phase.name}
      </h3>
      <p className="mt-2 text-xs sm:text-sm text-nc-text2 leading-relaxed">
        {phase.desc}
      </p>
    </div>
  );
}

function IndicatorCard({ num, ind }) {
  return (
    <div className="h-full p-5 rounded-2xl bg-nc-card border border-nc-border hover:border-nc-glow/40 transition">
      <div className="flex items-center gap-2.5 mb-2">
        <span
          dir="ltr"
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-nc-glow/10 text-nc-glow text-xs font-bold tabular-nums"
        >
          {num}
        </span>
        <h3 className="text-sm sm:text-base font-semibold text-nc-text1 leading-tight">
          {ind.name}
        </h3>
      </div>
      <p className="text-xs sm:text-sm text-nc-text2 leading-relaxed">
        {ind.detail}
      </p>
    </div>
  );
}
