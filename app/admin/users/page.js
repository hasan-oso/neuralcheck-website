'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  increment,
  deleteField,
  Timestamp,
  writeBatch,
  orderBy,
  query,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/firebase';
import { formatDateShort, planLabel } from '@/lib/admin';
import { PageSpinner } from '@/components/admin/Spinner';
import Spinner from '@/components/admin/Spinner';
import Modal from '@/components/admin/Modal';
import Pagination from '@/components/admin/Pagination';
import { useToast } from '@/components/admin/Toast';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  GiftIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE = 20;
const SCAN_OPTIONS = [1, 5, 10, 30, 100];

const PLAN_GRANTS = {
  free:       { scans: 1,      label: 'مجاني (تجريبي)' },
  single:     { scans: 1,      label: 'فحص فردي ($0.50)' },
  shop_basic: { scans: 50,     label: 'متجر أساسي ($10/شهر)' },
  shop_pro:   { scans: 150,    label: 'متجر احترافي ($20/شهر)' },
};

const TYPE_OPTIONS = [
  { value: 'free',       label: 'مجاني (تجريبي)' },
  { value: 'single',     label: 'فحص فردي ($0.50)' },
  { value: 'shop_basic', label: 'متجر أساسي ($10/شهر)' },
  { value: 'shop_pro',   label: 'متجر احترافي ($20/شهر)' },
];

// How far a grant pushes `expiresAt`. The three writers (onGrantScans,
// onGrantPlan, onBulkGrant) each spell this out as
// `Date.now() + 30 * 24 * 60 * 60 * 1000`; the preview lines below use this
// constant for the same arithmetic. They are separate spellings on purpose —
// the writers were not touched — so scripts/test/adminUsersGrantPreview.test.cjs
// drives the REAL handlers and fails if the two ever disagree.
const GRANT_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;

const PLAN_COLOR = {
  free:       'bg-nc-surface text-nc-text3',
  single:     'bg-nc-cyan/10 text-nc-cyan',
  shop_basic: 'bg-amber-500/10 text-amber-400',
  shop_pro:   'bg-nc-green/10 text-nc-green',
};

function planColor(plan) {
  return PLAN_COLOR[plan] || 'bg-nc-surface text-nc-text2';
}

function scansDisplay(n) {
  return n >= 999999 ? '∞' : n;
}

/**
 * The two fields of a users/{uid} document a grant window needs, copied as they
 * are — an absent field stays undefined here; grantPreview decides what to show.
 */
function grantCurrentOf(data) {
  const { scansRemaining, expiresAt } = data;
  return { scansRemaining, expiresAt };
}

/**
 * The «current ⟵ new» figures a grant window shows before the confirm button.
 *
 * `current` is grantCurrentOf(...) of the document read when the window was
 * opened — { scansRemaining, expiresAt }, each possibly absent.
 * `add` is the number the writer passes to `increment(...)`.
 *
 * An absent balance is shown as «—», never «0», and no «new» balance is
 * derived from it: the table's `?? credits ?? 0` fallback is not used here
 * because the writers increment `scansRemaining` alone. Only a real number
 * counts as a balance. The expiry the writers set is `Date.now()` of the
 * browser + 30 days; `nowMs` is that clock, read at render time.
 */
function grantPreview(current, add, nowMs) {
  const sr = current?.scansRemaining;
  const known = typeof sr === 'number' && Number.isFinite(sr);
  return {
    balanceFrom: known ? scansDisplay(sr) : '—',
    balanceTo:   known ? scansDisplay(sr + add) : '—',
    expiryFrom:  formatDateShort(current?.expiresAt),
    // formatDateShort reads a Timestamp / {seconds} / string / number — a Date
    // object would come back as «—» — so the expiry is formed the way the writers
    // form it, Timestamp.fromDate(...), and formatted like the table's column.
    expiryTo:    formatDateShort(Timestamp.fromDate(new Date(nowMs + GRANT_VALIDITY_MS))),
  };
}

/**
 * The two lines — «المتبقي» and «تاريخ الانتهاء», the table's own column
 * headings — each as `current ⟵ new`. Display only: it writes nothing.
 */
