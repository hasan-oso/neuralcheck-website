'use client';

// W-P6-20 — the marketing-name map page: reads getMarketingNames, writes an
// update-or-append patch through setMarketingNames, shows the numbered version.
//
// Spec: PLAN-06 §١٥-أ-١ (P6:1527-1536: «مصدر واحد في الخادم بالعربية والتركية
// والإنجليزية، من بيانات يحرّرها المشرف»; the row P6-20, P6:1061) and the
// server's A12 (neuralcheck-backend@5361116; evidence/run-2026-10-18/protocol-
// contract-A8-A11-A12-neuralcheck-backend-5361116.md:83-97). What this page
// keeps to:
//
//   - the page goes through the two functions, never through Firestore (P6:765;
//     no setDoc/updateDoc/deleteDoc here — lib/protocolAdminCalls.js is the only
//     door);
//   - NO ENTRY of the map is written in this repo or its tests except obvious
//     fakes: the admin types them (A12 «معلّق» 1: P6:1529 and :1533 carry no
//     entries). The input boxes carry no placeholder that looks like a model or
//     a name;
//   - an absence is shown as an absence (rule 22): the map that is not written
//     yet is `ABSENT` with no entry (the server says «الخريطة تبدأ غائبة»); a
//     stored document the server cannot read is shown with the anomaly it names
//     and the page does not save over it (the server refuses:
//     MARKETING_NAMES_CURRENT_UNREADABLE); a reply this page cannot read is not
//     drawn;
//   - the patch is update-or-append keyed by the model, literally, with the four
//     keys required in every entry, no delete and no reordering (A12 (2)); the
//     page sends only the entries the admin changed or added
//     (lib/marketingNamesPatch.js). A saved entry's model is its key: read only,
//     never removable. Only a row that is not saved yet can be taken back;
//   - the limits are the server's and are shown as sent (A10 (3): «الواجهة لا
//     تكرّرها»), not repeated in this file;
//   - after every write the page reads the server again; what it shows is what
//     the server holds, not what it asked for.
//
// Hook order is part of the test's contract (marketingNamesPanel.test.cjs reads
// the declared order from this file).

