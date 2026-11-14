'use client';

// The technician's name is asked ONCE, at the door, and then rides along with
// every evaluation automatically.
//
// Why at the door and not on the evaluation screen: requirement — no text
// input anywhere on the mandatory path. A keyboard popping up mid-evaluation
// is the single most expensive interaction on a phone, and it would land right
// between the two taps we are trying to protect.

import { useEffect, useRef, useState } from 'react';
import { UserIcon, PencilSquareIcon, CheckIcon } from '@heroicons/react/24/outline';

import Logo from '@/components/Logo';
import { writeTechnicianName } from '@/lib/techEval';

const MAX_LEN = 60;

/**
 * Full-screen, one-time prompt. Rendered instead of the list until a name
 * exists, so the technician never meets it again on this device.
 */
export function TechnicianNameGate({ onSaved }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const clean = value.trim();
  const canSubmit = clean.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    writeTechnicianName(clean);
    onSaved(clean);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <Logo size={56} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1">
            تقييم دقّة التقارير
          </h1>
          <p className="mt-3 text-nc-text2 leading-relaxed">
            قبل البدء — ما اسمك؟ نسألك مرّة واحدة فقط، ثم يُرفق اسمك بكل تقييم
            تلقائياً.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl bg-nc-card border border-nc-border"
        >
          <label
            htmlFor="tech-name"
            className="block text-xs text-nc-text3 mb-2 uppercase tracking-wider"
          >
            اسم الفنّي
          </label>
          <div className="relative">
            <UserIcon
              className="w-5 h-5 absolute top-1/2 -translate-y-1/2 start-3.5 text-nc-text3 pointer-events-none"
              strokeWidth={1.8}
            />
            <input
              id="tech-name"
              ref={inputRef}
              type="text"
              value={value}
              maxLength={MAX_LEN}
              onChange={(e) => setValue(e.target.value)}
              placeholder="مثال: أحمد"
              autoComplete="name"
              className="w-full ps-11 pe-4 py-4 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 text-lg placeholder:text-nc-text3 focus:outline-none focus:border-nc-green focus:ring-2 focus:ring-nc-green/20 transition"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-5 w-full py-4 rounded-xl nc-gradient-bg text-nc-bg font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ابدأ
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * The "signed in as" affordance in the panel header — shows the stored name
 * and lets the technician correct it inline without leaving the list.
 */
export function TechnicianChip({ name, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(name);
  }, [name]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const clean = draft.trim();
    if (!clean) {
      setDraft(name);
      setEditing(false);
      return;
    }
    writeTechnicianName(clean);
    onChange(clean);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          maxLength={MAX_LEN}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(name);
              setEditing(false);
            }
          }}
          className="w-36 px-3 py-1.5 rounded-lg bg-nc-surface border border-nc-green/50 text-nc-text1 text-sm focus:outline-none focus:ring-2 focus:ring-nc-green/20"
        />
        <button
          type="button"
          onClick={commit}
          aria-label="حفظ الاسم"
          className="p-1.5 rounded-lg bg-nc-green/15 border border-nc-green/40 text-nc-green"
        >
          <CheckIcon className="w-4 h-4" strokeWidth={2.4} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nc-surface border border-nc-border text-nc-text2 hover:text-nc-text1 hover:border-nc-text3/50 transition text-sm"
      title="تغيير اسم الفنّي"
    >
      <UserIcon className="w-4 h-4 text-nc-text3" strokeWidth={1.8} />
      <span className="max-w-[10rem] truncate">{name}</span>
      <PencilSquareIcon className="w-3.5 h-3.5 text-nc-text3" strokeWidth={1.8} />
    </button>
  );
}
