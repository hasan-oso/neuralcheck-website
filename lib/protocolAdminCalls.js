// The protocol admin callables, called (the five of W-P6-14, and since W-P6-18 /
// W-P6-20 correctProtocolRecord, getMarketingNames and setMarketingNames). This
// is the ONLY place the admin protocol pages reach the server: no `setDoc`,
// `updateDoc`, `deleteDoc` or `addDoc` on any
// protocol collection, ever (the guard rules of the collections allow the
// admin a direct write, and the decision of the design is that the pages go
// through the functions — P6:765, A0 item 1). A test scans the new files for
// those calls.
//
// Each wrapper returns `res.data` as the server sent it, unread; the readers in
// lib/protocolAdminReaders.js give it meaning. The panels take the wrappers as
// props (the AiModelCard pattern), so a test can hand them fakes.
//
// The eight are in the production function list at neuralcheck-backend@488e3ee
// (the five of W-P6-14 arrived with fd730ac, the three of W-P6-18 / W-P6-20 with
// @5361116; published 2026-10-21 18:25, DEPLOY-LIST-MAINTENANCE-PAIRS-
// 0dfe892-2026-10-22.md lines 46 and 73 — NOT checked against production from
// this repo). Were one missing, a call would answer `functions/not-found`,
// which the pages show as a failed call.

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { PROTOCOL_ADMIN_FN } from '@/lib/protocolAdminWire';
import { PROTOCOL_CORRECTION_FN } from '@/lib/protocolCorrectionWire';
import { MARKETING_NAMES_FN, MARKETING_REQUEST_KEY } from '@/lib/marketingNamesWire';

async function call(name, payload) {
  const fn = httpsCallable(functions, name);
  const res = await fn(payload);
  return res?.data;
}

/** getProtocolSettings() — no input; `{}` as getAiConfig is called (AiModelCard). */
export function callGetProtocolSettings() {
  return call(PROTOCOL_ADMIN_FN.GET_SETTINGS, {});
}

/** setProtocolSettings({ settings: <patch> }). */
export function callSetProtocolSettings(patch) {
  return call(PROTOCOL_ADMIN_FN.SET_SETTINGS, { settings: patch });
}

/** getShopProtocolConfig({ ownerId }). */
export function callGetShopProtocolConfig(ownerId) {
  return call(PROTOCOL_ADMIN_FN.GET_SHOP, { ownerId });
}

/** setShopProtocolParts({ ownerId, parts: <patch> }). */
export function callSetShopProtocolParts(ownerId, parts) {
  return call(PROTOCOL_ADMIN_FN.SET_PARTS, { ownerId, parts });
}

/** manageTechnician(<payload from lib/protocolAdminPatch.js>). */
export function callManageTechnician(payload) {
  return call(PROTOCOL_ADMIN_FN.MANAGE_TECHNICIAN, payload);
}

// ---- W-P6-18 and W-P6-20 (neuralcheck-backend@5361116; in the production list at 488e3ee too) ----

/** correctProtocolRecord(<payload from lib/protocolCorrectionPatch.js>) — an append, never a delete. */
export function callCorrectProtocolRecord(payload) {
  return call(PROTOCOL_CORRECTION_FN.CORRECT, payload);
}

/** getMarketingNames() — it reads no input (A12 (3)); `{}` as getAiConfig is called. */
export function callGetMarketingNames() {
  return call(MARKETING_NAMES_FN.GET, {});
}

/** setMarketingNames({ entries: <the update-or-append patch from lib/marketingNamesPatch.js> }). */
export function callSetMarketingNames(entries) {
  return call(MARKETING_NAMES_FN.SET, { [MARKETING_REQUEST_KEY.ENTRIES]: entries });
}
