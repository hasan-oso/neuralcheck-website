'use client';

// /admin/protocol — the protocol settings (W-P6-14). Invisible until the texts
// are approved: see components/admin/protocol/ProtocolGate.js.

import ProtocolGate from '@/components/admin/protocol/ProtocolGate';
import ProtocolSettingsPanel from '@/components/admin/protocol/ProtocolSettingsPanel';

export default function AdminProtocolPage() {
  return (
    <ProtocolGate>
      <ProtocolSettingsPanel />
    </ProtocolGate>
  );
}
