// What the admin pages SEND: the settings patch, the parts patch and the
// technician payloads — pure functions, so the exact payloads are testable
// against the contract (A10 (2), (5), (6); neuralcheck-backend@fd730ac).
//
// Rules they keep:
//
//   - A PATCH, never a replacement (A10 (2): «الرقعة لا الاستبدال: لا حقل
//     إلزامي ولا مسح»). Only a field the admin changed goes in; a field left
//     as it was is not sent; `null` is never sent (the server refuses it).
//
//   - An EMPTY input is an absence, not a zero (rule 22): `Number('')` is 0, so
//     the text is parsed here by `parseNumberText`, which has a state for
//     «empty», and an empty input on a field that is not saved yet simply sends
//     nothing for it.
//
//   - The site does not repeat the server's ranges (rates in [0,1], hours in
//     [1, 8760]…): the server owns them and sends `limits` (A10 (3): «الواجهة
//     لا تكرّرها»), and a value outside them comes back as a refusal the page
//     shows. What is checked here is only that a number is a number.
//
//   - No delete anywhere: a technician is added, renamed or switched off
//     (TECH_ACTION has no delete), a saved return-reason key is not removed.

import { toLatinDigits } from '@/lib/format';
import {
  SETTINGS_FIELDS,
  SETTINGS_FIELD_TYPE,
  PROTOCOL_PARTS,
  TECH_ACTION,
} from '@/lib/protocolAdminWire';
import { FIELD_STATE, PART_STATE } from '@/lib/protocolAdminReaders';

// ---------------------------------------------------------------------------
// a number typed in a box
// ---------------------------------------------------------------------------

export const NUMBER_TEXT = Object.freeze({
  EMPTY: 'EMPTY',
  INVALID: 'INVALID',
  VALID: 'VALID',
});

/** «0.25», «168», «٠٫٢٥» is not accepted (only the Latin digits and a dot). */
export function parseNumberText(text) {
  if (text === null || text === undefined) return { state: NUMBER_TEXT.EMPTY };
  if (typeof text !== 'string') return { state: NUMBER_TEXT.INVALID };
  const t = toLatinDigits(text).trim();
  if (t === '') return { state: NUMBER_TEXT.EMPTY };
  if (!/^-?\d+(\.\d+)?$/.test(t)) return { state: NUMBER_TEXT.INVALID };
  const value = Number(t);
  if (!Number.isFinite(value)) return { state: NUMBER_TEXT.INVALID };
  return { state: NUMBER_TEXT.VALID, value };
}

// ---------------------------------------------------------------------------
// the settings form
// ---------------------------------------------------------------------------

/** The three states of the boolean select: not set, true, false. */
export const BOOL_CHOICE = Object.freeze({ UNSET: 'unset', TRUE: 'true', FALSE: 'false' });

/**
 * The form the settings page edits, started from what the server sent:
 * a text for each number and the version text, a BOOL_CHOICE for the switch,
 * and the rows for the return reasons (saved rows are marked: their key is not
 * editable and they are not removable).
 */
export function initialSettingsForm(read) {
  const form = {};
  for (const name of SETTINGS_FIELDS) {
    const field = read.fields[name];
    const type = SETTINGS_FIELD_TYPE[name];
    if (type === 'number') {
      form[name] = field.state === FIELD_STATE.PRESENT ? String(field.value) : '';
    } else if (type === 'string') {
      form[name] = field.state === FIELD_STATE.PRESENT ? field.value : '';
    } else if (type === 'boolean') {
      form[name] =
        field.state === FIELD_STATE.PRESENT
          ? field.value
            ? BOOL_CHOICE.TRUE
            : BOOL_CHOICE.FALSE
          : BOOL_CHOICE.UNSET;
    } else {
      form[name] =
        field.state === FIELD_STATE.PRESENT
          ? field.value.map((e) => ({ ...e, saved: true }))
          : [];
    }
  }
  return form;
}

/** Why a field of the form cannot be sent as it stands. */
export const FORM_PROBLEM = Object.freeze({
  INVALID_NUMBER: 'INVALID_NUMBER',
  CANNOT_CLEAR: 'CANNOT_CLEAR',
});

