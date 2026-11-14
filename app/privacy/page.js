'use client';

import Link from 'next/link';
import { useLang } from '@/lib/LanguageContext';
import Reveal from '@/components/Reveal';
import { ShieldCheckIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

export default function PrivacyPage() {
  const { t, lang } = useLang();
  const p = t.privacy;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 start-1/4 w-72 h-72 sm:w-[400px] sm:h-[400px] bg-nc-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 end-1/4 w-72 h-72 sm:w-[400px] sm:h-[400px] bg-nc-cyan/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <Reveal>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-nc-text3 hover:text-nc-green transition mb-6"
          >
            <ChevronLeftIcon
              className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`}
              strokeWidth={2}
            />
            {t.notFound.home}
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-nc-green/10 border border-nc-green/30 flex items-center justify-center">
              <ShieldCheckIcon className="w-6 h-6 text-nc-green" strokeWidth={1.8} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-outfit font-bold nc-gradient-text leading-[1.15] pb-1">
              {p.title}
            </h1>
          </div>
          <p className="text-sm text-nc-text3">{p.updated}</p>
        </Reveal>

        <div className="mt-10 flex flex-col gap-6">
          {p.sections.map((s, i) => (
            <Reveal key={i} delay={i * 80}>
              <section className="p-6 sm:p-7 rounded-2xl bg-nc-card border border-nc-border">
                <h2 className="text-lg sm:text-xl font-semibold text-nc-text1">
                  {s.h}
                </h2>
                <p className="mt-3 text-nc-text2 leading-relaxed">{s.p}</p>
              </section>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
