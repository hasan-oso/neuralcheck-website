'use client';

import Link from 'next/link';
import {
  ClockIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useLang } from '@/lib/LanguageContext';
import FeatureCard from '@/components/FeatureCard';
import PricingCard from '@/components/PricingCard';
import Particles from '@/components/Particles';
import PhoneMockup from '@/components/PhoneMockup';
import TrustBar from '@/components/TrustBar';
import Stats from '@/components/Stats';
import FAQ from '@/components/FAQ';
import Reveal from '@/components/Reveal';

export default function HomePage() {
  const { t } = useLang();

  const featureDefs = [
    { Icon: ClockIcon, iconColor: 'green', ...t.features.f1 },
    { Icon: CpuChipIcon, iconColor: 'cyan', ...t.features.f2 },
    { Icon: ShieldCheckIcon, iconColor: 'neon', ...t.features.f3 },
    { Icon: SparklesIcon, iconColor: 'glow', ...t.features.f4 },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <Particles />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 start-1/4 w-[500px] h-[500px] bg-nc-green/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 end-1/4 w-[500px] h-[500px] bg-nc-cyan/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 grid md:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div className="text-center md:text-start">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nc-surface/70 border border-nc-border text-xs text-nc-text2 mb-6 animate-fade-slide-up"
            >
              <span className="w-2 h-2 rounded-full bg-nc-green animate-pulse" />
              {t.hero.badge}
            </div>

            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-outfit font-black leading-[1.05] tracking-tight animate-fade-slide-up"
              style={{ animationDelay: '0.08s' }}
            >
              <span className="nc-gradient-text nc-hero-title-glow">
                {t.hero.title}
              </span>
            </h1>

            <p
              className="mt-6 text-lg text-nc-text2 max-w-xl mx-auto md:mx-0 leading-relaxed animate-fade-slide-up"
              style={{ animationDelay: '0.18s' }}
            >
              {t.hero.subtitle}
            </p>

            <div
              className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start animate-fade-slide-up"
              style={{ animationDelay: '0.28s' }}
            >
              <a
                href="/download/NeuralCheck.apk"
                download
                className="px-8 py-4 rounded-xl nc-gradient-bg text-nc-bg font-semibold animate-pulse-glow inline-flex items-center justify-center"
              >
                {t.hero.cta}
              </a>
              <Link
                href="/verify"
                className="px-8 py-4 rounded-xl border border-nc-border bg-nc-card text-nc-text1 hover:border-nc-cyan/50 hover:bg-nc-surface transition"
              >
                {t.hero.ctaVerify}
              </Link>
            </div>
          </div>

          <div
            className="flex justify-center md:justify-end animate-fade-slide-up"
            style={{ animationDelay: '0.38s' }}
          >
            <PhoneMockup />
          </div>
        </div>
      </section>

      <TrustBar />

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-outfit font-bold text-center text-nc-text1">
            {t.features.title}
          </h2>
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featureDefs.map((f, i) => (
            <Reveal key={i} delay={i * 120}>
              <FeatureCard {...f} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={600}>
          <div className="mt-10 text-center">
            <Link
              href="/technology"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-nc-card border border-nc-border text-nc-text2 hover:text-nc-green hover:border-nc-green/50 transition text-sm font-medium"
            >
              {t.features.learnHow}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Stats */}
      <Stats />

      {/* How it works — timeline */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-outfit font-bold text-center text-nc-text1">
            {t.howItWorks.title}
          </h2>
        </Reveal>

        <div className="mt-14 relative">
          {/* Connecting line (desktop only) */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-8 start-[16.6%] end-[16.6%] h-px bg-gradient-to-r from-transparent via-nc-green/50 to-transparent"
          />

          <div className="grid md:grid-cols-3 gap-10 relative">
            {[t.howItWorks.s1, t.howItWorks.s2, t.howItWorks.s3].map((step, i) => (
              <Reveal key={i} delay={i * 220}>
                <div className="text-center">
                  <div
                    className="relative w-16 h-16 mx-auto rounded-full border-2 bg-nc-bg flex items-center justify-center text-2xl font-outfit font-black nc-gradient-text nc-step-pulse"
                    style={{ animationDelay: `${i * 0.6}s` }}
                  >
                    {i + 1}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-nc-text1">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-nc-text2 max-w-xs mx-auto leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 scroll-mt-24"
      >
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-outfit font-bold text-center text-nc-text1">
            {t.pricing.title}
          </h2>
          <p className="mt-3 text-center text-nc-text2 max-w-xl mx-auto">
            {t.pricing.subtitle}
          </p>
          {t.pricing.freeTrial && (
            <div className="mt-5 flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nc-green/10 border border-nc-green/30 text-nc-green text-xs sm:text-sm font-medium">
                <SparklesIcon className="w-4 h-4" strokeWidth={2} />
                <span>{t.pricing.freeTrial}</span>
              </div>
            </div>
          )}
        </Reveal>

        <div className="mt-12 grid md:grid-cols-3 gap-6 md:items-stretch">
          <Reveal delay={0}>
            <PricingCard
              name={t.pricing.single.name}
              price={t.pricing.single.price}
              priceLocal={t.pricing.single.priceLocal}
              desc={t.pricing.single.desc}
              features={t.pricing.single.features}
              cta={t.pricing.cta}
            />
          </Reveal>
          <Reveal delay={140}>
            <PricingCard
              name={t.pricing.basic.name}
              price={t.pricing.basic.price}
              desc={t.pricing.basic.desc}
              features={t.pricing.basic.features}
              popular
              badge={t.pricing.popular}
              cta={t.pricing.cta}
            />
          </Reveal>
          <Reveal delay={280}>
            <PricingCard
              name={t.pricing.pro.name}
              price={t.pricing.pro.price}
              desc={t.pricing.pro.desc}
              features={t.pricing.pro.features}
              highlight="cyan"
              cta={t.pricing.cta}
            />
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* Final CTA / Download */}
      <section
        id="download"
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 scroll-mt-24"
      >
        <Reveal>
          <div className="relative p-8 sm:p-12 lg:p-16 rounded-3xl bg-gradient-to-br from-nc-card to-nc-surface border border-nc-border nc-glow overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none opacity-30"
            >
              <div className="absolute -top-20 -start-20 w-64 h-64 bg-nc-green rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -end-20 w-64 h-64 bg-nc-cyan rounded-full blur-3xl" />
            </div>

            <div className="relative grid md:grid-cols-[1fr_auto] gap-10 md:gap-12 items-center">
              {/* Text + CTA */}
              <div className="text-center md:text-start">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nc-green/10 border border-nc-green/30 text-nc-green text-xs font-medium">
                  <AndroidIcon className="w-3.5 h-3.5" />
                  <span>{t.download.android}</span>
                </div>

                <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-outfit font-bold nc-gradient-text leading-[1.15] pb-2">
                  {t.download.title}
                </h2>
                <p className="mt-4 text-nc-text2 max-w-xl mx-auto md:mx-0 leading-relaxed">
                  {t.download.subtitle}
                </p>

                <a
                  href="/download/NeuralCheck.apk"
                  download
                  className="inline-flex items-center gap-3 mt-8 px-8 py-4 rounded-xl nc-gradient-bg text-nc-bg font-semibold animate-pulse-glow shadow-lg hover:shadow-[0_0_32px_rgba(0,255,140,0.4)] transition"
                >
                  <AndroidIcon className="w-5 h-5" />
                  {t.download.button}
                </a>

                <div className="mt-4 flex flex-col gap-1.5 items-center md:items-start text-xs">
                  <span className="text-nc-text2 font-medium">
                    {t.download.versionInfo}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-nc-text3">
                    <span className="w-1.5 h-1.5 rounded-full bg-nc-cyan" />
                    {t.download.comingPlayStore}
                  </span>
                </div>
              </div>

              {/* Compact phone preview — hidden on mobile */}
              <div className="hidden md:block scale-90 origin-center">
                <PhoneMockup />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function AndroidIcon({ className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.523 15.34c-.534 0-.967-.425-.967-.95 0-.524.433-.95.967-.95.534 0 .967.426.967.95 0 .525-.433.95-.967.95zm-11.046 0c-.534 0-.967-.425-.967-.95 0-.524.433-.95.967-.95.534 0 .967.426.967.95 0 .525-.433.95-.967.95zm11.39-6.05l1.928-3.34a.4.4 0 0 0-.146-.546.4.4 0 0 0-.546.146l-1.952 3.382C15.696 8.157 13.91 7.74 12 7.74s-3.696.417-5.151 1.193L4.897 5.55a.4.4 0 0 0-.546-.146.4.4 0 0 0-.146.546l1.928 3.34C2.842 11.06.745 14.27.327 18h23.346c-.418-3.73-2.515-6.94-5.806-8.71z" />
    </svg>
  );
}
