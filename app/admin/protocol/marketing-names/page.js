'use client';

// /admin/protocol/marketing-names — the marketing-name map (W-P6-20). Invisible
// until the texts are approved: see components/admin/protocol/ProtocolGate.js.

import ProtocolGate from '@/components/admin/protocol/ProtocolGate';
import MarketingNamesPanel from '@/components/admin/protocol/MarketingNamesPanel';

export default function AdminProtocolMarketingNamesPage() {
  return (
    <ProtocolGate>
      <MarketingNamesPanel />
    </ProtocolGate>
  );
}
