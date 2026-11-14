'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import {
  ShieldCheckIcon,
  MapPinIcon,
  PhoneIcon,
  CalendarDaysIcon,
  DevicePhoneMobileIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';

import { db } from '@/firebase';
import { useLang } from '@/lib/LanguageContext';
import {
  formatPriceLatin,
  formatDateLatin,
  toLatinDigits,
} from '@/lib/format';
import GradeBadge from '@/components/GradeBadge';
import Logo from '@/components/Logo';
import Reveal from '@/components/Reveal';
import V7Notices from '@/components/verify/V7Notices';
import { classifyPipeline, PipelineKind } from '@/lib/pipelineTags';
import { pickGrade, pickDeviceName } from '@/lib/reportReaders/v6';
import { readOverall } from '@/lib/reportReaders/v7';

// ---------- helpers ----------

function readSlugFromPath() {
  if (typeof window === 'undefined') return null;
  const m = window.location.pathname.match(/\/shop\/([^/]+)/);
  if (!m) return null;
  const raw = decodeURIComponent(m[1]);
  // `_` is the build-time placeholder — treat it as no slug.
  if (!raw || raw === '_') return null;
  return raw;
}

// pickDeviceModel/pickScore used to be local copies of what is now
// lib/reportReaders/v6.js — the local pickDeviceModel never checked
// `deviceMarketingName`, so a V7 listing (which carries only that field)
// rendered "—" here. Switched to the shared V6 reader + a pipeline branch
// below (see readOverall/pickGrade usage in DeviceCard) rather than adding a
// second near-identical reader for this card shape.

// ---------- main component ----------

export default function ShopClient() {
  const { t, lang } = useLang();
  const [mounted, setMounted] = useState(false);
  const [slug, setSlug] = useState(null);
  const [shop, setShop] = useState(null);
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'not_found' | 'error'

  // Mount: figure out the actual slug from the URL.
  useEffect(() => {
    setMounted(true);
    setSlug(readSlugFromPath());
  }, []);

  // Fetch shop + reports once we have a slug.
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    if (!slug) {
      setStatus('not_found');
      return;
    }

    setStatus('loading');

    (async () => {
      try {
        // 1. Find the shop owner by slug.
        const usersSnap = await getDocs(
          query(
            collection(db, 'users'),
            where('shopSlug', '==', slug),
            limit(1)
          )
        );
        if (cancelled) return;

        if (usersSnap.empty) {
          setStatus('not_found');
          return;
        }

        const doc0 = usersSnap.docs[0];
        const shopData = { id: doc0.id, ...doc0.data() };
        setShop(shopData);

        // 2. Fetch the owner's reports that are in a public listing state
        // (for_sale or sold). Sold items are kept on the page as social proof
        // — buyers can see what the seller has actually moved. Rules require
        // listingStatus to be in ['for_sale','sold'] for any non-owner read.
        //
        // Needs the composite index (userId ASC + listingStatus ASC +
        // createdAt DESC), which lives in the BACKEND repo at
        // neuralcheck-backend/firestore.indexes.json — not in this one. It was
        // created by hand in the console and went undeclared for a while; see
        // neuralcheck-backend/docs/FIRESTORE_INDEXES.md before touching it.
        let items = [];
        try {
          const reportsSnap = await getDocs(
            query(
              collection(db, 'reports'),
              where('userId', '==', doc0.id),
              where('listingStatus', 'in', ['for_sale', 'sold']),
              orderBy('createdAt', 'desc'),
              limit(50)
            )
          );
          if (cancelled) return;
          items = reportsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (reportsErr) {
          // Index still building, or rules denial — show shop without devices
          // rather than failing the whole page.
          // eslint-disable-next-line no-console
          console.warn('Shop reports fetch failed:', reportsErr);
        }

        // Sort: for_sale first, then sold. JS Array.sort is stable (ES2019+),
        // so within each group the createdAt-desc order from the query is
        // preserved.
        items.sort((a, b) => {
          const pa = a.listingStatus === 'for_sale' ? 0 : 1;
          const pb = b.listingStatus === 'for_sale' ? 0 : 1;
          return pa - pb;
        });

        if (cancelled) return;
        setReports(items);
        setStatus('ok');
      } catch (e) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error('Shop load failed:', e);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, slug]);

  // Skeleton until we've decided.
  if (!mounted || status === 'loading') {
    return <ShopSkeleton />;
  }

  if (status === 'not_found') {
    return <ShopNotFound t={t} lang={lang} />;
  }

  if (status === 'error' || !shop) {
    return <ShopError t={t} lang={lang} />;
  }

  return <ShopView shop={shop} reports={reports} t={t} lang={lang} />;
}

// ---------- subviews ----------

function ShopSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="p-8 rounded-3xl bg-nc-card border border-nc-border animate-pulse">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-nc-surface" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-48 rounded-md bg-nc-surface" />
            <div className="h-4 w-64 rounded-md bg-nc-surface/70" />
          </div>
        </div>
        <div className="mt-6 h-4 w-full rounded-md bg-nc-surface/70" />
        <div className="mt-2 h-4 w-3/4 rounded-md bg-nc-surface/70" />
      </div>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-nc-card border border-nc-border h-40 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function ShopNotFound({ t, lang }) {
  return (
    <div className="relative min-h-[70vh] flex items-center justify-center px-4 sm:px-6 py-16 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 start-1/4 w-72 h-72 sm:w-[400px] sm:h-[400px] bg-nc-grade-d/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 end-1/4 w-72 h-72 sm:w-[400px] sm:h-[400px] bg-nc-cyan/10 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-lg animate-fade-slide-up">
        <div className="flex justify-center mb-6">
          <Logo size={56} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1">
          {t.shop.noShop}
        </h1>
        <p className="mt-3 text-nc-text2 leading-relaxed">{t.shop.noShopHint}</p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl nc-gradient-bg text-nc-bg font-semibold transition"
        >
          <ChevronLeftIcon
            className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`}
            strokeWidth={2.2}
          />
          {t.notFound.home}
        </Link>
      </div>
    </div>
  );
}

function ShopError({ t, lang }) {
  return (
    <div className="relative min-h-[70vh] flex items-center justify-center px-4 sm:px-6 py-16">
      <div className="text-center max-w-lg">
        <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1">
          {t.shop.loadError}
        </h1>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl bg-nc-card border border-nc-border text-nc-text1 hover:border-nc-green/50 transition"
        >
          <ChevronLeftIcon
            className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`}
            strokeWidth={2.2}
          />
          {t.notFound.home}
        </Link>
      </div>
    </div>
  );
}