import { useCallback, useEffect, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

import { useToast } from '@/components/admin/Toast';
import { PageSpinner } from '@/components/admin/Spinner';
import ProtocolTabs from '@/components/admin/protocol/ProtocolTabs';
import CallFailure, { toFailure, replyFailure } from '@/components/admin/protocol/CallFailure';
import { ADMIN_PROTOCOL_TEXTS as T, MARKETING_PROBLEM_TEXT_KEY } from '@/lib/adminProtocolTexts';
import { formatDate } from '@/lib/admin';
import { MARKETING_LIMIT_KEYS } from '@/lib/marketingNamesWire';
import {
  MARKETING_VIEW,
  LIMIT_STATE,
  KNOWN_MARKETING_REFUSALS,
  readMarketingNames,
  readSetMarketingNamesResult,
} from '@/lib/marketingNamesReaders';
import {
  buildMarketingPatch,
  initialMarketingRows,
  newMarketingRow,
} from '@/lib/marketingNamesPatch';
import { callGetMarketingNames, callSetMarketingNames } from '@/lib/protocolAdminCalls';

const CELL_CLS =
  'px-3 py-2 rounded-lg bg-nc-surface border border-nc-border text-nc-text1 text-sm w-full min-w-0';

/** The line that says what state the map is in. */
export function MarketingStateBanner({ read }) {
  const lines = [];
  if (read.view === MARKETING_VIEW.PRESENT) {
    lines.push(
      <div key="v" className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          {T.versionLabel}:{' '}
          <span dir="ltr" className="font-mono font-semibold">{read.version}</span>
        </span>
        <span>
          {T.updatedAtLabel}:{' '}
          <span dir="ltr">{read.updatedAtMs === null ? '—' : formatDate(read.updatedAtMs)}</span>
        </span>
        <span>
          {T.updatedByLabel}:{' '}
          <span dir="ltr" className="font-mono text-xs break-all">{read.updatedBy === null ? '—' : read.updatedBy}</span>
        </span>
        <span>{T.marketingEntriesCount(read.entries.length)}</span>
      </div>
    );
  } else if (read.view === MARKETING_VIEW.ABSENT) {
    lines.push(
      <div key="a" className="leading-relaxed">
        <span dir="ltr" className="font-mono text-xs">{read.state}</span>{' '}
        <span className="font-semibold">{T.marketingAbsent}</span>
      </div>
    );
  } else if (read.view === MARKETING_VIEW.STORED_UNREADABLE) {
    lines.push(
      <div key="u" className="leading-relaxed">
        <span dir="ltr" className="font-mono text-xs">{read.state}</span>{' '}
        {read.anomaly !== null && (
          <span dir="ltr" className="font-mono text-xs">{read.anomaly}</span>
        )}{' '}
        {T.marketingStoredUnreadable}
      </div>
    );
  } else {
    lines.push(
      <div key="r" className="leading-relaxed">{T.replyUnreadable}</div>
    );
  }
  return (
    <div
      role="status"
      className={`p-4 rounded-xl border text-sm text-nc-text1 space-y-2 ${
        read.view === MARKETING_VIEW.PRESENT
          ? 'bg-nc-surface/60 border-nc-border'
          : 'bg-nc-grade-c/10 border-nc-grade-c/40'
      }`}
    >
      {lines}
      {read.problems.length > 0 && (
        <div dir="ltr" className="font-mono text-[11px] text-nc-text3 break-all">
          {read.problems.join(' · ')}
        </div>
      )}
    </div>
  );
}

/** The limits as the server sent them: each of the three in its own state. */
function LimitsCard({ limits }) {
  return (
    <div className="max-w-3xl bg-nc-card border border-nc-border rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-nc-text2 mb-3">{T.limitsTitle}</h2>
      {limits.state === LIMIT_STATE.ABSENT && <p className="text-xs text-nc-text3">{T.limitsAbsent}</p>}
      {limits.state === LIMIT_STATE.MALFORMED && (
        <pre dir="ltr" className="text-xs font-mono text-nc-text2 whitespace-pre-wrap break-all">
          {JSON.stringify(limits.raw)}
        </pre>
      )}
      {limits.state === LIMIT_STATE.PRESENT && (
        <dl dir="ltr" className="text-xs font-mono text-nc-text2 space-y-1">
          {MARKETING_LIMIT_KEYS.map((k) => (
            <div key={k} className="flex gap-3">
              <dt className="text-nc-text3">{k}</dt>
              <dd>
                {limits[k].state === LIMIT_STATE.PRESENT && limits[k].value}
                {limits[k].state === LIMIT_STATE.ABSENT && (
                  <span className="font-sans text-nc-text3">{T.limitsAbsent}</span>
                )}
                {limits[k].state === LIMIT_STATE.MALFORMED && JSON.stringify(limits[k].raw)}
              </dd>
            </div>
          ))}
          {limits.unknownKeys.length > 0 && (
            <div className="text-nc-text3 break-all">{limits.unknownKeys.join(' · ')}</div>
          )}
        </dl>
      )}
    </div>
  );
}

function MarketingRow({ row, problem, onChange, onRemove }) {
  return (
    <div>
      <div className="grid grid-cols-[1.3fr_1.2fr_1.2fr_1.2fr_auto] gap-2 items-center">
        <input
          type="text"
          dir="ltr"
          value={row.model}
          readOnly={row.saved}
          aria-label={T.marketingColModel}
          onChange={(e) => onChange('model', e.target.value)}
          className={`${CELL_CLS} font-mono ${row.saved ? 'opacity-70' : ''}`}
        />
        <input
          type="text"
          value={row.ar}
          aria-label={T.marketingColAr}
          onChange={(e) => onChange('ar', e.target.value)}
          className={CELL_CLS}
        />
        <input
          type="text"
          dir="ltr"
          value={row.tr}
          aria-label={T.marketingColTr}
          onChange={(e) => onChange('tr', e.target.value)}
          className={CELL_CLS}
        />
        <input
          type="text"
          dir="ltr"
          value={row.en}
          aria-label={T.marketingColEn}
          onChange={(e) => onChange('en', e.target.value)}
          className={CELL_CLS}
        />
        {row.saved ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={onRemove}
            className="px-2 text-nc-text3 hover:text-nc-grade-d"
          >
            ✕
          </button>
        )}
      </div>
      {problem && <p className="mt-1 text-[12px] text-nc-grade-d">{T[MARKETING_PROBLEM_TEXT_KEY[problem]]}</p>}
    </div>
  );
}

