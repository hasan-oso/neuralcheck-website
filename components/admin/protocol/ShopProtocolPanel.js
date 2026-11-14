'use client';

// W-P6-14 — the per-shop page: which of the six parts are on for a shop, and
// the shop's technicians. Reads getShopProtocolConfig, writes through
// setShopProtocolParts and manageTechnician.
//
// Spec: PLAN-06 P6:787-792 (the activation per shop «بجانب evaluationEnabled»,
// the list of technicians per shop and the user's decision on the screen
// «الفنّيون»: «إضافة اسم، وتعديله، وإيقافه بلا حذف … ولا تُدخل أيّ أسماء الآن»)
// and the server's A10 (5)-(7) (neuralcheck-backend@fd730ac; evidence/
// run-2026-10-18/protocol-contract-A0-A10-neuralcheck-backend-fd730ac.md:290-
// 292). What this page keeps to:
//
//   - NO name of a technician is written here, in any file of this feature:
//     the owner of the project types them (the input starts empty and has no
//     placeholder that looks like a name);
//   - no delete: a technician is added, renamed, switched off or on — the
//     three actions of manageTechnician, and there is no fourth;
//   - an absence is shown as an absence (rule 22): a shop with no
//     `protocolParts` shows «الغائب «غير مفعَّل»» (P6:788) with the state
//     `ABSENT`, a part the server did not send or sent unreadable is
//     «غير مقروء» and is never drawn as off, and a technician whose active
//     flag the server could not read stays «علم الفعّالية غير مقروء», neither
//     active nor inactive;
//   - the part named `batteryBeforeAfter` is sent under that name only (E42);
//   - the only readings from Firestore are the shop picker's read of `users`
//     (lib/protocolAdminShops.js, read only); every write goes through the
//     functions;
//   - after every write the page reads the shop's configuration again.
//
// Hook order is part of the test's contract (adminProtocolPanels.test.cjs reads
// the declared order from this file).

