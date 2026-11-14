'use strict';

// The door of the protocol admin pages (lib/protocolAdminCalls.js): every wrapper
// calls the function of its name with the payload of the contract, returns what
// the server sent unread, and lets a rejection through as it came (the pages read
// `details.reasonCode` from it — rule 21).
//
// The panels' own tests hand the pages fakes for these wrappers (the AiModelCard
// pattern), so nothing else proves the name and the payload each wrapper puts on
// the wire. This file does, for the five wrappers of W-P6-14 and the three of
// W-P6-18 / W-P6-20, by replacing the SDK's httpsCallable with a recorder.
//
// Names and payload shapes: neuralcheck-backend@fd730ac A10 (W-P6-14) and
// @5361116 A11 / A12 (the copies in evidence/run-2026-10-18/). Not checked
// against neuralcheck-backend (outside this repo).
//
// Run: node scripts/test/protocolAdminCalls.test.cjs

require('./_jsx-require-hook.cjs');

function install(request, exports) {
  const key = require.resolve(request);
  require.cache[key] = { id: key, filename: key, loaded: true, exports, children: [], paths: [] };
}
const seen = [];
let reject = null;
install('firebase/functions', {
  getFunctions: () => ({}),
  httpsCallable: (_functions, name) => async (payload) => {
    seen.push({ name, payload: payload === undefined ? '__undefined__' : JSON.parse(JSON.stringify(payload)) });
    if (reject) throw reject;
    return { data: { echoed: name } };
  },
});
install('@/firebase', { functions: {}, db: {}, auth: {} });
const C = require('@/lib/protocolAdminCalls');

let pass = 0;
let total = 0;
function check(name, cond) {
  total += 1;
  if (cond) pass += 1;
  else console.error(`  FAIL: ${name}`);
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  const ENTRIES = [{ model: 'FAKE-MODEL-A', ar: 'FAKE-AR-A', tr: 'FAKE-TR-A', en: 'FAKE-EN-A' }];
  const CORRECTION = { action: 'exclude', scanId: 'fake-scan-1', reason: 'test' };
  const TECH = { ownerId: 'fake-owner-1', action: 'add', displayName: 'FAKE-TECH-X' };
  // wrapper → [the function it calls, how it is called, the payload on the wire]
  const TABLE = {
    callGetProtocolSettings: ['getProtocolSettings', () => C.callGetProtocolSettings(), {}],
    callSetProtocolSettings: ['setProtocolSettings', () => C.callSetProtocolSettings({ repeatRate: 0.5 }), { settings: { repeatRate: 0.5 } }],
    callGetShopProtocolConfig: ['getShopProtocolConfig', () => C.callGetShopProtocolConfig('fake-owner-1'), { ownerId: 'fake-owner-1' }],
    callSetShopProtocolParts: ['setShopProtocolParts', () => C.callSetShopProtocolParts('fake-owner-1', { consent: true }), { ownerId: 'fake-owner-1', parts: { consent: true } }],
    callManageTechnician: ['manageTechnician', () => C.callManageTechnician(TECH), TECH],
    callCorrectProtocolRecord: ['correctProtocolRecord', () => C.callCorrectProtocolRecord(CORRECTION), CORRECTION],
    callGetMarketingNames: ['getMarketingNames', () => C.callGetMarketingNames(), {}],
    callSetMarketingNames: ['setMarketingNames', () => C.callSetMarketingNames(ENTRIES), { entries: ENTRIES }],
  };

  check('every exported wrapper is in this table (a new wrapper without a test fails here)', eq(Object.keys(C).sort(), Object.keys(TABLE).sort()));
  for (const [wrapper, [fn, run, payload]] of Object.entries(TABLE)) {
    seen.length = 0;
    const out = await run();
    check(`${wrapper}: calls exactly one function, ${fn}`, seen.length === 1 && seen[0].name === fn);
    check(`${wrapper}: the payload on the wire is the contract's`, eq(seen[0].payload, payload));
    check(`${wrapper}: returns what the server sent, unread (res.data)`, eq(out, { echoed: fn }));
  }

  // a rejection passes through unchanged: same object, details intact
  const err = { code: 'functions/failed-precondition', message: 'CORRECTION_NOT_LINKED', details: { reasonCode: 'CORRECTION_NOT_LINKED' } };
  reject = err;
  for (const [wrapper, [, run]] of Object.entries(TABLE)) {
    let caught = null;
    try { await run(); } catch (e) { caught = e; }
    check(`${wrapper}: a rejection reaches the page as the SDK raised it (the same object)`, caught === err);
  }

  console.log(`${pass}/${total} assertions passed`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
