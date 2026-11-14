// Single-sourced feature flags for temporary field-test-phase toggles.
//
// Not a user preference, not an A/B test — a small number of hard on/off
// switches the coordinator flips directly in this file when a decision
// changes. Each flag: one exported boolean, one comment naming the
// decision and date that set it. Consumers import the flag directly;
// never re-derive the same boolean from a second literal (rule 24 — a
// literal a distinction hangs on gets one exported source, not a copy per
// call site, same treatment as lib/pipelineTags.js's PIPELINE_TAG_V7).

/**
 * The "تحميل التقرير (PDF)" button on /verify (app/verify/page.js, rendered
 * by components/verify/VerifyActions.js). When true, it calls the
 * `generateReportPdf` Cloud Function, which renders the LIVE
 * `/print/{shortId}` route server-side via Puppeteer and returns a PDF URL.
 *
 * false per coordinator decision 73 (2026-09-23, question س٧): "قراري أن
 * الـPDF لا يصل إلى أحد في الفحص الثاني" — PDF is not to reach anyone
 * during the second field-test round. This hides the button only. It does
 * NOT delete /print, app/print/[shortId]/PrintClient.js, or the
 * generateReportPdf call itself — flipping this back to true is the
 * entire re-enable, no other code changes needed.
 *
 * Does NOT affect the "طباعة التقرير" button next to it: that one calls
 * the browser's native `window.print()` on the already-rendered /verify
 * page itself. It never calls generateReportPdf and never touches the
 * /print route — unrelated to this decision, left exactly as it was.
 */
export const PDF_DOWNLOAD_ENABLED = false;

/**
 * The admin pages for the data-collection protocol (/admin/protocol,
 * /admin/protocol/shops, /admin/protocol/corrections and
 * /admin/protocol/marketing-names: W-P6-14, W-P6-18 and W-P6-20) and their
 * sidebar entry.
 *
 * It was false from 2026-10-21 (web-engineer-5, rows A): every Arabic label on
 * those pages that PLAN-06 does not write was a PROPOSED text, and a proposed
 * text does not reach the user before he approves it.
 *
 * true since 2026-10-23, after all 89 proposed texts were approved (the user's
 * order of 2026-10-23, Hasan's delegation of 2026-10-22: relayed to the site's
 * engineer, not checkable from this repo). lib/adminProtocolTexts.js has no
 * PROPOSED source any more, and two tests pin that this flag cannot be true
 * while one is left (adminProtocolPanels.test.cjs and
 * adminProtocolTextsApproved.test.cjs). Setting it back to false is the entire
 * switch-off: the sidebar has no entry, and a visit to any of the four routes
 * redirects to /admin without rendering anything of them.
 *
 * The eight callables the pages call (getProtocolSettings, setProtocolSettings,
 * getShopProtocolConfig, setShopProtocolParts, manageTechnician,
 * correctProtocolRecord, getMarketingNames, setMarketingNames) are in the
 * production function list at neuralcheck-backend@488e3ee, published
 * 2026-10-21 18:25 (DEPLOY-LIST-MAINTENANCE-PAIRS-0dfe892-2026-10-22.md:46 and
 * :73, which copies the production list; NOT checked against production from
 * this repo). The batch after it (0dfe892) changes only correctProtocolRecord's
 * internals; the reply and the refusal codes the pages read are the same (the
 * real handlers of 0dfe892 were run in memory against these readers on
 * 2026-10-23: 90 checks, 0 differences; a check outside this repo, which does
 * not carry the backend's code). Turning this flag on changes nothing on
 * neuralcheck.net until the site itself is deployed, which is the user's
 * decision (rule 4).
 *
 * Rule 24: this is the only place the boolean is written; the sidebar and the
 * pages import it, none re-derives it.
 */
export const ADMIN_PROTOCOL_TEXTS_APPROVED = true;
