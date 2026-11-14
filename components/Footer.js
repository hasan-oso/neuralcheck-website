'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/LanguageContext';
import Logo from '@/components/Logo';
import {
  EnvelopeIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  LockClosedIcon,
  DevicePhoneMobileIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

const SUPPORT_EMAIL = 'contact@example.com';
// Baked at build time. Used as the SSR + first-client-render value so
// hydration matches; `year` switches to live `new Date()` only after mount.
const BUILD_YEAR = new Date().getFullYear();

export default function Footer() {
  const { t } = useLang();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const year = mounted ? new Date().getFullYear() : BUILD_YEAR;

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/print')) return null;

  return (
    <footer
      className="mt-20 border-t border-nc-border print:hidden"
      style={{ backgroundColor: '#060A14' }}
    >
      {/* Trust badges row */}
      <div className="border-b border-nc-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <TrustBadge Icon={LockClosedIcon} label={t.trust.encrypted} />
            <TrustBadge Icon={CpuChipIcon} label={t.trust.ai} />
            <TrustBadge Icon={ShieldCheckIcon} label={t.trust.verifiable} />
            <TrustBadge
              Icon={DevicePhoneMobileIcon}
              label={t.trust.models}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 md:gap-10">
          {/* Brand column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <Logo size={36} />
              <span className="text-xl font-outfit font-extrabold nc-gradient-text">
                NeuralCheck
              </span>
            </div>
            <p className="mt-4 text-nc-text2 text-sm leading-relaxed max-w-md">
              {t.footer.tagline}
            </p>

            {/* Support email */}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-5 inline-flex items-center gap-2 text-sm text-nc-text2 hover:text-nc-green transition group"
            >
              <span className="w-9 h-9 rounded-lg bg-nc-surface border border-nc-border flex items-center justify-center group-hover:border-nc-green/50 group-hover:text-nc-green transition">
                <EnvelopeIcon className="w-4 h-4" strokeWidth={1.8} />
              </span>
              <span className="font-mono text-xs sm:text-sm">
                {SUPPORT_EMAIL}
              </span>
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-nc-text1 mb-4 uppercase tracking-wider">
              {t.footer.product}
            </h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/" className="text-nc-text2 hover:text-nc-green transition">
                {t.nav.home}
              </Link>
              <Link
                href="/technology"
                className="text-nc-text2 hover:text-nc-green transition"
              >
                {t.nav.technology}
              </Link>
              <Link
                href="/verify"
                className="text-nc-text2 hover:text-nc-green transition"
              >
                {t.nav.verify}
              </Link>
              <Link
                href="/#pricing"
                className="text-nc-text2 hover:text-nc-green transition"
              >
                {t.nav.pricing}
              </Link>
              <Link
                href="/#faq"
                className="text-nc-text2 hover:text-nc-green transition"
              >
                {t.footer.faq}
              </Link>
              <a
                href="/download/NeuralCheck.apk"
                download
                className="text-nc-green hover:text-nc-green/80 transition flex items-center gap-1.5 font-medium"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
                {t.footer.downloadApk}
              </a>
            </div>
          </div>

          {/* Support / Legal */}
          <div>
            <h4 className="text-sm font-semibold text-nc-text1 mb-4 uppercase tracking-wider">
              {t.footer.support}
            </h4>
            <div className="flex flex-col gap-2 text-sm">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-nc-text2 hover:text-nc-green transition"
              >
                {t.footer.contact}
              </a>
              <Link
                href="/privacy"
                className="text-nc-text2 hover:text-nc-green transition"
              >
                {t.footer.privacy}
              </Link>
              <Link
                href="/terms"
                className="text-nc-text2 hover:text-nc-green transition"
              >
                {t.footer.terms}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-nc-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-nc-text3">
          <div suppressHydrationWarning>
            © {year} NeuralCheck. {t.footer.rights}.
          </div>
          <div className="font-mono">neuralcheck.net</div>
        </div>
      </div>
    </footer>
  );
}

function TrustBadge({ Icon, label }) {
  return (
    <div className="flex items-center gap-2.5 text-nc-text3">
      <Icon className="w-5 h-5 text-nc-green/70 shrink-0" strokeWidth={1.6} />
      <span className="text-xs sm:text-sm">{label}</span>
    </div>
  );
}
