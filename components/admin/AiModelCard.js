'use client';

// Switches the DeepSeek model the analysis pipeline uses.
//
// The list comes from getAiConfig rather than being written here, and there is
// no free-text field, because the model id is not guessable: the backend
// established that `deepseek-r1` and `deepseek-v3` are rejected while
// `deepseek-v4-flash` is accepted as a silent alias. A typo in a text box would
// not fail here — it would fail on the first scan a customer runs, which is the
// worst possible place to discover it. So the server owns the list and this
// only picks from it.
//
// The switch goes through setAiModel and never touches settings/ai directly.
// A direct write would skip the server's validation — the very thing the picker
// exists to enforce — and stamping updatedAt/updatedBy from here would overwrite
// the switch log with a write that is not a switch. If this page ever needs a
// field of its own, it belongs in a different document.

import { useCallback, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import {
  CpuChipIcon,
  CheckIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  BeakerIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';

import { functions } from '@/firebase';
import Modal from '@/components/admin/Modal';
import Spinner from '@/components/admin/Spinner';
import { useToast } from '@/components/admin/Toast';

const GET_FN = 'getAiConfig';
const SET_FN = 'setAiModel';

/** Only used if the server omits cacheTtlMs. */
const FALLBACK_TTL_MS = 60_000;

// `verified` is an enum, not a boolean. The distinction it draws matters to
// whoever is deciding: probe-only does NOT mean the name is undocumented or
// shaky — it means nobody has measured it across a full scan yet.
const VERIFIED_PRODUCTION = 'production';
const VERIFIED_PROBE_ONLY = 'probe-only';

/**
 * `allowed[]` is an array of objects. Every entry is read BY NAME and the
 * original is spread through untouched, because getAiConfig forwards the array
 * without dropping anything — a sixth field can appear, and rebuilding the
 * object from the five we know about today would silently discard it.
 *
 * Order is not part of the contract either, so nothing downstream indexes into
 * this array; ids are the only handle used.
 */
function normalizeAllowed(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const id = entry.id;
      if (!id) return null;
      return {
        ...entry,
        id: String(id),
        label: entry.label || String(id),
        note: entry.note || null,
        verified: typeof entry.verified === 'string' ? entry.verified : null,
        thinkingSupported:
          typeof entry.thinkingSupported === 'boolean'
            ? entry.thinkingSupported
            : null,
      };
    })
    .filter(Boolean);
}

/** Milliseconds as an Arabic duration an operator can act on. */
function humanDuration(ms) {
  if (typeof ms !== 'number' || !isFinite(ms) || ms <= 0) return null;
  const s = Math.round(ms / 1000);
  if (s < 1) return 'أقل من ثانية';
  // Seconds up to two minutes: rounding 90s to "دقيقتان" overstates a wait the
  // operator is timing, and rounding it down would understate it.
  if (s < 120) return `${s} ثانية`;
  const m = Math.round(s / 60);
  return `${m} دقائق`;
}

/** Arabic text from a rejected callable, when there is any. */
function serverMessage(e) {
  return typeof e?.message === 'string' && /[؀-ۿ]/.test(e.message)
    ? e.message
    : '';
}

/** The real call. Injectable so the card's rendering can be exercised without a
 *  deployed function — the SDK captures `fetch` at module load, so it cannot be
 *  intercepted from the page afterwards. */
async function callGetAiConfig() {
  const fn = httpsCallable(functions, GET_FN);
  const res = await fn({});
  return res?.data || {};
}

/** Same reasoning as callGetAiConfig. The response has three branches —
 *  changed, same_value, and rejected — and none of them is reachable in a
 *  browser until the function is deployed. */
async function callSetAiModel(deepseekModel) {
  const fn = httpsCallable(functions, SET_FN);
  const res = await fn({ deepseekModel });
  return res?.data || {};
}

