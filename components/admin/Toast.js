'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (msg, type = 'info', duration = 3500) => {
      const id = ++idRef.current;
      setToasts((list) => [...list, { id, msg, type }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
      return id;
    },
    [remove]
  );

  const api = {
    success: (m, d) => push(m, 'success', d),
    error: (m, d) => push(m, 'error', d ?? 5000),
    info: (m, d) => push(m, 'info', d),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 end-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  const { type, msg } = toast;
  const Icon =
    type === 'success'
      ? CheckCircleIcon
      : type === 'error'
      ? XCircleIcon
      : InformationCircleIcon;
  const color =
    type === 'success'
      ? 'text-nc-green border-nc-green/40'
      : type === 'error'
      ? 'text-nc-grade-d border-nc-grade-d/40'
      : 'text-nc-cyan border-nc-cyan/40';

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl bg-nc-card border ${color} shadow-2xl animate-fade-slide-up`}
    >
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" strokeWidth={2} />
      <div className="flex-1 text-sm text-nc-text1 leading-relaxed">{msg}</div>
      <button
        onClick={onClose}
        className="text-nc-text3 hover:text-nc-text1 transition flex-shrink-0"
        aria-label="إغلاق"
      >
        <XMarkIcon className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    return {
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}
