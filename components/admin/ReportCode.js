'use client';

// Shows a report by the code a customer would quote (NC-…), with the full scan
// id one click away.
//
// The full id is what the operator needs for a Firestore query or a support
// ticket, so it is never hidden — only folded. Copy puts the full id on the
// clipboard rather than the short code, because nobody pastes a short code
// into anything.

import { useState } from 'react';
import {
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { reportCode } from '@/lib/admin';

export default function ReportCode({ report, expandable = true }) {
  const { display, full, hasShort } = reportCode(report);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyFull = async (e) => {
    e.stopPropagation();
    if (!full) return;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (insecure context, denied permission) — the id is
      // still reachable by expanding, so this stays silent rather than
      // throwing an error at an operator who can just read it.
    }
  };

  // Nothing folded away when there is no short code: `display` already IS the
  // full id, so an expander would reveal what is on screen.
  const canExpand = expandable && hasShort && !!full;

  return (
    <div className="inline-flex flex-col gap-1 min-w-0">
      <div className="inline-flex items-center gap-1.5 min-w-0">
        <span
          dir="ltr"
          className={`font-mono truncate ${
            hasShort ? 'text-nc-text1 font-semibold' : 'text-nc-text3'
          }`}
          title={hasShort ? full : undefined}
        >
          {display}
        </span>

        {canExpand && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            aria-expanded={open}
            title={open ? 'إخفاء المعرّف الكامل' : 'إظهار المعرّف الكامل'}
            className="shrink-0 p-0.5 rounded text-nc-text3 hover:text-nc-text1 transition"
          >
            <ChevronDownIcon
              className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
              strokeWidth={2}
            />
          </button>
        )}

        {full && (
          <button
            type="button"
            onClick={copyFull}
            title="نسخ المعرّف الكامل"
            className="shrink-0 p-0.5 rounded text-nc-text3 hover:text-nc-green transition"
          >
            {copied ? (
              <CheckIcon className="w-3.5 h-3.5 text-nc-green" strokeWidth={2.4} />
            ) : (
              <ClipboardDocumentIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
            )}
          </button>
        )}
      </div>

      {canExpand && open && (
        <span
          dir="ltr"
          className="font-mono text-[10px] text-nc-text3 break-all leading-snug"
        >
          {full}
        </span>
      )}

      {!hasShort && (
        <span className="text-[10px] text-nc-text3/70">
          لا يوجد رمز قصير لهذا التقرير
        </span>
      )}
    </div>
  );
}
