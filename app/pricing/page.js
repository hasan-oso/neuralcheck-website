'use client';

import { useLang } from '@/lib/LanguageContext';
import { SparklesIcon } from '@heroicons/react/24/outline';
import PricingCard from '@/components/PricingCard';

export default function PricingPage() {
  const { t } = useLang();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="text-center">
        <h1 className="text-3xl sm:text-5xl font-outfit font-bold nc-gradient-text leading-[1.15] pb-1">
          {t.pricing.title}
        </h1>
        <p className="mt-4 text-nc-text2 max-w-xl mx-auto">
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
      </div>

      <div className="mt-12 grid md:grid-cols-3 gap-6">
        <PricingCard
          name={t.pricing.single.name}
          price={t.pricing.single.price}
          priceLocal={t.pricing.single.priceLocal}
          desc={t.pricing.single.desc}
          features={t.pricing.single.features}
          cta={t.pricing.cta}
        />
        <PricingCard
          name={t.pricing.basic.name}
          price={t.pricing.basic.price}
          desc={t.pricing.basic.desc}
          features={t.pricing.basic.features}
          highlight="green"
          cta={t.pricing.cta}
        />
        <PricingCard
          name={t.pricing.pro.name}
          price={t.pricing.pro.price}
          desc={t.pricing.pro.desc}
          features={t.pricing.pro.features}
          highlight="cyan"
          badge={'★ ' + t.pricing.best}
          cta={t.pricing.cta}
        />
      </div>
    </div>
  );
}
