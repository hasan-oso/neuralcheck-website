'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useLang } from '@/lib/LanguageContext';
import Logo from '@/components/Logo';
import { auth, db } from '@/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ADMIN_EMAILS } from '@/lib/admin';
import {
  Bars3Icon,
  XMarkIcon,
  GlobeAltIcon,
  UserCircleIcon,
  Squares2X2Icon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';

const PRO_PLANS = new Set(['pro', 'shop_pro', 'shopPro']);

const LANGS = [
  { code: 'ar', label: 'العربية' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
];

function isAdmin(email) {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return ADMIN_EMAILS.some((a) => a.toLowerCase().trim() === e);
}

export default function Navbar() {
  const { lang, setLang, t } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [shopProfile, setShopProfile] = useState(null); // {plan, shopSlug, ...}
  const langRef = useRef(null);
  const userRef = useRef(null);
  const isRTL = lang === 'ar';
  const hideOnAdmin = pathname?.startsWith('/admin');
  const hideOnPrint = pathname?.startsWith('/print');
  // /tech runs its own sticky header on the evaluation screen; two stacked
  // sticky bars eat the phone viewport the technician needs for the buttons.
  const hideOnTech = pathname?.startsWith('/tech');

  // Mount guard — ensures SSR + first client render output match,
  // before any auth/localStorage-dependent UI is rendered.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthReady(true);
      // Fetch shop profile for "My Shop" link visibility.
      // Failure is non-fatal — link just stays hidden.
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (snap.exists()) {
            setShopProfile(snap.data());
          } else {
            setShopProfile(null);
          }
        } catch {
          setShopProfile(null);
        }
      } else {
        setShopProfile(null);
      }
    });
    return () => unsub();
  }, [mounted]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUserOpen(false);
      setOpen(false);
      router.push('/');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Navbar] signOut failed:', e);
    }
  };

  if (hideOnAdmin || hideOnPrint || hideOnTech) return null;

  const userIsAdmin = isAdmin(user?.email);
  const userIsPro = PRO_PLANS.has((shopProfile?.plan || '').toLowerCase());
  const userShopSlug = shopProfile?.shopSlug || null;
  const showMyShop = userIsPro && !!userShopSlug;
  const initial =
    (user?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <>
      <nav
        className={`sticky top-0 z-50 border-b transition-all duration-300 print:hidden ${
          scrolled
            ? 'bg-nc-bg/90 backdrop-blur-2xl border-nc-border shadow-[0_2px_24px_rgba(0,0,0,0.4)]'
            : 'bg-nc-bg/70 backdrop-blur-xl border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`flex items-center justify-between transition-all duration-300 ${
              scrolled ? 'h-14' : 'h-16'
            }`}
          >
            <Link href="/" className="flex items-center gap-2 group">
              <Logo
                size={scrolled ? 32 : 40}
                className="group-hover:scale-105 transition-all duration-300"
              />
              <span
                className={`font-outfit font-extrabold nc-gradient-text tracking-tight transition-all duration-300 ${
                  scrolled ? 'text-lg' : 'text-xl'
                }`}
              >
                NeuralCheck
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <NavLink href="/">{t.nav.home}</NavLink>
              <NavLink href="/technology">{t.nav.technology}</NavLink>
              <NavLink href="/verify">{t.nav.verify}</NavLink>
              <NavLink href="/#pricing">{t.nav.pricing}</NavLink>

              {!mounted || !authReady ? (
                <div
                  className="ms-3 w-24 h-9 rounded-lg bg-nc-surface/40 animate-pulse"
                  aria-hidden="true"
                />
              ) : user ? (
                <div className="relative ms-3" ref={userRef}>
                  <button
                    onClick={() => setUserOpen((v) => !v)}
                    className="flex items-center gap-2 ps-1 pe-3 py-1 rounded-full bg-nc-surface border border-nc-border hover:border-nc-green/50 transition"
                    aria-label="Account menu"
                  >
                    {user.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.photoURL}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="w-7 h-7 rounded-full nc-gradient-bg text-nc-bg flex items-center justify-center text-xs font-bold">
                        {initial}
                      </span>
                    )}
                    <span className="text-sm text-nc-text2 max-w-[120px] truncate">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <ChevronDownIcon
                      className={`w-4 h-4 text-nc-text3 transition ${
                        userOpen ? 'rotate-180' : ''
                      }`}
                      strokeWidth={2}
                    />
                  </button>
                  {userOpen && (
                    <div className="absolute end-0 mt-2 w-60 bg-nc-card border border-nc-border rounded-xl shadow-2xl overflow-hidden animate-fade-slide-up">
                      <div className="px-4 py-3 border-b border-nc-border">
                        <div className="text-sm font-semibold text-nc-text1 truncate">
                          {user.displayName || t.nav.myAccount}
                        </div>
                        <div className="text-xs text-nc-text3 truncate mt-0.5">
                          {user.email}
                        </div>
                      </div>
                      <div className="py-1">
                        <DropdownItem
                          href="/dashboard"
                          icon={Squares2X2Icon}
                          onClick={() => setUserOpen(false)}
                        >
                          {t.nav.dashboard}
                        </DropdownItem>
                        {showMyShop && (
                          <DropdownItem
                            href={`/shop/${userShopSlug}/`}
                            icon={ShoppingBagIcon}
                            onClick={() => setUserOpen(false)}
                          >
                            {t.nav.myShop}
                          </DropdownItem>
                        )}
                        {userIsAdmin && (
                          <DropdownItem
                            href="/admin"
                            icon={ShieldCheckIcon}
                            onClick={() => setUserOpen(false)}
                            highlight
                          >
                            {t.nav.adminPanel}
                          </DropdownItem>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-nc-grade-d hover:bg-nc-grade-d/10 transition text-start"
                        >
                          <ArrowRightOnRectangleIcon
                            className="w-4 h-4"
                            strokeWidth={2}
                          />
                          {t.nav.signOut}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="ms-3 px-4 py-2 rounded-lg border border-nc-green text-nc-green hover:bg-nc-green hover:text-nc-bg transition font-medium text-sm"
                >
                  {t.nav.login}
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => setLangOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-nc-text2 hover:text-nc-text1 hover:bg-nc-surface transition text-sm"
                  aria-label="Language"
                >
                  <GlobeAltIcon className="w-4 h-4" strokeWidth={2} />
                  <span className="uppercase font-medium" suppressHydrationWarning>
                    {mounted ? lang : 'en'}
                  </span>
                </button>
                {langOpen && (
                  <div className="absolute end-0 mt-2 w-36 bg-nc-card border border-nc-border rounded-xl shadow-2xl overflow-hidden animate-fade-slide-up">
                    {LANGS.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLang(l.code);
                          setLangOpen(false);
                        }}
                        className={`block w-full text-start px-4 py-2.5 text-sm hover:bg-nc-surface transition ${
                          lang === l.code
                            ? 'text-nc-green font-semibold'
                            : 'text-nc-text2'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setOpen(true)}
                className="md:hidden p-2 text-nc-text1 hover:bg-nc-surface rounded-lg"
                aria-label="Open menu"
              >
                <Bars3Icon className="w-6 h-6" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <aside
        className="fixed top-0 bottom-0 w-72 max-w-[85vw] bg-nc-card border-nc-border z-[61] md:hidden shadow-2xl transition-transform duration-300 ease-out flex flex-col"
        style={{
          [isRTL ? 'left' : 'right']: 0,
          borderInlineStartWidth: 1,
          transform: open
            ? 'translateX(0)'
            : isRTL
            ? 'translateX(-100%)'
            : 'translateX(100%)',
        }}
      >
        <div className="flex items-center justify-between p-4 border-b border-nc-border">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-outfit font-extrabold nc-gradient-text">
              NeuralCheck
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 text-nc-text1 hover:bg-nc-surface rounded-lg"
            aria-label="Close menu"
          >
            <XMarkIcon className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* User card on top of drawer when logged in */}
        {mounted && authReady && user && (
          <div className="p-4 border-b border-nc-border bg-nc-surface/40">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="w-10 h-10 rounded-full nc-gradient-bg text-nc-bg flex items-center justify-center text-sm font-bold">
                  {initial}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-nc-text1 truncate">
                  {user.displayName || t.nav.myAccount}
                </div>
                <div className="text-xs text-nc-text3 truncate">
                  {user.email}
                </div>
              </div>
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
          <DrawerLink href="/" onClick={() => setOpen(false)}>
            {t.nav.home}
          </DrawerLink>
          <DrawerLink href="/technology" onClick={() => setOpen(false)}>
            {t.nav.technology}
          </DrawerLink>
          <DrawerLink href="/verify" onClick={() => setOpen(false)}>
            {t.nav.verify}
          </DrawerLink>
          <DrawerLink href="/#pricing" onClick={() => setOpen(false)}>
            {t.nav.pricing}
          </DrawerLink>

          {!mounted || !authReady ? (
            // Stable placeholder during SSR + first client render
            <div
              className="mt-2 h-12 rounded-lg bg-nc-surface/40 animate-pulse"
              aria-hidden="true"
            />
          ) : user ? (
            <>
              <div className="my-2 h-px bg-nc-border" />
              <DrawerLink href="/dashboard" onClick={() => setOpen(false)}>
                {t.nav.dashboard}
              </DrawerLink>
              {showMyShop && (
                <DrawerLink
                  href={`/shop/${userShopSlug}/`}
                  onClick={() => setOpen(false)}
                >
                  {t.nav.myShop}
                </DrawerLink>
              )}
              {userIsAdmin && (
                <DrawerLink
                  href="/admin"
                  onClick={() => setOpen(false)}
                  accent="cyan"
                >
                  {t.nav.adminPanel}
                </DrawerLink>
              )}
              <button
                onClick={handleSignOut}
                className="px-3 py-3 rounded-lg text-base text-nc-grade-d hover:bg-nc-grade-d/10 transition text-start"
              >
                {t.nav.signOut}
              </button>
            </>
          ) : (
            <DrawerLink href="/login" onClick={() => setOpen(false)} highlight>
              {t.nav.login}
            </DrawerLink>
          )}
        </nav>

        <div className="p-4 border-t border-nc-border">
          <div className="text-xs text-nc-text3 uppercase tracking-wider mb-2">
            Language
          </div>
          <div className="flex gap-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                  lang === l.code
                    ? 'nc-gradient-bg text-nc-bg'
                    : 'bg-nc-surface text-nc-text2'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

function NavLink({ href, children }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 rounded-lg text-nc-text2 hover:text-nc-text1 hover:bg-nc-surface transition text-sm font-medium"
    >
      {children}
    </Link>
  );
}

function DrawerLink({ href, onClick, children, highlight, accent }) {
  let cls =
    'px-3 py-3 rounded-lg transition text-base text-nc-text2 hover:bg-nc-surface hover:text-nc-text1';
  if (highlight) {
    cls =
      'px-3 py-3 rounded-lg transition text-base border border-nc-green text-nc-green font-semibold text-center mt-2';
  } else if (accent === 'cyan') {
    cls =
      'px-3 py-3 rounded-lg transition text-base text-nc-cyan font-semibold hover:bg-nc-cyan/10';
  }
  return (
    <Link href={href} onClick={onClick} className={cls}>
      {children}
    </Link>
  );
}

function DropdownItem({ href, icon: Icon, children, onClick, highlight }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${
        highlight
          ? 'text-nc-cyan hover:bg-nc-cyan/10 font-medium'
          : 'text-nc-text2 hover:bg-nc-surface hover:text-nc-text1'
      }`}
    >
      <Icon className="w-4 h-4" strokeWidth={2} />
      {children}
    </Link>
  );
}