import { useEffect, useRef, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

import { useToast } from '@/components/admin/Toast';
import { PageSpinner } from '@/components/admin/Spinner';
import ProtocolTabs from '@/components/admin/protocol/ProtocolTabs';
import CallFailure, { toFailure, replyFailure } from '@/components/admin/protocol/CallFailure';
import {
  ADMIN_PROTOCOL_TEXTS as T,
  PART_LABEL_KEY,
  TECH_STATE_LABEL_KEY,
} from '@/lib/adminProtocolTexts';
import { PARTS_STATE, PROTOCOL_PARTS, TECH_ACTIVE_STATE } from '@/lib/protocolAdminWire';
import {
  PART_STATE,
  readShopConfig,
  readSetPartsResult,
  readManageResult,
} from '@/lib/protocolAdminReaders';
import {
  initialPartsDraft,
  buildPartsPatch,
  addTechnicianPayload,
  renameTechnicianPayload,
  setTechnicianActivePayload,
} from '@/lib/protocolAdminPatch';
import { filterShops, shopLabel, loadShopCandidates } from '@/lib/protocolAdminShops';
import {
  callGetShopProtocolConfig,
  callSetShopProtocolParts,
  callManageTechnician,
} from '@/lib/protocolAdminCalls';

const BTN =
  'px-3 py-1.5 rounded-lg border text-xs transition disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_NEUTRAL = `${BTN} bg-nc-surface border-nc-border text-nc-text2 hover:text-nc-text1`;

/** What a part is right now, drawn from the draft if the admin chose, else the saved state. */
function effectiveChoice(savedState, chosen) {
  if (chosen === true || chosen === false) return chosen;
  if (savedState === PART_STATE.ON) return true;
  if (savedState === PART_STATE.OFF) return false;
  return null; // MISSING / MALFORMED and untouched: no choice is drawn
}

function PartsCard({ config, draft, busy, onChoose, onSave }) {
  const patch = buildPartsPatch(config, draft);
  const dirty = Object.keys(patch).length > 0;
  return (
    <div className="max-w-3xl bg-nc-card border border-nc-border rounded-2xl p-6 sm:p-7 space-y-4">
      <h2 className="text-lg font-semibold text-nc-text1">{T.partsTitle}</h2>
      {config.partsState === PARTS_STATE.ABSENT && (
        <p className="text-sm text-nc-text2 leading-relaxed">
          <span dir="ltr" className="font-mono text-xs">{PARTS_STATE.ABSENT}</span> {T.partsAbsent}
        </p>
      )}
      <div className="divide-y divide-nc-border/60">
        {PROTOCOL_PARTS.map((key) => {
          const saved = config.parts[key];
          const choice = effectiveChoice(saved.state, draft[key]);
          const unreadable = saved.state === PART_STATE.MISSING || saved.state === PART_STATE.MALFORMED;
          return (
            <div key={key} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-nc-text1">{T[PART_LABEL_KEY[key]]}</span>{' '}
                <span dir="ltr" className="font-mono text-[11px] text-nc-text3">{key}</span>
                {unreadable && draft[key] === null && (
                  <span className="ms-2 text-[11px] px-2 py-0.5 rounded-md bg-nc-grade-c/10 border border-nc-grade-c/40 text-nc-grade-c">
                    {T.partUnreadable}
                  </span>
                )}
              </div>
              <div role="radiogroup" className="flex gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={choice === true}
                  disabled={busy !== null}
                  onClick={() => onChoose(key, true)}
                  className={`${BTN} ${
                    choice === true
                      ? 'bg-nc-green/10 border-nc-green/40 text-nc-green'
                      : 'bg-nc-surface border-nc-border text-nc-text3 hover:text-nc-text2'
                  }`}
                >
                  {T.boolOn}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={choice === false}
                  disabled={busy !== null}
                  onClick={() => onChoose(key, false)}
                  className={`${BTN} ${
                    choice === false
                      ? 'bg-nc-grade-d/10 border-nc-grade-d/40 text-nc-grade-d'
                      : 'bg-nc-surface border-nc-border text-nc-text3 hover:text-nc-text2'
                  }`}
                >
                  {T.boolOff}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {config.unknownPartKeys.length > 0 && (
        <div dir="ltr" className="font-mono text-[11px] text-nc-text3 break-all">
          {config.unknownPartKeys.join(' · ')}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || busy !== null}
          className="px-6 py-2.5 rounded-xl nc-gradient-bg text-nc-bg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <CheckIcon className="w-4 h-4" strokeWidth={2.2} />
          {busy === 'parts' ? T.saving : T.save}
        </button>
        {dirty && <span className="text-xs text-nc-grade-c">{T.unsaved}</span>}
      </div>
    </div>
  );
}

function TechnicianRow({ tech, draft, busy, onDraft, onRename, onSetActive }) {
  if (!tech.readable) {
    return (
      <div className="py-3 text-sm text-nc-text3">
        {T.techUnreadableEntry}{' '}
        <span dir="ltr" className="font-mono text-[11px] break-all">{tech.problems.join(' · ')}</span>
      </div>
    );
  }
  const text = draft === undefined ? tech.displayName : draft;
  const working = busy === `tech:${tech.technicianId}`;
  const known = TECH_STATE_LABEL_KEY[tech.activeState];
  const canActivate = tech.activeState !== TECH_ACTIVE_STATE.ACTIVE;
  const canDeactivate = tech.activeState !== TECH_ACTIVE_STATE.INACTIVE;
  return (
    <div className="py-3 flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={text}
        onChange={(e) => onDraft(tech.technicianId, e.target.value)}
        aria-label={T.techNameLabel}
        className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-nc-surface border border-nc-border text-nc-text1 text-sm"
      />
      <span
        className={`text-[11px] px-2 py-0.5 rounded-md border ${
          tech.activeState === TECH_ACTIVE_STATE.ACTIVE
            ? 'bg-nc-green/10 border-nc-green/30 text-nc-green'
            : 'bg-nc-grade-c/10 border-nc-grade-c/40 text-nc-grade-c'
        }`}
      >
        {known ? T[known] : tech.activeState}
      </span>
      <button
        type="button"
        onClick={() => onRename(tech)}
        disabled={busy !== null || text.trim() === '' || text.trim() === tech.displayName}
        className={BTN_NEUTRAL}
      >
        {working ? T.saving : T.techRenameSave}
      </button>
      {canActivate && (
        <button type="button" onClick={() => onSetActive(tech, true)} disabled={busy !== null} className={BTN_NEUTRAL}>
          {T.techActivate}
        </button>
      )}
      {canDeactivate && (
        <button type="button" onClick={() => onSetActive(tech, false)} disabled={busy !== null} className={BTN_NEUTRAL}>
          {T.techDeactivate}
        </button>
      )}
    </div>
  );
}

export default function ShopProtocolPanel({
  loadShops = loadShopCandidates,
  loadConfig = callGetShopProtocolConfig,
  saveParts = callSetShopProtocolParts,
  manage = callManageTechnician,
}) {
  const toast = useToast();
  const [shopsStatus, setShopsStatus] = useState('loading');
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState('');
  const [ownerId, setOwnerId] = useState(null);
  const [configStatus, setConfigStatus] = useState('idle');
  const [config, setConfig] = useState(null);
  const [configFailure, setConfigFailure] = useState(null);
  const [partsDraft, setPartsDraft] = useState(initialPartsDraft());
  const [busy, setBusy] = useState(null);
  const [actionFailure, setActionFailure] = useState(null);
  const [newName, setNewName] = useState('');
  const [renameDrafts, setRenameDrafts] = useState({});
  const requestRef = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await loadShops();
        if (!alive) return;
        setShops(list);
        setShopsStatus('ready');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[protocol] loading the shops failed:', e);
        if (!alive) return;
        setShopsStatus('failed');
        toast.error(T.usersLoadFailed);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadShops]);

  /** Read the shop's configuration; a reply for a shop no longer selected is dropped. */
  const loadConfigFor = async (id) => {
    const token = ++requestRef.current;
    setConfigStatus('loading');
    setConfigFailure(null);
    try {
      const shop = readShopConfig(await loadConfig(id));
      if (token !== requestRef.current) return;
      if (!shop.ok) {
        setConfig(null);
        setConfigFailure(replyFailure(shop.problems));
        setConfigStatus('failed');
        return;
      }
      if (shop.ownerId !== id) {
        // Asked for one shop, answered for another: shown as a failure, never drawn.
        setConfig(null);
        setConfigFailure(replyFailure(['ownerId:DOES_NOT_MATCH_THE_REQUEST']));
        setConfigStatus('failed');
        return;
      }
      setConfig(shop);
      setPartsDraft(initialPartsDraft());
      setRenameDrafts({});
      setConfigStatus('ready');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[protocol] getShopProtocolConfig failed:', e);
      if (token !== requestRef.current) return;
      setConfig(null);
      setConfigFailure(toFailure(e));
      setConfigStatus('failed');
    }
  };

  const onSelect = (id) => {
    setOwnerId(id);
    setActionFailure(null);
    setNewName('');
    loadConfigFor(id);
  };

  const onChoosePart = (key, value) => setPartsDraft((d) => ({ ...d, [key]: value }));
  const onDraftName = (technicianId, text) => setRenameDrafts((d) => ({ ...d, [technicianId]: text }));

  /**
   * One write, then a fresh read of the shop — also when the reply could not be
   * read: the write may have happened, so what the server holds is what is
   * shown. `finish` reads the reply (and reports an unreadable one itself).
   */
  const write = async (busyKey, send, finish) => {
    setBusy(busyKey);
    setActionFailure(null);
    try {
      finish(await send());
      await loadConfigFor(ownerId);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[protocol] a write failed:', e);
      setActionFailure(toFailure(e));
    } finally {
      setBusy(null);
    }
  };

  const onSaveParts = () => {
    if (!config || !ownerId) return;
    const patch = buildPartsPatch(config, partsDraft);
    if (Object.keys(patch).length === 0) return;
    return write(
      'parts',
      () => saveParts(ownerId, patch),
      (data) => {
        const reply = readSetPartsResult(data);
        if (!reply.ok) {
          setActionFailure(replyFailure(reply.problems));
          return false;
        }
        toast.success(reply.changed.length > 0 ? T.saved : T.savedNoChange);
        return true;
      }
    );
  };

  const manageReply = (afterOk) => (data) => {
    const reply = readManageResult(data);
    if (!reply.ok) {
      setActionFailure(replyFailure(reply.problems));
      return false;
    }
    toast.success(reply.changed ? T.saved : T.savedNoChange);
    if (afterOk) afterOk();
    return true;
  };

  const onAdd = () => {
    if (!ownerId || newName.trim() === '') return;
    return write('add', () => manage(addTechnicianPayload(ownerId, newName)), manageReply(() => setNewName('')));
  };

  const onRename = (tech) => {
    if (!ownerId) return;
    const text = renameDrafts[tech.technicianId];
    if (text === undefined || text.trim() === '' || text.trim() === tech.displayName) return;
    return write(
      `tech:${tech.technicianId}`,
      () => manage(renameTechnicianPayload(ownerId, tech.technicianId, text)),
      manageReply()
    );
  };

  const onSetActive = (tech, active) => {
    if (!ownerId) return;
    return write(
      `tech:${tech.technicianId}`,
      () => manage(setTechnicianActivePayload(ownerId, tech.technicianId, active)),
      manageReply()
    );
  };

  const visible = filterShops(shops, search);

  return (
    <div className="space-y-6">
      <ProtocolTabs />
      <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1">{T.shopsTitle}</h1>

      {/* the picker */}
      <div className="max-w-3xl bg-nc-card border border-nc-border rounded-2xl p-5 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={T.shopSearch}
          className="w-full px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 text-sm"
        />
        {shopsStatus === 'loading' && <PageSpinner />}
        {shopsStatus === 'ready' && visible.length === 0 && (
          <p className="text-sm text-nc-text3">{T.noShopMatches}</p>
        )}
        {shopsStatus === 'ready' && visible.length > 0 && (
          <div className="max-h-64 overflow-y-auto divide-y divide-nc-border/60">
            {visible.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                aria-pressed={ownerId === c.id}
                className={`w-full text-start px-3 py-2 text-sm transition ${
                  ownerId === c.id ? 'bg-nc-green/10 text-nc-green' : 'text-nc-text2 hover:bg-nc-surface'
                }`}
              >
                <span className="font-medium">{shopLabel(c)}</span>
                {c.email && c.email !== shopLabel(c) && (
                  <span dir="ltr" className="block text-xs text-nc-text3">{c.email}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {ownerId === null && <p className="text-sm text-nc-text3">{T.noShopSelected}</p>}

      {ownerId !== null && configStatus === 'loading' && !config && <PageSpinner />}
      {ownerId !== null && configFailure && (
        <CallFailure failure={configFailure} onRetry={() => loadConfigFor(ownerId)} />
      )}
      {actionFailure && <CallFailure failure={actionFailure} />}

      {ownerId !== null && config && (
        <>
          <PartsCard
            config={config}
            draft={partsDraft}
            busy={busy}
            onChoose={onChoosePart}
            onSave={onSaveParts}
          />

          <div className="max-w-3xl bg-nc-card border border-nc-border rounded-2xl p-6 sm:p-7 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-nc-text1">{T.techTitle}</h2>
              <p className="text-sm text-nc-text3 mt-1 leading-relaxed">{T.techHint}</p>
            </div>

            {config.technicians.length === 0 ? (
              <p className="text-sm text-nc-text3">{T.techNone}</p>
            ) : (
              <div className="divide-y divide-nc-border/60">
                {config.technicians.map((tech, i) => (
                  <TechnicianRow
                    key={tech.technicianId || `unreadable-${i}`}
                    tech={tech}
                    draft={tech.readable ? renameDrafts[tech.technicianId] : undefined}
                    busy={busy}
                    onDraft={onDraftName}
                    onRename={onRename}
                    onSetActive={onSetActive}
                  />
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                aria-label={T.techNameLabel}
                className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-nc-surface border border-nc-border text-nc-text1 text-sm"
              />
              <button
                type="button"
                onClick={onAdd}
                disabled={busy !== null || newName.trim() === ''}
                className="px-5 py-2 rounded-xl nc-gradient-bg text-nc-bg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy === 'add' ? T.saving : T.techAdd}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
