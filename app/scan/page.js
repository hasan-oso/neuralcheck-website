'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/LanguageContext';
import {
  QrCodeIcon,
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const READER_ID = 'nc-qr-reader';

// Pull a scan ID out of whatever the QR encodes:
//   - Full URL like https://neuralcheck.net/verify?id=NC-XY7N9J  → "NC-XY7N9J"
//   - Path-style:  https://neuralcheck.net/r/NC-XY7N9J            → "NC-XY7N9J"
//   - Plain text:  "NC-XY7N9J" or a UUID                          → as-is
function extractIdFromQR(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const fromQuery =
      url.searchParams.get('id') ||
      url.searchParams.get('scanId') ||
      url.searchParams.get('shortId');
    if (fromQuery) return fromQuery;

    const segs = url.pathname.split('/').filter(Boolean);
    const last = segs[segs.length - 1];
    if (last && /^[A-Z0-9-]{4,}$/i.test(last)) return last;
  } catch {
    // Not a URL — fall through.
  }

  // Treat as a plain identifier — accept short codes (NC-XXXXXX) and UUIDs.
  if (/^[A-Z0-9-]{4,}$/i.test(trimmed)) return trimmed;
  return null;
}

export default function ScanPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const scannerRef = useRef(null);
  const elementMountedRef = useRef(false);

  const [status, setStatus] = useState('idle'); // 'idle' | 'starting' | 'scanning' | 'detected' | 'error' | 'unsupported'
  const [errorMsg, setErrorMsg] = useState('');
  const [manualId, setManualId] = useState('');

  // ---------- start camera on mount ----------
  useEffect(() => {
    let cancelled = false;
    let html5QrCodeInstance = null;

    async function start() {
      // Browser support check
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setStatus('unsupported');
        setErrorMsg(t.scan.notSupported);
        return;
      }

      setStatus('starting');

      try {
        // Dynamic import — html5-qrcode touches `window` at module load,
        // so it must NOT be imported at the top of a file that may be
        // bundled into the SSR pass.
        const mod = await import('html5-qrcode');
        if (cancelled) return;

        const Html5Qrcode = mod.Html5Qrcode;
        html5QrCodeInstance = new Html5Qrcode(READER_ID, {
          verbose: false,
        });
        scannerRef.current = html5QrCodeInstance;

        await html5QrCodeInstance.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (vw, vh) => {
              const min = Math.min(vw, vh);
              const size = Math.floor(min * 0.7);
              return { width: size, height: size };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // onScanSuccess
            const id = extractIdFromQR(decodedText);
            if (!id) {
              // Keep scanning — invalid content
              return;
            }
            // We have a hit — tear down the camera and redirect.
            setStatus('detected');
            stop().finally(() => {
              router.replace(`/verify/?id=${encodeURIComponent(id)}`);
            });
          },
          () => {
            // onScanFailure — fired continuously while scanning. Ignore.
          }
        );

        if (cancelled) {
          // Component unmounted while we were starting; tear down.
          await stop();
          return;
        }
        setStatus('scanning');
      } catch (e) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('[scan] camera start failed:', e);

        const name = (e && (e.name || e.message || '')).toString();
        if (
          name.includes('NotAllowed') ||
          name.toLowerCase().includes('permission')
        ) {
          setStatus('error');
          setErrorMsg(t.scan.cameraDenied);
        } else {
          setStatus('error');
          setErrorMsg(t.scan.cameraError);
        }
      }
    }

    async function stop() {
      const inst = scannerRef.current;
      if (!inst) return;
      try {
        if (typeof inst.isScanning !== 'undefined' ? inst.isScanning : true) {
          await inst.stop();
        }
        await inst.clear();
      } catch (e) {
        // ignore — camera may already be stopped
      }
      scannerRef.current = null;
    }

    // Wait for the reader element to be in the DOM (mount paint), then start.
    // Without this microtask gap, html5-qrcode can't find the container.
    Promise.resolve().then(() => {
      if (cancelled) return;
      elementMountedRef.current = true;
      start();
    });

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const id = manualId.trim();
    if (!id) return;
    router.push(`/verify/?id=${encodeURIComponent(id)}`);
  };

  const cameraOK = status === 'starting' || status === 'scanning' || status === 'detected';
  const cameraFailed = status === 'error' || status === 'unsupported';

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 start-1/4 w-72 h-72 sm:w-[400px] sm:h-[400px] bg-nc-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 end-1/4 w-72 h-72 sm:w-[400px] sm:h-[400px] bg-nc-cyan/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Back link */}
        <Link
          href="/verify"
          className="inline-flex items-center gap-1.5 text-sm text-nc-text3 hover:text-nc-green transition mb-6"
        >
          <ChevronLeftIcon
            className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
          {t.scan.back}
        </Link>

        {/* Header */}
        <div className="text-center animate-fade-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-nc-cyan/10 border border-nc-cyan/30 mb-5">
            <QrCodeIcon className="w-9 h-9 text-nc-cyan" strokeWidth={1.6} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-outfit font-bold nc-gradient-text leading-[1.15] pb-1">
            {t.scan.title}
          </h1>
          <p className="mt-3 text-nc-text2 max-w-xl mx-auto leading-relaxed">
            {t.scan.subtitle}
          </p>
        </div>

        {/* Camera area */}
        <div
          className="mt-10 relative rounded-2xl bg-nc-card border border-nc-border overflow-hidden animate-fade-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          {/* Reader element — html5-qrcode inserts <video> inside this. */}
          <div
            id={READER_ID}
            className={`w-full ${cameraOK ? 'aspect-square sm:aspect-video' : 'hidden'}`}
            aria-label={t.scan.title}
          />

          {/* Starting overlay */}
          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-nc-card/90 backdrop-blur-sm">
              <div className="w-10 h-10 border-4 border-nc-border border-t-nc-cyan rounded-full animate-spin" />
              <p className="text-sm text-nc-text2">{t.scan.starting}</p>
            </div>
          )}

          {/* Detected overlay */}
          {status === 'detected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-nc-green/10 backdrop-blur-sm">
              <CheckCircleIcon
                className="w-14 h-14 text-nc-green"
                strokeWidth={1.5}
              />
              <p className="text-base text-nc-green font-semibold">
                {t.scan.detected}
              </p>
              <p className="text-xs text-nc-text2">{t.scan.redirecting}</p>
            </div>
          )}

          {/* Error / unsupported state */}
          {cameraFailed && (
            <div className="p-8 sm:p-10 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-nc-grade-d/10 border border-nc-grade-d/30 flex items-center justify-center">
                <ExclamationTriangleIcon
                  className="w-7 h-7 text-nc-grade-d"
                  strokeWidth={1.6}
                />
              </div>
              <p className="text-nc-grade-d font-semibold">{errorMsg}</p>
              {status === 'error' && (
                <p className="text-sm text-nc-text3 max-w-sm leading-relaxed">
                  {t.scan.cameraHint}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Manual entry */}
        <div
          className="mt-8 p-6 rounded-2xl bg-nc-card border border-nc-border animate-fade-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <PencilSquareIcon
              className="w-5 h-5 text-nc-text3"
              strokeWidth={1.8}
            />
            <h2 className="text-sm font-semibold text-nc-text1 uppercase tracking-wider">
              {t.scan.manualEntry}
            </h2>
          </div>
          <p className="text-xs text-nc-text3 leading-relaxed mb-4">
            {t.scan.manualHint}
          </p>
          <form
            onSubmit={handleManualSubmit}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder={t.verify.placeholder}
              className="flex-1 px-4 py-3 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-cyan focus:ring-2 focus:ring-nc-cyan/20 transition font-mono text-sm"
            />
            <button
              type="submit"
              disabled={!manualId.trim()}
              className="px-6 py-3 rounded-xl nc-gradient-bg text-nc-bg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {t.verify.button}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
