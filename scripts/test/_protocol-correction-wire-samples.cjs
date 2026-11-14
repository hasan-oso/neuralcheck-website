'use strict';

// Test-only — NOT part of the shipped site.
//
// ⚠ SYNTHETIC SAMPLES: «اصطناعية من العقد، لا من مُنتِج حقيقي».
// Every object below is BUILT BY HAND from the contract text, not produced by
// the server: neuralcheck-backend@5361116, docs/PROTOCOL_CONTRACT.md §٢ A11
// ((4) the reply of correctProtocolRecord, (3) the line it appends), as copied in
//   evidence/run-2026-10-18/protocol-contract-A8-A11-A12-neuralcheck-backend-5361116.md
//   lines 71-81, and the backend engineer's report
//   evidence/run-2026-10-18/reports/backend-engineer-5-rows-b-5361116-2026-10-21.md
//   item 4.
// No real producer's output of this function is kept in this repo: it holds no
// golden sample of it (contract/ holds the report samples only; the function is
// in the production list at neuralcheck-backend@488e3ee). When a real sample exists it replaces these (rule 41), and this file is
// the one place to change.
//
// Ids are obvious fakes (`fake-scan-*`): no scan and no report code of the real
// world is written in this repo (the order: no production data).

// ---------------------------------------------------------------------------
// A11 — the reply of correctProtocolRecord
// ---------------------------------------------------------------------------

const correctionExcluded = () => ({
  scanId: 'fake-scan-1',
  action: 'exclude',
  changed: true,
  basis: 'SCAN_PROTOCOL',
  exclusion: { state: 'excluded', reasonCode: 'test' },
  linkState: 'active',
  linkedScanId: 'fake-scan-2',
  correctionSeq: 1,
});

const correctionUnexcluded = () => ({
  scanId: 'fake-scan-1',
  action: 'unexclude',
  changed: true,
  basis: 'SCAN_PROTOCOL',
  exclusion: { state: 'not_excluded', reasonCode: null },
  linkState: 'active',
  linkedScanId: 'fake-scan-2',
  correctionSeq: 2,
});

const correctionUnlinked = () => ({
  scanId: 'fake-scan-1',
  action: 'unlink',
  changed: true,
  basis: 'SCAN_PROTOCOL',
  exclusion: null,
  linkState: 'unlinked_by_admin',
  linkedScanId: 'fake-scan-2',
  correctionSeq: 1,
});

const correctionRelinked = () => ({
  scanId: 'fake-scan-1',
  action: 'relink',
  changed: true,
  basis: 'SCAN_PROTOCOL',
  exclusion: null,
  linkState: 'relinked_by_admin',
  linkedScanId: 'fake-scan-3',
  correctionSeq: 3,
});

/** exclude on a scan already excluded for the same reason: nothing written (A11 (4)). */
const correctionUnchanged = () => ({
  scanId: 'fake-scan-1',
  action: 'exclude',
  changed: false,
  basis: 'SCAN_PROTOCOL',
  exclusion: { state: 'excluded', reasonCode: 'test' },
  linkState: 'active',
  linkedScanId: 'fake-scan-2',
  correctionSeq: null,
});

/** a scan older than `scanProtocol` (E16): the line alone, no link fields (A11 (3)). */
const correctionReportOnly = () => ({
  scanId: 'fake-scan-old',
  action: 'exclude',
  changed: true,
  basis: 'REPORT_ONLY',
  exclusion: { state: 'excluded', reasonCode: 'golden_reference' },
  linkState: null,
  linkedScanId: null,
  correctionSeq: 1,
});

module.exports = {
  correctionExcluded,
  correctionUnexcluded,
  correctionUnlinked,
  correctionRelinked,
  correctionUnchanged,
  correctionReportOnly,
};
