'use client';

import { useLang } from '@/lib/LanguageContext';
import {
  LockClosedIcon,
  CpuChipIcon,
  CheckBadgeIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';

export default function TrustBar() {
  const { t } = useLang();
  const items = [
    { Icon: LockClosedIcon, label: t.trust.encrypted },
    { Icon: CpuChipIcon, label: t.trust.ai },
    { Icon: CheckBadgeIcon, label: t.trust.verifiable },
    { Icon: DevicePhoneMobileIcon, label: t.trust.models },
  ];

  return (
    <section className="border-y border-nc-border bg-nc-card/40 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        {items.map(({ Icon, label }, i) => (
          <div
            key={i}
            className="flex items-center justify-center gap-2 text-nc-text2 text-sm"
          >
            <Icon className="w-5 h-5 text-nc-green flex-shrink-0" strokeWidth={1.5} />
            <span className="whitespace-nowrap">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
