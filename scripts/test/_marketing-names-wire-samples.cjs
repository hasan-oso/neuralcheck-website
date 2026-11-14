'use strict';

// Test-only — NOT part of the shipped site.
//
// ⚠ SYNTHETIC SAMPLES: «اصطناعية من العقد، لا من مُنتِج حقيقي».
// Every object below is BUILT BY HAND from the contract text, not produced by
// the server: neuralcheck-backend@5361116, docs/PROTOCOL_CONTRACT.md §٢ A12
// ((2) setMarketingNames, (3) getMarketingNames), as copied in
//   evidence/run-2026-10-18/protocol-contract-A8-A11-A12-neuralcheck-backend-5361116.md
//   lines 89-97, and the backend engineer's report
//   evidence/run-2026-10-18/reports/backend-engineer-5-rows-b-5361116-2026-10-21.md
//   item 5.
// No real producer's output of these two functions exists yet: they are not
// deployed, and this repo holds no golden sample of them (contract/ holds the
// report samples only). When a real sample exists it replaces these (rule 41),
// and this file is the one place to change.
//
// The numbers 1000 / 64 / 120 of `limits` are the CONTRACT's own (A12 (3):
// `limits {maxEntries: 1000, modelMaxLength: 64, nameMaxLength: 120}`).
//
// Models and names are obvious fakes (`FAKE-MODEL-*`, `FAKE-AR-*`): no device
// model and no marketing name of the real world is written in this repo (the
// order: no map entries).

const LIMITS = () => ({ maxEntries: 1000, modelMaxLength: 64, nameMaxLength: 120 });

// ---------------------------------------------------------------------------
// A12 — getMarketingNames / setMarketingNames
// ---------------------------------------------------------------------------

const marketingPresent = () => ({
  state: 'PRESENT',
  anomaly: null,
  version: 3,
  entries: [
    { model: 'FAKE-MODEL-A', ar: 'FAKE-AR-A', tr: 'FAKE-TR-A', en: 'FAKE-EN-A' },
    { model: 'FAKE-MODEL-B', ar: 'FAKE-AR-B', tr: 'FAKE-TR-B', en: 'FAKE-EN-B' },
  ],
  updatedAtMs: 1760000000000,
  updatedBy: 'FAKE-HASH-ADMIN-1',
  limits: LIMITS(),
});

/** «قبل أيّ كتابة: {state: "ABSENT", anomaly: null, version: null, entries: [], updatedAtMs: null, updatedBy: null, limits}». */
const marketingAbsent = () => ({
  state: 'ABSENT',
  anomaly: null,
  version: null,
  entries: [],
  updatedAtMs: null,
  updatedBy: null,
  limits: LIMITS(),
});

/** state UNREADABLE with one of the five anomalies of A12 (3); entries `[]` «حين لا تُقرأ». */
const marketingUnreadable = (anomaly, version = null) => ({
  state: 'UNREADABLE',
  anomaly,
  version,
  entries: [],
  updatedAtMs: null,
  updatedBy: null,
  limits: LIMITS(),
});

const MARKETING_ANOMALIES = [
  'DOCUMENT_NOT_AN_OBJECT',
  'VERSION_UNUSABLE',
  'ENTRIES_NOT_AN_ARRAY',
  'ENTRY_UNUSABLE',
  'DUPLICATE_MODEL',
];

const setMarketingChanged = () => ({ changed: true, version: 4, added: 1, updated: 1 });
const setMarketingUnchanged = () => ({ changed: false, version: 3, added: 0, updated: 0 });

module.exports = {
  LIMITS,
  marketingPresent,
  marketingAbsent,
  marketingUnreadable,
  MARKETING_ANOMALIES,
  setMarketingChanged,
  setMarketingUnchanged,
};
