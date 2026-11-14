'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLang } from '@/lib/LanguageContext';
import { auth } from '@/firebase';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from 'firebase/auth';
import Logo from '@/components/Logo';
import { LockClosedIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
  const { t } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace('/dashboard');
    });
    return () => unsub();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err?.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push('/dashboard');
    } catch (err) {
      setError(err?.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
      {/* Decorative gradient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 start-1/4 w-72 h-72 sm:w-[400px] sm:h-[400px] bg-nc-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 end-1/4 w-72 h-72 sm:w-[400px] sm:h-[400px] bg-nc-cyan/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo + welcome */}
        <div className="text-center mb-8 animate-fade-slide-up">
          <Link
            href="/"
            className="inline-flex items-center gap-3 group"
            aria-label="NeuralCheck"
          >
            <Logo
              size={64}
              className="group-hover:scale-105 transition duration-300"
            />
            <span className="font-outfit font-extrabold nc-gradient-text text-3xl">
              NeuralCheck
            </span>
          </Link>
        </div>

        <div
          className="p-7 sm:p-8 rounded-2xl bg-nc-card border border-nc-border shadow-2xl backdrop-blur-sm animate-fade-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1 text-center">
            {t.login.title}
          </h1>
          <p className="mt-2 text-center text-sm text-nc-text2">
            {t.login.subtitle}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
            <div>
              <label className="block text-xs text-nc-text3 mb-1.5 uppercase tracking-wider">
                {t.login.email}
              </label>
              <div className="relative">
                <EnvelopeIcon
                  className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-nc-text3 pointer-events-none"
                  strokeWidth={2}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full ps-10 pe-4 py-3 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green focus:ring-2 focus:ring-nc-green/20 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-nc-text3 mb-1.5 uppercase tracking-wider">
                {t.login.password}
              </label>
              <div className="relative">
                <LockClosedIcon
                  className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-nc-text3 pointer-events-none"
                  strokeWidth={2}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full ps-10 pe-4 py-3 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green focus:ring-2 focus:ring-nc-green/20 transition"
                />
              </div>
            </div>

            {error && (
              <div className="text-nc-grade-d text-sm p-3 rounded-lg bg-nc-grade-d/10 border border-nc-grade-d/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="py-3.5 rounded-xl nc-gradient-bg text-nc-bg font-semibold disabled:opacity-50 hover:shadow-[0_0_24px_rgba(0,255,140,0.3)] transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-nc-bg/60 border-t-transparent rounded-full animate-spin" />
              ) : (
                t.login.signin
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-nc-border" />
            <div className="text-xs text-nc-text3 uppercase">{t.login.or}</div>
            <div className="flex-1 h-px bg-nc-border" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 hover:border-nc-cyan/60 hover:bg-nc-card transition flex items-center justify-center gap-3 disabled:opacity-50 font-medium"
          >
            <GoogleIcon />
            <span>{t.login.google}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.5-11.3-8.2l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
