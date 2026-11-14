'use client';

// W-P6-18 — the correction page: one action on one scan, sent through
// `correctProtocolRecord`, and what the server answers shown as it answered.
//
// Spec: PLAN-06 §٦-ب-٥ (P6:854-868) and the server's A11 (neuralcheck-backend@
// 5361116; evidence/run-2026-10-18/protocol-contract-A8-A11-A12-neuralcheck-
// backend-5361116.md:64-81). What this page keeps to:
//
//   - the page goes through the function, never through Firestore (P6:765; no
//     setDoc/updateDoc/deleteDoc here — lib/protocolAdminCalls.js is the only
//     door). The function APPENDS: each real change is a line in
//     `protocolCorrections` and a mark on `scanProtocol`; nothing is deleted
//     (P6:864), and this page has no delete anywhere;
//   - the four actions the server accepts: unlink, relink, exclude, unexclude.
//     `resolveIdentityConflict` (P6:859) is the design's fifth: the server
//     refuses it (CORRECTION_ACTION_NOT_SPECIFIED) and it is not offered;
//   - the target is ONE of the report code (`shortId`, P6:867) or the `scanId`;
//     `reason` is for exclude alone and `toScanId` for relink alone, and the
//     payload carries only what applies (lib/protocolCorrectionPatch.js);
//   - nothing is defaulted: the action and the reason start unchosen;
//   - what is shown after a send is the SERVER's reply, the state after the
//     action: `changed`, `basis`, `exclusion` (no mark is «no mark», not «not
//     excluded»), `linkState`, `correctionSeq`. A reply that disagrees with the
//     contract is shown with the disagreement named under it; one that cannot
//     be read is not drawn at all. There is no read function in the contract
//     for this page to ask again, so nothing is reloaded;
//   - the list of the test scans (P6:866) is NOT here: its text did not arrive
//     with the order («معلّق: مواصفة غائبة»), and applying it to production is
//     the owner's act, from this page, once the functions are deployed.
//
// Hook order is part of the test's contract (protocolCorrectionPanel.test.cjs
// reads the declared order from this file).

import { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

import { useToast } from '@/components/admin/Toast';
import ProtocolTabs from '@/components/admin/protocol/ProtocolTabs';
import CallFailure, { toFailure, replyFailure } from '@/components/admin/protocol/CallFailure';
import {
  ADMIN_PROTOCOL_TEXTS as T,
  CORRECTION_ACTION_LABEL_KEY,
  EXCLUDE_REASON_LABEL_KEY,
  CORRECTION_BASIS_LABEL_KEY,
  CORRECTION_PROBLEM_TEXT_KEY,
} from '@/lib/adminProtocolTexts';
import { CORRECTION_ACTION, CORRECTION_ACTIONS, EXCLUDE_REASONS } from '@/lib/protocolCorrectionWire';
import {
  EXCLUSION_VIEW,
  KNOWN_CORRECTION_REFUSALS,
  readCorrectionResult,
} from '@/lib/protocolCorrectionReaders';
import {
  buildCorrectionPayload,
  initialCorrectionForm,
} from '@/lib/protocolCorrectionPatch';
import { callCorrectProtocolRecord } from '@/lib/protocolAdminCalls';

const INPUT_CLS =
  'w-full sm:max-w-md px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 font-mono focus:outline-none focus:border-nc-green focus:ring-2 focus:ring-nc-green/20 transition';

/** A value that may be absent, drawn as an absence («لا قيمة»), never as an empty cell. */
function NullableValue({ value }) {
  if (value === null) return <span className="text-nc-text3">{T.valueNull}</span>;
  return <span dir="ltr" className="font-mono text-xs break-all">{value}</span>;
}

/** The state of the exclusion mark, in words, and the code beside it. */
function ExclusionValue({ exclusion }) {
  if (exclusion.view === EXCLUSION_VIEW.NONE) {
    return <span className="text-nc-text2">{T.exclusionNone}</span>;
  }
  if (exclusion.view === EXCLUSION_VIEW.UNKNOWN_STATE) {
    return (
      <span>
        <span dir="ltr" className="font-mono text-xs break-all">{exclusion.state}</span>{' '}
        <span className="text-[11px] text-nc-grade-c">{T.valueUnknown}</span>
      </span>
    );
  }
  const label = exclusion.view === EXCLUSION_VIEW.EXCLUDED ? T.exclusionExcluded : T.exclusionNotExcluded;
  const reasonKey = EXCLUDE_REASON_LABEL_KEY[exclusion.reasonCode];
  return (
    <span>
      <span className="font-semibold">{label}</span>{' '}
      <span dir="ltr" className="font-mono text-[11px] text-nc-text3">{exclusion.state}</span>
      {exclusion.reasonCode !== null && (
        <span className="block mt-1">
          {T.exclusionReasonLabel}:{' '}
          {reasonKey ? <span>{T[reasonKey]} </span> : null}
          <span dir="ltr" className="font-mono text-[11px] text-nc-text3 break-all">{exclusion.reasonCode}</span>
          {!exclusion.reasonKnown && (
            <span className="ms-2 text-[11px] text-nc-grade-c">{T.valueUnknown}</span>
          )}
        </span>
      )}
    </span>
  );
}

/** What the server answered, as it answered (the state AFTER the action). */
export function CorrectionResultCard({ result }) {
  const actionKey = CORRECTION_ACTION_LABEL_KEY[result.action];
  const basisKey = CORRECTION_BASIS_LABEL_KEY[result.basis];
  const row = (label, content) => (
    <div className="flex flex-wrap gap-x-3 gap-y-1 py-2">
      <dt className="w-44 shrink-0 text-nc-text3">{label}</dt>
      <dd className="flex-1 min-w-0 text-nc-text1">{content}</dd>
    </div>
  );
  return (
    <div
      role="status"
      className="max-w-3xl bg-nc-card border border-nc-border rounded-2xl p-6 sm:p-7 space-y-3"
    >
      <h2 className="text-lg font-semibold text-nc-text1">{T.resultTitle}</h2>
      <p className="text-sm font-semibold text-nc-text1">
        {result.changed ? T.correctionRecorded : T.savedNoChange}
      </p>
      <dl className="text-sm divide-y divide-nc-border/60">
        {row(
          T.correctionAction,
          <span>
            {T[actionKey]}{' '}
            <span dir="ltr" className="font-mono text-[11px] text-nc-text3">{result.action}</span>
          </span>
        )}
        {row(T.targetScanId, <NullableValue value={result.scanId} />)}
        {row(
          T.resultBasis,
          <span>
            {T[basisKey]}{' '}
            <span dir="ltr" className="font-mono text-[11px] text-nc-text3">{result.basis}</span>
          </span>
        )}
        {row(T.resultExclusion, <ExclusionValue exclusion={result.exclusion} />)}
        {row(
          T.resultLinkState,
          <span>
            <NullableValue value={result.linkState.value} />
            {!result.linkState.known && (
              <span className="ms-2 text-[11px] text-nc-grade-c">{T.valueUnknown}</span>
            )}
          </span>
        )}
        {row(T.resultLinkedScanId, <NullableValue value={result.linkedScanId} />)}
        {row(
          T.resultSeq,
          result.correctionSeq === null ? (
            <span className="text-nc-text3">{T.seqNone}</span>
          ) : (
            <span dir="ltr" className="font-mono font-semibold">{result.correctionSeq}</span>
          )
        )}
      </dl>
      {result.problems.length > 0 && (
        <div dir="ltr" className="font-mono text-[11px] text-nc-grade-c break-all">
          {result.problems.join(' · ')}
        </div>
      )}
    </div>
  );
}

export default function ProtocolCorrectionPanel({ correct = callCorrectProtocolRecord }) {
  const toast = useToast();
  const [form, setForm] = useState(initialCorrectionForm());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const onSend = async () => {
    const { payload } = buildCorrectionPayload(form);
    if (payload === null || busy) return;
    setBusy(true);
    setFailure(null);
    setResult(null);
    try {
      const reply = readCorrectionResult(await correct(payload), payload);
      if (reply.ok) {
        setResult(reply);
        toast.success(reply.changed ? T.correctionRecorded : T.savedNoChange);
      } else {
        // The call went through and its reply cannot be drawn: say so. The write
        // may have happened; there is no read in the contract to ask again.
        setFailure(replyFailure(reply.problems));
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[protocol] correctProtocolRecord failed:', e);
      setFailure(toFailure(e, KNOWN_CORRECTION_REFUSALS));
    } finally {
      setBusy(false);
    }
  };

  const built = buildCorrectionPayload(form);
  const touched = Object.values(form).some((v) => v !== '');
  const shown = touched ? built.problems : [];
  const action = form.action;

  return (
    <div className="space-y-6">
      <ProtocolTabs />
      <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1">{T.correctionsTitle}</h1>

      <div className="max-w-3xl bg-nc-card border border-nc-border rounded-2xl p-6 sm:p-7 space-y-5">
        <div>
          <label className="block mb-2 font-semibold text-nc-text1">{T.correctionAction}</label>
          <select
            value={form.action}
            aria-label={T.correctionAction}
            onChange={(e) => setField('action', e.target.value)}
            className={INPUT_CLS}
          >
            <option value="">{T.correctionActionUnset}</option>
            {CORRECTION_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {`${T[CORRECTION_ACTION_LABEL_KEY[a]]} — ${a}`}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-nc-text3">{T.targetHint}</p>
          <div>
            <label className="block mb-2 font-semibold text-nc-text1">{T.targetShortId}</label>
            <input
              type="text"
              dir="ltr"
              value={form.shortId}
              aria-label={T.targetShortId}
              onChange={(e) => setField('shortId', e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold text-nc-text1">{T.targetScanId}</label>
            <input
              type="text"
              dir="ltr"
              value={form.scanId}
              aria-label={T.targetScanId}
              onChange={(e) => setField('scanId', e.target.value)}
              className={INPUT_CLS}
            />
          </div>
        </div>

        {action === CORRECTION_ACTION.RELINK && (
          <div>
            <label className="block mb-2 font-semibold text-nc-text1">{T.toScanIdLabel}</label>
            <input
              type="text"
              dir="ltr"
              value={form.toScanId}
              aria-label={T.toScanIdLabel}
              onChange={(e) => setField('toScanId', e.target.value)}
              className={INPUT_CLS}
            />
          </div>
        )}

        {action === CORRECTION_ACTION.EXCLUDE && (
          <div>
            <label className="block mb-2 font-semibold text-nc-text1">{T.reasonLabel}</label>
            <select
              value={form.reason}
              aria-label={T.reasonLabel}
              onChange={(e) => setField('reason', e.target.value)}
              className={INPUT_CLS}
            >
              <option value="">{T.reasonUnset}</option>
              {EXCLUDE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {`${T[EXCLUDE_REASON_LABEL_KEY[r]]} — ${r}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {shown.length > 0 && (
          <ul className="space-y-1">
            {shown.map((p) => (
              <li key={p} className="text-[12px] text-nc-grade-d">
                {T[CORRECTION_PROBLEM_TEXT_KEY[p]]}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center pt-2">
          <button
            type="button"
            onClick={onSend}
            disabled={built.payload === null || busy}
            className="px-6 py-3 rounded-xl nc-gradient-bg text-nc-bg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
          >
            <CheckIcon className="w-4 h-4" strokeWidth={2.2} />
            {busy ? T.saving : T.correctionSend}
          </button>
        </div>

        {failure && <CallFailure failure={failure} />}
      </div>

      {result && <CorrectionResultCard result={result} />}
    </div>
  );
}
