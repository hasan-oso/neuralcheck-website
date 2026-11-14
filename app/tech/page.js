'use client';

// Technician evaluation panel — list + evaluation in one client route.
//
// WHY ONE ROUTE AND NOT /tech/[scanId]:
// the site is a static export, so a dynamic segment would need the
// generateStaticParams + Firebase rewrite dance that /shop/[slug] and
// /print/[shortId] use, and every open would re-fetch the report. Here the
// list is already in memory, so opening an evaluation costs zero network and
// zero wait — which is the whole budget we're protecting. The browser back
// button is wired through history.pushState so it still behaves like two
// screens.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  ClipboardDocumentCheckIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { auth, db } from '@/firebase';
import { useAuth } from '@/lib/AuthContext';
import Spinner, { PageSpinner } from '@/components/admin/Spinner';
import { toLatinDigits } from '@/lib/format';
import ScanCard from '@/components/tech/ScanCard';
import EvaluationForm from '@/components/tech/EvaluationForm';
import {
  TechnicianNameGate,
  TechnicianChip,
} from '@/components/tech/TechnicianName';
import {
  EVALUATIONS_COLLECTION,
  SCANS_LIMIT,
  applyEvaluationPayloadLocally,
  readTechnicianName,
  resolveScanId,
} from '@/lib/techEval';

// The panel is Arabic-only (same call as the admin panel), so dates are
// formatted in Arabic regardless of the visitor's site language preference.
const PANEL_LANG = 'ar';

