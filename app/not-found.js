'use client';

import Link from 'next/link';
import { useLang } from '@/lib/LanguageContext';
import Logo from '@/components/Logo';
import { HomeIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
  const { t } = useLang();

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-16 overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 start-1/4 w-72 h-72 sm:w-[400px] sm:h-[400px] bg-nc-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 end-1/4 w-72 h-72 sm:w-[400px] sm:h-[400px] bg-nc-cyan/10 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-lg animate-fade-slide-up">
        <div className="flex justify-center mb-6">
          <Logo size={64} />
        </div>

        <div className="text-7xl sm:text-9xl font-outfit font-black nc-gradient-text nc-hero-title-glow leading-none">
          404
        </div>

        <h1 className="mt-6 text-2xl sm:text-3xl font-outfit font-bold text-nc-text1">
          {t.notFound.title}
        </h1>
        <p className="mt-3 text-nc-text2 leading-relaxed">
          {t.notFound.desc}
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl nc-gradient-bg text-nc-bg font-semibold hover:shadow-[0_0_24px_rgba(0,255,140,0.3)] transition"
        >
          <HomeIcon className="w-4 h-4" strokeWidth={2.2} />
          {t.notFound.home}
        </Link>
      </div>
    </div>
  );
}
