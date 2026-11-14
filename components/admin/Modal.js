'use client';

import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeCls =
    size === 'sm'
      ? 'max-w-md'
      : size === 'lg'
      ? 'max-w-3xl'
      : size === 'xl'
      ? 'max-w-5xl'
      : 'max-w-xl';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${sizeCls} bg-nc-card border border-nc-border rounded-2xl shadow-2xl animate-fade-slide-up max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between p-5 border-b border-nc-border">
          <h3 className="text-lg font-outfit font-semibold text-nc-text1">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-nc-text3 hover:text-nc-text1 hover:bg-nc-surface transition"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="p-5 border-t border-nc-border flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