function ShopView({ shop, reports, t, lang }) {
  const name = shop.shopName || shop.name || shop.displayName || shop.email || '—';
  const city = shop.shopCity || shop.city || '';
  const phone = shop.shopPhone || shop.phone || shop.shopContact || '';
  const desc = shop.shopDesc || shop.shopDescription || shop.description || '';
  const logoUrl = shop.shopLogoUrl || shop.logoUrl || shop.photoURL || '';

  const initial = (name || '?').toString().trim().charAt(0).toUpperCase();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 start-1/4 w-72 h-72 sm:w-[400px] sm:h-[400px] bg-nc-green/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 end-1/4 w-72 h-72 sm:w-[400px] sm:h-[400px] bg-nc-cyan/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Back link */}
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
        </Reveal>

        {/* Shop header card */}
        <Reveal>
          <header className="relative p-6 sm:p-8 rounded-3xl bg-nc-card border border-nc-border nc-glow overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Logo / initial */}
              <div className="shrink-0">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-nc-border bg-nc-surface"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-nc-green/20 to-nc-cyan/20 border border-nc-border flex items-center justify-center">
                    <span className="text-3xl sm:text-4xl font-outfit font-black nc-gradient-text">
                      {initial}
                    </span>
                  </div>
                )}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1 leading-tight break-words">
                  {name}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-nc-text2">
                  {city && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPinIcon
                        className="w-4 h-4 text-nc-text3"
                        strokeWidth={1.8}
                      />
                      {city}
                    </span>
                  )}
                  {phone && (
                    <a
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                      className="inline-flex items-center gap-1.5 hover:text-nc-green transition"
                    >
                      <PhoneIcon
                        className="w-4 h-4 text-nc-text3"
                        strokeWidth={1.8}
                      />
                      {phone}
                    </a>
                  )}
                </div>

                {desc && (
                  <p className="mt-3 text-nc-text2 leading-relaxed text-sm sm:text-base">
                    {desc}
                  </p>
                )}
              </div>
            </div>

            {/* Trusted badge */}
            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-nc-green/10 border border-nc-green/30 text-nc-green text-xs sm:text-sm font-medium">
              <ShieldCheckIcon className="w-4 h-4" strokeWidth={2} />
              <span>{t.shop.trustedBadge}</span>
            </div>
          </header>
        </Reveal>

        {/* Devices section */}
        <section className="mt-10 sm:mt-12">
          <Reveal>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-outfit font-bold text-nc-text1">
                {t.shop.scannedDevices}
              </h2>
              {reports.length > 0 && (
                <span className="text-sm text-nc-text3">
                  <span dir="ltr" className="tabular-nums">
                    {toLatinDigits(reports.length)}
                  </span>{' '}
                  {t.shop.devicesCount}
                </span>
              )}
            </div>
          </Reveal>

          {reports.length === 0 ? (
            <Reveal>
              <div className="mt-6 p-8 sm:p-10 rounded-2xl bg-nc-card border border-nc-border text-center">
                <DevicePhoneMobileIcon
                  className="w-12 h-12 mx-auto text-nc-text3"
                  strokeWidth={1.4}
                />
                <p className="mt-4 text-nc-text2">{t.shop.noDevices}</p>
              </div>
            </Reveal>
          ) : (
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((r, i) => (
                <Reveal key={r.id} delay={Math.min(i * 60, 360)}>
                  <DeviceCard report={r} t={t} lang={lang} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Exported (not just used locally) so scripts/test/v7NoticesWiring.test.cjs
// can render the REAL card component directly with a real fixture (rule
// 30), rather than a reimplementation. Purely additive.
export function DeviceCard({ report, t, lang }) {
  // Pipeline read first, then the matching reader (see lib/reportReaders/
  // {v6,v7}.js doc comments — no fallback chain trying both shapes at once).
  const pipeline = classifyPipeline(report);
  const isV7 = pipeline.kind === PipelineKind.V7;
  if (pipeline.kind === PipelineKind.UNKNOWN_TAG) {
    // eslint-disable-next-line no-console
    console.warn('[shop] unrecognized pipeline tag — using the V6 reader as a best effort', pipeline.tag);
  }
  // Letter grade unifies (V6 `grade` / V7 `overall.letter`). The numeric
  // score never reaches this card at all any more: V7 has no per-report
  // numeric score (see readOverall's doc comment in lib/reportReaders/
  // v7.js), and V6's score is hidden from the buyer by decision (decision 6:
  // "score — لا يُعرض للمستخدم إطلاقاً"). The score DOM block itself (a
  // `score !== null` guard around a percentage span) is removed outright,
  // not merely fed `null` — item 6(b) of the fourth addendum to decision 102
  // (2026-09-26) needed no bare "score" token left in this file's rendered
  // JSX at all, so the guard extended in that commit could ban the word
  // structurally instead of having to special-case a guarded-but-dead
  // branch. pickScore is not called here.
  const model = pickDeviceName(report);
  const date = formatDateLatin(
    report.createdAt || report.scannedAt || report.timestamp || report.date,
    lang
  );
  const scanId = report.scanId || report.id;
  // decision 82 §2: /shop shows the state and its reason with the same
  // component /verify uses (V7Notices), not just a bare grade badge.
  const overall = isV7 ? readOverall(report) : null;
  const grade = isV7 ? overall.letter : pickGrade(report);
  const priceStr = formatPriceLatin(report.price, report.currency, lang);
  const sellerNote = (report.sellerNote || '').toString().trim();
  const isSold = report.listingStatus === 'sold';
  const isForSale = report.listingStatus === 'for_sale';

  const href = scanId ? `/verify/?scanId=${encodeURIComponent(scanId)}` : '#';

  return (
    <Link
      href={href}
      className={`group block p-5 rounded-2xl bg-nc-card border transition-all ${
        isSold
          ? 'border-nc-border/60 opacity-60 hover:opacity-100 hover:border-nc-grade-d/40'
          : 'border-nc-border hover:border-nc-green/50 hover:-translate-y-0.5 hover:shadow-lg'
      }`}
    >
      <div className="flex items-start gap-4">
        <GradeBadge grade={grade} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="mt-1.5 text-sm font-medium text-nc-text1 line-clamp-2 break-words">
            {model}
          </div>
        </div>
        {isForSale && (
          <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-nc-green/15 border border-nc-green/30 text-nc-green font-semibold uppercase tracking-wider whitespace-nowrap">
            {t.shop.forSaleBadge}
          </span>
        )}
        {isSold && (
          <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-nc-grade-d/15 border border-nc-grade-d/40 text-nc-grade-d font-semibold uppercase tracking-wider whitespace-nowrap">
            {t.shop.soldBadge}
          </span>
        )}
      </div>

      {/* decision 82 §2 — same V7Notices component /verify uses. Renders
          nothing when `overall` has nothing to show. */}
      {overall && (
        <div className="mt-3">
          <V7Notices overall={overall} t={t} />
        </div>
      )}

      {/* Price */}
      {priceStr && (
        <div
          dir="ltr"
          className="mt-3 text-lg font-outfit font-bold nc-gradient-text tabular-nums text-start"
        >
          {priceStr}
        </div>
      )}

      {/* Seller note */}
      {sellerNote && (
        <div className="mt-3 p-3 rounded-lg bg-nc-surface">
          <div className="text-[10px] text-nc-text3 uppercase tracking-wider mb-1">
            {t.shop.sellerNote}
          </div>
          <p className="text-xs text-nc-text2 leading-relaxed line-clamp-3 break-words">
            {sellerNote}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-nc-text3">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDaysIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span dir="ltr">{date}</span>
        </span>
        <span className="text-nc-text3 group-hover:text-nc-green transition">
          {t.shop.viewReport}
          <span className={`ms-1 ${lang === 'ar' ? 'inline-block rotate-180' : ''}`}>
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