export default function AiModelCard({
  loadConfig = callGetAiConfig,
  saveModel = callSetAiModel,
}) {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [allowed, setAllowed] = useState([]);
  const [current, setCurrent] = useState(null);
  const [source, setSource] = useState(null); // 'settings' | 'default'
  const [builtInDefault, setBuiltInDefault] = useState(null);
  const [pricingDocUrl, setPricingDocUrl] = useState('');
  const [pricingFromApi, setPricingFromApi] = useState(false);
  const [cacheTtlMs, setCacheTtlMs] = useState(FALLBACK_TTL_MS);

  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async ({ isRetry = false } = {}) => {
    setLoading(true);
    if (isRetry) setLoadError('');
    try {
      const data = await loadConfig();

      setAllowed(normalizeAllowed(data.allowed));
      setCurrent(data.current ?? null);
      setSource(data.source ?? null);
      setBuiltInDefault(data.builtInDefault ?? null);
      setPricingDocUrl(
        typeof data.pricingDocUrl === 'string' ? data.pricingDocUrl : ''
      );
      setPricingFromApi(data.pricingAvailableFromApi === true);
      setCacheTtlMs(
        typeof data.cacheTtlMs === 'number' && data.cacheTtlMs > 0
          ? data.cacheTtlMs
          : FALLBACK_TTL_MS
      );
      setSelected(data.current ?? null);
      setLoadError('');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[settings] ${GET_FN} failed:`, e);
      // The function ships separately from this page, so "not found" is the
      // expected state before it is deployed — say that rather than blaming
      // the operator's permissions.
      const code = (e?.code || '').replace(/^functions\//, '');
      setLoadError(
        code === 'not-found' || code === 'unimplemented'
          ? `الدالّة ${GET_FN} غير منشورة بعد على الخادم.`
          : code === 'permission-denied'
          ? 'لا تملك صلاحية قراءة إعدادات النموذج.'
          : serverMessage(e) || 'تعذّر تحميل إعدادات النموذج من الخادم.'
      );
    } finally {
      setLoading(false);
    }
  }, [loadConfig]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = !!selected && selected !== current;
  const selectedOption = allowed.find((o) => o.id === selected) || null;
  const ttlLabel = humanDuration(cacheTtlMs);

  const applyChange = async () => {
    if (!selected || !dirty) return;
    setSaving(true);
    try {
      const data = await saveModel(selected);
      setConfirming(false);

      if (data.changed === false) {
        // Nothing moved, so nothing on screen may move either. Adopting the
        // requested id here would paint a switch the server just told us did
        // not happen; only an explicit `current` from the server is trusted.
        if (data.current) {
          setCurrent(data.current);
          setSelected(data.current);
        } else {
          setSelected(current);
        }
        toast.info(
          data.reason === 'same_value'
            ? 'النموذج المختار هو الفعّال أصلاً — لم يتغيّر شيء.'
            : 'لم يُسجَّل أي تغيير.'
        );
        return;
      }

      // The server is authoritative about what the value ended up being —
      // trust its `current` over the id we asked for.
      const landed = data.current ?? selected;
      setCurrent(landed);
      setSelected(landed);
      setSource('settings');

      const took = humanDuration(data.propagationMs) || ttlLabel;
      toast.success(
        `تم التبديل إلى ${selectedOption?.label || landed}` +
          (took ? ` — يسري خلال ${took}` : '')
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[settings] ${SET_FN} failed:`, e);
      const code = (e?.code || '').replace(/^functions\//, '');
      toast.error(
        code === 'not-found' || code === 'unimplemented'
          ? `الدالّة ${SET_FN} غير منشورة بعد على الخادم.`
          : code === 'permission-denied'
          ? 'لا تملك صلاحية تبديل النموذج.'
          : serverMessage(e) ||
            'فشل التبديل — أعد المحاولة، وإن تكرّر أبلغ الدعم.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl bg-nc-card border border-nc-border rounded-2xl p-6 sm:p-7">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-nc-neon/10 border border-nc-neon/30 flex items-center justify-center shrink-0">
          <CpuChipIcon className="w-5 h-5 text-nc-neon" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-nc-text1">
            نموذج التحليل (DeepSeek)
          </h2>
          <p className="text-sm text-nc-text3 mt-1 leading-relaxed">
            النموذج الذي يُحلّل بيانات الفحص ويكتب التقرير. الأسماء المسموحة
            تأتي من الخادم — لا يوجد إدخال حرّ، لأن اسماً خاطئاً لا يظهر خطؤه
            إلا عند أول فحص حقيقي.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-6 text-sm text-nc-text3">
          <Spinner size="sm" />
          جاري تحميل الإعدادات من الخادم...
        </div>
      ) : loadError ? (
        <div className="p-4 rounded-xl bg-nc-grade-c/10 border border-nc-grade-c/40">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon
              className="w-5 h-5 text-nc-grade-c shrink-0 mt-0.5"
              strokeWidth={2}
            />
            <div className="flex-1 text-sm text-nc-text1 leading-relaxed">
              {loadError}
              <div className="text-xs text-nc-text3 mt-1">
                بقيّة الإعدادات في هذه الصفحة تعمل كالمعتاد.
              </div>
            </div>
          </div>
          <button
            onClick={() => load({ isRetry: true })}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nc-surface border border-nc-border text-nc-text2 hover:text-nc-text1 transition text-xs"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" strokeWidth={2} />
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          {/* Current value + where it came from */}
          <div className="mb-4 p-3 rounded-xl bg-nc-surface/60 border border-nc-border flex flex-wrap items-center gap-2 text-xs">
            <span className="text-nc-text3">النموذج الفعّال الآن:</span>
            <span
              dir="ltr"
              className="font-mono font-semibold text-nc-text1 px-2 py-0.5 rounded bg-nc-card"
            >
              {current || '—'}
            </span>
            {source && (
              <span
                className={`px-2 py-0.5 rounded-md border ${
                  source === 'settings'
                    ? 'bg-nc-cyan/10 border-nc-cyan/30 text-nc-cyan'
                    : 'bg-nc-surface border-nc-border text-nc-text3'
                }`}
              >
                {source === 'settings'
                  ? 'مضبوط يدوياً من الإعدادات'
                  : 'القيمة الافتراضية للخادم'}
              </span>
            )}
          </div>

          {/* Options — cards, not a <select>, so each keeps whatever note and
              verification state the server sent for it. */}
          <div
            role="radiogroup"
            aria-label="نموذج التحليل"
            className="flex flex-col gap-2.5"
          >
            {allowed.length === 0 && (
              <div className="text-sm text-nc-text3 py-2">
                لم يُرجع الخادم أي اسم مسموح.
              </div>
            )}

            {allowed.map((opt) => {
              const active = selected === opt.id;
              const isCurrent = current === opt.id;
              const isDefault = builtInDefault === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(opt.id)}
                  className={`w-full text-start p-4 rounded-xl border-2 transition ${
                    active
                      ? 'bg-nc-neon/10 border-nc-neon'
                      : 'bg-nc-surface border-nc-border hover:border-nc-text3/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          active ? 'border-nc-neon' : 'border-nc-text3/50'
                        }`}
                      >
                        {active && (
                          <span className="w-2 h-2 rounded-full bg-nc-neon" />
                        )}
                      </span>
                      <span className="font-semibold text-nc-text1 truncate">
                        {opt.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-nc-green/10 border border-nc-green/30 text-nc-green font-semibold">
                          فعّال
                        </span>
                      )}
                      {isDefault && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-md bg-nc-surface border border-nc-border text-nc-text3 font-semibold"
                          title="القيمة التي يعود إليها الخادم في غياب إعداد"
                        >
                          الافتراضي
                        </span>
                      )}
                      {opt.verified === VERIFIED_PRODUCTION && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-nc-cyan/10 border border-nc-cyan/30 text-nc-cyan font-semibold"
                          title="مُقاس على فحوصات كاملة — معتمد للإنتاج"
                        >
                          <ShieldCheckIcon className="w-3 h-3" strokeWidth={2} />
                          معتمد للإنتاج
                        </span>
                      )}
                      {opt.verified === VERIFIED_PROBE_ONLY && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-nc-grade-c/10 border border-nc-grade-c/40 text-nc-grade-c font-semibold"
                          title="جُرِّب باستدعاء استطلاعي فقط — لم يُقَس على فحص كامل. الاسم صالح؛ غير المعروف هو سلوكه عبر فحص كامل."
                        >
                          <BeakerIcon className="w-3 h-3" strokeWidth={2} />
                          لم يُقَس على فحص كامل
                        </span>
                      )}
                      {opt.thinkingSupported === false && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-nc-grade-d/10 border border-nc-grade-d/40 text-nc-grade-d font-semibold"
                          title="لا يدعم التفكير العميق — والكود يرسل reasoning_effort=high، فيتجاهله النموذج بصمت"
                        >
                          <NoSymbolIcon className="w-3 h-3" strokeWidth={2} />
                          بلا تفكير عميق
                        </span>
                      )}
                    </div>
                  </div>

                  {opt.label !== opt.id && (
                    <div
                      dir="ltr"
                      className="mt-1.5 ms-6 font-mono text-[11px] text-nc-text3 truncate"
                    >
                      {opt.id}
                    </div>
                  )}

                  {/* Server-supplied note, verbatim. */}
                  {opt.note && (
                    <p className="report-prose mt-2 ms-6 text-xs text-nc-text2 leading-relaxed">
                      {opt.note}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Pricing. The server tells us whether prices are machine-readable;
              while they are not, a link is the only honest option — a hardcoded
              table would go stale silently. */}
          {pricingDocUrl && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={pricingDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-nc-cyan hover:underline"
              >
                <ArrowTopRightOnSquareIcon
                  className="w-3.5 h-3.5"
                  strokeWidth={2}
                />
                أسعار النماذج عند المزوّد
              </a>
              {!pricingFromApi && (
                <span className="inline-flex items-center gap-1 text-[10px] text-nc-text3">
                  <InformationCircleIcon className="w-3 h-3" strokeWidth={2} />
                  المزوّد لا يوفّر الأسعار برمجياً
                </span>
              )}
            </div>
          )}

          {/* Apply */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <button
              onClick={() => setConfirming(true)}
              disabled={!dirty || saving}
              className="px-6 py-3 rounded-xl nc-gradient-bg text-nc-bg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
            >
              <CheckIcon className="w-4 h-4" strokeWidth={2.2} />
              تطبيق التبديل
            </button>
            {dirty && <span className="text-xs text-nc-grade-c">• لم يُحفظ بعد</span>}
            {!dirty && current && <span className="text-xs text-nc-green">✓ متزامن</span>}
          </div>
        </>
      )}

      {/* Unlike the other settings cards this one names a function, not a
          document — the site does not write the AI config itself. */}
      <div className="mt-5 pt-5 border-t border-nc-border text-xs text-nc-text3 leading-relaxed">
        <span className="font-semibold text-nc-text2">مسار الكتابة:</span>{' '}
        <span className="font-mono">{SET_FN}()</span> — الخادم يتحقّق من الاسم
        ويكتب <span className="font-mono">settings/ai</span> ويسجّل التبديل.
        الموقع لا يكتب هذا المستند مباشرةً.
      </div>

      {confirming && (
        <Modal
          open
          onClose={saving ? undefined : () => setConfirming(false)}
          title="تأكيد تبديل النموذج"
          footer={
            <>
              <button
                onClick={() => setConfirming(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-nc-border text-nc-text2 hover:text-nc-text1 transition text-sm disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={applyChange}
                disabled={saving}
                className="px-5 py-2 rounded-lg nc-gradient-bg text-nc-bg font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                {saving && <Spinner size="sm" />}
                تأكيد التبديل
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-nc-text2 leading-relaxed">
              سيتحوّل تحليل الفحوصات من{' '}
              <span dir="ltr" className="font-mono text-nc-text1">
                {current || '—'}
              </span>{' '}
              إلى{' '}
              <span dir="ltr" className="font-mono text-nc-text1">
                {selected}
              </span>
              .
            </p>

            <div className="p-3 rounded-lg bg-nc-surface border border-nc-border text-xs text-nc-text2 leading-relaxed">
              التبديل يسري خلال{' '}
              <span className="font-semibold text-nc-text1">
                {ttlLabel || 'مدّة قصيرة'}
              </span>{' '}
              — الخادم يحتفظ بالقيمة السابقة في الذاكرة حتى تنتهي هذه المدّة،
              فالفحوصات التي تبدأ الآن قد تستخدم النموذج القديم.
            </div>

            <div className="p-3 rounded-lg bg-nc-grade-c/10 border border-nc-grade-c/40">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon
                  className="w-4 h-4 text-nc-grade-c shrink-0 mt-0.5"
                  strokeWidth={2}
                />
                <p className="text-xs text-nc-text1 leading-relaxed">
                  التقارير الصادرة بعد التبديل قد تختلف عن السابقة لنفس الجهاز —
                  في الدرجة والصياغة معاً. هذا متوقّع: نموذج مختلف يقرأ البيانات
                  نفسها بحكم مختلف.
                </p>
              </div>
            </div>

            {selectedOption?.verified === VERIFIED_PROBE_ONLY && (
              <div className="p-3 rounded-lg bg-nc-grade-c/10 border border-nc-grade-c/40 text-xs text-nc-text1 leading-relaxed">
                هذا النموذج{' '}
                <span className="font-semibold">لم يُقَس على فحص كامل</span> —
                جُرِّب باستدعاء استطلاعي فقط. الاسم صالح ومقبول من المزوّد؛
                المجهول هو سلوكه عبر فحص كامل: جودة التقرير وزمنه وكلفته.
              </div>
            )}

            {selectedOption?.thinkingSupported === false && (
              <div className="p-3 rounded-lg bg-nc-grade-d/10 border border-nc-grade-d/40">
                <div className="flex items-start gap-2">
                  <NoSymbolIcon
                    className="w-4 h-4 text-nc-grade-d shrink-0 mt-0.5"
                    strokeWidth={2}
                  />
                  <p className="text-xs text-nc-text1 leading-relaxed">
                    هذا النموذج{' '}
                    <span className="font-semibold">لا يدعم التفكير العميق</span>،
                    والكود يرسل{' '}
                    <span dir="ltr" className="font-mono">
                      reasoning_effort=high
                    </span>{' '}
                    مع كل فحص. لن يظهر خطأ — سيتجاهله النموذج بصمت ويتحلّل
                    التحليل إلى سلوك آخر دون أن يُبلغك أحد.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
