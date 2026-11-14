'use client';

// Centralised auth bootstrap.
//
// Mounted once at the root (app/layout.js). Two responsibilities:
//   1. Subscribe to Firebase auth state and expose it via useAuth()
//      for any future page that wants it.
//   2. SIDE EFFECT — after every successful sign-in, check whether the
//      user has a Firestore `users/{uid}` document. If not, call the
//      `registerUser` Cloud Function which seeds the doc with the canonical
//      schema (plan: 'free', scansRemaining from settings/app, etc).
//
// Existing pages (login, dashboard, Navbar, AdminGuard, admin/layout)
// still subscribe to onAuthStateChanged independently — that's intentional
// and harmless. Firebase de-duplicates listeners internally; this provider
// just guarantees the user-doc creation runs in exactly one place,
// no matter which page the user lands on first.

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { auth, db, functions } from '@/firebase';

const AuthContext = createContext({
  user: null,
  authReady: false,
  profileChecked: false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  // UIDs we've already verified have a Firestore doc — prevents duplicate
  // registerUser calls when onAuthStateChanged fires multiple times for the
  // same user (e.g. token refresh, page focus).
  const ensuredRef = useRef(new Set());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthReady(true);

      if (!u) {
        setProfileChecked(false);
        return;
      }

      const uid = u.uid;
      if (ensuredRef.current.has(uid)) {
        setProfileChecked(true);
        return;
      }

      // Mark optimistically to block concurrent re-fires.
      ensuredRef.current.add(uid);

      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) {
          // Doc missing → first-time sign-in from web. The Cloud Function
          // uses admin SDK and reads settings/app to populate the canonical
          // schema. Empty payload — the function reads the caller's uid
          // from context.auth.
          const register = httpsCallable(functions, 'registerUser');
          await register({});
        }
        setProfileChecked(true);
      } catch (e) {
        // Roll back the marker so we retry on the next auth event (e.g.
        // a transient network failure shouldn't permanently block the
        // user from getting a profile).
        ensuredRef.current.delete(uid);
        // eslint-disable-next-line no-console
        console.warn('[AuthContext] ensureUserDoc failed:', e);
        // Still mark profile as "checked" so consumers don't hang forever.
        // The next auth event will retry.
        setProfileChecked(true);
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, authReady, profileChecked }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
