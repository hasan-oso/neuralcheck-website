// Layout-level guard for the technician evaluation panel.
//
// Same pattern as app/admin/layout.js — the guard wraps the whole route
// segment so no child page repeats the auth check. Kept as a SERVER component
// so it can also export `metadata` (app/admin/layout.js is 'use client' and
// therefore cannot); the client-side pieces live in TechGuard.
//
// `dir="rtl"` + `font-tajawal` are pinned here, exactly as the admin layout
// does, because this panel is Arabic-only.

import TechGuard from '@/components/tech/TechGuard';
import { ToastProvider } from '@/components/admin/Toast';

export const metadata = {
  title: 'تقييم الفنّي — NeuralCheck',
  description: 'لوحة تقييم دقّة تقارير NeuralCheck من قِبل فنّي المتجر.',
  robots: { index: false, follow: false },
};

export default function TechLayout({ children }) {
  return (
    <TechGuard>
      <ToastProvider>
        <div
          dir="rtl"
          className="min-h-screen bg-nc-bg text-nc-text1 font-tajawal"
        >
          {children}
        </div>
      </ToastProvider>
    </TechGuard>
  );
}
