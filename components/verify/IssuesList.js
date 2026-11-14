'use client';

import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { toLatinDigits } from '@/lib/format';

const SEVERITY_DANGER = new Set([
  'danger',
  'critical',
  'severe',
  'high',
  'crit',
  'error',
]);
const SEVERITY_INFO = new Set([
  'info',
  'notice',
  'low',
  'minor',
]);

// V6-only. This is the report's original free-text severity classifier —
// it keeps its documented catch-all ("warning, medium, … → warning")
// unchanged so genuine V6 reports keep rendering exactly as before. It is
// NOT safe to run V7's fixed-enum severities (FAIL/WARNING/INFO/POSITIVE)
// through this: 'fail' and 'positive' are not in either Set below, so they
// would fall through to the 'warning' default — verified while building V7
// support, see lib/reportReaders/v7.js's classifyV7Severity for the
// dedicated V7 classifier and the fuller account of what that would have
// meant (a security FAIL rendered as a mere warning, not even the 'info'
// bucket the originating report had assumed).
function classifySeverity(s) {
  // Missing/empty severity is treated as INFO (a positive/neutral note),
  // never as a problem — a healthy device whose findings carry no explicit
  // severity must not be flagged or counted as an issue.
  const v = (s || 'info').toString().toLowerCase().trim();
  if (SEVERITY_DANGER.has(v)) return 'danger';
  if (SEVERITY_INFO.has(v)) return 'info';
  // anything else (warning, medium, …) → warning
  return 'warning';
}

const SEVERITY_STYLES = {
  danger: {
    border: 'border-nc-grade-d/40',
    bg: 'bg-nc-grade-d/5',
    icon: 'text-nc-grade-d',
    Icon: ShieldExclamationIcon,
    badge: 'bg-nc-grade-d/15 text-nc-grade-d border-nc-grade-d/30',
  },
  warning: {
    border: 'border-nc-grade-c/40',
    bg: 'bg-nc-grade-c/5',
    icon: 'text-nc-grade-c',
    Icon: ExclamationTriangleIcon,
    badge: 'bg-nc-grade-c/15 text-nc-grade-c border-nc-grade-c/30',
  },
  info: {
    border: 'border-nc-cyan/40',
    bg: 'bg-nc-cyan/5',
    icon: 'text-nc-cyan',
    Icon: InformationCircleIcon,
    badge: 'bg-nc-cyan/15 text-nc-cyan border-nc-cyan/30',
  },
  // V7 addition — a category with no faults on the tests that ran.
  positive: {
    border: 'border-nc-green/40',
    bg: 'bg-nc-green/5',
    icon: 'text-nc-green',
    Icon: CheckCircleIcon,
    badge: 'bg-nc-green/15 text-nc-green border-nc-green/30',
  },
  // A severity value this repo does not recognize. Deliberately its own
  // style, not aliased to 'warning' or 'info' — see the two classifiers'
  // doc comments for why an unrecognized value must never render as if it
  // were a known one.
  unknown: {
    border: 'border-nc-glow/40',
    bg: 'bg-nc-glow/5',
    icon: 'text-nc-glow',
    Icon: QuestionMarkCircleIcon,
    badge: 'bg-nc-glow/15 text-nc-glow border-nc-glow/30',
  },
};

function severityLabel(level, t) {
  if (level === 'danger') return t.verify.severityDanger;
  if (level === 'info') return t.verify.severityInfo;
  if (level === 'positive') return t.verify.severityPositive;
  if (level === 'unknown') return t.verify.severityUnknown;
  return t.verify.severityWarning;
}

// W4 (أمر 2026-10-01، مُراجَع بإضافة المستخدم 2026-10-01 — القاعدة 23: يستبدل
// نطاقَي 1/2/3-10/11+ المبسَّطين من الجولة الأولى، الخاطئَين فوق المئة —
// 103 عربياً "few" (103%100===3) لا "many"). تُعتمد فئات CLDR كما هي عبر
// Intl.PluralRules، لا إعادة تطبيق قاعدة mod-100 يدوياً. zero لا تصل هذه
// الدالّة أصلاً — IssuesList يعرض scanHighlights بدل هذا السطر كلّياً عند
// عدٍّ صفري (انظر موضع الاستدعاء أسفله). 'other' تشارك نصّها مع 'many' —
// كلاهما "%d ملاحظة تحتاج انتباهاً" بنصّ المستخدم نفسه — فلا مفتاح خامس.
const PLURAL_CATEGORY_KEY = {
  one: 'issuesNeedAttentionOne',
  two: 'issuesNeedAttentionTwo',
  few: 'issuesNeedAttentionFew',
  many: 'issuesNeedAttentionMany',
  other: 'issuesNeedAttentionMany',
};

function fillCount(template, n) {
  if (typeof template !== 'string') return '';
  return template.replace('%d', toLatinDigits(n));
}

// `lang` selects the PluralRules locale (Arabic's few/many/other split only
// exists in 'ar'; tr/en always resolve to 'one'/'other'). Defaults to 'ar'
// — the site's own default language (lib/LanguageContext.js's DEFAULT) —
// so a caller that omits it keeps today's behavior rather than falling back
// to the Node runtime's own locale.
function issuesNeedAttentionLabel(n, t, lang) {
  const category = new Intl.PluralRules(lang || 'ar').select(n);
  const key = PLURAL_CATEGORY_KEY[category] || 'issuesNeedAttentionMany';
  return fillCount(t.verify[key], n);
}

