'use client';

// W-P6-14 — the protocol settings page: reads getProtocolSettings, writes a
// PATCH through setProtocolSettings, shows the numbered version.
//
// Spec: PLAN-06 §٦-ب-١ (P6:767-785) and the server's A10 (neuralcheck-backend@
// fd730ac; evidence/run-2026-10-18/protocol-contract-A0-A10-neuralcheck-backend-
// fd730ac.md:264-296). What this page keeps to:
//
//   - the page goes through the two functions, never through Firestore
//     (P6:765; no setDoc/updateDoc/deleteDoc here — lib/protocolAdminCalls.js
//     is the only door);
//   - an absence is shown as an absence (rule 22): the document that is not
//     written yet is SETTINGS_ABSENT, a field that is not in it is «غير مضبوط»
//     — never 0, never the plan's «proposed» values, which are "for display,
//     not for code" (P6:773);
//   - the server is the authority on ranges and sends them as `limits`; they
//     are shown as sent and not repeated in this file (A10 (3));
//   - `symptomChips` and `targets` are not shown and not sent: the design gives
//     them no meaning (P6:783-784);
//   - a saved return-reason key is not editable and not removable («المفتاح لا
//     يُعدَّل بعد استعماله، والإيقاف بدل الحذف.» P6:782);
//   - after every write the page reads the server again; what it shows is
//     what the server holds, not what it asked for.
//
// Hook order is part of the test's contract (adminProtocolPanels.test.cjs reads
// the declared order from this file).

