'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { ADMIN_EMAILS } from '@/lib/admin';
import { PageSpinner } from './Spinner';

function checkAdmin(user) {
  if (!user?.email) return false;
  const email = user.email.toLowerCase().trim();
  return ADMIN_EMAILS.some((e) => e.toLowerCase().trim() === email);
}

export default function AdminGuard({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      // eslint-disable-next-line no-console
      console.log('[AdminGuard] Auth user email:', u?.email);
      // eslint-disable-next-line no-console
      console.log('[AdminGuard] ADMIN_EMAILS:', ADMIN_EMAILS);
      // eslint-disable-next-line no-console
      console.log('[AdminGuard] Is admin:', checkAdmin(u));
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!checkAdmin(user)) {
      // eslint-disable-next-line no-console
      console.warn('[AdminGuard] Redirecting to /login — user:', user?.email);
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <PageSpinner label="التحقق من الصلاحيات..." />
      </div>
    );
  }

  if (!checkAdmin(user)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <PageSpinner label="جاري إعادة التوجيه..." />
      </div>
    );
  }

  return children;
}