function GrantPreviewLines({ preview }) {
  return (
    <>
      <div>{`المتبقي: ${preview.balanceFrom} ⟵ ${preview.balanceTo}`}</div>
      <div>{`تاريخ الانتهاء: ${preview.expiryFrom} ⟵ ${preview.expiryTo}`}</div>
    </>
  );
}

function GrantPreview({ current, add, nowMs }) {
  return (
    <div className="p-3 rounded-lg bg-nc-surface/60 text-xs text-nc-text2 space-y-1.5">
      <GrantPreviewLines preview={grantPreview(current, add, nowMs)} />
    </div>
  );
}

export default function AdminUsersPage() {
  const toast = useToast();
  const [loading, setLoading]       = useState(true);
  const [users, setUsers]           = useState([]);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage]             = useState(1);
  const [working, setWorking]       = useState(null);
  const [scanModal, setScanModal]   = useState(null);
  const [planModal, setPlanModal]   = useState(null);
  // scanModal / planModal: { user, current } — `current` is read fresh when the
  // window opens. bulkModal: { current } — { [uid]: current } for every account.
  const [bulkModal, setBulkModal]   = useState(null);

  const loadUsers = async () => {
    try {
      let snap;
      try {
        snap = await getDocs(
          query(collection(db, 'users'), orderBy('createdAt', 'desc'))
        );
      } catch {
        snap = await getDocs(collection(db, 'users'));
      }
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      toast.error('فشل تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        setUsers((prev) =>
          prev.map((u) => (u.id === uid ? { ...u, ...snap.data() } : u))
        );
      }
    } catch {
      // silent fallback — table keeps old data
    }
  };

  // The grant windows show «current ⟵ new». `users` above was read once when
  // the page loaded, and a balance moves with every scan, so the «current» side
  // is read again from Firestore at the moment a window opens — not taken from
  // that snapshot. These two only read; the writers below are unchanged.

  // Single-account windows («منح فحوصات», «منح اشتراك مجاني»): getDoc on
  // users/{uid}, then open with the result. If the read fails the window does
  // not open — a stale or invented «current» would be worse than no window.
  const openGrantModal = async (user, setModal) => {
    setWorking(user.id);
    try {
      const snap = await getDoc(doc(db, 'users', user.id));
      if (!snap.exists()) throw new Error('user document not found');
      setModal({ user, current: grantCurrentOf(snap.data()) });
    } catch {
      toast.error('فشل تحميل المستخدمين');
    } finally {
      setWorking(null);
    }
  };

  // Bulk window: the accounts are picked after it opens, so one fresh read of
  // the collection (the same query loadUsers falls back to) is taken at open
  // and every selected account's line is computed from it.
  const openBulkModal = async () => {
    setWorking('bulk');
    try {
      const snap = await getDocs(collection(db, 'users'));
      const current = {};
      snap.docs.forEach((d) => { current[d.id] = grantCurrentOf(d.data()); });
      setBulkModal({ current });
    } catch {
      toast.error('فشل تحميل المستخدمين');
    } finally {
      setWorking(null);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return users.filter((u) => {
      if (s) {
        const hay = `${u.email || ''} ${u.name || u.displayName || ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (typeFilter !== 'all' && (u.plan || 'free') !== typeFilter) return false;
      if (statusFilter !== 'all') {
        const remaining = u.scansRemaining ?? u.credits ?? 0;
        const active = u.isActive !== false;
        if (statusFilter === 'active'   && (!active || remaining <= 0)) return false;
        if (statusFilter === 'empty'    && remaining > 0)               return false;
        if (statusFilter === 'disabled' && active)                      return false;
      }
      return true;
    });
  }, [users, search, typeFilter, statusFilter]);

  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter]);

  const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onGrantScans = async ({ userId, scans }) => {
    setWorking(userId);
    try {
      const expiry = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      await updateDoc(doc(db, 'users', userId), {
        scansRemaining: increment(scans),
        scansTotal:     increment(scans),
        isActive:       true,
        expiresAt:      expiry,
        // Manual renewal → clear last cycle's reminder flags so the next
        // month starts a clean reminder cycle (mirrors confirmPayment).
        subExpiredNotified: deleteField(),
        subExpiryEmailSent: deleteField(),
        subExpiryFcmDate:   deleteField(),
      });
      toast.success(`تم منح ${scans} فحص بنجاح`);
      try {
        await httpsCallable(functions, 'sendNotificationEmail')({
          userId,
          templateName: 'grantSubscription',
          extraData: { scans, plan: null },
        });
      } catch (err) {
        console.warn('sendNotificationEmail failed:', err);
        toast.info('تم المنح لكن فشل إرسال البريد');
      }
      setScanModal(null);
      await refreshUser(userId);
    } catch (e) {
      toast.error(`فشل المنح: ${e.message || 'خطأ غير معروف'}`);
    } finally {
      setWorking(null);
    }
  };

  const onGrantPlan = async ({ userId, plan }) => {
    const grant = PLAN_GRANTS[plan];
    if (!grant) return;
    setWorking(userId);
    try {
      const expiry = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      await updateDoc(doc(db, 'users', userId), {
        plan,
        scansRemaining: increment(grant.scans),
        scansTotal:     increment(grant.scans),
        isActive:       true,
        expiresAt:      expiry,
        // Manual renewal → clear last cycle's reminder flags so the next
        // month starts a clean reminder cycle (mirrors confirmPayment).
        subExpiredNotified: deleteField(),
        subExpiryEmailSent: deleteField(),
        subExpiryFcmDate:   deleteField(),
      });
      toast.success(`تم منح اشتراك ${planLabel(plan)} بنجاح`);
      try {
        await httpsCallable(functions, 'sendNotificationEmail')({
          userId,
          templateName: 'grantSubscription',
          extraData: { scans: grant.scans, plan },
        });
      } catch (err) {
        console.warn('sendNotificationEmail failed:', err);
        toast.info('تم المنح لكن فشل إرسال البريد');
      }
      setPlanModal(null);
      await refreshUser(userId);
    } catch (e) {
      toast.error(`فشل المنح: ${e.message || 'خطأ غير معروف'}`);
    } finally {
      setWorking(null);
    }
  };

  const onToggleActive = async (user) => {
    setWorking(user.id);
    try {
      const next = user.isActive === false;
      await updateDoc(doc(db, 'users', user.id), { isActive: next });
      toast.success(next ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب');
      await refreshUser(user.id);
    } catch (e) {
      toast.error(`فشل: ${e.message || ''}`);
    } finally {
      setWorking(null);
    }
  };

  // Capability flag only — it decides whether the app shows the technician's
  // evaluation screen for this shop. It is not a role and grants nothing else:
  // no scans, no plan change, no admin rights. Written on its own so a mistake
  // here can never disturb a subscription.
  const onToggleEvaluation = async (user) => {
    setWorking(user.id);
    try {
      // Absent field means "not enabled" — only an explicit `true` counts.
      const next = user.evaluationEnabled !== true;
      await updateDoc(doc(db, 'users', user.id), { evaluationEnabled: next });
      toast.success(
        next
          ? 'تم منح صلاحية تقييم الفحوصات'
          : 'تم سحب صلاحية تقييم الفحوصات'
      );
      await refreshUser(user.id);
    } catch (e) {
      toast.error(`فشل تحديث صلاحية التقييم: ${e.message || ''}`);
    } finally {
      setWorking(null);
    }
  };

  const onBulkGrant = async ({ plan, userIds }) => {
    const grant = PLAN_GRANTS[plan];
    if (!grant || userIds.length === 0) return;
    setWorking('bulk');
    try {
      const expiry = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      for (let i = 0; i < userIds.length; i += 400) {
        const batch = writeBatch(db);
        for (const uid of userIds.slice(i, i + 400)) {
          batch.update(doc(db, 'users', uid), {
            plan,
            scansRemaining: increment(grant.scans),
            scansTotal:     increment(grant.scans),
            isActive:       true,
            expiresAt:      expiry,
            // Manual renewal → clear last cycle's reminder flags so the next
            // month starts a clean reminder cycle (mirrors confirmPayment).
            subExpiredNotified: deleteField(),
            subExpiryEmailSent: deleteField(),
            subExpiryFcmDate:   deleteField(),
          });
        }
        await batch.commit();
      }
      toast.success(`تم منح ${userIds.length} مستخدم اشتراك ${planLabel(plan)}`);
      try {
        const sendEmail = httpsCallable(functions, 'sendNotificationEmail');
        const results = await Promise.allSettled(
          userIds.map((uid) =>
            sendEmail({ userId: uid, templateName: 'grantSubscription', extraData: { scans: grant.scans, plan } })
          )
        );
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed > 0) toast.info(`فشل إرسال البريد لـ ${failed} مستخدم`);
      } catch (err) {
        console.warn('bulk sendNotificationEmail failed:', err);
      }
      setBulkModal(null);
      await loadUsers();
    } catch (e) {
      toast.error(`فشل المنح الجماعي: ${e.message || ''}`);
    } finally {
      setWorking(null);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1">المستخدمون</h1>
          <p className="text-nc-text3 text-sm mt-1">
            {filtered.length} من أصل {users.length}
          </p>
        </div>
        <button
          onClick={openBulkModal}
          disabled={working === 'bulk'}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl nc-gradient-bg text-nc-bg font-semibold text-sm hover:opacity-95 transition disabled:opacity-50"
        >
          {working === 'bulk' ? <Spinner size="sm" /> : <UserGroupIcon className="w-4 h-4" strokeWidth={2.2} />}
          منح اشتراك جماعي
        </button>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute top-1/2 start-4 -translate-y-1/2 text-nc-text3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالبريد أو الاسم..."
            className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 text-sm focus:outline-none focus:border-nc-green"
        >
          <option value="all">كل الأنواع</option>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 text-sm focus:outline-none focus:border-nc-green"
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="empty">بدون رصيد</option>
          <option value="disabled">معطّل</option>
        </select>
      </div>

      <div className="bg-nc-card border border-nc-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-nc-text3 text-xs uppercase tracking-wider border-b border-nc-border bg-nc-surface/40">
                <th className="text-start py-3 px-4 font-medium">المستخدم</th>
                <th className="text-start py-3 px-4 font-medium">الباقة</th>
                <th className="text-start py-3 px-4 font-medium">المتبقي</th>
                <th className="text-start py-3 px-4 font-medium">تاريخ الانتهاء</th>
                <th className="text-start py-3 px-4 font-medium">الحالة</th>
                {/* The explanation sits in the header rather than a tooltip:
                    a `title` is invisible on touch and easy to miss, and an
                    admin granting a capability should read what it does. */}
                <th className="text-start py-3 px-4 font-medium min-w-[230px]">
                  صلاحية تقييم الفحوصات
                  <span className="block mt-1 text-[10px] font-normal normal-case tracking-normal text-nc-text3/80 leading-relaxed">
                    يُفعّل شاشة تقييم الفنّي داخل التطبيق عند الفحص بكود المتجر
                  </span>
                </th>
                <th className="text-start py-3 px-4 font-medium">آخر دخول</th>
                <th className="text-start py-3 px-4 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-nc-text3">
                    لا يوجد مستخدمون مطابقون
                  </td>
                </tr>
              ) : (
                pageUsers.map((u) => {
                  const remaining = u.scansRemaining ?? u.credits ?? 0;
                  const active    = u.isActive !== false;
                  const isWorking = working === u.id;
                  return (
                    <tr key={u.id} className="border-b border-nc-border/50 hover:bg-nc-surface/30 transition">
                      <td className="py-3 px-4">
                        <div className="text-nc-text1 font-medium truncate max-w-[200px]">
                          {u.displayName || u.name || u.email?.split('@')[0] || '—'}
                        </div>
                        <div className="text-xs text-nc-text3 truncate max-w-[200px]">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${planColor(u.plan || 'free')}`}>
                          {planLabel(u.plan || 'free')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-nc-text1">
                        {scansDisplay(remaining)}
                      </td>
                      <td className="py-3 px-4 text-nc-text3 text-xs">
                        {formatDateShort(u.expiresAt)}
                      </td>
                      <td className="py-3 px-4">
                        {active ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-nc-green/10 text-nc-green text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-nc-green" />نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-nc-grade-d/10 text-nc-grade-d text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-nc-grade-d" />معطّل
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <EvaluationToggle
                          enabled={u.evaluationEnabled === true}
                          disabled={isWorking}
                          onToggle={() => onToggleEvaluation(u)}
                        />
                      </td>
                      <td className="py-3 px-4 text-nc-text3 text-xs">
                        {formatDateShort(u.lastLoginAt || u.lastSignInTime || u.lastLogin)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <ActionBtn onClick={() => openGrantModal(u, setScanModal)} title="منح فحوصات" disabled={isWorking} color="green">
                            <PlusIcon className="w-4 h-4" />
                          </ActionBtn>
                          <ActionBtn onClick={() => openGrantModal(u, setPlanModal)} title="منح اشتراك مجاني" disabled={isWorking} color="cyan">
                            <GiftIcon className="w-4 h-4" />
                          </ActionBtn>
                          {/* «تغيير الباقة» was hidden on purpose (the user's decision,
                              2026-10-14, before delivery) and its handler and window
                              were deleted with it. It ASSIGNED the balance — set
                              scansRemaining to the plan's scans outright — where the
                              two buttons above add to it with increment(): a balance
                              of 132 became 150 (relayed by the user, 2026-10-14; that
                              account is not in this repo). It stays in git history;
                              if it ever returns it should add, not assign, and show
                              the same «current ⟵ new» lines first. */}
                          <button
                            onClick={() => onToggleActive(u)}
                            disabled={isWorking}
                            title={active ? 'تعطيل' : 'تفعيل'}
                            className={`relative inline-flex items-center w-10 h-5 rounded-full transition ${
                              active ? 'bg-nc-green' : 'bg-nc-surface'
                            } disabled:opacity-50`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition ${active ? 'start-5' : 'start-0.5'}`} />
                          </button>
                          {isWorking && <Spinner size="sm" />}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-4">
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </div>
      </div>

      {scanModal && (
        <GrantScansModal
          user={scanModal.user}
          current={scanModal.current}
          onClose={() => setScanModal(null)}
          onConfirm={onGrantScans}
          working={working === scanModal.user.id}
        />
      )}
      {planModal && (
        <GrantPlanModal
          user={planModal.user}
          current={planModal.current}
          onClose={() => setPlanModal(null)}
          onConfirm={onGrantPlan}
          working={working === planModal.user.id}
        />
      )}
      {bulkModal && (
        <BulkGrantModal
          users={users}
          current={bulkModal.current}
          onClose={() => setBulkModal(null)}
          onConfirm={onBulkGrant}
          working={working === 'bulk'}
        />
      )}
    </div>
  );
}

/**
 * Labelled switch for the evaluation capability.
 *
 * It carries its state as a word, not just a colour: the neighbouring
 * account-enable switch is an unlabelled pill, and two bare pills side by side
 * in the same row would be indistinguishable at a glance — exactly the kind of
 * mix-up that gets the wrong flag flipped on the wrong shop.
 */
function EvaluationToggle({ enabled, disabled, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      disabled={disabled}
      title={
        enabled
          ? 'سحب صلاحية تقييم الفحوصات'
          : 'منح صلاحية تقييم الفحوصات'
      }
      className={`inline-flex items-center gap-2 ps-1.5 pe-2.5 py-1 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${
        enabled
          ? 'bg-nc-green/10 border-nc-green/40 text-nc-green'
          : 'bg-nc-surface border-nc-border text-nc-text3 hover:border-nc-text3/40 hover:text-nc-text2'
      }`}
    >
      {/* `start-*` keeps the knob on the correct side under dir="rtl". */}
      <span
        className={`relative inline-flex shrink-0 w-10 h-5 rounded-full transition ${
          enabled ? 'bg-nc-green' : 'bg-nc-border'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition ${
            enabled ? 'start-5' : 'start-0.5'
          }`}
        />
      </span>
      <span className="text-xs font-medium whitespace-nowrap">
        {enabled ? 'مفعّل' : 'غير مفعّل'}
      </span>
    </button>
  );
}

function ActionBtn({ children, onClick, title, disabled, color = 'neutral' }) {
  const colorCls = {
    green:   'hover:bg-nc-green/15 hover:text-nc-green hover:border-nc-green/40',
    cyan:    'hover:bg-nc-cyan/15 hover:text-nc-cyan hover:border-nc-cyan/40',
    neutral: 'hover:bg-nc-surface hover:text-nc-text1 hover:border-nc-text3/30',
  }[color];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md border border-nc-border text-nc-text2 transition disabled:opacity-40 disabled:cursor-not-allowed ${colorCls}`}
    >
      {children}
    </button>
  );
}

function GrantScansModal({ user, current, onClose, onConfirm, working }) {
  const [scans, setScans] = useState(5);
  return (
    <Modal
      open
      onClose={working ? undefined : onClose}
      title="منح فحوصات"
      footer={
        <>
          <button onClick={onClose} disabled={working} className="px-4 py-2 rounded-lg border border-nc-border text-nc-text2 hover:text-nc-text1 transition text-sm disabled:opacity-50">
            إلغاء
          </button>
          <button
            onClick={() => onConfirm({ userId: user.id, scans })}
            disabled={working}
            className="px-5 py-2 rounded-lg nc-gradient-bg text-nc-bg font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            {working && <Spinner size="sm" />}
            تأكيد المنح
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-nc-text2">
          منح فحوصات للمستخدم:{' '}
          <span className="text-nc-text1 font-medium">{user.email}</span>
        </p>
        <div>
          <label className="block text-xs text-nc-text3 uppercase tracking-wider mb-2">عدد الفحوصات</label>
          <div className="grid grid-cols-5 gap-2">
            {SCAN_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setScans(n)}
                className={`py-2.5 rounded-lg text-sm font-semibold transition ${
                  scans === n ? 'nc-gradient-bg text-nc-bg' : 'bg-nc-surface text-nc-text2 hover:text-nc-text1'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-nc-surface/60 text-xs text-nc-text3">
          سيتم إضافة {scans} فحص + تمديد الصلاحية 30 يوم
        </div>
        <GrantPreview current={current} add={scans} nowMs={Date.now()} />
      </div>
    </Modal>
  );
}

function GrantPlanModal({ user, current, onClose, onConfirm, working }) {
  const [plan, setPlan] = useState('shop_basic');
  return (
    <Modal
      open
      onClose={working ? undefined : onClose}
      title="منح اشتراك مجاني"
      footer={
        <>
          <button onClick={onClose} disabled={working} className="px-4 py-2 rounded-lg border border-nc-border text-nc-text2 hover:text-nc-text1 transition text-sm disabled:opacity-50">
            إلغاء
          </button>
          <button
            onClick={() => onConfirm({ userId: user.id, plan })}
            disabled={working}
            className="px-5 py-2 rounded-lg nc-gradient-bg text-nc-bg font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            {working && <Spinner size="sm" />}
            تأكيد المنح
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-nc-text2">
          منح اشتراك للمستخدم:{' '}
          <span className="text-nc-text1 font-medium">{user.email}</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(PLAN_GRANTS).map(([key, g]) => (
            <button
              key={key}
              onClick={() => setPlan(key)}
              className={`p-4 rounded-xl text-sm font-medium transition text-start ${
                plan === key
                  ? 'bg-nc-green/10 border border-nc-green text-nc-text1'
                  : 'bg-nc-surface border border-nc-border text-nc-text2 hover:text-nc-text1'
              }`}
            >
              <div className="font-semibold">{planLabel(key)}</div>
              <div className="text-xs text-nc-text3 mt-1">
                {g.scans >= 999999 ? 'فحوصات غير محدودة' : `${g.scans} فحص`}
              </div>
            </button>
          ))}
        </div>
        <GrantPreview current={current} add={PLAN_GRANTS[plan].scans} nowMs={Date.now()} />
      </div>
    </Modal>
  );
}

/**
 * One block per selected account: its name, then the same two lines as the
 * single-account windows. `add` is the plan's grant.scans — what onBulkGrant
 * passes to increment(). `current` is { [uid]: { scansRemaining, expiresAt } }
 * from the read taken when the window opened; an account missing from it shows
 * «—» on every side. Scrolls when the selection is long.
 */
function BulkGrantPreview({ users, selected, current, add, nowMs }) {
  const rows = users.filter((u) => selected.includes(u.id));
  if (rows.length === 0) return null;
  return (
    <div className="border border-nc-border rounded-xl max-h-56 overflow-y-auto">
      {rows.map((u) => (
        <div
          key={u.id}
          className="px-4 py-2.5 border-b border-nc-border/50 last:border-b-0 text-xs text-nc-text2 space-y-1"
        >
          <div className="text-sm text-nc-text1 truncate">
            {u.name || u.displayName || u.email?.split('@')[0] || '—'}
          </div>
          <GrantPreviewLines preview={grantPreview(current[u.id], add, nowMs)} />
        </div>
      ))}
    </div>
  );
}

function BulkGrantModal({ users, current, onClose, onConfirm, working }) {
  const [plan, setPlan]     = useState('shop_basic');
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');

  const visibleUsers = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) =>
      `${u.email || ''} ${u.name || u.displayName || ''}`.toLowerCase().includes(s)
    );
  }, [users, search]);

  const allSelected =
    visibleUsers.length > 0 &&
    visibleUsers.every((u) => selected.includes(u.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !visibleUsers.some((u) => u.id === id)));
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...visibleUsers.map((u) => u.id)])));
    }
  };

  const toggle = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <Modal
      open
      onClose={working ? undefined : onClose}
      title="منح اشتراك جماعي"
      size="lg"
      footer={
        <>
          <div className="me-auto text-xs text-nc-text3">{selected.length} مستخدم محدد</div>
          <button onClick={onClose} disabled={working} className="px-4 py-2 rounded-lg border border-nc-border text-nc-text2 hover:text-nc-text1 transition text-sm disabled:opacity-50">
            إلغاء
          </button>
          <button
            onClick={() => onConfirm({ plan, userIds: selected })}
            disabled={working || selected.length === 0}
            className="px-5 py-2 rounded-lg nc-gradient-bg text-nc-bg font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            {working && <Spinner size="sm" />}
            تأكيد المنح
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-nc-text3 uppercase tracking-wider mb-2">الباقة</label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(PLAN_GRANTS).map(([key, g]) => (
              <button
                key={key}
                onClick={() => setPlan(key)}
                className={`p-3 rounded-xl text-sm font-medium transition text-start ${
                  plan === key
                    ? 'bg-nc-green/10 border border-nc-green text-nc-text1'
                    : 'bg-nc-surface border border-nc-border text-nc-text2 hover:text-nc-text1'
                }`}
              >
                <div className="font-semibold">{planLabel(key)}</div>
                <div className="text-xs text-nc-text3 mt-1">
                  {g.scans >= 999999 ? 'غير محدود' : `${g.scans} فحص`}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs text-nc-text3 uppercase tracking-wider">المستخدمون</label>
            <button onClick={toggleAll} className="text-xs text-nc-green hover:underline">
              {allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            className="w-full px-4 py-2 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green text-sm mb-3"
          />
          <div className="border border-nc-border rounded-xl max-h-64 overflow-y-auto">
            {visibleUsers.length === 0 ? (
              <div className="p-6 text-center text-nc-text3 text-sm">لا يوجد مستخدمون</div>
            ) : (
              visibleUsers.map((u) => {
                const checked = selected.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-3 px-4 py-2.5 border-b border-nc-border/50 cursor-pointer transition ${
                      checked ? 'bg-nc-green/5' : 'hover:bg-nc-surface/40'
                    }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggle(u.id)} className="w-4 h-4 accent-nc-green" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-nc-text1 truncate">
                        {u.name || u.displayName || u.email?.split('@')[0]}
                      </div>
                      <div className="text-xs text-nc-text3 truncate">{u.email}</div>
                    </div>
                    <div className="text-xs text-nc-text3 whitespace-nowrap">
                      {planLabel(u.plan || 'free')}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <BulkGrantPreview
          users={users}
          selected={selected}
          current={current}
          add={PLAN_GRANTS[plan].scans}
          nowMs={Date.now()}
        />
      </div>
    </Modal>
  );
}
