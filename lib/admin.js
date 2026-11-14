export const ADMIN_EMAILS = [
  'admin1@example.com',
  'admin2@example.com',
  'admin3@example.com',
];

export function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export function tsToDate(v) {
  if (!v) return null;
  if (typeof v === 'object' && typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'object' && v._seconds) return new Date(v._seconds * 1000);
  if (typeof v === 'object' && v.seconds) return new Date(v.seconds * 1000);
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatDate(v) {
  const d = tsToDate(v);
  if (!d) return '—';
  return d.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(v) {
  const d = tsToDate(v);
  if (!d) return '—';
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const PLAN_LABELS = {
  free: 'مجاني (تجريبي)',
  single: 'فحص فردي ($0.50)',
  shop_basic: 'متجر أساسي ($10/شهر)',
  shop_pro: 'متجر احترافي ($20/شهر)',
  // legacy fallbacks
  basic: 'متجر أساسي',
  pro: 'متجر احترافي',
};

export function planLabel(plan) {
  if (!plan) return '—';
  return PLAN_LABELS[plan] || plan;
}

/**
 * The two identities a report has: the short code a customer quotes (`NC-…`)
 * and the full scan id everything else is keyed by.
 *
 * Deliberately does NOT invent a short code when `shortId` is missing. The
 * rest of the site falls back to the first eight characters of the scan id —
 * lib/reportReaders/v6.js's resolveShortId() (shared by app/verify/page.js
 * and app/print/[shortId]/PrintClient.js), app/dashboard/page.js:53,
 * lib/techEval.js:174 — which produces something that looks like a code and
 * verifies as nothing. In an operator tool that is worse than showing the
 * long id: support reads it off the screen, gives it to a customer, and the
 * customer's lookup fails. So an absent shortId shows the truth.
 */
export function reportCode(report) {
  const full = (report?.scanId || report?.id || '').toString();
  const short = report?.shortId ? report.shortId.toString().toUpperCase() : null;
  return {
    full,
    short,
    display: short || full || '—',
    hasShort: !!short,
  };
}
