'use client';

// The pages of the protocol admin, as tabs (W-P6-14: settings and shops; W-P6-18:
// the correction; W-P6-20: the marketing-name map).

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_PROTOCOL_TEXTS as T } from '@/lib/adminProtocolTexts';

export const PROTOCOL_ROUTES = Object.freeze({
  SETTINGS: '/admin/protocol',
  SHOPS: '/admin/protocol/shops',
  CORRECTIONS: '/admin/protocol/corrections',
  MARKETING_NAMES: '/admin/protocol/marketing-names',
});

const TABS = [
  { href: PROTOCOL_ROUTES.SETTINGS, label: T.settingsTitle },
  { href: PROTOCOL_ROUTES.SHOPS, label: T.shopsTitle },
  { href: PROTOCOL_ROUTES.CORRECTIONS, label: T.correctionsTitle },
  { href: PROTOCOL_ROUTES.MARKETING_NAMES, label: T.marketingTitle },
];

export default function ProtocolTabs() {
  const pathname = usePathname() || '';
  // trailingSlash is on (next.config.js), so a path may end in "/".
  const here = pathname.replace(/\/+$/, '');
  return (
    <nav className="flex flex-wrap gap-2 border-b border-nc-border pb-3">
      {TABS.map((tab) => {
        const active = here === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`px-4 py-2 rounded-lg text-sm transition border ${
              active
                ? 'bg-nc-green/10 text-nc-green border-nc-green/30'
                : 'text-nc-text2 hover:text-nc-text1 hover:bg-nc-surface border-transparent'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
