'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';

const PLAN_SCANS = { free: 1, single: 1, shop_basic: 50, shop_pro: 150 };
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/firebase';
import { formatDate, planLabel } from '@/lib/admin';
import { PageSpinner } from '@/components/admin/Spinner';
import Spinner from '@/components/admin/Spinner';
import Modal from '@/components/admin/Modal';
import Pagination from '@/components/admin/Pagination';
import { useToast } from '@/components/admin/Toast';
import {
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE = 20;
const TABS = [
  { key: 'pending', label: 'معلّقة' },
  { key: 'confirmed', label: 'مؤكدة' },
  { key: 'rejected', label: 'مرفوضة' },
  { key: 'all', label: 'الكل' },
];

const STATUS_META = {
  pending: { label: 'معلّقة', cls: 'bg-nc-grade-c/10 text-nc-grade-c' },
  confirmed: { label: 'مؤكدة', cls: 'bg-nc-green/10 text-nc-green' },
  rejected: { label: 'مرفوضة', cls: 'bg-nc-grade-d/10 text-nc-grade-d' },
};

export default function AdminPaymentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(1);
  const [working, setWorking] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);

  const loadPayments = async () => {
    try {
      let snap;
      try {
        snap = await getDocs(
          query(collection(db, 'payments'), orderBy('createdAt', 'desc'))
        );
      } catch {
        snap = await getDocs(collection(db, 'payments'));
      }

      const rawPayments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Enrich each payment with user data from `users` collection.
      // Cache fetched users so we don't re-fetch the same uid multiple times.
      const userCache = new Map();
      const getUser = async (uid) => {
        if (!uid) return null;
        if (userCache.has(uid)) return userCache.get(uid);
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          const data = userSnap.exists() ? userSnap.data() : null;
          userCache.set(uid, data);
          return data;
        } catch {
          userCache.set(uid, null);
          return null;
        }
      };

      const enriched = await Promise.all(
        rawPayments.map(async (p) => {
          const uid = p.userId || p.uid || null;
          const u = await getUser(uid);
          return {
            ...p,
            userName: u?.name || u?.displayName || p.userName || '',
            userEmail: u?.email || p.userEmail || p.email || '',
          };
        })
      );

      setPayments(enriched);
    } catch (e) {
      toast.error('فشل تحميل الدفعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const counts = useMemo(() => {
    const c = { pending: 0, confirmed: 0, rejected: 0, all: payments.length };
    for (const p of payments) {
      const s = p.status || 'pending';
      if (c[s] !== undefined) c[s]++;
    }
    return c;
  }, [payments]);

  const filtered = useMemo(() => {
    if (tab === 'all') return payments;
    return payments.filter((p) => (p.status || 'pending') === tab);
  }, [payments, tab]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const refreshPayment = async (paymentId) => {
    try {
      const snap = await getDoc(doc(db, 'payments', paymentId));
      if (snap.exists()) {
        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId ? { ...p, ...snap.data(), id: paymentId } : p
          )
        );
      }
    } catch {
      // silent — table keeps previous data
    }
  };

  const onConfirm = async (p) => {
    setWorking(p.id);
    try {
      const fn = httpsCallable(functions, 'confirmPayment');
      await fn({ paymentId: p.id });
      await refreshPayment(p.id);
      const scans = PLAN_SCANS[p.plan];
      const scansText = scans >= 999999
        ? 'فحوصات غير محدودة'
        : scans ? `${scans} فحص` : '';
      toast.success(`تمت الموافقة${scansText ? ` — المستخدم حصل على ${scansText}` : ''}`);
    } catch (e) {
      toast.error(`فشل التأكيد: ${e.message || ''}`);
    } finally {
      setWorking(null);
    }
  };

  const confirmReject = async ({ paymentId, reason }) => {
    setWorking(paymentId);
    try {
      const rejectFn = httpsCallable(functions, 'rejectPayment');
      await rejectFn({ paymentId, reason });
      toast.success('تم رفض الدفعة');
      setRejectModal(null);
      await refreshPayment(paymentId);
    } catch (e) {
      toast.error(`فشل الرفض: ${e.message || ''}`);
    } finally {
      setWorking(null);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1">
          الدفعات
        </h1>
        <p className="text-nc-text3 text-sm mt-1">
          إدارة دفعات الاشتراكات وتأكيدها
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition border ${
              tab === t.key
                ? 'bg-nc-green/10 text-nc-green border-nc-green/40'
                : 'bg-nc-card border-nc-border text-nc-text2 hover:text-nc-text1'
            }`}
          >
            {t.label}
            <span className="ms-2 text-xs opacity-70">
              ({counts[t.key] || 0})
            </span>
          </button>
        ))}
      </div>

      <div className="bg-nc-card border border-nc-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-nc-text3 text-xs uppercase tracking-wider border-b border-nc-border bg-nc-surface/40">
                <th className="text-start py-3 px-4 font-medium">رقم العملية</th>
                <th className="text-start py-3 px-4 font-medium">رقم الإيصال</th>
                <th className="text-start py-3 px-4 font-medium">المستخدم</th>
                <th className="text-start py-3 px-4 font-medium">المبلغ</th>
                <th className="text-start py-3 px-4 font-medium">الباقة</th>
                <th className="text-start py-3 px-4 font-medium">الحالة</th>
                <th className="text-start py-3 px-4 font-medium">التاريخ</th>
                <th className="text-start py-3 px-4 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-nc-text3">
                    لا توجد دفعات في هذه الحالة
                  </td>
                </tr>
              ) : (
                pageItems.map((p) => {
                  const status = p.status || 'pending';
                  const meta = STATUS_META[status] || STATUS_META.pending;
                  const isWorking = working === p.id;
                  const amount =
                    p.amountUsd != null
                      ? `$${p.amountUsd}`
                      : p.amount != null
                      ? `${p.amount} ${p.currency || 'USD'}`
                      : '—';
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-nc-border/50 hover:bg-nc-surface/30 transition"
                    >
                      <td className="py-3 px-4 font-mono text-xs text-nc-text2 truncate max-w-[140px]">
                        {p.id}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-nc-text1 truncate max-w-[140px]">
                        {p.reference || p.referenceNumber || p.ref || p.receiptNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-nc-text1">
                        {p.userName && (
                          <div className="font-medium truncate max-w-[200px]">
                            {p.userName}
                          </div>
                        )}
                        <div
                          className={`truncate max-w-[200px] ${
                            p.userName ? 'text-xs text-nc-text3' : ''
                          }`}
                        >
                          {p.userEmail || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-nc-text1">
                        {amount}
                      </td>
                      <td className="py-3 px-4 text-nc-text2">
                        {planLabel(p.plan)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-md text-xs ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-nc-text3 text-xs whitespace-nowrap">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        {status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onConfirm(p)}
                              disabled={isWorking}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-nc-green/10 text-nc-green border border-nc-green/30 hover:bg-nc-green/20 transition text-xs font-semibold disabled:opacity-50"
                            >
                              {isWorking ? (
                                <Spinner size="sm" />
                              ) : (
                                <CheckIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                              )}
                              تأكيد
                            </button>
                            <button
                              onClick={() => setRejectModal(p)}
                              disabled={isWorking}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-nc-grade-d/10 text-nc-grade-d border border-nc-grade-d/30 hover:bg-nc-grade-d/20 transition text-xs font-semibold disabled:opacity-50"
                            >
                              <XMarkIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                              رفض
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-nc-text3">—</span>
                        )}
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

      {rejectModal && (
        <RejectPaymentModal
          payment={rejectModal}
          onClose={() => setRejectModal(null)}
          onConfirm={confirmReject}
          working={working === rejectModal.id}
        />
      )}
    </div>
  );
}

const PRESET_REASONS = [
  'الإيصال غير واضح أو غير مقروء',
  'رقم الإيصال غير صحيح',
  'المبلغ لا يطابق الباقة المطلوبة',
  'الدفعة غير موجودة في حسابنا',
  'تم الدفع إلى حساب خاطئ',
];

function RejectPaymentModal({ payment, onClose, onConfirm, working }) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const valid = trimmed.length >= 5;

  return (
    <Modal
      open
      onClose={working ? undefined : onClose}
      title="رفض الدفعة"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={working}
            className="px-4 py-2 rounded-lg border border-nc-border text-nc-text2 hover:text-nc-text1 transition text-sm disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={() => onConfirm({ paymentId: payment.id, reason: trimmed })}
            disabled={working || !valid}
            className="px-5 py-2 rounded-lg bg-nc-grade-d text-white font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50 hover:bg-nc-grade-d/90 transition"
          >
            {working && <Spinner size="sm" />}
            تأكيد الرفض
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-nc-surface/60 border border-nc-border text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-nc-text3">رقم العملية:</span>
            <span className="font-mono text-nc-text1 truncate ms-2">
              {payment.id}
            </span>
          </div>
          {payment.userEmail && (
            <div className="flex justify-between">
              <span className="text-nc-text3">المستخدم:</span>
              <span className="text-nc-text1 truncate ms-2">
                {payment.userEmail}
              </span>
            </div>
          )}
          {(payment.amountUsd != null || payment.amount != null) && (
            <div className="flex justify-between">
              <span className="text-nc-text3">المبلغ:</span>
              <span className="text-nc-text1">
                {payment.amountUsd != null
                  ? `$${payment.amountUsd}`
                  : `${payment.amount} ${payment.currency || 'USD'}`}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-nc-text3 uppercase tracking-wider mb-2">
            سبب الرفض <span className="text-nc-grade-d">*</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                disabled={working}
                className="px-3 py-1.5 rounded-md text-xs bg-nc-surface border border-nc-border text-nc-text2 hover:text-nc-text1 hover:border-nc-text3/40 transition disabled:opacity-50"
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={working}
            rows={4}
            placeholder="اكتب سبباً واضحاً للمستخدم..."
            className="w-full px-4 py-3 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-grade-d focus:ring-2 focus:ring-nc-grade-d/20 transition text-sm resize-none disabled:opacity-50"
          />
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span
              className={
                valid ? 'text-nc-text3' : 'text-nc-grade-c'
              }
            >
              {valid
                ? 'سيُرسل هذا السبب للمستخدم بالبريد'
                : 'يجب كتابة 5 أحرف على الأقل'}
            </span>
            <span className="text-nc-text3">{trimmed.length} حرف</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
