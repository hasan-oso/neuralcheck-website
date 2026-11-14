'use client';

// Keeps the protocol admin pages invisible until their texts are approved.
//
// While ADMIN_PROTOCOL_TEXTS_APPROVED (lib/featureFlags.js) is false this
// renders NOTHING of its children — not a message, not a placeholder, because
// any sentence it showed would itself be an unapproved text — and sends the
// visitor to /admin. The pages themselves are mounted only through this gate,
// so with the flag false none of their code runs: no callable is called, no
// collection is read.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_PROTOCOL_TEXTS_APPROVED } from '@/lib/featureFlags';

export default function ProtocolGate({ children }) {
  const router = useRouter();

  useEffect(() => {
    if (!ADMIN_PROTOCOL_TEXTS_APPROVED) router.replace('/admin');
  }, [router]);

  return ADMIN_PROTOCOL_TEXTS_APPROVED ? children : null;
}
