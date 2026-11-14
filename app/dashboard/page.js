'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLang } from '@/lib/LanguageContext';
import { formatDateLatin, toLatinDigits } from '@/lib/format';
import { auth, db } from '@/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import GradeBadge from '@/components/GradeBadge';
import V7Notices from '@/components/verify/V7Notices';
import { classifyPipeline, PipelineKind } from '@/lib/pipelineTags';
import {
  pickGrade,
  resolveShortId,
  pickDeviceName,
} from '@/lib/reportReaders/v6';
import { readOverall } from '@/lib/reportReaders/v7';
import {
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  TagIcon,
  PencilSquareIcon,
  CheckIcon,
  EyeSlashIcon,
  ShoppingBagIcon,
  ArrowUpRightIcon,
} from '@heroicons/react/24/outline';

const PRO_PLANS = new Set(['pro', 'shop_pro', 'shopPro']);
const CURRENCIES = ['USD', 'SYP', 'TRY'];
const LISTING_STATUSES = ['for_sale', 'sold', 'hidden'];

function tsToDate(v) {
  if (!v) return null;
  if (typeof v === 'object' && typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'object' && v.seconds) return new Date(v.seconds * 1000);
  if (typeof v === 'object' && v._seconds) return new Date(v._seconds * 1000);
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// Device model + short id were duplicated here as local copies of
// lib/reportReaders/v6.js's pickDeviceName/resolveShortId — the exact A102
// shape this task exists to remove. The local pickDeviceModel never checked
// `deviceMarketingName`, so a V7 report (which carries only that field, not
// deviceModel/device/model/brand) rendered "—" for the device name. Switched
// to the shared readers below; see reportReaders/v6.js's doc comment for why
// these two are safe to call on either pipeline.

export default function DashboardPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace('/login');
        return;
      }
      setUser(u);
      try {
        const profileDoc = await getDoc(doc(db, 'users', u.uid));
        if (profileDoc.exists()) {
          setProfile({ id: profileDoc.id, ...profileDoc.data() });
        } else {
          setProfile({ id: u.uid });
        }
        try {
          const q = query(
            collection(db, 'reports'),
            where('userId', '==', u.uid),
            orderBy('createdAt', 'desc'),
            limit(50)
          );
          const snap = await getDocs(q);
          setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[dashboard] reports fetch failed:', e);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleSaveListing = async (reportId, fields) => {
    await updateDoc(doc(db, 'reports', reportId), fields);
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, ...fields } : r))
    );
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-2 border-nc-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const expiresDate =
    tsToDate(profile?.expiresAt) || tsToDate(profile?.expiryDate);
  const isPro = PRO_PLANS.has((profile?.plan || '').toLowerCase());
  const shopSlug = profile?.shopSlug || null;
  const shopUrl = shopSlug ? `/shop/${shopSlug}/` : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1">
            {user?.displayName ||
              profile?.shopName ||
              user?.email?.split('@')[0]}
          </h1>
          <p className="text-nc-text2 text-sm mt-1">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-lg border border-nc-border text-nc-text2 hover:border-nc-grade-d hover:text-nc-grade-d transition text-sm"
        >
          {t.dashboard.logout}
        </button>
      </div>

      {/* Plan stats */}
      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <StatCard label={t.dashboard.plan}>
          <span className="text-2xl font-outfit font-bold nc-gradient-text">
            {profile?.plan || profile?.tier || 'Free'}
          </span>
        </StatCard>
        <StatCard label={t.dashboard.remaining}>
          <div className="flex items-baseline gap-2">
            <span
              dir="ltr"
              className="text-3xl font-outfit font-bold text-nc-text1 tabular-nums"
            >
              {toLatinDigits(profile?.scansRemaining ?? profile?.credits ?? 0)}
            </span>
            <span className="text-xs text-nc-text3">{t.dashboard.scans}</span>
          </div>
        </StatCard>
        <StatCard label={t.dashboard.expires}>
          <span
            dir="ltr"
            className="text-lg font-semibold text-nc-text1"
          >
            {expiresDate ? formatDateLatin(expiresDate, lang) : '—'}
          </span>
        </StatCard>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={() => router.push('/#pricing')}
          className="px-6 py-3 rounded-xl nc-gradient-bg text-nc-bg font-semibold"
        >
          {t.dashboard.upgrade}
        </button>
        {isPro && shopUrl && (
          <Link
            href={shopUrl}
            className="px-6 py-3 rounded-xl bg-nc-card border border-nc-border text-nc-text1 hover:border-nc-cyan/50 hover:bg-nc-surface transition flex items-center gap-2"
          >
            <ShoppingBagIcon className="w-4 h-4" strokeWidth={1.8} />
            {t.dashboard.visitShop}
            <ArrowUpRightIcon className="w-3.5 h-3.5" strokeWidth={2} />
          </Link>
        )}
      </div>

      {/* Public shop link */}
      {isPro && shopUrl && (
        <PublicShopLinkCard slug={shopSlug} t={t} />
      )}

      {/* Listing manager — Pro only */}
      <div className="mt-12">
        <h2 className="text-xl font-outfit font-semibold text-nc-text1 mb-4">
          {t.dashboard.myDevices}
        </h2>

        {!isPro ? (
          <ShopProGate t={t} />
        ) : reports.length === 0 ? (
          <EmptyDevices t={t} />
        ) : (
          <div className="grid gap-4">
            {reports.map((r) => (
              <ListingEditorCard
                key={r.id}
                report={r}
                t={t}
                lang={lang}
                onSave={handleSaveListing}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- subcomponents ----------

function StatCard({ label, children }) {
  return (
    <div className="p-6 rounded-2xl bg-nc-card border border-nc-border">
      <div className="text-xs text-nc-text3 uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function PublicShopLinkCard({ slug, t }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/shop/${slug}/`
    : `/shop/${slug}/`;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <div className="mt-6 p-5 rounded-2xl bg-nc-card border border-nc-cyan/30 nc-glow flex items-center gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-nc-text3 uppercase tracking-wider">
          {t.dashboard.publicShopLink}
        </div>
        <div className="mt-1 font-mono text-sm text-nc-text2 truncate">
          {url}
        </div>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 px-4 py-2 rounded-lg bg-nc-surface border border-nc-border hover:border-nc-cyan/50 hover:text-nc-cyan transition text-sm flex items-center gap-2"
      >
        {copied ? (
          <>
            <CheckCircleIcon className="w-4 h-4 text-nc-green" strokeWidth={2} />
            <span className="text-nc-green">{t.dashboard.copied}</span>
          </>
        ) : (
          <>
            <ClipboardDocumentIcon className="w-4 h-4" strokeWidth={1.8} />
            {t.dashboard.copyLink}
          </>
        )}
      </button>
      <Link
        href={`/shop/${slug}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 px-4 py-2 rounded-lg nc-gradient-bg text-nc-bg font-semibold text-sm flex items-center gap-2"
      >
        <ArrowTopRightOnSquareIcon className="w-4 h-4" strokeWidth={2} />
        {t.dashboard.visitShop}
      </Link>
    </div>
  );
}

function ShopProGate({ t }) {
  return (
    <div className="p-8 sm:p-10 rounded-2xl bg-nc-card border border-nc-border text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-nc-cyan/10 border border-nc-cyan/30 mb-4">
        <ShoppingBagIcon className="w-7 h-7 text-nc-cyan" strokeWidth={1.6} />
      </div>
      <p className="text-nc-text2 leading-relaxed max-w-md mx-auto">
        {t.dashboard.shopProOnly}
      </p>
      <Link
        href="/#pricing"
        className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl nc-gradient-bg text-nc-bg font-semibold"
      >
        {t.dashboard.upgradeToPro}
      </Link>
    </div>
  );
}

function EmptyDevices({ t }) {
  return (
    <div className="p-10 text-center bg-nc-card border border-nc-border rounded-2xl">
      <p className="text-nc-text2">{t.dashboard.empty}</p>
      <p className="mt-2 text-xs text-nc-text3">{t.dashboard.emptyHint}</p>
    </div>
  );
}

// Normalize a report's persisted fields into a comparable shape.
// Used for both the initial form state AND the pristine snapshot.
function snapshotFromReport(r) {
  return {
    price: r.price !== undefined && r.price !== null ? String(r.price) : '',
    currency: r.currency || 'USD',
    sellerNote: r.sellerNote || '',
    listingStatus: r.listingStatus || 'for_sale',
  };
}

// Exported (not just used locally) so scripts/test/v7NoticesWiring.test.cjs
// can render the REAL card component directly with a real fixture — the
// convention this repo's tests already use (rule 30), rather than a
// reimplementation. Purely additive: nothing else imports this from outside
// this file today.
export function ListingEditorCard({ report, t, lang, onSave }) {
  // Single source of truth for editable fields.
  const [values, setValues] = useState(() => snapshotFromReport(report));
  // Snapshot of the LAST SAVED state. Compared against `values` to detect
  // whether the user has any unsaved changes (`dirty`). Updated in handleSave
  // after a successful write.
  const [pristine, setPristine] = useState(() => snapshotFromReport(report));
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'

  const setField = (key, val) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const dirty =
    values.price !== pristine.price ||
    values.currency !== pristine.currency ||
    values.sellerNote !== pristine.sellerNote ||
    values.listingStatus !== pristine.listingStatus;

  // Pipeline read first, then the matching reader — never a fallback chain
  // that tries both shapes (see lib/reportReaders/{v6,v7}.js doc comments).
  const pipeline = classifyPipeline(report);
  const isV7 = pipeline.kind === PipelineKind.V7;
  if (pipeline.kind === PipelineKind.UNKNOWN_TAG) {
    // eslint-disable-next-line no-console
    console.warn('[dashboard] unrecognized pipeline tag — using the V6 reader as a best effort', pipeline.tag);
  }
  // Letter grade unifies across pipelines (V6's `grade`, V7's
  // `overall.letter`). The numeric score does NOT — V7 has no per-report
  // numeric score at all, so it is left null rather than substituting
  // `overall.coverage` (a different concept — see readOverall's doc comment
  // in lib/reportReaders/v7.js). GradeBadge renders '—' for a null grade
  // (changed from '?' — see components/GradeBadge.js, Honor sample task,
  // 2026-09-24), and the score span below is already conditioned on
  // `!== null`, so a V7 card simply omits the score rather than showing a
  // wrong number.
  // decision 82 §2: /dashboard shows the state and its reason with the same
  // component /verify uses (V7Notices) — not just a bare grade badge. Reads
  // `overall` once and shares it between the grade and the notice, rather
  // than calling readOverall(report) twice.
  const overall = isV7 ? readOverall(report) : null;
  const grade = isV7 ? overall.letter : pickGrade(report);
  // Numeric score never reaches this card at all any more: V7 has none (see
  // readOverall's doc comment in lib/reportReaders/v7.js), and V6's is
  // hidden from the buyer/owner by decision (decision 6). The score DOM
  // block itself is removed outright, not merely fed `null` — item 6(b) of
  // the fourth addendum to decision 102 (2026-09-26) needed no bare "score"
  // token left in this file's rendered JSX, so the guard extended in that
  // commit could ban the word structurally rather than special-case a
  // guarded-but-dead branch. pickScore is not called here.
  const model = pickDeviceName(report);
  const dateLabel = formatDateLatin(
    report.createdAt || report.scannedAt,
    lang
  );
  const shortId = resolveShortId(report, report.id);

  const handleSave = async () => {
    if (!dirty) return; // safety: button is disabled, but guard anyway
    setSaveState('saving');
    try {
      const priceNum = values.price === '' ? null : Number(values.price);
      if (values.price !== '' && (isNaN(priceNum) || priceNum < 0)) {
        setSaveState('error');
        return;
      }
      const trimmedNote = values.sellerNote.trim();
      const fields = {
        price: priceNum,
        currency: priceNum !== null ? values.currency : null,
        sellerNote: trimmedNote || null,
        listingStatus: values.listingStatus,
      };

      // Debug log (remove after verifying writes land in Firestore).
      // eslint-disable-next-line no-console
      console.log('[dashboard] saving listing fields for', report.id, fields);

      await onSave(report.id, fields);

      // Snapshot the now-saved state. Note we also normalize the local
      // `values` so trimmed sellerNote etc. don't leave the form dirty.
      const saved = {
        price: priceNum === null ? '' : String(priceNum),
        currency: values.currency,
        sellerNote: trimmedNote,
        listingStatus: values.listingStatus,
      };
      setValues(saved);
      setPristine(saved);

      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1800);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[dashboard] save listing failed:', e);
      setSaveState('error');
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-nc-card border border-nc-border">
      {/* Device header */}
      <div className="flex items-start gap-4 flex-wrap">
        <GradeBadge grade={grade} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h3 className="text-lg font-semibold text-nc-text1 truncate">
              {model}
            </h3>
          </div>
          <div className="mt-1 text-xs text-nc-text3 flex items-center gap-3 flex-wrap">
            <span dir="ltr">{dateLabel}</span>
            <span dir="ltr" className="font-mono">
              {shortId}
            </span>
          </div>
        </div>
        <ListingStatusBadge status={values.listingStatus} t={t} />
      </div>

      {/* decision 82 §2 — same V7Notices component /verify uses: the state
          and its reason (e.g. a harness-error explanation) when the grade
          alone (above) doesn't say why it's "—". Renders nothing when
          `overall` has nothing to show (see V7Notices' own null-guard). */}
      {overall && (
        <div className="mt-3">
          <V7Notices overall={overall} t={t} />
        </div>
      )}

      {/* Editor grid */}
      <div className="mt-5 grid md:grid-cols-2 gap-4">
        {/* Price + Currency */}
        <div>
          <Label icon={TagIcon} text={t.dashboard.price} />
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={values.price}
              onChange={(e) => setField('price', e.target.value)}
              placeholder={t.dashboard.pricePlaceholder}
              className="flex-1 px-3 py-2.5 rounded-lg bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green focus:ring-2 focus:ring-nc-green/20 transition text-sm"
            />
            <select
              value={values.currency}
              onChange={(e) => setField('currency', e.target.value)}
              className="w-24 px-2 py-2.5 rounded-lg bg-nc-surface border border-nc-border text-nc-text1 focus:outline-none focus:border-nc-green focus:ring-2 focus:ring-nc-green/20 transition text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'USD'
                    ? t.dashboard.currencyUSD + ' USD'
                    : c === 'SYP'
                    ? t.dashboard.currencySYP + ' SYP'
                    : t.dashboard.currencyTRY + ' TRY'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status */}
        <div>
          <Label icon={CheckIcon} text={t.dashboard.listingStatus} />
          <div className="flex gap-2 flex-wrap">
            {LISTING_STATUSES.map((s) => (
              <StatusButton
                key={s}
                value={s}
                active={values.listingStatus === s}
                onClick={() => setField('listingStatus', s)}
                t={t}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Seller note */}
      <div className="mt-4">
        <Label icon={PencilSquareIcon} text={t.dashboard.sellerNote} />
        <textarea
          value={values.sellerNote}
          onChange={(e) => setField('sellerNote', e.target.value)}
          placeholder={t.dashboard.sellerNotePlaceholder}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green focus:ring-2 focus:ring-nc-green/20 transition text-sm resize-y leading-relaxed"
        />
      </div>

      {/* Save row */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saveState === 'saving' || !dirty}
          className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${
            saveState === 'saving' || !dirty
              ? 'bg-nc-surface text-nc-text3 border border-nc-border cursor-not-allowed'
              : 'nc-gradient-bg text-nc-bg hover:brightness-110'
          }`}
        >
          {saveState === 'saving' ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-current/60 border-t-transparent rounded-full animate-spin" />
              {t.dashboard.saving}
            </>
          ) : (
            <>
              <CheckIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
              {t.dashboard.saveListing}
            </>
          )}
        </button>
        {saveState === 'saved' && (
          <span className="text-sm text-nc-green font-medium animate-fade-slide-up">
            {t.dashboard.saved}
          </span>
        )}
        {saveState === 'error' && (
          <span className="text-sm text-nc-grade-d font-medium">
            {t.dashboard.saveError}
          </span>
        )}
      </div>
    </div>
  );
}

function Label({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 text-xs text-nc-text3 uppercase tracking-wider">
      {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />}
      <span>{text}</span>
    </div>
  );
}

function StatusButton({ value, active, onClick, t }) {
  const config = {
    for_sale: {
      label: t.dashboard.forSale,
      activeCls: 'bg-nc-green/15 border-nc-green/50 text-nc-green',
      Icon: CheckIcon,
    },
    sold: {
      label: t.dashboard.sold,
      activeCls: 'bg-nc-text3/15 border-nc-text3/40 text-nc-text2',
      Icon: ShoppingBagIcon,
    },
    hidden: {
      label: t.dashboard.hidden,
      activeCls: 'bg-nc-grade-d/15 border-nc-grade-d/40 text-nc-grade-d',
      Icon: EyeSlashIcon,
    },
  }[value];

  if (!config) return null;
  const { label, activeCls, Icon } = config;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition ${
        active
          ? activeCls
          : 'bg-nc-surface border-nc-border text-nc-text3 hover:text-nc-text2 hover:border-nc-text3/50'
      }`}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
      {label}
    </button>
  );
}

function ListingStatusBadge({ status, t }) {
  const map = {
    for_sale: {
      label: t.dashboard.forSale,
      cls: 'bg-nc-green/15 text-nc-green border-nc-green/30',
    },
    sold: {
      label: t.dashboard.sold,
      cls: 'bg-nc-text3/15 text-nc-text2 border-nc-text3/30',
    },
    hidden: {
      label: t.dashboard.hidden,
      cls: 'bg-nc-grade-d/15 text-nc-grade-d border-nc-grade-d/30',
    },
  };
  const cfg = map[status] || map.for_sale;
  return (
    <span
      className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wider ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}