function categoryLabel(cat, t) {
  if (!cat) return null;
  const key = `cat${cat.charAt(0).toUpperCase()}${cat.slice(1).toLowerCase()}`;
  return t.verify[key] || cat;
}

function IssueCard({ issue, t, severityClassifier }) {
  const level = severityClassifier(issue.severity);
  const style = SEVERITY_STYLES[level];
  const Icon = style.Icon;
  const sevLabel = severityLabel(level, t);
  const catLabel = categoryLabel(issue.category, t);
  const title =
    issue.title || issue.text || issue.message || issue.description || issue.label || '';
  const description =
    issue.title && issue.description ? issue.description : '';
  const evidence = issue.evidence || issue.proof || '';
  // Item 6(a) of the fourth addendum to decision 102 (2026-09-26):
  // lib/reportReaders/v7.js's readIssues already reads evidenceUnit (e.g.
  // "IOPS" for ISS-S-06's evidence "2597") but nothing rendered it — shown
  // beside the value now; when it is absent (null, the far more common
  // case — most real issues carry no unit, e.g. ISS-SEC-04's evidence
  // "مكتشف"), nothing is added, no placeholder, per rule 22.
  const evidenceUnit =
    typeof issue.evidenceUnit === 'string' && issue.evidenceUnit.trim()
      ? issue.evidenceUnit.trim()
      : '';

  return (
    <div
      className={`p-5 rounded-2xl border ${style.border} ${style.bg} print:break-inside-avoid`}
    >
      {/* Header: severity + category */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wider ${style.badge}`}
        >
          <Icon className="w-3.5 h-3.5" strokeWidth={2} />
          {sevLabel}
        </span>
        {catLabel && (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-nc-surface border border-nc-border text-nc-text3 font-medium uppercase tracking-wider">
            {catLabel}
          </span>
        )}
      </div>

      {/* Title */}
      {title && (
        <h3 className="report-prose text-base sm:text-lg font-semibold text-nc-text1 leading-snug">
          {title}
        </h3>
      )}

      {/* Description */}
      {description && (
        <p className="report-prose mt-2 text-sm text-nc-text2 leading-relaxed">
          {description}
        </p>
      )}

      {/* Evidence */}
      {evidence && (
        <div className="mt-4 pt-3 border-t border-nc-border/60">
          <div className="flex items-start gap-2">
            <LightBulbIcon
              className="w-4 h-4 text-nc-text3 shrink-0 mt-0.5"
              strokeWidth={1.8}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-nc-text3 uppercase tracking-wider mb-1">
                {t.verify.evidence}
              </div>
              <code
                dir="ltr"
                className="text-xs font-mono text-nc-text2 leading-relaxed break-all"
              >
                {evidence}
                {evidenceUnit && <span className="ms-1">{evidenceUnit}</span>}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IssuesList({ issues, t, lang, severityClassifier = classifySeverity }) {
  // No issues at all → green badge
  if (!issues || issues.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-nc-green/10 border border-nc-green/30 flex items-center justify-center gap-2 text-nc-green font-semibold print:break-inside-avoid">
        <CheckCircleIcon className="w-5 h-5" strokeWidth={2} />
        {t.verify.noIssues}
      </div>
    );
  }

  // Only warning/critical findings count as "problems". Pure-info findings
  // (e.g. positive notes on a healthy device) must not inflate the count or
  // color the header as an alert. An 'unknown' severity (V7 only — a value
  // this repo does not recognize) counts as concerning: erring toward
  // surfacing an unrecognized finding beats silently dropping it from the
  // count.
  const concerningCount = issues.reduce((n, issue) => {
    const level = severityClassifier(issue.severity);
    return level === 'warning' || level === 'danger' || level === 'unknown' ? n + 1 : n;
  }, 0);
  const hasConcerns = concerningCount > 0;
  const HeaderIcon = hasConcerns ? ExclamationTriangleIcon : InformationCircleIcon;

  return (
    <section className="print:break-inside-avoid">
      <div className="flex items-center gap-2 mb-4">
        <HeaderIcon
          className={`w-5 h-5 ${hasConcerns ? 'text-nc-grade-c' : 'text-nc-cyan'}`}
          strokeWidth={1.8}
        />
        <h2 className="text-lg sm:text-xl font-outfit font-bold text-nc-text1">
          {hasConcerns ? (
            // W4 addendum (2026-10-01): the count used to render as its own
            // leading <span>, always shown, before the fixed label string.
            // The approved CLDR text embeds the number inside the sentence
            // itself via `%d` (and the Arabic one/two buckets carry no digit
            // at all — "ملاحظة واحدة"/"ملاحظتان") — so the digit is no
            // longer rendered separately here.
            issuesNeedAttentionLabel(concerningCount, t, lang)
          ) : (
            t.verify.scanHighlights
          )}
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {issues.map((issue, i) => (
          <IssueCard key={i} issue={issue} t={t} severityClassifier={severityClassifier} />
        ))}
      </div>
    </section>
  );
}
