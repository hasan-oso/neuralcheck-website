'use client';

// How a failed call is shown — by the refusal's CODE (rule 21), never by the
// exception's text. The code is printed as the server sends it, in monospace:
// the server's refusal messages ARE their technical codes (A10 (4)), so no
// Arabic sentence per code is invented here (the order: refusals are read from
// `details.reasonCode`).

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ADMIN_PROTOCOL_TEXTS as T } from '@/lib/adminProtocolTexts';
import { classifyCallError } from '@/lib/protocolAdminReaders';

/**
 * A thrown error → what the page keeps and shows. `knownCodes` (a Set) is the
 * refusal codes of the contract the calling page follows; left out, it is A10's
 * (the settings and shops pages).
 */
export function toFailure(err, knownCodes) {
  const c = classifyCallError(err, knownCodes);
  return {
    refused: c.reasonCode !== null,
    code: c.reasonCode !== null ? c.reasonCode : c.transportCode,
    field: c.field,
    known: c.known,
  };
}

/** A reply that came back but could not be read: the keys it failed on. */
export function replyFailure(problems) {
  return { reply: true, problems };
}

export default function CallFailure({ failure, onRetry }) {
  if (!failure) return null;

  let head;
  if (failure.reply) head = T.replyUnreadable;
  else if (failure.refused) head = T.refusedPrefix;
  else head = T.callFailed;

  return (
    <div
      role="alert"
      className="p-4 rounded-xl bg-nc-grade-c/10 border border-nc-grade-c/40 text-sm text-nc-text1"
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-nc-grade-c shrink-0 mt-0.5" strokeWidth={2} />
        <div className="flex-1 min-w-0 leading-relaxed">
          <span>{head}</span>{' '}
          {failure.reply ? (
            <span dir="ltr" className="font-mono text-xs break-all">
              {failure.problems.join(' · ')}
            </span>
          ) : (
            <>
              {failure.code && (
                <span dir="ltr" className="font-mono text-xs break-all">
                  {failure.code}
                </span>
              )}
              {failure.field && (
                <span dir="ltr" className="font-mono text-xs ms-1 break-all">
                  ({failure.field})
                </span>
              )}
              {failure.refused && !failure.known && (
                <span className="block text-xs text-nc-text3 mt-1">{T.unknownRefusalCode}</span>
              )}
            </>
          )}
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 rounded-lg bg-nc-surface border border-nc-border text-nc-text2 hover:text-nc-text1 transition text-xs"
        >
          {T.retry}
        </button>
      )}
    </div>
  );
}
