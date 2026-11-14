'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import Logo from '@/components/Logo';
import { ADMIN_PROTOCOL_TEXTS_APPROVED } from '@/lib/featureFlags';
import { ADMIN_PROTOCOL_TEXTS } from '@/lib/adminProtocolTexts';
import {
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  UsersIcon,
  CreditCardIcon,
  DocumentTextIcon,
  GiftIcon,
  EnvelopeIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const NAV = [
  { href: '/admin', label: 'لوحة التحكم', Icon: ChartBarIcon, exact: true },
  { href: '/admin/users', label: 'المستخدمون', Icon: UsersIcon },
  { href: '/admin/payments', label: 'الدفعات', Icon: CreditCardIcon },
  { href: '/admin/reports', label: 'التقارير', Icon: DocumentTextIcon },
  { href: '/admin/promos', label: 'العروض', Icon: GiftIcon },
  { href: '/admin/messages', label: 'الرسائل', Icon: EnvelopeIcon, disabled: true },
  { href: '/admin/settings', label: 'الإعدادات', Icon: Cog6ToothIcon },
  // The protocol pages (W-P6-14) have no entry until their texts are approved
  // (lib/featureFlags.js, ADMIN_PROTOCOL_TEXTS_APPROVED).
  ...(ADMIN_PROTOCOL_TEXTS_APPROVED
    ? [
        {
          href: '/admin/protocol',
          label: ADMIN_PROTOCOL_TEXTS.navLabel,
          Icon: ClipboardDocumentCheckIcon,
        },
      ]
    : []),
];

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await signOut(auth);
    router.replace('/login');
  };

  const isActive = (item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-nc-border bg-nc-card sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-outfit font-extrabold nc-gradient-text">
            Admin
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-nc-text1 hover:bg-nc-surface"
          aria-label="فتح القائمة"
        >
          <Bars3Icon className="w-6 h-6" strokeWidth={2} />
        </button>
      </div>

      {/* Backdrop (mobile) */}
      <div
        className={`fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 start-0 z-[80] md:z-30 h-screen w-64 bg-nc-card border-e border-nc-border flex flex-col transition-transform duration-300 md:!translate-x-0 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-nc-border">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-outfit font-extrabold nc-gradient-text text-lg">
              Admin
            </span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-nc-text3 hover:text-nc-text1 hover:bg-nc-surface"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(item);
            const Icon = item.Icon;
            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-nc-text3/70 text-sm cursor-not-allowed"
                  title="قريباً"
                >
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                  <span>{item.label}</span>
                  <span className="ms-auto text-[10px] px-1.5 py-0.5 rounded bg-nc-surface text-nc-text3">
                    قريباً
                  </span>
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? 'bg-nc-green/10 text-nc-green border border-nc-green/30'
                    : 'text-nc-text2 hover:text-nc-text1 hover:bg-nc-surface border border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-nc-border">
          {user && (
            <div className="px-3 py-2 text-xs text-nc-text3 truncate">
              {user.email}
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-nc-text2 hover:text-nc-grade-d hover:bg-nc-grade-d/10 transition"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" strokeWidth={1.8} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
