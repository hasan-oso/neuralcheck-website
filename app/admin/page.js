'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getCountFromServer,
  getAggregateFromServer,
  sum,
  count,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { formatDateShort } from '@/lib/admin';
import { toRecentReportRow } from '@/lib/adminReportView';
import { PageSpinner } from '@/components/admin/Spinner';
import GradeBadge from '@/components/GradeBadge';
import ReportCode from '@/components/admin/ReportCode';
import { classifyPipeline, PipelineKind } from '@/lib/pipelineTags';
import { pickGrade } from '@/lib/reportReaders/v6';
import { readOverall } from '@/lib/reportReaders/v7';
import {
  UsersIcon,
  DocumentTextIcon,
  BoltIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CreditCardIcon,
  GiftIcon,
  ChartPieIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

// ─────────────────────────────────────────────────────────────────────────
// Phase-1 admin stats. ALL aggregation is done server-side via
// getCountFromServer / getAggregateFromServer (firebase 10.13) — no full
// collection downloads. Every query below is SINGLE-FIELD (equality or a
// single range), so Firestore's automatic indexes cover them; no composite
// index is required or defined for this dashboard.
// ─────────────────────────────────────────────────────────────────────────

// Decision 7 (relayed in the task order, 2026-10-09): "لا تُخزَّن المستندات
// الكاملة في المتصفّح." This cache used to hold the last ten FULL `reports`
// documents (v1). It now holds one small row per report (see
// lib/adminReportView.js toRecentReportRow) — the cache stays, because the
// page still saves its 21 queries for five minutes; only what is kept in it
// shrank to what the table prints. The key was bumped so a v1 entry (full
// documents, written by the previous build) is never read as the new shape,
// and purgeLegacyCache() deletes it from the browser on the next visit.
const CACHE_KEY = 'nc_admin_stats_v2';
const LEGACY_CACHE_KEYS = ['nc_admin_stats_v1'];
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Revenue is intentionally a simple, honest estimate in Phase 1: we sum the
// `amountUsd` field over confirmed payments only. Payments recorded in other
// currencies (amount + currency, no amountUsd) are NOT included. We label the
// number as approximate rather than computing exact coverage (which would need
// a composite status+amountUsd index we deliberately avoid this phase).
const REVENUE_CAVEAT =
  'تقديري — مجموع amountUsd للدفعات المؤكَّدة فقط (قد لا يشمل دفعات بعملات أخرى)';

// ── server-side helpers ────────────────────────────────────────────────────

// Count documents WITHOUT downloading them. Returns null on error so the UI
// can render "—" instead of a misleading 0.
async function safeCount(col, clauses = []) {
  try {
    const q = clauses.length
      ? query(collection(db, col), ...clauses)
      : query(collection(db, col));
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (e) {
    return null;
  }
}

// Sum a numeric field + count matching docs in one server call. Returns null
// on error → UI renders "—".
async function safeSum(col, field, clauses = []) {
  try {
    const q = clauses.length
      ? query(collection(db, col), ...clauses)
      : query(collection(db, col));
    const snap = await getAggregateFromServer(q, { total: sum(field), n: count() });
    const d = snap.data();
    return { total: d.total ?? 0, n: d.n ?? 0 };
  } catch (e) {
    return null;
  }
}

// Bounded document reads (recent lists). Unchanged from before — cheap.
async function safeList(col, clauses = []) {
  try {
    const q = clauses.length
      ? query(collection(db, col), ...clauses)
      : collection(db, col);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    return [];
  }
}

// ── small utils ─────────────────────────────────────────────────────────────

function fmtInt(v) {
  return v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US');
}

function fmtMoney(rev) {
  if (!rev || rev.total == null) return '—';
  return '$' + Number(rev.total).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// Sum of values, or null if ANY input is not a number (so we never present a
// derived figure built on a failed query as if it were complete).
function sumOrNull(...xs) {
  return xs.every((x) => typeof x === 'number') ? xs.reduce((a, b) => a + b, 0) : null;
}

// "آخر 10 فحوصات" only shows a letter grade, no score/points column — so V7's
// missing numeric score (a decision the other admin table has to make; see
// app/admin/reports/page.js) never comes up here. Letter grade unifies across
// pipelines (V6 `grade` / V7 `overall.letter`); see lib/reportReaders/
// {v6,v7}.js. Pipeline read first, then the matching reader.
function resolveGrade(report) {
  const pipeline = classifyPipeline(report);
  if (pipeline.kind === PipelineKind.UNKNOWN_TAG) {
    // eslint-disable-next-line no-console
    console.warn('[admin] unrecognized pipeline tag — using the V6 reader as a best effort', pipeline.tag);
  }
  return pipeline.kind === PipelineKind.V7 ? readOverall(report).letter : pickGrade(report);
}

function purgeLegacyCache() {
  for (const key of LEGACY_CACHE_KEYS) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* sessionStorage unavailable — nothing to purge */
    }
  }
}

function readCache() {
  // Every visit starts here (the mount effect calls load(false)), so a v1
  // entry left by the previous build is deleted before anything else.
  purgeLegacyCache();
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed; // { ts, data }
  } catch {
    return null;
  }
}

