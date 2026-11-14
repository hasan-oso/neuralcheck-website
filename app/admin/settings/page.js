'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from '@/components/admin/Toast';
import { PageSpinner } from '@/components/admin/Spinner';
import AiModelCard from '@/components/admin/AiModelCard';
import {
  Cog6ToothIcon,
  GiftIcon,
  CheckIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

export default function AdminSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  // freeScansForNewUser
  const [freeScans, setFreeScans] = useState('0');
  const [originalFreeScans, setOriginalFreeScans] = useState(0);
  const [savingFreeScans, setSavingFreeScans] = useState(false);

  // shamCashNumber
  const [shamCash, setShamCash] = useState('');
  const [originalShamCash, setOriginalShamCash] = useState('');
  const [savingShamCash, setSavingShamCash] = useState(false);

  // Load all settings in a single Firestore read.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'app'));
        const data = snap.exists() ? snap.data() : {};

        const v = Number(data.freeScansForNewUser ?? 0);
        const safe = Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

        const cash = String(data.shamCashNumber ?? '');

        if (!mounted) return;
        setFreeScans(String(safe));
        setOriginalFreeScans(safe);
        setShamCash(cash);
        setOriginalShamCash(cash);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[settings] load failed:', e);
        if (mounted) toast.error('فشل تحميل الإعدادات');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- save: free scans ----
  const handleSaveFreeScans = async () => {
    const n = Number(freeScans);
    if (!Number.isFinite(n) || n < 0) {
      toast.error('قيمة غير صالحة — يجب أن تكون رقماً ≥ 0');
      return;
    }
    const value = Math.floor(n);
    setSavingFreeScans(true);
    try {
      await setDoc(
        doc(db, 'settings', 'app'),
        {
          freeScansForNewUser: value,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setOriginalFreeScans(value);
      setFreeScans(String(value));
      toast.success(`تم الحفظ — كل مستخدم جديد سيحصل على ${value} فحص`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[settings] save freeScans failed:', e);
      toast.error('فشل الحفظ — تحقّق من صلاحيات Firestore');
    } finally {
      setSavingFreeScans(false);
    }
  };

  // ---- save: sham cash number ----
  const handleSaveShamCash = async () => {
    const value = shamCash.trim();
    setSavingShamCash(true);
    try {
      await setDoc(
        doc(db, 'settings', 'app'),
        {
          shamCashNumber: value,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setOriginalShamCash(value);
      setShamCash(value);
      toast.success(
        value
          ? 'تم حفظ رقم حساب شام كاش'
          : 'تم مسح رقم حساب شام كاش'
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[settings] save shamCash failed:', e);
      toast.error('فشل الحفظ — تحقّق من صلاحيات Firestore');
    } finally {
      setSavingShamCash(false);
    }
  };

  if (loading) return <PageSpinner />;

  // dirty flags
  const fsNumeric = Number(freeScans);
  const fsDirty =
    Number.isFinite(fsNumeric) && Math.floor(fsNumeric) !== originalFreeScans;
  const fsInvalid =
    freeScans !== '' && (!Number.isFinite(fsNumeric) || fsNumeric < 0);

  const shamDirty = shamCash.trim() !== originalShamCash.trim();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1 flex items-center gap-3">
          <Cog6ToothIcon
            className="w-7 h-7 text-nc-cyan"
            strokeWidth={1.8}
          />
          إعدادات التطبيق
        </h1>
        <p className="text-nc-text3 text-sm mt-1">
          إعدادات عامة تؤثّر على سلوك التطبيق لجميع المستخدمين
        </p>
      </div>

      {/* Free scans for new users */}
      <div className="max-w-xl bg-nc-card border border-nc-border rounded-2xl p-6 sm:p-7">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-nc-green/10 border border-nc-green/30 flex items-center justify-center shrink-0">
            <GiftIcon
              className="w-5 h-5 text-nc-green"
              strokeWidth={1.8}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-nc-text1">
              الفحوصات المجانية للمستخدم الجديد
            </h2>
            <p className="text-sm text-nc-text3 mt-1 leading-relaxed">
              عدد الفحوصات التي تُمنح تلقائياً عند إنشاء حساب جديد في التطبيق.
              ضع <span className="font-mono">0</span> لإلغاء المنح المجاني.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={freeScans}
            onChange={(e) => setFreeScans(e.target.value)}
            className={`flex-1 px-4 py-3 rounded-xl bg-nc-surface border text-nc-text1 text-lg font-semibold tabular-nums focus:outline-none focus:ring-2 transition ${
              fsInvalid
                ? 'border-nc-grade-d/60 focus:border-nc-grade-d focus:ring-nc-grade-d/20'
                : 'border-nc-border focus:border-nc-green focus:ring-nc-green/20'
            }`}
          />
          <button
            onClick={handleSaveFreeScans}
            disabled={savingFreeScans || !fsDirty || fsInvalid}
            className="px-6 py-3 rounded-xl nc-gradient-bg text-nc-bg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
          >
            {savingFreeScans ? (
              <>
                <span className="w-4 h-4 border-2 border-nc-bg/60 border-t-transparent rounded-full animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4" strokeWidth={2.2} />
                حفظ
              </>
            )}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-nc-text3">القيمة الحالية في Firestore:</span>
          <span className="font-mono font-semibold text-nc-text2 px-2 py-0.5 rounded bg-nc-surface">
            {originalFreeScans}
          </span>
          {fsInvalid && (
            <span className="text-nc-grade-d">• قيمة غير صالحة</span>
          )}
          {fsDirty && !fsInvalid && (
            <span className="text-nc-grade-c">• لم يُحفظ بعد</span>
          )}
          {!fsDirty && !fsInvalid && originalFreeScans > 0 && (
            <span className="text-nc-green">✓ متزامن</span>
          )}
        </div>

        <div className="mt-5 pt-5 border-t border-nc-border text-xs text-nc-text3 leading-relaxed">
          <span className="font-semibold text-nc-text2">المسار في Firestore:</span>{' '}
          <span className="font-mono">settings/app</span> →{' '}
          <span className="font-mono">freeScansForNewUser</span>
        </div>
      </div>

      {/* Sham Cash account number */}
      <div className="max-w-xl bg-nc-card border border-nc-border rounded-2xl p-6 sm:p-7">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-nc-cyan/10 border border-nc-cyan/30 flex items-center justify-center shrink-0">
            <CreditCardIcon
              className="w-5 h-5 text-nc-cyan"
              strokeWidth={1.8}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-nc-text1">
              رقم حساب شام كاش
            </h2>
            <p className="text-sm text-nc-text3 mt-1 leading-relaxed">
              رقم الحساب الذي يُعرض للمستخدمين عند الدفع عبر شام كاش.
              اتركه فارغاً لإخفاء خيار شام كاش من التطبيق.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            inputMode="text"
            dir="ltr"
            value={shamCash}
            onChange={(e) => setShamCash(e.target.value)}
            placeholder="مثال: 0912345678"
            className="flex-1 px-4 py-3 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 text-base font-mono tabular-nums focus:outline-none focus:border-nc-cyan focus:ring-2 focus:ring-nc-cyan/20 transition placeholder:text-nc-text3 placeholder:font-sans"
          />
          <button
            onClick={handleSaveShamCash}
            disabled={savingShamCash || !shamDirty}
            className="px-6 py-3 rounded-xl nc-gradient-bg text-nc-bg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
          >
            {savingShamCash ? (
              <>
                <span className="w-4 h-4 border-2 border-nc-bg/60 border-t-transparent rounded-full animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4" strokeWidth={2.2} />
                حفظ
              </>
            )}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-nc-text3">القيمة الحالية في Firestore:</span>
          <span className="font-mono font-semibold text-nc-text2 px-2 py-0.5 rounded bg-nc-surface break-all">
            {originalShamCash || '— فارغ —'}
          </span>
          {shamDirty && (
            <span className="text-nc-grade-c">• لم يُحفظ بعد</span>
          )}
          {!shamDirty && originalShamCash && (
            <span className="text-nc-green">✓ متزامن</span>
          )}
        </div>

        <div className="mt-5 pt-5 border-t border-nc-border text-xs text-nc-text3 leading-relaxed">
          <span className="font-semibold text-nc-text2">المسار في Firestore:</span>{' '}
          <span className="font-mono">settings/app</span> →{' '}
          <span className="font-mono">shamCashNumber</span>
        </div>
      </div>

      {/* AI analysis model — loads its own options from the server and fails
          on its own if that function is not deployed yet. */}
      <AiModelCard />
    </div>
  );
}
