'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import AdminGuard from '@/components/admin/AdminGuard';
import Sidebar from '@/components/admin/Sidebar';
import { ToastProvider } from '@/components/admin/Toast';

export default function AdminLayout({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  return (
    <AdminGuard>
      <ToastProvider>
        <div dir="rtl" className="min-h-screen bg-nc-bg text-nc-text1 flex flex-col md:flex-row font-tajawal">
          <Sidebar user={user} />
          <main className="flex-1 min-w-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </ToastProvider>
    </AdminGuard>
  );
}