const sameReasons = (a, b) =>
  a.length === b.length &&
  a.every(
    (e, i) => e.key === b[i].key && e.ar === b[i].ar && e.tr === b[i].tr && e.active === b[i].active
  );

/**
 * The patch for what the admin changed: `{ patch, problems, changedFields }`.
 * `problems` is a list of `{ field, problem }`; while it is not empty the page
 * does not send.
 */
export function buildSettingsPatch(read, form) {
  const patch = {};
  const problems = [];

  for (const name of SETTINGS_FIELDS) {
    const field = read.fields[name];
    const type = SETTINGS_FIELD_TYPE[name];
    const present = field.state === FIELD_STATE.PRESENT;
    const value = form[name];

    if (type === 'number') {
      const parsed = parseNumberText(value);
      if (parsed.state === 'INVALID') problems.push({ field: name, problem: FORM_PROBLEM.INVALID_NUMBER });
      else if (parsed.state === 'EMPTY') {
        if (present) problems.push({ field: name, problem: FORM_PROBLEM.CANNOT_CLEAR });
      } else if (!present || parsed.value !== field.value) patch[name] = parsed.value;
    } else if (type === 'string') {
      const text = typeof value === 'string' ? value.trim() : '';
      if (text === '') {
        if (present) problems.push({ field: name, problem: FORM_PROBLEM.CANNOT_CLEAR });
      } else if (!present || text !== field.value) patch[name] = text;
    } else if (type === 'boolean') {
      if (value === BOOL_CHOICE.UNSET) {
        if (present) problems.push({ field: name, problem: FORM_PROBLEM.CANNOT_CLEAR });
      } else {
        const next = value === BOOL_CHOICE.TRUE;
        if (!present || next !== field.value) patch[name] = next;
      }
    } else {
      const rows = (Array.isArray(value) ? value : []).map((r) => ({
        key: r.key,
        ar: r.ar,
        tr: r.tr,
        active: r.active,
      }));
      if (present) {
        if (!sameReasons(rows, field.value)) patch[name] = rows;
      } else if (rows.length > 0) {
        patch[name] = rows;
      }
    }
  }

  return { patch, problems, changedFields: Object.keys(patch) };
}

// ---------------------------------------------------------------------------
// the six parts of a shop
// ---------------------------------------------------------------------------

/**
 * The draft of the six switches: `true` / `false` for a part the admin chose,
 * `null` for one he did not touch. Started all-null: nothing is sent for a part
 * nobody changed, and a part the server could not read is never turned into
 * «off» by default.
 */
export function initialPartsDraft() {
  return Object.fromEntries(PROTOCOL_PARTS.map((k) => [k, null]));
}

/** The parts patch: only a part with a chosen value that differs from the saved one. */
export function buildPartsPatch(shop, draft) {
  const patch = {};
  for (const key of PROTOCOL_PARTS) {
    const chosen = draft[key];
    if (chosen !== true && chosen !== false) continue;
    const saved = shop.parts[key].state;
    const savedBool = saved === PART_STATE.ON ? true : saved === PART_STATE.OFF ? false : null;
    if (savedBool !== chosen) patch[key] = chosen;
  }
  return patch;
}

// ---------------------------------------------------------------------------
// the technicians — the three payloads (A10 (6))
// ---------------------------------------------------------------------------

export function addTechnicianPayload(ownerId, displayName) {
  return { ownerId, action: TECH_ACTION.ADD, displayName: String(displayName).trim() };
}

export function renameTechnicianPayload(ownerId, technicianId, displayName) {
  return { ownerId, action: TECH_ACTION.RENAME, technicianId, displayName: String(displayName).trim() };
}

export function setTechnicianActivePayload(ownerId, technicianId, active) {
  // `active` is required and boolean on the wire (A10 (6)); a missing or
  // non-boolean one is a bug of the caller, not a «false» to be made up here.
  if (typeof active !== 'boolean') throw new TypeError('active must be a boolean');
  return { ownerId, action: TECH_ACTION.SET_ACTIVE, technicianId, active };
}