import { useCallback, useEffect, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

import { useToast } from '@/components/admin/Toast';
import { PageSpinner } from '@/components/admin/Spinner';
import ProtocolTabs from '@/components/admin/protocol/ProtocolTabs';
import CallFailure, { toFailure, replyFailure } from '@/components/admin/protocol/CallFailure';
import { ADMIN_PROTOCOL_TEXTS as T, SETTINGS_FIELD_LABEL_KEY } from '@/lib/adminProtocolTexts';
import { formatDate } from '@/lib/admin';
import {
  SETTINGS_FIELDS,
  SETTINGS_FIELD_TYPE,
} from '@/lib/protocolAdminWire';
import {
  SETTINGS_VIEW,
  FIELD_STATE,
  readProtocolSettings,
  readSetSettingsResult,
} from '@/lib/protocolAdminReaders';
import {
  BOOL_CHOICE,
  FORM_PROBLEM,
  buildSettingsPatch,
  initialSettingsForm,
} from '@/lib/protocolAdminPatch';
import { callGetProtocolSettings, callSetProtocolSettings } from '@/lib/protocolAdminCalls';

const INPUT_CLS =
  'w-full sm:max-w-xs px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 font-mono tabular-nums focus:outline-none focus:border-nc-green focus:ring-2 focus:ring-nc-green/20 transition';

/** The line that says what state the settings document is in. */
export function SettingsStateBanner({ read }) {
  const lines = [];
  if (read.view === SETTINGS_VIEW.PRESENT) {
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
      </div>
    );
  } else if (read.view === SETTINGS_VIEW.ABSENT) {
    lines.push(
      <div key="a" className="leading-relaxed">
        <span dir="ltr" className="font-mono text-xs">SETTINGS_ABSENT</span>{' '}
        <span className="font-semibold">{T.settingsAbsent}</span>
        {' — '}
        {T.settingsAbsentEffect}
      </div>
    );
    if (read.anomaly !== null) {
      lines.push(
        <div key="u" className="leading-relaxed">
          <span dir="ltr" className="font-mono text-xs">{read.anomaly}</span>{' '}
          {T.settingsVersionUnusable}
        </div>
      );
    }
  } else {
    lines.push(
      <div key="r" className="leading-relaxed">{T.replyUnreadable}</div>
    );
  }
  return (
    <div
      role="status"
      className={`p-4 rounded-xl border text-sm text-nc-text1 space-y-2 ${
        read.view === SETTINGS_VIEW.PRESENT
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

function FieldHead({ name, field, problem }) {
  const label = T[SETTINGS_FIELD_LABEL_KEY[name]];
  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-semibold text-nc-text1">{label}</span>
        <span dir="ltr" className="font-mono text-[11px] text-nc-text3">{name}</span>
        {field.state === FIELD_STATE.ABSENT && (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-nc-surface border border-nc-border text-nc-text3">
            {T.fieldAbsent}
          </span>
        )}
        {field.state === FIELD_STATE.MALFORMED && (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-nc-grade-c/10 border border-nc-grade-c/40 text-nc-grade-c">
            {T.fieldMalformed}{' '}
            <span dir="ltr" className="font-mono break-all">{JSON.stringify(field.raw)}</span>
          </span>
        )}
        {problem === FORM_PROBLEM.INVALID_NUMBER && (
          <span className="text-[11px] text-nc-grade-d">{T.invalidNumber}</span>
        )}
        {problem === FORM_PROBLEM.CANNOT_CLEAR && (
          <span className="text-[11px] text-nc-grade-d">{T.cannotClear}</span>
        )}
      </div>
    </div>
  );
}

function ReturnReasonsEditor({ rows, onChange, onAdd, onRemove }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-nc-text3 leading-relaxed">{T.returnReasonsRule}</p>
      {rows.length > 0 && (
        <div className="grid grid-cols-[1.2fr_1.5fr_1.5fr_auto_auto] gap-2 text-[11px] text-nc-text3">
          <span>{T.returnReasonKey}</span>
          <span>{T.returnReasonAr}</span>
          <span>{T.returnReasonTr}</span>
          <span>{T.returnReasonActive}</span>
          <span />
        </div>
      )}
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[1.2fr_1.5fr_1.5fr_auto_auto] gap-2 items-center">
          <input
            type="text"
            dir="ltr"
            value={row.key}
            readOnly={row.saved}
            onChange={(e) => onChange(i, 'key', e.target.value)}
            className={`px-3 py-2 rounded-lg bg-nc-surface border border-nc-border text-nc-text1 font-mono text-sm ${
              row.saved ? 'opacity-70' : ''
            }`}
          />
          <input
            type="text"
            value={row.ar}
            onChange={(e) => onChange(i, 'ar', e.target.value)}
            className="px-3 py-2 rounded-lg bg-nc-surface border border-nc-border text-nc-text1 text-sm"
          />
          <input
            type="text"
            dir="ltr"
            value={row.tr}
            onChange={(e) => onChange(i, 'tr', e.target.value)}
            className="px-3 py-2 rounded-lg bg-nc-surface border border-nc-border text-nc-text1 text-sm"
          />
          <input
            type="checkbox"
            checked={row.active}
            onChange={(e) => onChange(i, 'active', e.target.checked)}
            className="w-4 h-4"
          />
          {row.saved ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="px-2 text-nc-text3 hover:text-nc-grade-d"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="px-3 py-1.5 rounded-lg bg-nc-surface border border-nc-border text-nc-text2 hover:text-nc-text1 transition text-xs"
      >
        {T.returnReasonAdd}
      </button>
    </div>
  );
}

export default function ProtocolSettingsPanel({
  loadSettings = callGetProtocolSettings,
  saveSettings = callSetProtocolSettings,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState(null);
  const [read, setRead] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveFailure, setSaveFailure] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadSettings();
      const r = readProtocolSettings(data);
      setRead(r);
      setForm(initialSettingsForm(r));
      setLoadFailure(null);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[protocol] getProtocolSettings failed:', e);
      setLoadFailure(toFailure(e));
    } finally {
      setLoading(false);
    }
  }, [loadSettings]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const setReasonField = (index, key, value) =>
    setForm((f) => ({
      ...f,
      returnReasons: f.returnReasons.map((r, i) => (i === index ? { ...r, [key]: value } : r)),
    }));
  const addReason = () =>
    setForm((f) => ({
      ...f,
      // A new row starts INACTIVE: a reason the admin has not switched on does
      // not reach the app (rule 22 appendix: this start state is listed in the
      // report's inventory of defaults).
      returnReasons: [...f.returnReasons, { key: '', ar: '', tr: '', active: false, saved: false }],
    }));
  const removeReason = (index) =>
    setForm((f) => ({
      ...f,
      // Only a row that is not saved yet has this button.
      returnReasons: f.returnReasons.filter((r, i) => !(i === index && !r.saved)),
    }));

  const onSave = async () => {
    if (!read || !form) return;
    const { patch, problems, changedFields } = buildSettingsPatch(read, form);
    if (problems.length > 0 || changedFields.length === 0) return;
    setSaving(true);
    setSaveFailure(null);
    try {
      const reply = readSetSettingsResult(await saveSettings(patch));
      if (reply.ok) {
        toast.success(reply.changed ? T.savedVersion(reply.version) : T.savedNoChange);
      } else {
        // The call went through and its reply cannot be read: say so, and read
        // the server again to see what it holds.
        setSaveFailure(replyFailure(reply.problems));
      }
      await load();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[protocol] setProtocolSettings failed:', e);
      setSaveFailure(toFailure(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !read) return <PageSpinner />;

  const built = read && form ? buildSettingsPatch(read, form) : null;
  const problemOf = (name) => {
    const hit = built ? built.problems.find((p) => p.field === name) : null;
    return hit ? hit.problem : null;
  };
  const canSave =
    !!built &&
    !saving &&
    read.view !== SETTINGS_VIEW.UNREADABLE &&
    built.problems.length === 0 &&
    built.changedFields.length > 0;

  return (
    <div className="space-y-6">
      <ProtocolTabs />
      <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1">{T.settingsTitle}</h1>

      {loadFailure && <CallFailure failure={loadFailure} onRetry={load} />}

      {read && form && (
        <>
          <SettingsStateBanner read={read} />

          <div className="max-w-3xl bg-nc-card border border-nc-border rounded-2xl p-6 sm:p-7 space-y-6">
            {SETTINGS_FIELDS.map((name) => {
              const field = read.fields[name];
              const type = SETTINGS_FIELD_TYPE[name];
              return (
                <div key={name}>
                  <FieldHead name={name} field={field} problem={problemOf(name)} />
                  {type === 'number' && (
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={form[name]}
                      onChange={(e) => setField(name, e.target.value)}
                      className={INPUT_CLS}
                    />
                  )}
                  {type === 'string' && (
                    <input
                      type="text"
                      dir="ltr"
                      value={form[name]}
                      onChange={(e) => setField(name, e.target.value)}
                      className={INPUT_CLS}
                    />
                  )}
                  {type === 'boolean' && (
                    <select
                      value={form[name]}
                      onChange={(e) => setField(name, e.target.value)}
                      className={INPUT_CLS}
                    >
                      {field.state !== FIELD_STATE.PRESENT && (
                        <option value={BOOL_CHOICE.UNSET}>{T.fieldAbsent}</option>
                      )}
                      <option value={BOOL_CHOICE.TRUE}>{T.boolOn}</option>
                      <option value={BOOL_CHOICE.FALSE}>{T.boolOff}</option>
                    </select>
                  )}
                  {type === 'list' && (
                    <ReturnReasonsEditor
                      rows={form[name]}
                      onChange={setReasonField}
                      onAdd={addReason}
                      onRemove={removeReason}
                    />
                  )}
                </div>
              );
            })}

            {read.unknownSettingsKeys.length > 0 && (
              <div className="text-xs text-nc-text3">
                {T.fieldUnknownKeys}:{' '}
                <span dir="ltr" className="font-mono break-all">{read.unknownSettingsKeys.join(' · ')}</span>
              </div>
            )}

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
              {built && built.changedFields.length > 0 && (
                <span className="text-xs text-nc-grade-c">{T.unsaved}</span>
              )}
              {built && built.changedFields.length === 0 && built.problems.length === 0 && (
                <span className="text-xs text-nc-text3">{T.nothingToSave}</span>
              )}
            </div>

            {saveFailure && <CallFailure failure={saveFailure} />}
          </div>

          <div className="max-w-3xl bg-nc-card border border-nc-border rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-nc-text2 mb-3">{T.limitsTitle}</h2>
            {read.limits.state === FIELD_STATE.PRESENT ? (
              <pre dir="ltr" className="text-xs font-mono text-nc-text2 whitespace-pre-wrap break-all">
                {JSON.stringify(read.limits.value, null, 2)}
              </pre>
            ) : read.limits.state === FIELD_STATE.MALFORMED ? (
              <pre dir="ltr" className="text-xs font-mono text-nc-text2 whitespace-pre-wrap break-all">
                {JSON.stringify(read.limits.raw)}
              </pre>
            ) : (
              <p className="text-xs text-nc-text3">{T.limitsAbsent}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