function writeCache(data, ts) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts, data }));
  } catch {
    /* sessionStorage unavailable / quota — non-fatal */
  }
}

// ── data fetch ───────────────────────────────────────────────────────────────

async function fetchStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayTs = Timestamp.fromDate(startOfToday);
  const now = Timestamp.now();

  const [
    users,
    reports,
    today,
    pending,
    confirmed,
    rejected,
    paymentsTotal,
    revenue,
    validSubs,
    expiredSubs,
    disabledAcc,
    pFree,
    pSingle,
    pShopBasic,
    pShopPro,
    pLegacyBasic,
    pLegacyPro,
    promo,
    activeCodes,
    recentReportDocs,
    recentUsers,
  ] = await Promise.all([
    safeCount('users'),
    safeCount('reports'),
    safeCount('reports', [where('createdAt', '>=', todayTs)]),
    safeCount('payments', [where('status', '==', 'pending')]),
    safeCount('payments', [where('status', '==', 'confirmed')]),
    safeCount('payments', [where('status', '==', 'rejected')]),
    safeCount('payments'),
    safeSum('payments', 'amountUsd', [where('status', '==', 'confirmed')]),
    safeCount('users', [where('expiresAt', '>=', now)]),
    safeCount('users', [where('expiresAt', '<', now)]),
    safeCount('users', [where('isActive', '==', false)]),
    safeCount('users', [where('plan', '==', 'free')]),
    safeCount('users', [where('plan', '==', 'single')]),
    safeCount('users', [where('plan', '==', 'shop_basic')]),
    safeCount('users', [where('plan', '==', 'shop_pro')]),
    safeCount('users', [where('plan', '==', 'basic')]), // legacy → folded into shop_basic
    safeCount('users', [where('plan', '==', 'pro')]), // legacy → folded into shop_pro
    safeSum('promoCodes', 'usedCount'),
    safeCount('promoCodes', [where('isActive', '==', true)]),
    safeList('reports', [orderBy('createdAt', 'desc'), limit(10)]),
    safeList('users', [orderBy('createdAt', 'desc'), limit(5)]),
  ]);

  // The documents stop here: only the rows the table prints leave this
  // function, so they are all that reaches state and the sessionStorage cache.
  const recentReports = recentReportDocs.map((r) => toRecentReportRow(r, resolveGrade(r)));

  // Fold legacy basic/pro into their canonical shop tiers (same tier).
  const planFree = pFree;
  const planSingle = pSingle;
  const planShopBasic = (pShopBasic ?? 0) + (pLegacyBasic ?? 0);
  const planShopPro = (pShopPro ?? 0) + (pLegacyPro ?? 0);

  // "غير مصنّف" = users with a missing/unexpected plan value. Only computed
  // when every input is a real number (else left null → not shown).
  const knownPlans = sumOrNull(
    pFree,
    pSingle,
    pShopBasic,
    pShopPro,
    pLegacyBasic,
    pLegacyPro
  );
  const uncategorized =
    typeof users === 'number' && typeof knownPlans === 'number'
      ? Math.max(0, users - knownPlans)
      : null;

  // "أخرى" payments = docs with a missing/unknown status (the UI elsewhere
  // treats absent status as pending). Only shown when computable & > 0.
  const knownPayments = sumOrNull(pending, confirmed, rejected);
  const paymentsOther =
    typeof paymentsTotal === 'number' && typeof knownPayments === 'number'
      ? Math.max(0, paymentsTotal - knownPayments)
      : null;

  return {
    users,
    reports,
    today,
    pending,
    confirmed,
    rejected,
    paymentsTotal,
    paymentsOther,
    revenue,
    validSubs,
    expiredSubs,
    disabledAcc,
    plans: {
      free: planFree,
      single: planSingle,
      shop_basic: planShopBasic,
      shop_pro: planShopPro,
      uncategorized,
    },
    promo,
    activeCodes,
    recentReports,
    recentUsers,
  };
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    if (!force) {
      const cached = readCache();
      if (cached) {
        setData(cached.data);
        setUpdatedAt(cached.ts);
        setLoading(false);
        return;
      }
    }
    if (force) setRefreshing(true);
    else setLoading(true);

    const result = await fetchStats();
    const ts = Date.now();
    setData(result);
    setUpdatedAt(ts);
    writeCache(result, ts);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  if (loading || !data) return <PageSpinner />;

  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="space-y-8">
      {/* Header + refresh */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1">
            لوحة التحكم
          </h1>
          <p className="text-nc-text3 text-sm mt-1">نظرة عامة على حالة النظام</p>
        </div>
        <div className="flex items-center gap-3">
          {updatedLabel && (
            <span className="text-xs text-nc-text3" dir="rtl">
              آخر تحديث:{' '}
              <span dir="ltr" className="font-mono tabular-nums">
                {updatedLabel}
              </span>
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-nc-card border border-nc-border text-nc-text2 hover:text-nc-text1 hover:border-nc-green/40 transition text-sm disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              strokeWidth={2}
            />
            تحديث
          </button>
        </div>
      </div>

      {/* Hero row — actionable + financial + scale */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="الدفعات المعلّقة"
          value={fmtInt(data.pending)}
          Icon={ClockIcon}
          color={data.pending > 0 ? 'red' : 'muted'}
          highlight={data.pending > 0}
          href="/admin/payments"
        />
        <StatCard
          label="الإيراد المؤكَّد"
          value={fmtMoney(data.revenue)}
          caption={REVENUE_CAVEAT}
          Icon={BanknotesIcon}
          color="green"
        />
        <StatCard
          label="إجمالي المستخدمين"
          value={fmtInt(data.users)}
          Icon={UsersIcon}
          color="cyan"
        />
        <StatCard
          label="إجمالي الفحوصات"
          value={fmtInt(data.reports)}
          Icon={DocumentTextIcon}
          color="neon"
        />
      </div>

      {/* Financial — payment status breakdown */}
      <Section title="الدفعات" Icon={CreditCardIcon} href="/admin/payments">
        <div className="flex flex-wrap gap-3">
          <Chip label="معلّقة" value={data.pending} color="#F59E0B" />
          <Chip label="مؤكدة" value={data.confirmed} color="#4ADE80" />
          <Chip label="مرفوضة" value={data.rejected} color="#EF4444" />
          {typeof data.paymentsOther === 'number' && data.paymentsOther > 0 && (
            <Chip label="أخرى (بلا حالة)" value={data.paymentsOther} color="#64748B" />
          )}
        </div>
      </Section>

      {/* Growth + subscriptions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="توزيع الباقات" Icon={ChartPieIcon} href="/admin/users">
          <PlanDonut plans={data.plans} />
        </Section>

        <Section title="الاشتراكات" Icon={UserGroupIcon}>
          <div className="flex flex-col gap-2.5">
            <MetricRow
              Icon={CheckCircleIcon}
              label="اشتراكات سارية"
              hint="expiresAt ≥ الآن"
              value={fmtInt(data.validSubs)}
              color="#4ADE80"
            />
            <MetricRow
              Icon={ClockIcon}
              label="اشتراكات منتهية"
              hint="expiresAt < الآن"
              value={fmtInt(data.expiredSubs)}
              color="#F59E0B"
            />
            <MetricRow
              Icon={XCircleIcon}
              label="حسابات معطّلة"
              hint="isActive = false"
              value={fmtInt(data.disabledAcc)}
              color="#64748B"
            />
          </div>
        </Section>
      </div>

      {/* Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="نشاط الفحص" Icon={BoltIcon} href="/admin/reports">
          <MetricRow
            Icon={BoltIcon}
            label="الفحوصات اليوم"
            value={fmtInt(data.today)}
            color="#22D3EE"
          />
        </Section>

        <Section title="الأكواد الترويجية" Icon={GiftIcon} href="/admin/promos">
          <div className="flex flex-col gap-2.5">
            <MetricRow
              Icon={GiftIcon}
              label="إجمالي الاستخدامات"
              value={fmtInt(data.promo ? data.promo.total : null)}
              color="#A3E635"
            />
            <MetricRow
              Icon={CheckCircleIcon}
              label="أكواد مفعّلة"
              value={fmtInt(data.activeCodes)}
              color="#4ADE80"
            />
            <MetricRow
              Icon={DocumentTextIcon}
              label="إجمالي الأكواد"
              value={fmtInt(data.promo ? data.promo.n : null)}
              color="#64748B"
            />
          </div>
        </Section>
      </div>

      {/* Recent activity — kept from the original dashboard */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-nc-card border border-nc-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-nc-text1">آخر 10 فحوصات</h2>
            <Link
              href="/admin/reports"
              className="text-xs text-nc-green hover:underline flex items-center gap-1"
            >
              عرض الكل
              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
            </Link>
          </div>
          <RecentReportsTable rows={data.recentReports} />
        </div>

        <div className="lg:col-span-2 bg-nc-card border border-nc-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-nc-text1">آخر المسجّلين</h2>
            <Link
              href="/admin/users"
              className="text-xs text-nc-green hover:underline flex items-center gap-1"
            >
              عرض الكل
              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
            </Link>
          </div>
          {data.recentUsers.length === 0 ? (
            <EmptyState label="لا يوجد مستخدمون بعد" />
          ) : (
            <div className="flex flex-col gap-2">
              {data.recentUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-nc-surface/50 border border-nc-border"
                >
                  <div className="w-9 h-9 rounded-full nc-gradient-bg text-nc-bg font-bold flex items-center justify-center text-sm flex-shrink-0">
                    {(u.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-nc-text1 truncate">
                      {u.name || u.displayName || u.email?.split('@')[0] || '—'}
                    </div>
                    <div className="text-xs text-nc-text3 truncate">{u.email}</div>
                  </div>
                  <div className="text-xs text-nc-text3 whitespace-nowrap">
                    {formatDateShort(u.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── presentational components ─────────────────────────────────────────────────

// "آخر 10 فحوصات". `rows` are lib/adminReportView.js toRecentReportRow()
// rows — what fetchStats() builds and what the sessionStorage cache holds —
// never `reports` documents. The markup is the one this table always had;
// only where each cell reads from changed (the row's fields instead of the
// document's, with the same fall-back chain already applied when the row
// was built).
function RecentReportsTable({ rows }) {
  if (rows.length === 0) return <EmptyState label="لا توجد فحوصات بعد" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-nc-text3 text-xs uppercase tracking-wider border-b border-nc-border">
            <th className="text-start py-2 px-2 font-medium">Scan ID</th>
            <th className="text-start py-2 px-2 font-medium">الجهاز</th>
            <th className="text-start py-2 px-2 font-medium">التقييم</th>
            <th className="text-start py-2 px-2 font-medium">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-b border-nc-border/50 hover:bg-nc-surface/50 transition"
            >
              <td className="py-3 px-2 text-xs max-w-[170px]">
                <ReportCode report={r} />
              </td>
              <td className="py-3 px-2 text-nc-text1">{r.deviceName || '—'}</td>
              <td className="py-3 px-2">
                <GradeBadge grade={r.grade} size="sm" />
              </td>
              <td className="py-3 px-2 text-nc-text3 text-xs">
                {formatDateShort(r.createdAtMs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, caption, Icon, color = 'cyan', highlight = false, href }) {
  const colorMap = {
    green: 'text-nc-green bg-nc-green/10',
    cyan: 'text-nc-cyan bg-nc-cyan/10',
    neon: 'text-nc-neon bg-nc-neon/10',
    red: 'text-nc-grade-d bg-nc-grade-d/10',
    muted: 'text-nc-text3 bg-nc-surface',
  };
  const borderCls = highlight
    ? 'border-nc-grade-d/40 shadow-[0_0_30px_rgba(239,68,68,0.15)]'
    : 'border-nc-border';

  const inner = (
    <div
      className={`h-full p-5 rounded-2xl bg-nc-card border ${borderCls} transition hover:border-nc-text3/30`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-nc-text3 uppercase tracking-wider">
            {label}
          </div>
          <div
            className={`mt-2 text-3xl font-outfit font-bold tabular-nums ${
              highlight ? 'text-nc-grade-d' : 'text-nc-text1'
            }`}
            dir="ltr"
          >
            {value}
          </div>
          {caption && (
            <div className="mt-1.5 text-[11px] text-nc-text3 leading-snug">
              {caption}
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${colorMap[color]}`}>
          <Icon className="w-5 h-5" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

function Section({ title, Icon, href, children }) {
  return (
    <div className="bg-nc-card border border-nc-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-nc-text1 flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-nc-text3" strokeWidth={1.8} />}
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="text-xs text-nc-green hover:underline flex items-center gap-1"
          >
            عرض الكل
            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function MetricRow({ Icon, label, hint, value, color }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-nc-surface/50 border border-nc-border">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        {Icon && <Icon className="w-4 h-4 text-nc-text3 shrink-0" strokeWidth={1.8} />}
        <div className="min-w-0">
          <div className="text-sm text-nc-text1 truncate">{label}</div>
          {hint && (
            <div className="text-[10px] text-nc-text3 font-mono" dir="ltr">
              {hint}
            </div>
          )}
        </div>
      </div>
      <div className="text-lg font-semibold text-nc-text1 tabular-nums" dir="ltr">
        {value}
      </div>
    </div>
  );
}

function Chip({ label, value, color }) {
  return (
    <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-nc-surface/60 border border-nc-border">
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-nc-text2">{label}</span>
      <span className="text-base font-bold text-nc-text1 tabular-nums" dir="ltr">
        {fmtInt(value)}
      </span>
    </div>
  );
}

function PlanDonut({ plans }) {
  const segments = [
    { key: 'free', label: 'مجاني', value: plans.free ?? 0, color: '#64748B' },
    { key: 'single', label: 'فحص فردي', value: plans.single ?? 0, color: '#38BDF8' },
    { key: 'shop_basic', label: 'متجر أساسي', value: plans.shop_basic ?? 0, color: '#4ADE80' },
    { key: 'shop_pro', label: 'متجر احترافي', value: plans.shop_pro ?? 0, color: '#22D3EE' },
  ];
  if (typeof plans.uncategorized === 'number' && plans.uncategorized > 0) {
    segments.push({
      key: 'other',
      label: 'غير مصنّف',
      value: plans.uncategorized,
      color: '#334155',
    });
  }

  const total = segments.reduce((a, s) => a + (s.value || 0), 0);

  let acc = 0;
  const stops = [];
  for (const s of segments) {
    if (!s.value) continue;
    const start = (acc / total) * 100;
    acc += s.value;
    const end = (acc / total) * 100;
    stops.push(`${s.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
  }
  const ringStyle =
    total > 0
      ? { background: `conic-gradient(${stops.join(', ')})` }
      : { background: '#1A2235' };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Donut */}
      <div className="relative w-40 h-40 rounded-full shrink-0" style={ringStyle}>
        <div className="absolute inset-[24%] rounded-full bg-nc-card border border-nc-border flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-outfit font-bold text-nc-text1 tabular-nums">
              {total > 0 ? total.toLocaleString('en-US') : '—'}
            </div>
            <div className="text-[10px] text-nc-text3 uppercase tracking-wider">
              مستخدم
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <ul className="flex-1 w-full flex flex-col gap-2">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li
              key={s.key}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-nc-text2 truncate">{s.label}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-nc-text1 font-semibold tabular-nums" dir="ltr">
                  {Number(s.value || 0).toLocaleString('en-US')}
                </span>
                <span className="text-xs text-nc-text3 tabular-nums w-9 text-end" dir="ltr">
                  {pct}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyState({ label }) {
  return <div className="text-center py-10 text-nc-text3 text-sm">{label}</div>;
}
