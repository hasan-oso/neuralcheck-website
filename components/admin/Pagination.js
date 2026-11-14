'use client';

import { ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

export default function Pagination({ page, pageSize, total, onPageChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const go = (p) => onPageChange(Math.min(Math.max(1, p), pageCount));

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-sm">
      <div className="text-nc-text3">
        {from}–{to} من {total}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg border border-nc-border text-nc-text2 hover:text-nc-text1 hover:border-nc-green/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          aria-label="السابق"
        >
          <ChevronRightIcon className="w-4 h-4" strokeWidth={2} />
        </button>
        <div className="px-3 text-nc-text1 font-medium">
          {page} / {pageCount}
        </div>
        <button
          onClick={() => go(page + 1)}
          disabled={page >= pageCount}
          className="p-2 rounded-lg border border-nc-border text-nc-text2 hover:text-nc-text1 hover:border-nc-green/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          aria-label="التالي"
        >
          <ChevronLeftIcon className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
