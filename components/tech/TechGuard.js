'use client';

// Route guard for /tech — mirrors the shape of components/admin/AdminGuard.js
// but with ONE difference: it gates on authentication only.
//
// There is deliberately no plan check and no role check. The technician signs
// in with the shop's own account; the data he sees is scoped by the Firestore
// queries (userId == uid) and by the backend's ownership check, not by a
// client-side role. Adding a plan gate here would lock out partner shops on
// any plan we later rename.
//
// NOTE: the site is a static export, so this — like every other guard in the
// project — is a UX redirect, not a security boundary. Firestore rules and the
// submitEvaluation function are what actually protect the data.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '@/firebase';
import { PageSpinner } from '@/components/admin/Spinner';

export default function TechGuard({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (checking) return;
    if (!user) router.replace('/login');
  }, [checking, user, router]);

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <PageSpinner label="جاري التحقق من الدخول..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <PageSpinner label="جاري إعادة التوجيه إلى تسجيل الدخول..." />
      </div>
    );
  }

  return children;
}
