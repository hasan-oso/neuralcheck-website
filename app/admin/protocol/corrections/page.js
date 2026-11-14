'use client';

// /admin/protocol/corrections — the correction by appending (W-P6-18). Invisible
// until the texts are approved: see components/admin/protocol/ProtocolGate.js.

import ProtocolGate from '@/components/admin/protocol/ProtocolGate';
import ProtocolCorrectionPanel from '@/components/admin/protocol/ProtocolCorrectionPanel';

export default function AdminProtocolCorrectionsPage() {
  return (
    <ProtocolGate>
      <ProtocolCorrectionPanel />
    </ProtocolGate>
  );
}
