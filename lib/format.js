// Number/date formatters that always render LATIN digits (0-9), even when
// the user's locale is `ar-EG` or `fa-IR` (which would otherwise produce
// Arabic-Indic ٠-٩ or Persian ۰-۹ digits via Intl.NumberFormat).
//
// Use these everywhere the website displays a price, date, score, count,
// or any number that originated from user data or Date objects. Pair
// with `dir="ltr"` on the rendering element to also stabilise mixed
// LTR/RTL ordering of currency symbols.

const ARABIC_DIGIT_RE = /[٠-٩]/g; // Arabic-Indic ٠-٩
const PERSIAN_DIGIT_RE = /[۰-۹]/g; // Persian/Urdu ۰-۹

/** Convert any Arabic-Indic or Persian digits in `s` to ASCII 0-9. */
export function toLatinDigits(s) {
  if (s === null || s === undefined) return s;
  return String(s)
    .replace(ARABIC_DIGIT_RE, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(PERSIAN_DIGIT_RE, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Currency symbol/code given a 3-letter currency code and the UI lang. */
function currencySymbol(currency, lang) {
  if (currency === 'USD') return '$';
  if (currency === 'TRY') return '₺';
  if (currency === 'SYP') return lang === 'ar' ? 'ل.س' : 'SYP';
  return currency || '';
}

/**
 * Format a price as a plain string with LATIN digits.
 * Example: formatPriceLatin(200, 'USD', 'ar') === "$200"
 *          formatPriceLatin(5000, 'SYP', 'ar') === "5,000 ل.س"
 */
export function formatPriceLatin(price, currency, lang) {
  if (price === null || price === undefined || isNaN(Number(price))) return null;
  const n = Number(price);
  // en-US gives Latin digits + comma thousand separators — universal and
  // readable in any language. Locale-specific grouping (e.g. spaces in fr-FR)
  // is intentionally avoided here.
  const formatted = n.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(n) ? 0 : 0,
  });
  const sym = currencySymbol(currency, lang);
  // SYP follows the number (Arabic convention); $/₺ precede.
  if (currency === 'SYP') return `${formatted} ${sym}`.trim();
  return `${sym}${formatted}`;
}

/**
 * Format a Firestore-ish timestamp / Date / ISO string as a localised date
 * with LATIN digits. Month names still respect the locale ("نوفمبر" in AR).
 *
 * Accepts: Date, JS millis number, ISO string, Firestore Timestamp
 *          ({seconds,nanoseconds}), or our own {_seconds,_nanoseconds}.
 */
export function formatDateLatin(value, lang) {
  if (!value) return '—';
  let d;
  if (typeof value === 'object' && value.seconds) {
    d = new Date(value.seconds * 1000);
  } else if (typeof value === 'object' && value._seconds) {
    d = new Date(value._seconds * 1000);
  } else if (typeof value === 'object' && typeof value.toDate === 'function') {
    d = value.toDate();
  } else {
    d = new Date(value);
  }
  if (isNaN(d.getTime())) return String(value);

  const locale = lang === 'ar' ? 'ar-EG' : lang === 'tr' ? 'tr-TR' : 'en-US';
  const opts = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  // `numberingSystem: 'latn'` forces Latin digits while keeping locale-aware
  // month names. Older Intl impls may reject the option — fall back and
  // post-convert.
  let s;
  try {
    s = d.toLocaleDateString(locale, { ...opts, numberingSystem: 'latn' });
  } catch {
    s = d.toLocaleDateString(locale, opts);
  }
  return toLatinDigits(s);
}