export default function TechPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();

  const [technicianName, setTechnicianName] = useState(null); // null = unread
  const [reports, setReports] = useState([]);
  const [evaluations, setEvaluations] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [evalsDegraded, setEvalsDegraded] = useState(false);
  const [activeScanId, setActiveScanId] = useState(null);

  // localStorage is only readable after mount.
  useEffect(() => {
    setTechnicianName(readTechnicianName());
  }, []);

  // -------------------------------------------------------------------------
  // Data
  // -------------------------------------------------------------------------

  const load = useCallback(async (uid, { isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError('');

    const reportsQ = query(
      collection(db, 'reports'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(SCANS_LIMIT)
    );
    const evalsQ = query(
      collection(db, EVALUATIONS_COLLECTION),
      where('ownerId', '==', uid)
    );

    // allSettled, not all: the evaluations collection may not have rules
    // deployed yet. A failure there must not take the panel down — the
    // technician can still evaluate, he just loses the "already done" markers.
    const [reportsRes, evalsRes] = await Promise.allSettled([
      getDocs(reportsQ),
      getDocs(evalsQ),
    ]);

    if (reportsRes.status === 'fulfilled') {
      setReports(
        reportsRes.value.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    } else {
      // eslint-disable-next-line no-console
      console.error('[tech] reports query failed:', reportsRes.reason);
      setLoadError(
        'تعذّر تحميل الفحوصات — تحقّق من الاتصال ثم اضغط تحديث.'
      );
    }

    if (evalsRes.status === 'fulfilled') {
      const map = new Map();
      // Doc id IS the scanId, per the backend contract.
      evalsRes.value.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
      setEvaluations(map);
      setEvalsDegraded(false);
    } else {
      // eslint-disable-next-line no-console
      console.warn('[tech] evaluations query failed:', evalsRes.reason);
      setEvalsDegraded(true);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!authReady || !user?.uid) return;
    load(user.uid);
  }, [authReady, user?.uid, load]);

  // -------------------------------------------------------------------------
  // Two-screen navigation backed by history, so Android back works
  // -------------------------------------------------------------------------

  const historyPushedRef = useRef(false);

  useEffect(() => {
    const onPop = () => {
      historyPushedRef.current = false;
      setActiveScanId(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openScan = (scanId) => {
    setActiveScanId(scanId);
    try {
      window.history.pushState({ ncTechScan: scanId }, '');
      historyPushedRef.current = true;
    } catch {
      // History blocked — the in-page back button still works.
    }
  };

  const closeScan = useCallback(() => {
    if (historyPushedRef.current) {
      historyPushedRef.current = false;
      window.history.back(); // popstate handler clears activeScanId
    } else {
      setActiveScanId(null);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Merge + split
  // -------------------------------------------------------------------------

  const { pending, done } = useMemo(() => {
    const p = [];
    const d = [];
    for (const r of reports) {
      const scanId = resolveScanId(r);
      if (!scanId) continue;
      const evaluation = evaluations.get(scanId) || null;
      (evaluation ? d : p).push({ report: r, scanId, evaluation });
    }
    return { pending: p, done: d };
  }, [reports, evaluations]);

  const activeEntry = useMemo(() => {
    if (!activeScanId) return null;
    return (
      [...pending, ...done].find((e) => e.scanId === activeScanId) || null
    );
  }, [activeScanId, pending, done]);

  const handleSaved = useCallback(
    (scanId, payload) => {
      // Optimistic local update — the card flips to "مُقيَّم" immediately
      // instead of waiting for a round trip.
      //
      // This must REPLACE the contract fields, not spread over them: the
      // server writes with set-without-merge, so an optional the technician
      // cleared is now null there. Spreading would leave the old value here
      // and the cache would quietly disagree with the database.
      setEvaluations((prev) => {
        const next = new Map(prev);
        next.set(scanId, applyEvaluationPayloadLocally(next.get(scanId), payload));
        return next;
      });
      closeScan();
    },
    [closeScan]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!authReady || technicianName === null) {
    return <PageSpinner label="جاري التحميل..." />;
  }

  if (!technicianName) {
    return <TechnicianNameGate onSaved={setTechnicianName} />;
  }

  if (activeEntry) {
    return (
      <EvaluationForm
        key={activeEntry.scanId}
        report={activeEntry.report}
        evaluation={activeEntry.evaluation}
        technicianName={technicianName}
        onSaved={handleSaved}
        onBack={closeScan}
        lang={PANEL_LANG}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-outfit font-bold text-nc-text1">
            تقييم دقّة التقارير
          </h1>
          <p className="mt-1 text-sm text-nc-text2">
            افتح أي فحص وسجّل حكمك — تقييمان بنقرتين.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TechnicianChip name={technicianName} onChange={setTechnicianName} />
          <button
            type="button"
            onClick={() => user?.uid && load(user.uid, { isRefresh: true })}
            disabled={refreshing}
            aria-label="تحديث القائمة"
            className="p-2 rounded-lg bg-nc-surface border border-nc-border text-nc-text2 hover:text-nc-text1 transition disabled:opacity-50"
          >
            {refreshing ? (
              <Spinner size="sm" />
            ) : (
              <ArrowPathIcon className="w-4 h-4" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      {/* Progress strip */}
      {!loading && reports.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <StatTile
            label="بانتظار التقييم"
            value={pending.length}
            tone="cyan"
          />
          <StatTile label="مُقيَّم" value={done.length} tone="green" />
        </div>
      )}

      {/* Degraded evaluations read */}
      {evalsDegraded && !loading && (
        <Banner tone="warn">
          تعذّر تحميل التقييمات السابقة — القائمة تعمل، لكن الفحوصات المُقيَّمة
          قد تظهر كأنها جديدة.
        </Banner>
      )}

      {/* Load failure */}
      {loadError && !loading && <Banner tone="error">{loadError}</Banner>}

      {loading ? (
        <PageSpinner label="جاري تحميل الفحوصات..." />
      ) : reports.length === 0 && !loadError ? (
        <EmptyState email={user?.email} />
      ) : (
        <div className="mt-6 flex flex-col gap-7">
          <Section
            title="بانتظار التقييم"
            count={pending.length}
            Icon={DevicePhoneMobileIcon}
            emptyText="لا يوجد فحص بانتظار التقييم — أنهيت كل شيء ✓"
          >
            {pending.map(({ report, scanId, evaluation }) => (
              <ScanCard
                key={scanId}
                report={report}
                evaluation={evaluation}
                onOpen={() => openScan(scanId)}
                lang={PANEL_LANG}
              />
            ))}
          </Section>

          {done.length > 0 && (
            <Section
              title="مُقيَّم"
              count={done.length}
              Icon={ClipboardDocumentCheckIcon}
            >
              {done.map(({ report, scanId, evaluation }) => (
                <ScanCard
                  key={scanId}
                  report={report}
                  evaluation={evaluation}
                  onOpen={() => openScan(scanId)}
                  lang={PANEL_LANG}
                />
              ))}
            </Section>
          )}
        </div>
      )}

      {/* The site navbar is hidden on /tech, so this is the only way off a
          shared shop phone. Kept at the very bottom, out of the work path. */}
      <div className="mt-10 pt-5 border-t border-nc-border text-center">
        <button
          type="button"
          onClick={async () => {
            await signOut(auth);
            router.replace('/login');
          }}
          className="inline-flex items-center gap-1.5 text-xs text-nc-text3 hover:text-nc-grade-d transition"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" strokeWidth={1.8} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational bits
// ---------------------------------------------------------------------------

function StatTile({ label, value, tone }) {
  const cls =
    tone === 'green'
      ? 'border-nc-green/30 text-nc-green'
      : 'border-nc-cyan/30 text-nc-cyan';
  return (
    <div className={`p-3 rounded-xl bg-nc-card border ${cls}`}>
      <div className="num-ltr text-2xl font-outfit font-extrabold">
        {toLatinDigits(value)}
      </div>
      <div className="text-xs text-nc-text3 mt-0.5">{label}</div>
    </div>
  );
}

function Banner({ tone, children }) {
  const cls =
    tone === 'error'
      ? 'bg-nc-grade-d/10 border-nc-grade-d/40 text-nc-grade-d'
      : 'bg-nc-grade-c/10 border-nc-grade-c/40 text-nc-grade-c';
  return (
    <div className={`mt-5 p-4 rounded-xl border flex items-start gap-3 ${cls}`}>
      <ExclamationTriangleIcon
        className="w-5 h-5 shrink-0 mt-0.5"
        strokeWidth={2}
      />
      <div className="flex-1 text-sm text-nc-text1 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function Section({ title, count, Icon, emptyText, children }) {
  const items = Array.isArray(children) ? children : [children];
  const isEmpty = items.filter(Boolean).length === 0;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-nc-text3" strokeWidth={1.8} />
        <h2 className="text-base font-bold text-nc-text1">{title}</h2>
        <span className="num-ltr text-xs text-nc-text3 bg-nc-surface border border-nc-border rounded-md px-2 py-0.5">
          {toLatinDigits(count)}
        </span>
      </div>

      {isEmpty && emptyText ? (
        <div className="p-6 rounded-2xl bg-nc-card border border-nc-border text-center text-sm text-nc-text2">
          {emptyText}
        </div>
      ) : (
        <div className="flex flex-col gap-3">{children}</div>
      )}
    </section>
  );
}

function EmptyState({ email }) {
  return (
    <div className="mt-8 p-8 rounded-2xl bg-nc-card border border-nc-border text-center">
      <DevicePhoneMobileIcon
        className="w-12 h-12 mx-auto text-nc-text3"
        strokeWidth={1.4}
      />
      <p className="mt-4 text-nc-text1 leading-relaxed font-medium">
        لا توجد فحوصات لهذا الحساب — تأكّد أنك سجّلت الدخول بحساب المتجر.
      </p>
      {email && (
        <p className="mt-3 text-xs text-nc-text3">
          أنت الآن داخل بحساب:{' '}
          <span dir="ltr" className="font-mono text-nc-text2">
            {email}
          </span>
        </p>
      )}
    </div>
  );
}
