// The shop picker of /admin/protocol/shops: which accounts can be chosen, and
// how the list is filtered. READ ONLY.
//
// The five protocol callables are keyed by `ownerId` (the shop's uid) and
// there is no admin function that lists shops, so the picker reads `users`
// the way the existing users page does (app/admin/users/page.js loadUsers:
// getDocs of `users`). Nothing is written here; every write of this feature
// goes through lib/protocolAdminCalls.js.
//
// No account is assumed to be a shop (the plan values `shop_basic` and
// `shop_pro` are not filtered on: nothing in the contract says which accounts
// the protocol applies to), so every account is listed and the server answers
// `SHOP_NOT_FOUND` for an id it does not know.

import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

/** The most rows the picker lists at once. */
export const PICKER_LIMIT = 100;

/** `{ id, name, email }` of an account — absent parts stay null, not ''. */
export function shopCandidate(id, data) {
  const d = data && typeof data === 'object' ? data : {};
  const text = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
  return {
    id,
    name: text(d.displayName) || text(d.name),
    email: text(d.email),
  };
}

export async function loadShopCandidates() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => shopCandidate(d.id, d.data()));
}

/** What the picker shows for an account: its name, else its e-mail, else its id. */
export function shopLabel(c) {
  return c.name || c.email || c.id;
}

/** The accounts matching a search text (name, e-mail or id), first PICKER_LIMIT. */
export function filterShops(candidates, search) {
  const q = (search || '').trim().toLowerCase();
  const hits = q
    ? candidates.filter((c) =>
        [c.name, c.email, c.id].some((v) => typeof v === 'string' && v.toLowerCase().includes(q))
      )
    : candidates;
  return hits.slice(0, PICKER_LIMIT);
}
