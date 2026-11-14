'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { formatDate } from '@/lib/admin';
import { withoutRawKeys } from '@/lib/adminReportView';
import { PageSpinner } from '@/components/admin/Spinner';
import Modal from '@/components/admin/Modal';
import Pagination from '@/components/admin/Pagination';
import { useToast } from '@/components/admin/Toast';
import GradeBadge from '@/components/GradeBadge';
import ReportCode from '@/components/admin/ReportCode';
import { classifyPipeline, PipelineKind } from '@/lib/pipelineTags';
import { pickGrade } from '@/lib/reportReaders/v6';
import {
  readOverall,
  readCategories,
  readIssues,
  readVerdict,
  readDetails,
  classifyV7Severity,
} from '@/lib/reportReaders/v7';
import {
  MagnifyingGlassIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE = 20;

// Resolve a human-readable name for a report's owner.
// Order: Firestore users/{uid}.displayName → .name → .email
//        → embedded fields on the report → "مستخدم مجهول".
// `usersMap` is a Map<uid, userData> — caller is responsible for filling it.
function resolveUserName(report, usersMap) {
  const uid = report.userId || report.ownerUid || report.uid;
  const u = uid ? usersMap.get(uid) : null;
  return (
    u?.displayName ||
    u?.name ||
    u?.email ||
    report.userName ||
    report.userEmail ||
    report.ownerEmail ||
    'مستخدم مجهول'
  );
}

function resolveUserEmail(report, usersMap) {
  const uid = report.userId || report.ownerUid || report.uid;
  const u = uid ? usersMap.get(uid) : null;
  return u?.email || report.userEmail || report.ownerEmail || null;
}

// This table mixes V6 and V7 reports in one list (see lib/pipelineTags.js).
// Pipeline read first, then the matching reader — never a fallback chain
// that tries both shapes at once (see lib/reportReaders/{v6,v7}.js).
function classifyReportPipeline(report) {
  const pipeline = classifyPipeline(report);
  if (pipeline.kind === PipelineKind.UNKNOWN_TAG) {
    // eslint-disable-next-line no-console
    console.warn(
      '[admin/reports] unrecognized pipeline tag — using the V6 reader as a best effort',
      pipeline.tag
    );
  }
  return pipeline;
}

// "التقييم" column (GradeBadge) + the grade filter + the modal's grade
// badge. Letter grade IS unifiable across pipelines: V6's `grade` and V7's
// `overall.letter` are both a single letter — see readOverall's doc comment
// in lib/reportReaders/v7.js.
function resolveGrade(report) {
  const pipeline = classifyReportPipeline(report);
  return pipeline.kind === PipelineKind.V7
    ? readOverall(report).letter
    : pickGrade(report);
}

// "الدرجة" column (the numeric points, `report.score`) is NOT unifiable —
// V7 carries no per-report numeric score at all. `overall.coverage` is a
// different concept (see readOverall's doc comment) and must never be shown
// in its place. Callers branch on this before reading `report.score`.
function isV7Report(report) {
  return classifyReportPipeline(report).kind === PipelineKind.V7;
}

export default function AdminReportsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [usersMap, setUsersMap] = useState(new Map());
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        let snap;
        try {
          snap = await getDocs(
            query(collection(db, 'reports'), orderBy('createdAt', 'desc'))
          );
        } catch {
          snap = await getDocs(collection(db, 'reports'));
        }
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setReports(list);

        // Batch-fetch the owner doc for every unique user referenced by a
        // report. Sequential getDoc is slow for many users — Promise.all
        // parallelises across the unique set.
        const uids = [
          ...new Set(
            list
              .map((r) => r.userId || r.ownerUid || r.uid)
              .filter(Boolean)
          ),
        ];
        if (uids.length > 0) {
          const docs = await Promise.all(
            uids.map(async (uid) => {
              try {
                const us = await getDoc(doc(db, 'users', uid));
                return us.exists() ? [uid, { id: us.id, ...us.data() }] : null;
              } catch {
                return null;
              }
            })
          );
          const map = new Map();
          for (const entry of docs) {
            if (entry) map.set(entry[0], entry[1]);
          }
          setUsersMap(map);
        }
      } catch (e) {
        toast.error('فشل تحميل التقارير');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (s) {
        const userName = resolveUserName(r, usersMap);
        const userEmail = resolveUserEmail(r, usersMap) || '';
        const deviceName = r.deviceMarketingName || r.deviceModel || r.device || r.model || '';
        const hay = `${r.shortId || ''} ${r.scanId || r.id} ${deviceName} ${userName} ${userEmail}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (gradeFilter !== 'all') {
        const g = (resolveGrade(r) || '').toString().toUpperCase().charAt(0);
        if (g !== gradeFilter) return false;
      }
      return true;
    });
  }, [reports, search, gradeFilter, usersMap]);

  useEffect(() => {
    setPage(1);
  }, [search, gradeFilter]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-nc-text1">
          التقارير
        </h1>
        <p className="text-nc-text3 text-sm mt-1">
          {filtered.length} من أصل {reports.length}
        </p>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-3">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute top-1/2 start-4 -translate-y-1/2 text-nc-text3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بـ Scan ID أو طراز الجهاز..."
            className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 placeholder:text-nc-text3 focus:outline-none focus:border-nc-green text-sm"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-nc-surface border border-nc-border text-nc-text1 text-sm focus:outline-none focus:border-nc-green"
        >
          <option value="all">كل التقييمات</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>

      <div className="bg-nc-card border border-nc-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-nc-text3 text-xs uppercase tracking-wider border-b border-nc-border bg-nc-surface/40">
                <th className="text-start py-3 px-4 font-medium">Scan ID</th>
                <th className="text-start py-3 px-4 font-medium">الجهاز</th>
                <th className="text-start py-3 px-4 font-medium">التقييم</th>
                <th className="text-start py-3 px-4 font-medium">الدرجة</th>
                <th className="text-start py-3 px-4 font-medium">المستخدم</th>
                <th className="text-start py-3 px-4 font-medium">التاريخ</th>
                <th className="text-start py-3 px-4 font-medium">عرض</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-nc-text3">
                    لا توجد تقارير مطابقة
                  </td>
                </tr>
              ) : (
                pageItems.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-nc-border/50 hover:bg-nc-surface/30 transition"
                  >
                    <td className="py-3 px-4 text-xs max-w-[180px]">
                      <ReportCode report={r} />
                    </td>
                    <td className="py-3 px-4 text-nc-text1 truncate max-w-[180px]">
                      {r.deviceMarketingName || r.deviceModel || r.device || r.model || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <GradeBadge grade={resolveGrade(r)} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-nc-text2">
                      {isV7Report(r) ? (
                        <span className="text-[11px] text-nc-text3" title="تقرير V7 — لا يحمل نقاطاً رقمية لكل تقرير">
                          V7 — بلا نقاط
                        </span>
                      ) : r.score != null ? (
                        `${r.score}`
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs truncate max-w-[200px]">
                      <div className="text-nc-text1 truncate">
                        {resolveUserName(r, usersMap)}
                      </div>
                      {resolveUserEmail(r, usersMap) && (
                        <div className="text-nc-text3 text-[11px] truncate">
                          {resolveUserEmail(r, usersMap)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-nc-text3 text-xs whitespace-nowrap">
                      {formatDate(r.createdAt || r.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setViewing(r)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-nc-cyan/10 text-nc-cyan border border-nc-cyan/30 hover:bg-nc-cyan/20 transition text-xs font-semibold"
                      >
                        <EyeIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
                        عرض
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-4">
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
          />
        </div>
      </div>

      {viewing && (
        <ReportModal
          report={viewing}
          usersMap={usersMap}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

// V6/V7 field parity for the report-detail modal below (this task,
// 2026-09-23). Each field is read through its OWN pipeline branch, matching
// the rest of this file's resolveGrade()/isV7Report() pattern — never a
// chain that tries both shapes on one document (lib/reportReaders/{v6,v7}.js
// explain why). The V6 branch of every field below is BYTE-IDENTICAL to
// what this modal read before this task; only the V7 branch is new. Where
// V7 genuinely has no counterpart for a V6 field (a numeric per-report or
// per-category score), that is declared below, not invented — see
// resolveCategoryScores' comment.
//
// verdict: V6 reads report.verdict / report.summary / report.ai?.verdict
// (three legacy top-level locations, unchanged). V7's one real counterpart
// is narrative.verdict (readVerdict) — read alone, no fallback to
// narrative.summary: that would be inventing a merged field this task did
// not ask for. A V7 report with no verdict sentence shows nothing here,
// same as a V6 report with none of its three legacy fields.
function resolveVerdict(report, isV7) {
  return isV7
    ? readVerdict(report)
    : report.verdict || report.summary || report.ai?.verdict || null;
}

// details: V6 reads report.details (top-level only, unchanged — note this
// does NOT include aiResponse.details the way lib/reportReaders/v6.js's
// pickDetails() does; that gap predates this task and is left untouched,
// out of scope for a V7-parity pass). V7's direct counterpart is
// narrative.details (readDetails).
function resolveDetails(report, isV7) {
  return isV7 ? readDetails(report) || null : report.details || null;
}

// issues: V6 reads the raw report.issues array with duck-typed rendering
// (unchanged below). V7 also has issues[] at the same top-level key, but a
// DIFFERENT shape (severity/evidence/evidenceUnit, no .message) — read
// through readIssues() rather than the raw array so severity renders
// correctly instead of relying on incidental duck-typing.
function resolveIssues(report, isV7) {
  if (isV7) {
    const list = readIssues(report);
    return list.length > 0 ? list : null;
  }
  return Array.isArray(report.issues) ? report.issues : null;
}

// categoryScores ("تقييم الفئات", V6 report.category_scores/categoryScores —
// a name → NUMBER map): V7 has NO numeric counterpart at all — categories
// carry a letter/state/coverage, never a per-category number (same reason
// the table's "الدرجة" column shows "V7 — بلا نقاط" instead of a number).
// Rather than inventing a number, or silently showing nothing, the V7
// branch below renders the real V7 categories (letter/state/coverage) in
// their own clearly-labeled block — a different field shown as itself, not
// a substitute for the missing number.
function resolveCategoryScores(report, isV7) {
  if (isV7) return null; // no numeric map exists on V7 — see comment above
  return report.category_scores || report.categoryScores || null;
}

function ReportModal({ report, usersMap, onClose }) {
  const title = `تقرير — ${report.deviceMarketingName || report.deviceModel || report.device || 'جهاز'}`;
  const isV7 = isV7Report(report);
  const verdict = resolveVerdict(report, isV7);
  const issues = resolveIssues(report, isV7);
  const details = resolveDetails(report, isV7);
  const categoryScores = resolveCategoryScores(report, isV7);
  const v7Categories = isV7 ? readCategories(report) : null;
  const userName = resolveUserName(report, usersMap || new Map());
  const userEmail = resolveUserEmail(report, usersMap || new Map());

  return (
    <Modal open onClose={onClose} title={title} size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <GradeBadge grade={resolveGrade(report)} size="lg" />
          <div>
            <div className="text-xs text-nc-text3 uppercase tracking-wider">
              Scan ID
            </div>
            <div className="text-sm">
              <ReportCode report={report} />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="الجهاز" value={report.deviceMarketingName || report.deviceModel || report.device || report.model} />
          <Field label="التاريخ" value={formatDate(report.createdAt || report.timestamp)} />
          <Field
            label="المستخدم"
            value={userEmail ? `${userName} — ${userEmail}` : userName}
          />
          <Field
            label="الدرجة"
            value={
              isV7
                ? 'V7 — لا يحمل نقاطاً رقمية لكل تقرير'
                : report.score != null
                ? `${report.score}`
                : null
            }
          />
        </div>

        {verdict && (
          <div className="p-4 rounded-xl bg-nc-surface border border-nc-border">
            <div className="text-xs text-nc-text3 uppercase tracking-wider mb-2">
              الحكم
            </div>
            <div className="text-sm text-nc-text1 leading-relaxed whitespace-pre-wrap">
              {verdict}
            </div>
          </div>
        )}

        {categoryScores && typeof categoryScores === 'object' && (
          <div className="p-4 rounded-xl bg-nc-surface border border-nc-border">
            <div className="text-xs text-nc-text3 uppercase tracking-wider mb-3">
              تقييم الفئات
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(categoryScores).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-nc-bg"
                >
                  <span className="text-xs text-nc-text2">{k}</span>
                  <span className="text-sm font-semibold text-nc-text1">
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* V7 has no numeric category_scores map (see resolveCategoryScores'
            comment above) — this shows the real V7 field instead: each
            category's letter/state/coverage, plus letterCeilingReason.text
            verbatim when a LOW_CATEGORY_COVERAGE gate capped that letter
            (same field as /verify's V7CategoriesGrid, read through the same
            lib/reportReaders/v7.js readCategories()). Explicitly labeled
            "V7" so it is never mistaken for the numeric V6 block above. */}
        {v7Categories && v7Categories.length > 0 && (
          <div className="p-4 rounded-xl bg-nc-surface border border-nc-border">
            <div className="text-xs text-nc-text3 uppercase tracking-wider mb-3">
              فئات V7 (حرف/حالة — بلا نقاط رقمية)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {v7Categories.map((cat) => (
                <div
                  key={cat.name}
                  className="px-3 py-2 rounded-lg bg-nc-bg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-nc-text2">{cat.name}</span>
                    <span className="text-sm font-semibold text-nc-text1">
                      {cat.letter ?? cat.stateRaw ?? '—'}
                      {typeof cat.coverage === 'number'
                        ? ` · ${Math.round(cat.coverage * 100)}%`
                        : ''}
                    </span>
                  </div>
                  {cat.letterCeilingReasonStatus === 'ok' &&
                    cat.letterCeilingReason?.text && (
                      <div className="mt-1 text-[11px] text-nc-text3 leading-relaxed">
                        {cat.letterCeilingReason.text}
                      </div>
                    )}
                  {(cat.letterCeilingReasonStatus === 'missing' ||
                    cat.letterCeilingReasonStatus === 'invalid') && (
                    <div dir="ltr" className="mt-1 text-[10px] text-nc-glow font-mono">
                      letterCeilingReason: {cat.letterCeilingReasonStatus}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {issues && issues.length > 0 && (
          <div className="p-4 rounded-xl bg-nc-surface border border-nc-border">
            <div className="text-xs text-nc-text3 uppercase tracking-wider mb-3">
              المشاكل المكتشفة ({issues.length})
            </div>
            <ul className="space-y-2">
              {issues.map((iss, i) => (
                <li
                  key={i}
                  className="text-sm text-nc-text1 leading-relaxed ps-4 border-s-2 border-nc-grade-c"
                >
                  {isV7 && typeof iss === 'object' && iss.severity && (
                    <span
                      dir="ltr"
                      className="me-2 text-[10px] font-mono text-nc-text3 align-middle"
                    >
                      [{classifyV7Severity(iss.severity)}]
                    </span>
                  )}
                  {typeof iss === 'string' ? iss : iss.title || iss.message || JSON.stringify(iss)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {details && (
          <details className="p-4 rounded-xl bg-nc-surface border border-nc-border">
            <summary className="text-xs text-nc-text3 uppercase tracking-wider cursor-pointer hover:text-nc-text1">
              التفاصيل الكاملة
            </summary>
            <pre className="mt-3 text-xs text-nc-text2 overflow-x-auto font-mono">
              {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
            </pre>
          </details>
        )}

        <details className="p-4 rounded-xl bg-nc-bg border border-nc-border">
          <summary className="text-xs text-nc-text3 uppercase tracking-wider cursor-pointer hover:text-nc-text1">
            البيانات الخام (JSON)
          </summary>
          {/* Decision 7: the admin view does not show the raw data. The five
              keys the server moved out of `reports` (lib/adminReportView.js,
              REPORT_DOC_RAW_KEYS) are dropped from this COPY — an older
              document still carries them until production is migrated, and
              `report` itself (search, filters, the fields above) is untouched. */}
          <pre className="mt-3 text-[11px] text-nc-text3 overflow-x-auto font-mono max-h-96">
            {JSON.stringify(withoutRawKeys(report), null, 2)}
          </pre>
        </details>
      </div>
    </Modal>
  );
}

function Field({ label, value }) {
  return (
    <div className="p-3 rounded-xl bg-nc-surface border border-nc-border">
      <div className="text-xs text-nc-text3 uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1 text-sm text-nc-text1 break-words">
        {value || '—'}
      </div>
    </div>
  );
}