export default function MarketingNamesPanel({
  loadNames = callGetMarketingNames,
  saveNames = callSetMarketingNames,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState(null);
  const [read, setRead] = useState(null);
  const [rows, setRows] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveFailure, setSaveFailure] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadNames();
      const r = readMarketingNames(data);
      setRead(r);
      setRows(initialMarketingRows(r));
      setLoadFailure(null);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[protocol] getMarketingNames failed:', e);
      setLoadFailure(toFailure(e, KNOWN_MARKETING_REFUSALS));
    } finally {
      setLoading(false);
    }
  }, [loadNames]);

  useEffect(() => {
    load();
  }, [load]);

  const setRowField = (index, key, value) =>
    setRows((rs) =>
      rs.map((r, i) => (i === index && !(r.saved && key === 'model') ? { ...r, [key]: value } : r))
    );
  const addRow = () => setRows((rs) => [...rs, newMarketingRow()]);
  const removeRow = (index) =>
    // Only a row that is not saved yet can be taken back: a saved entry is never removed.
    setRows((rs) => rs.filter((r, i) => !(i === index && !r.saved)));

  const onSave = async () => {
    if (!read || !rows) return;
    const { entries, problems } = buildMarketingPatch(read, rows);
    if (problems.length > 0 || entries.length === 0) return;
    setSaving(true);
    setSaveFailure(null);
    try {
      const reply = readSetMarketingNamesResult(await saveNames(entries));
      if (reply.ok) {
        toast.success(
          reply.changed ? T.marketingSaved(reply.version, reply.added, reply.updated) : T.savedNoChange
        );
      } else {
        // The call went through and its reply cannot be read: say so, and read
        // the server again to see what it holds.
        setSaveFailure(replyFailure(reply.problems));
      }
      await load();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[protocol] setMarketingNames failed:', e);
      setSaveFailure(toFailure(e, KNOWN_MARKETING_REFUSALS));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !read) return <PageSpinner />;

  const built = read && rows ? buildMarketingPatch(read, rows) : null;
  const problemOf = (index) => {
    const hit = built ? built.problems.find((p) => p.row === index) : null;
    return hit ? hit.problem : null;
  };
  const editable =
    !!read && (read.view === MARKETING_VIEW.PRESENT || read.view === MARKETING_VIEW.ABSENT);
  const dirty = !!built && built.entries.length > 0;
  const canSave = editable && !saving && !!built && built.problems.length === 0 && dirty;

  return (
    <div className="space-y-6">
      <ProtocolTabs />
      <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1">{T.marketingTitle}</h1>

      {loadFailure && <CallFailure failure={loadFailure} onRetry={load} />}

      {read && rows && (
        <>
          <MarketingStateBanner read={read} />

          {editable && (
            <div className="max-w-4xl bg-nc-card border border-nc-border rounded-2xl p-6 sm:p-7 space-y-4">
              <p className="text-xs text-nc-text3 leading-relaxed">{T.marketingModelHint}</p>
              {rows.length > 0 && (
                <div className="grid grid-cols-[1.3fr_1.2fr_1.2fr_1.2fr_auto] gap-2 text-[11px] text-nc-text3">
                  <span>{T.marketingColModel}</span>
                  <span>{T.marketingColAr}</span>
                  <span>{T.marketingColTr}</span>
                  <span>{T.marketingColEn}</span>
                  <span />
                </div>
              )}
              {rows.length === 0 && <p className="text-sm text-nc-text3">{T.marketingNoEntries}</p>}
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <MarketingRow
                    key={i}
                    row={row}
                    problem={problemOf(i)}
                    onChange={(key, value) => setRowField(i, key, value)}
                    onRemove={() => removeRow(i)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={addRow}
                className="px-3 py-1.5 rounded-lg bg-nc-surface border border-nc-border text-nc-text2 hover:text-nc-text1 transition text-xs"
              >
                {T.marketingAddRow}
              </button>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center pt-2">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!canSave}
                  className="px-6 py-3 rounded-xl nc-gradient-bg text-nc-bg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
                >
                  <CheckIcon className="w-4 h-4" strokeWidth={2.2} />
                  {saving ? T.saving : T.save}
                </button>
                {dirty && <span className="text-xs text-nc-grade-c">{T.unsaved}</span>}
                {!dirty && built && built.problems.length === 0 && (
                  <span className="text-xs text-nc-text3">{T.nothingToSave}</span>
                )}
              </div>

              {saveFailure && <CallFailure failure={saveFailure} />}
            </div>
          )}

          <LimitsCard limits={read.limits} />
        </>
      )}
    </div>
  );
}
