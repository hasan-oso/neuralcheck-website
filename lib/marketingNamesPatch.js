// What the marketing-names page SENDS: the `entries` patch of `setMarketingNames`
// built from the rows the admin edited — pure functions, so the exact payload is
// testable against the contract (A12 (1), (2); neuralcheck-backend@5361116).
//
// Rules they keep:
//
//   - The server takes an UPDATE-OR-APPEND patch keyed by `model`, literally
//     (A12 (2): «رقعة بالتحديث-أو-الإضافة بـmodel»; case and spaces count): an
//     entry whose model is saved is REPLACED in its place, a new model is
//     appended at the end in the order sent; nothing is deleted or reordered,
//     and the whole list is never replaced. So the page sends only what the
//     admin CHANGED (a saved entry whose names differ) and what he ADDED; an
//     untouched entry is not sent.
//
//   - A new row whose model is already saved is NOT sent: the server would read
//     it as an update and overwrite the saved names without the admin having
//     opened them. It is a problem the page names; the saved entry is edited in
//     its own row.
//
//   - Every entry carries ALL FOUR keys, each non-empty (A12 (1): «المفاتيح
//     الأربعة كلّها إلزامية»). A saved entry cannot be emptied (there is no
//     delete and no partial entry); a new row is either entirely blank (then it
//     is nothing and is not sent) or complete.
//
//   - The values go as typed: the model is NOT trimmed — the server rejects a
//     model with a space at an end on purpose («يُخفي فرقاً لا يُرى»), so a
//     silent trim here would hide the very thing it protects against. A text
//     of only spaces counts as empty.
//
//   - The site does not repeat the server's limits (≤ 1000 entries, 64 and 120
//     characters): they come from `limits` and a value over them is answered
//     with a refusal the page shows (A10 (3), the same stance).

import {
  MARKETING_ENTRY_KEY as E,
  MARKETING_ENTRY_KEYS,
  MARKETING_NAME_KEYS,
} from '@/lib/marketingNamesWire';
import { MARKETING_VIEW } from '@/lib/marketingNamesReaders';

/** A blank row for a new entry. */
export function newMarketingRow() {
  return { model: '', ar: '', tr: '', en: '', saved: false };
}

/** The rows the page edits, started from what the server sent (none unless the map is PRESENT). */
export function initialMarketingRows(read) {
  if (!read || read.view !== MARKETING_VIEW.PRESENT) return [];
  return read.entries.map((e) => ({ model: e.model, ar: e.ar, tr: e.tr, en: e.en, saved: true }));
}

/** Why a row cannot be sent as it stands. */
export const MARKETING_ROW_PROBLEM = Object.freeze({
  /** a saved entry with a name emptied. */
  CANNOT_CLEAR: 'CANNOT_CLEAR',
  /** a new row with some of the four keys empty and some not. */
  ROW_INCOMPLETE: 'ROW_INCOMPLETE',
  /** a new row whose model is already saved. */
  MODEL_ALREADY_SAVED: 'MODEL_ALREADY_SAVED',
  /** a new row whose model is the model of an earlier new row. */
  MODEL_DUPLICATE: 'MODEL_DUPLICATE',
});

const isBlank = (v) => typeof v !== 'string' || v.trim() === '';

/**
 * `{ entries, problems, counts }`: `entries` is the patch (changed saved entries
 * in their order, then the new ones in the order typed); `problems` is a list of
 * `{ row, problem }` (row = index in `rows`) — while it is not empty the page
 * does not send; `counts` is `{ updated, added }` as the page expects the server
 * to answer.
 */
export function buildMarketingPatch(read, rows) {
  const entries = [];
  const problems = [];
  const counts = { updated: 0, added: 0 };

  const saved = new Map();
  if (read && read.view === MARKETING_VIEW.PRESENT) for (const e of read.entries) saved.set(e.model, e);
  const newModels = new Set();

  (Array.isArray(rows) ? rows : []).forEach((row, index) => {
    const r = row && typeof row === 'object' ? row : {};
    const was = r.saved === true ? saved.get(r.model) : undefined;

    if (was) {
      // a saved entry: the model is its key and is not editable
      if (MARKETING_NAME_KEYS.some((k) => isBlank(r[k]))) {
        problems.push({ row: index, problem: MARKETING_ROW_PROBLEM.CANNOT_CLEAR });
      } else if (MARKETING_NAME_KEYS.some((k) => r[k] !== was[k])) {
        entries.push({ [E.MODEL]: was.model, [E.AR]: r.ar, [E.TR]: r.tr, [E.EN]: r.en });
        counts.updated += 1;
      }
      return;
    }

    // a new row
    const blanks = MARKETING_ENTRY_KEYS.filter((k) => isBlank(r[k]));
    if (blanks.length === MARKETING_ENTRY_KEYS.length) return; // nothing typed: nothing to send
    if (blanks.length > 0) {
      problems.push({ row: index, problem: MARKETING_ROW_PROBLEM.ROW_INCOMPLETE });
      return;
    }
    if (saved.has(r.model)) {
      problems.push({ row: index, problem: MARKETING_ROW_PROBLEM.MODEL_ALREADY_SAVED });
      return;
    }
    if (newModels.has(r.model)) {
      problems.push({ row: index, problem: MARKETING_ROW_PROBLEM.MODEL_DUPLICATE });
      return;
    }
    newModels.add(r.model);
    entries.push({ [E.MODEL]: r.model, [E.AR]: r.ar, [E.TR]: r.tr, [E.EN]: r.en });
    counts.added += 1;
  });

  return { entries, problems, counts };
}
