'use strict';

// Test-only — NOT part of the shipped site.
//
// ⚠ SYNTHETIC SAMPLES: «اصطناعية من العقد، لا من مُنتِج حقيقي».
// Every object below is BUILT BY HAND from the contract text, not produced by
// the server: neuralcheck-backend@fd730ac, docs/PROTOCOL_CONTRACT.md §٢ A10
// ((1) the settings document, (3) getProtocolSettings, (5)-(7) the shop parts,
// manageTechnician, getShopProtocolConfig), as copied in
//   evidence/run-2026-10-18/protocol-contract-A0-A10-neuralcheck-backend-fd730ac.md
//   lines 286-293, and the backend engineer's report
//   evidence/run-2026-10-18/reports/backend-engineer-3-rows-a-fd730ac-2026-10-21.md
//   lines 54-60 («أشكال السلك الجديدة كاملةً»).
// No real producer's output of these functions exists yet: they are not
// deployed, and this repo holds no golden sample of them (contract/ holds the
// report samples only). When a real sample exists it replaces these (rule 41),
// and this file is the one place to change.
//
// What the contract does NOT give and this file therefore does not invent:
//   - the inner shape of `limits` (A10 (3) says «الحدود أعلاه» and no more):
//     the samples carry an obviously synthetic object, and the reader and the
//     page must pass it through without reading a key of it;
//   - the exact `state` / `anomaly` pairing of an unusable version beyond
//     «يُقرأ غائباً»: the sample for it is state SETTINGS_ABSENT with the
//     anomaly VERSION_UNUSABLE.
//
// Values are deliberately NOT the plan's «proposed» ones (0.25, 0.10, 168, 80:
// «اقتراح للعرض، لا للكود»), so a default leaking out of the code shows as a
// mismatch. Names and ids are fakes in the FAKE-TECH-* style the order allows.

const LIMITS_SYNTHETIC = { SYNTHETIC_UNSPECIFIED_SHAPE: true };

const settingsPresent = () => ({
  state: 'PRESENT',
  anomaly: null,
  version: 3,
  settings: {
    repeatRate: 0.37,
    doubleEvalRate: 0.11,
    openBeforeValidityHours: 24,
    collectionPhase: true,
    blindnessAlertBelowPct: 61,
    returnReasons: [
      { key: 'fake_reason_a', ar: 'FAKE-AR-A', tr: 'FAKE-TR-A', active: true },
      { key: 'fake_reason_b', ar: 'FAKE-AR-B', tr: 'FAKE-TR-B', active: false },
    ],
    minAppVersion: '0.0.1',
  },
  updatedAtMs: 1760000000000,
  updatedBy: 'FAKE-HASH-ADMIN-1',
  limits: { ...LIMITS_SYNTHETIC },
  notSpecified: ['symptomChips', 'targets'],
});

const settingsAbsent = () => ({
  state: 'SETTINGS_ABSENT',
  anomaly: null,
  version: null,
  settings: {},
  updatedAtMs: null,
  updatedBy: null,
  limits: { ...LIMITS_SYNTHETIC },
  notSpecified: ['symptomChips', 'targets'],
});

const settingsVersionUnusable = () => ({
  state: 'SETTINGS_ABSENT',
  anomaly: 'VERSION_UNUSABLE',
  version: null,
  settings: { repeatRate: 0.37 },
  updatedAtMs: null,
  updatedBy: null,
  limits: { ...LIMITS_SYNTHETIC },
  notSpecified: ['symptomChips', 'targets'],
});

const SIX_PARTS_MIXED = () => ({
  purposes: true,
  batteryBeforeAfter: false,
  coldRepeat: true,
  returns: false,
  doubleEval: true,
  consent: false,
});

const shopPresent = () => ({
  ownerId: 'fake-owner-1',
  partsState: 'PRESENT',
  parts: SIX_PARTS_MIXED(),
  technicians: [
    {
      technicianId: 'fake-tech-id-a',
      displayName: 'FAKE-TECH-A',
      active: true,
      activeState: 'ACTIVE',
      createdAtMs: 1760000001000,
      updatedAtMs: 1760000002000,
    },
    {
      technicianId: 'fake-tech-id-b',
      displayName: 'FAKE-TECH-B',
      active: false,
      activeState: 'INACTIVE',
      createdAtMs: 1760000003000,
      updatedAtMs: 1760000004000,
    },
    {
      technicianId: 'fake-tech-id-c',
      displayName: 'FAKE-TECH-C',
      active: null,
      activeState: 'ACTIVE_FLAG_UNREADABLE',
      createdAtMs: null,
      updatedAtMs: null,
    },
  ],
});

const shopAbsent = () => ({
  ownerId: 'fake-owner-2',
  partsState: 'ABSENT',
  parts: {
    purposes: false,
    batteryBeforeAfter: false,
    coldRepeat: false,
    returns: false,
    doubleEval: false,
    consent: false,
  },
  technicians: [],
});

const setSettingsChanged = () => ({ changed: true, version: 4, fields: ['repeatRate'] });
const setSettingsUnchanged = () => ({ changed: false, version: 3, fields: [] });

const setPartsChanged = () => ({
  ownerId: 'fake-owner-1',
  parts: { ...SIX_PARTS_MIXED(), coldRepeat: false },
  changed: ['coldRepeat'],
});

const manageChanged = () => ({
  technicianId: 'fake-tech-id-a',
  ownerId: 'fake-owner-1',
  displayName: 'FAKE-TECH-A',
  active: true,
  changed: true,
});

/** A rejected callable the way the SDK raises it: `code`, a technical `message`, `details`. */
const refusal = (reasonCode, field) => ({
  code: 'functions/failed-precondition',
  message: reasonCode,
  details: field === undefined ? { reasonCode } : { reasonCode, field },
});

module.exports = {
  LIMITS_SYNTHETIC,
  settingsPresent,
  settingsAbsent,
  settingsVersionUnusable,
  shopPresent,
  shopAbsent,
  SIX_PARTS_MIXED,
  setSettingsChanged,
  setSettingsUnchanged,
  setPartsChanged,
  manageChanged,
  refusal,
};
