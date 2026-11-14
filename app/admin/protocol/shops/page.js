'use client';

// /admin/protocol/shops — the parts per shop and the technicians (W-P6-14).
// Invisible until the texts are approved: see
// components/admin/protocol/ProtocolGate.js.

import ProtocolGate from '@/components/admin/protocol/ProtocolGate';
import ShopProtocolPanel from '@/components/admin/protocol/ShopProtocolPanel';

export default function AdminProtocolShopsPage() {
  return (
    <ProtocolGate>
      <ShopProtocolPanel />
    </ProtocolGate>
  );
}
