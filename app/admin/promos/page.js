'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { formatDate, planLabel, PLAN_LABELS } from '@/lib/admin';
import { PageSpinner } from '@/components/admin/Spinner';
import Modal from '@/components/admin/Modal';
import Pagination from '@/components/admin/Pagination';
import { useToast } from '@/components/admin/Toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  PowerIcon,
  TrashIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE = 20;

// Plan options for the dropdown.
// Values MUST match the canonical plan keys used everywhere else
// (backend plans.js, checkSubscription isShop, admin/users PLAN_GRANTS):
// 'shop_basic' / 'shop_pro' — NOT the legacy 'basic'/'pro', which made
// checkSubscription compute isShop=false and silently deny shop features
// to users who redeemed a shop-plan promo code.
const PLAN_OPTIONS = [
  { value: '', label: 'بدون باقة' },
  { value: 'single', label: PLAN_LABELS.single },
  { value: 'shop_basic', label: PLAN_LABELS.shop_basic },
  { value: 'shop_pro', label: PLAN_LABELS.shop_pro },
  { value: 'free', label: PLAN_LABELS.free },
];

function generateCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
}

function sanitizeCode(v) {
  return (v || '')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32);
}

export default function AdminPromosPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [savingCode, setSavingCode] = useState(null); // id being toggled
  const [deletingCode, setDeletingCode] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  const loadPromos = async () => {
    setLoading(true);
    try {
      let snap;
      try {
        snap = await getDocs(
          query(collection(db, 'promoCodes'), orderBy('createdAt', 'desc'))
        );
      } catch {
        snap = await getDocs(collection(db, 'promoCodes'));
      }
      setPromos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[promos] load failed:', e);
      toast.error('فشل تحميل الأكواد الترويجية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return promos.filter((p) => {
      if (s) {
        const hay = `${p.code || p.id} ${p.plan || ''} ${p.notes || ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (statusFilter === 'active' && !p.isActive) return false;
      if (statusFilter === 'inactive' && p.isActive) return false;
      return true;
    });
  }, [promos, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCreate = async (data) => {
    const code = sanitizeCode(data.code);
    if (!code || code.length < 3) {
      toast.error('الكود يجب أن يكون 3 أحرف على الأقل');
      return false;
    }
    // Check duplicate (case-insensitive against existing IDs)
    if (promos.some((p) => (p.code || p.id || '').toUpperCase() === code)) {
      toast.error('هذا الكود موجود مسبقاً');
      return false;
    }

    try {
      const ref = doc(db, 'promoCodes', code);
      await setDoc(ref, {
        code,
        plan: data.plan || null,
        scans: data.scans ? Number(data.scans) : 0,
        durationDays: data.durationDays ? Number(data.durationDays) : 0,
        maxUses: data.maxUses ? Number(data.maxUses) : 0, // 0 = unlimited
        usedCount: 0,
        isActive: true,
        notes: data.notes || '',
        createdAt: serverTimestamp(),
      });
      toast.success(`تم إنشاء الكود ${code}`);
      await loadPromos();
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[promos] create failed:', e);
      toast.error('فشل إنشاء الكود');
      return false;
    }
  };

  const handleToggle = async (promo) => {
    setSavingCode(promo.id);
    try {
      await updateDoc(doc(db, 'promoCodes', promo.id), {
        isActive: !promo.isActive,
      });
      toast.success(
        !promo.isActive ? `تم تفعيل ${promo.code || promo.id}` : `تم تعطيل ${promo.code || promo.id}`
      );
      setPromos((prev) =>
        prev.map((p) =>
          p.id === promo.id ? { ...p, isActive: !p.isActive } : p
        )
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[promos] toggle failed:', e);
      toast.error('فشل تحديث الحالة');
    } finally {
      setSavingCode(null);
    }
  };

  const handleDelete = async (promo) => {
    setDeletingCode(promo.id);
    try {
      await deleteDoc(doc(db, 'promoCodes', promo.id));
      toast.success(`تم حذف ${promo.code || promo.id}`);
      setPromos((prev) => prev.filter((p) => p.id !== promo.id));
      setConfirmDelete(null);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[promos] delete failed:', e);
      toast.error('فشل حذف الكود');
    } finally {
      setDeletingCode(null);
    }
  };

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1800);
    } catch {
      toast.error('فشل النسخ');
    }
  };

  if (loading) return <PageSpinner />;

  const activeCount = promos.filter((p) => p.isActive).length;
  const totalUses = promos.reduce((acc, p) => acc + (p.usedCount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1 flex items-center gap-2.5">
            <GiftIcon className="w-7 h-7 text-nc-green" strokeWidth={2} />
            الأكواد الترويجية
          </h1>
          <p className="text-nc-text3 text-sm mt-1">
            {promos.length} كود — {activeCount} مفعّل — {totalUses} استخدام
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl nc-gradient-bg text-nc-bg font-semibold text-sm hover:shadow-[0_0_24px_rgba(0,255,140,0.3)] transition"
        >
          <PlusIcon className="w-4 h-4" strokeWidth={2.4} />
          إنشاء كود جديد
        </button>
      </div>

      {/* Filters */}
      <div className="grid sm:grid-cols-[1fr_auto] gap-3">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute top-1/2 start-4 -translate-y-1/2 text-nc-text3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالكود أو الباقة..."
            className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 text-sm focus:outline-none focus:border-nc-green"
        >
          <option value="all">كل الحالات</option>
          <option value="active">مفعّل فقط</option>
          <option value="inactive">معطّل فقط</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-nc-card border border-nc-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-nc-text3 text-xs uppercase tracking-wider border-b border-nc-border bg-nc-surface/40">
                <th className="text-start py-3 px-4 font-medium">الكود</th>
                <th className="text-start py-3 px-4 font-medium">الباقة</th>
                <th className="text-start py-3 px-4 font-medium">الفحوصات</th>
                <th className="text-start py-3 px-4 font-medium">المدة</th>
                <th className="text-start py-3 px-4 font-medium">الاستخدام</th>
                <th className="text-start py-3 px-4 font-medium">الحالة</th>
                <th className="text-start py-3 px-4 font-medium">التاريخ</th>
                <th className="text-start py-3 px-4 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-nc-text3">
                    {promos.length === 0
                      ? 'لا توجد أكواد بعد — أنشئ أول كود الآن'
                      : 'لا توجد أكواد مطابقة'}
                  </td>
                </tr>
              ) : (
                pageItems.map((p) => {
                  const code = p.code || p.id;
                  const used = Number(p.usedCount || 0);
                  const max = Number(p.maxUses || 0);
                  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
                  const exhausted = max > 0 && used >= max;

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-nc-border/50 hover:bg-nc-surface/30 transition"
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleCopy(code)}
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-nc-surface border border-nc-border hover:border-nc-green/50 hover:text-nc-green transition font-mono text-xs text-nc-text1 group"
                          title="نسخ"
                        >
                          {code}
                          {copiedCode === code ? (
                            <CheckIcon
                              className="w-3.5 h-3.5 text-nc-green"
                              strokeWidth={2.4}
                            />
                          ) : (
                            <ClipboardDocumentIcon
                              className="w-3.5 h-3.5 text-nc-text3 group-hover:text-nc-green"
                              strokeWidth={1.8}
                            />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-nc-text1">
                        {p.plan ? planLabel(p.plan) : <span className="text-nc-text3">—</span>}
                      </td>
                      <td className="py-3 px-4 text-nc-text2 tabular-nums">
                        {p.scans ? `+${p.scans}` : <span className="text-nc-text3">—</span>}
                      </td>
                      <td className="py-3 px-4 text-nc-text2 tabular-nums">
                        {p.durationDays ? (
                          `${p.durationDays} يوم`
                        ) : (
                          <span className="text-nc-text3">∞</span>
                        )}
                      </td>
                      <td className="py-3 px-4 min-w-[140px]">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs text-nc-text2 tabular-nums">
                            {used} / {max > 0 ? max : '∞'}
                          </div>
                          {max > 0 && (
                            <div className="w-full h-1.5 rounded-full bg-nc-surface overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  exhausted
                                    ? 'bg-nc-grade-d'
                                    : pct > 70
                                    ? 'bg-nc-grade-c'
                                    : 'bg-nc-green'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge active={p.isActive} exhausted={exhausted} />
                      </td>
                      <td className="py-3 px-4 text-nc-text3 text-xs whitespace-nowrap">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggle(p)}
                            disabled={savingCode === p.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition ${
                              p.isActive
                                ? 'bg-nc-grade-c/10 text-nc-grade-c border-nc-grade-c/30 hover:bg-nc-grade-c/20'
                                : 'bg-nc-green/10 text-nc-green border-nc-green/30 hover:bg-nc-green/20'
                            } disabled:opacity-50`}
                            title={p.isActive ? 'تعطيل الكود' : 'تفعيل الكود'}
                          >
                            <PowerIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
                            {p.isActive ? 'تعطيل' : 'تفعيل'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(p)}
                            disabled={deletingCode === p.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-nc-grade-d/10 text-nc-grade-d border border-nc-grade-d/30 hover:bg-nc-grade-d/20 transition text-xs disabled:opacity-50"
                            title="حذف"
                          >
                            <TrashIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
                          </button>
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
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
          />
        </div>
      </div>

      {creating && (
        <CreatePromoModal
          onClose={() => setCreating(false)}
          onCreate={handleCreate}
        />
      )}

      {confirmDelete && (
        <Modal
          open
          onClose={() => setConfirmDelete(null)}
          title="حذف الكود"
          size="sm"
          footer={
            <>
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-nc-border text-nc-text2 hover:text-nc-text1 hover:border-nc-text2 transition text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingCode === confirmDelete.id}
                className="px-4 py-2 rounded-lg bg-nc-grade-d text-white font-semibold hover:bg-nc-grade-d/90 transition text-sm disabled:opacity-50"
              >
                {deletingCode === confirmDelete.id ? 'جاري الحذف...' : 'حذف نهائي'}
              </button>
            </>
          }
        >
          <p className="text-nc-text2 leading-relaxed">
            هل أنت متأكد من حذف الكود{' '}
            <span className="font-mono font-semibold text-nc-text1">
              {confirmDelete.code || confirmDelete.id}
            </span>
            ؟ لن يستطيع أحد استخدامه بعد الحذف.
          </p>
          {confirmDelete.usedCount > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-nc-grade-c/10 border border-nc-grade-c/30 text-xs text-nc-grade-c">
              ⚠️ هذا الكود تم استخدامه {confirmDelete.usedCount} مرة. الحذف لن يلغي
              المنح السابقة لكنه سيمنع أي استخدام جديد.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function StatusBadge({ active, exhausted }) {
  if (exhausted) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-nc-grade-d/10 text-nc-grade-d border border-nc-grade-d/30 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-nc-grade-d" />
        مكتمل
      </span>
    );
  }
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-nc-green/10 text-nc-green border border-nc-green/30 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-nc-green animate-pulse" />
        مفعّل
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-nc-text3/10 text-nc-text3 border border-nc-text3/30 text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-nc-text3" />
      معطّل
    </span>
  );
}

function CreatePromoModal({ onClose, onCreate }) {
  const [code, setCode] = useState('');
  const [plan, setPlan] = useState('');
  const [scans, setScans] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [maxUses, setMaxUses] = useState('100');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const ok = await onCreate({
      code,
      plan,
      scans,
      durationDays,
      maxUses,
      notes,
    });
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="إنشاء كود ترويجي جديد"
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-nc-border text-nc-text2 hover:text-nc-text1 hover:border-nc-text2 transition text-sm disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !code.trim()}
            className="px-5 py-2 rounded-lg nc-gradient-bg text-nc-bg font-semibold text-sm disabled:opacity-50 hover:shadow-[0_0_18px_rgba(0,255,140,0.25)] transition"
          >
            {submitting ? 'جاري الإنشاء...' : 'إنشاء الكود'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Code */}
        <div>
          <label className="block text-xs text-nc-text3 mb-1.5 uppercase tracking-wider">
            الكود <span className="text-nc-grade-d">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(sanitizeCode(e.target.value))}
              placeholder="WELCOME10"
              className="flex-1 px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green text-sm font-mono uppercase tracking-wider"
              maxLength={32}
            />
            <button
              type="button"
              onClick={() => setCode(generateCode(8))}
              className="px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text2 hover:text-nc-cyan hover:border-nc-cyan/50 transition text-sm whitespace-nowrap"
            >
              عشوائي
            </button>
          </div>
          <p className="mt-1.5 text-xs text-nc-text3">
            أحرف لاتينية كبيرة وأرقام فقط (3-32 حرفاً)
          </p>
        </div>

        {/* Plan */}
        <div>
          <label className="block text-xs text-nc-text3 mb-1.5 uppercase tracking-wider">
            الباقة الممنوحة
          </label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 focus:outline-none focus:border-nc-green text-sm"
          >
            {PLAN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Scans + Duration row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-nc-text3 mb-1.5 uppercase tracking-wider">
              عدد الفحوصات
            </label>
            <input
              type="number"
              min="0"
              value={scans}
              onChange={(e) => setScans(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs text-nc-text3 mb-1.5 uppercase tracking-wider">
              المدة (بالأيام)
            </label>
            <input
              type="number"
              min="0"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="0 = بدون انتهاء"
              className="w-full px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green text-sm tabular-nums"
            />
          </div>
        </div>

        {/* Max uses */}
        <div>
          <label className="block text-xs text-nc-text3 mb-1.5 uppercase tracking-wider">
            الحد الأقصى للاستخدام
          </label>
          <input
            type="number"
            min="0"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="0 = غير محدود"
            className="w-full px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green text-sm tabular-nums"
          />
          <p className="mt-1.5 text-xs text-nc-text3">
            إجمالي عدد المرات التي يمكن استخدام الكود فيها (اتركه 0 لجعله غير محدود)
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-nc-text3 mb-1.5 uppercase tracking-wider">
            ملاحظات (اختياري)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثلاً: حملة رمضان 2026"
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green text-sm resize-none"
            maxLength={200}
          />
        </div>
      </form>
    </Modal>
  );
}
