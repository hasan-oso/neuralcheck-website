// Every Arabic string the protocol admin pages show (/admin/protocol, /admin/protocol/shops,
// /admin/protocol/corrections, /admin/protocol/marketing-names, and the sidebar entry) — ONE source (rule 24),
// with where each string comes from.
//
// History. web-engineer-5 (2026-10-21) took the texts of the new admin pages from PLAN-06 word for word where
// the plan wrote them (quoted below with the line, plan/PLAN-06-DATA-COLLECTION.md = «P6») and PROPOSED the
// rest, behind ADMIN_PROTOCOL_TEXTS_APPROVED = false. The 89 proposals were listed in the decisions sheet
// (DECISIONS-FOR-HASAN-2026-10-21.md, section (ج), rows C1-1 .. C3-14) and APPROVED on 2026-10-23 by the
// user's order («اعتمد بتقديرك الأنسب كل القرارات والنصوص المعلّقة», Hasan's delegation of 2026-10-22; relayed in the
// order to the site's engineer, not checkable from this repo), each
// one after being set against what the page and the callable it reads actually do. 84 were approved as
// proposed (`APPROVED:<row>`); 5 after a minimal edit with its reason beside the text (`APPROVED_EDITED:<row>`).
// An existing string of the site is reused where one already says the thing (marked EXISTING).
//
// `TEXT_SOURCE` has one entry per key of `ADMIN_PROTOCOL_TEXTS`. Two tests read it: adminProtocolPanels.test.cjs
// (every text has a source; the guard is true only when no text is still PROPOSED) and
// adminProtocolTextsApproved.test.cjs (every key, its literal text and its source, one by one: rule 29).
//
// Not texts and not here: the wire names (lib/protocolAdminWire.js) — the pages show the setting names and the
// refusal codes as the server sends them, in monospace, because a refusal's message IS its technical code
// (A10 (4): «والرسالة رمزه التقني: لا نصّ عربي جديد»).

import {
  SETTINGS_FIELD,
  PROTOCOL_PART,
  TECH_ACTIVE_STATE,
} from '@/lib/protocolAdminWire';
import {
  CORRECTION_ACTION,
  CORRECTION_BASIS,
  EXCLUDE_REASON,
} from '@/lib/protocolCorrectionWire';
import { CORRECTION_FORM_PROBLEM } from '@/lib/protocolCorrectionPatch';
import { MARKETING_ROW_PROBLEM } from '@/lib/marketingNamesPatch';

const P = (line) => `P6:${line}`;

export const ADMIN_PROTOCOL_TEXTS = Object.freeze({
  // ---- navigation and titles ------------------------------------------------
  navLabel: 'بروتوكول الجمع',
  settingsTitle: 'إعدادات البروتوكول',
  shopsTitle: 'التفعيل لكل محلّ',

  // ---- settings: the state of the document ----------------------------------
  versionLabel: 'الإصدار',
  updatedAtLabel: 'آخر تحديث',
  updatedByLabel: 'المشرف مُهشَّراً',
  settingsAbsent: 'إعدادات غائبة (لم تُكتب بعد)',
  settingsAbsentEffect: 'الخادم لا يختار تكراراً ولا تقييماً مزدوجاً حينها',
  settingsVersionUnusable:
    'مستند الإعدادات موجود بلا رقم إصدار صالح، فيُقرأ غائباً والدالّة ترفض الكتابة فوقه',
  replyUnreadable: 'تعذّر فهم ردّ الخادم',

  // ---- settings: the seven fields -------------------------------------------
  fieldRepeatRate: 'نسبة التكرار',
  fieldDoubleEvalRate: 'نسبة التقييم المزدوج',
  // C1-9, EDITED 2026-10-23: the proposal «صلاحية «قبل» المفتوح (ساعات)» was a guess from the field name. The server reads the value as how
  // long a «قبل» scan (maintenance_before) stays open for the link with a «بعد» scan: neuralcheck-backend@0dfe892
  // functions/src/protocol/maintenancePair.js:199-211 (readValidityHours, isWithinWindow: now - openedAt <= hours) and :428 (BEFORE_EXPIRED).
  fieldOpenBeforeValidityHours: 'المدّة التي يبقى فيها فحص «قبل» مفتوحاً للربط بفحص «بعد» (ساعات)',
  fieldCollectionPhase: 'مرحلة الجمع',
  fieldBlindnessAlertBelowPct: 'حدّ تنبيه العمى (%)',
  fieldReturnReasons: 'أسباب المرتجع',
  fieldMinAppVersion: 'أدنى إصدار للتطبيق',
  fieldAbsent: 'غير مضبوط',
  fieldMalformed: 'القيمة المحفوظة بنوع غير متوقَّع',
  fieldUnknownKeys: 'حقول غير معروفة للواجهة',
  returnReasonsRule: 'المفتاح لا يُعدَّل بعد استعماله، والإيقاف بدل الحذف.',
  returnReasonKey: 'المفتاح',
  returnReasonAr: 'العربية',
  returnReasonTr: 'التركية',
  returnReasonActive: 'فعّال',
  returnReasonAdd: 'إضافة سبب',
  boolOn: 'مفعَّل',
  boolOff: 'غير مفعَّل',
  limitsTitle: 'الحدود المقبولة (كما أرسلها الخادم)',
  limitsAbsent: 'لم يُرسل الخادم الحدود',
  cannotClear: 'لا يمكن مسح قيمة محفوظة',
  invalidNumber: 'رقم غير صالح',

  // ---- actions and results --------------------------------------------------
  save: 'حفظ',
  saving: 'جاري الحفظ...',
  unsaved: '• لم يُحفظ بعد',
  nothingToSave: 'لا تغيير',
  saved: 'تم الحفظ',
  savedVersion: (version) => `تم الحفظ — الإصدار ${version}`,
  savedNoChange: 'لم يتغيّر شيء',
  refusedPrefix: 'رُفض الطلب:',
  unknownRefusalCode: 'رمز غير معروف للواجهة',
  callFailed: 'تعذّر إتمام الطلب',
  retry: 'إعادة المحاولة',

  // ---- shops: the picker ----------------------------------------------------
  shopSearch: 'بحث بالبريد أو الاسم...',
  usersLoadFailed: 'فشل تحميل المستخدمين',
  noShopSelected: 'اختر محلّاً',
  noShopMatches: 'لا يوجد مستخدمون مطابقون',

  // ---- shops: the six parts -------------------------------------------------
  // C1-32, EDITED 2026-10-23: the card lists all six parts, each on or off (ShopProtocolPanel.js PartsCard), so «الأجزاء المفعَّلة» would claim a filtered list.
  partsTitle: 'تفعيل الأجزاء',
  partsAbsent: 'الغائب «غير مفعَّل»',
  partUnreadable: 'غير مقروء',
  partPurposes: 'غرض الفحص',
  partBatteryBeforeAfter: 'أزواج البطارية',
  partColdRepeat: 'التكرار البارد',
  partReturns: 'عاد الزبون بشكوى',
  partDoubleEval: 'التقييم المزدوج',
  partConsent: 'الموافقة',

  // ---- shops: the technicians -----------------------------------------------
  techTitle: 'الفنّيون',
  techHint: 'إضافة اسم، وتعديله، وإيقافه بلا حذف (فتبقى تقييماته القديمة مربوطة باسمه).',
  techNameLabel: 'الاسم المعروض',
  techNone: 'لا فنّيين لهذا المحلّ',
  techAdd: 'إضافة',
  techRenameSave: 'حفظ الاسم',
  techActivate: 'تفعيل',
  techDeactivate: 'إيقاف',
  techStateActive: 'فعّال',
  techStateInactive: 'موقوف',
  techStateUnreadable: 'علم الفعّالية غير مقروء',
  techUnreadableEntry: 'سجلّ فنّي غير مقروء',

  // ---- W-P6-18: the correction page (one action, then what the server answers) ----
  correctionsTitle: 'التصحيح: سجلّ بالإلحاق وحده',
  correctionAction: 'الإجراء',
  correctionActionUnset: 'اختر الإجراء',
  actionUnlink: 'فكّ الربط',
  actionRelink: 'إعادة الربط',
  actionExclude: 'استبعاد',
  actionUnexclude: 'إلغاء الاستبعاد',
  targetShortId: 'رمز التقرير',
  targetScanId: 'معرّف الفحص',
  targetHint: 'أدخل أحدهما فقط',
  toScanIdLabel: 'الفحص المراد الربط به (معرّف الفحص)',
  reasonLabel: 'سبب الاستبعاد',
  reasonUnset: 'اختر السبب',
  reasonTest: 'فحص اختبار',
  reasonWrong: 'فحص خاطئ',
  reasonGoldenReference: 'مرجع ذهبي',
  correctionSend: 'تنفيذ',
  problemNoTarget: 'أدخل رمز التقرير أو معرّف الفحص',
  problemBothTargets: 'أدخل أحدهما فقط، لا الاثنين',
  problemNoToScanId: 'أدخل معرّف الفحص المراد الربط به',
  problemNoReason: 'اختر سبب الاستبعاد',
  correctionRecorded: 'تم تسجيل التصحيح',
  resultTitle: 'نتيجة الإجراء',
  resultBasis: 'الأساس',
  basisScanProtocol: 'سجلّ البروتوكول',
  basisReportOnly: 'التقرير وحده (فحص أقدم من سجلّ البروتوكول)',
  resultExclusion: 'علامة الاستبعاد',
  // C2-26, EDITED 2026-10-23: `exclusion: null` means no EXCLUSION mark, not that the scan was never corrected: an unlink or a relink
  // leaves it null (neuralcheck-backend@0dfe892 protocolCorrection.js:260-287, only linkState and linkModelCheck are written), and the card
  // then also says «تم تسجيل التصحيح».
  exclusionNone: 'لا علامة (لم يُصحَّح استبعاده قطّ)',
  exclusionExcluded: 'مستبعَد',
  exclusionNotExcluded: 'غير مستبعَد',
  exclusionReasonLabel: 'السبب',
  resultLinkState: 'حالة الربط',
  // C2-31, EDITED 2026-10-23: after an unlink the server keeps `linkedScanId` and changes only `linkState` (protocolCorrection.js:20 and :285-287),
  // so «الفحص المرتبط» would read as still linked beside `unlinked_by_admin`.
  resultLinkedScanId: 'الفحص المسجَّل في الربط',
  resultSeq: 'رقم سطر التصحيح',
  seqNone: 'لا سطر ملحَق',
  valueNull: 'لا قيمة',
  valueUnknown: 'قيمة غير معروفة للواجهة',

  // ---- W-P6-20: the marketing-name map ---------------------------------------------
  marketingTitle: 'خريطة الأسماء التجارية بالعربية',
  marketingAbsent: 'الخريطة غائبة (لم تُدخَل بعد)',
  marketingStoredUnreadable: 'مستند الخريطة المحفوظ غير مقروء، والدالّة ترفض الكتابة فوقه',
  marketingEntriesCount: (n) => `${n} مدخل`,
  marketingColModel: 'الطراز',
  marketingColAr: 'العربية',
  marketingColTr: 'التركية',
  marketingColEn: 'الإنجليزية',
  // C3-8, EDITED 2026-10-23: the match is literal (marketingNames.js:17) but a model with a space at either end is REFUSED (:82, MODEL_NOT_TRIMMED),
  // so «المسافات كما هي» was not true for the ends.
  marketingModelHint: 'مطابقة الطراز حرفية: حالة الأحرف والمسافات الداخلية كما هي، ولا تُقبل مسافة في طرفيه',
  marketingAddRow: 'إضافة مدخل',
  marketingNoEntries: 'لا مداخل',
  marketingRowIncomplete: 'المدخل ناقص: الطراز والأسماء الثلاثة مطلوبة كلها',
  marketingModelSaved: 'الطراز محفوظ مسبقاً: عدّل مدخله في القائمة',
  marketingModelDuplicate: 'الطراز مكرَّر بين المداخل الجديدة',
  marketingSaved: (version, added, updated) =>
    `تم الحفظ — الإصدار ${version} (أُضيف ${added}، حُدِّث ${updated})`,
});

/**
 * Where each text comes from: `APPROVED:<row>` (a proposal approved as written; <row> is its row in the decisions
 * sheet, C1-1 .. C3-14), `APPROVED_EDITED:<row>` (approved after a minimal edit, the reason beside the text),
 * `EXISTING` (a string the site already shows), or the plan line it is copied from (`P6:<line>`). One entry per key
 * above. `PROPOSED` is no longer a value: a text the user has not approved must not ship with
 * ADMIN_PROTOCOL_TEXTS_APPROVED = true, and the tests pin that.
 */
export const TEXT_SOURCE = Object.freeze({
  navLabel: 'APPROVED:C1-1',
  settingsTitle: 'APPROVED:C1-2',
  shopsTitle: P('787'), // «التفعيل لكل محلّ»
  versionLabel: 'APPROVED:C1-3',
  updatedAtLabel: 'APPROVED:C1-4',
  updatedByLabel: P('863'), // «المشرف مُهشَّراً» (the line: «والمشرف مُهشَّراً»)
  settingsAbsent: P('893'), // «إعدادات غائبة (لم تُكتب بعد)»
  settingsAbsentEffect: P('893'), // «والخادم لا يختار تكراراً ولا تقييماً مزدوجاً حينها»
  settingsVersionUnusable: 'APPROVED:C1-5',
  replyUnreadable: 'APPROVED:C1-6',
  fieldRepeatRate: 'APPROVED:C1-7',
  fieldDoubleEvalRate: 'APPROVED:C1-8',
  fieldOpenBeforeValidityHours: 'APPROVED_EDITED:C1-9',
  fieldCollectionPhase: P('780'), // «في مرحلة الجمع»
  fieldBlindnessAlertBelowPct: 'APPROVED:C1-10',
  fieldReturnReasons: 'APPROVED:C1-11',
  fieldMinAppVersion: 'APPROVED:C1-12',
  fieldAbsent: 'APPROVED:C1-13',
  fieldMalformed: 'APPROVED:C1-14',
  fieldUnknownKeys: 'APPROVED:C1-15',
  returnReasonsRule: P('782'), // «المفتاح لا يُعدَّل بعد استعماله، والإيقاف بدل الحذف.»
  returnReasonKey: 'APPROVED:C1-16',
  returnReasonAr: 'APPROVED:C1-17',
  returnReasonTr: 'APPROVED:C1-18',
  returnReasonActive: P('191'), // «فعّال»
  returnReasonAdd: 'APPROVED:C1-19',
  boolOn: P('780'), // «مفعَّل»
  boolOff: P('788'), // «غير مفعَّل»
  limitsTitle: 'APPROVED:C1-20',
  limitsAbsent: 'APPROVED:C1-21',
  cannotClear: 'APPROVED:C1-22',
  invalidNumber: 'APPROVED:C1-23',
  save: 'EXISTING', // app/admin/settings/page.js «حفظ»
  saving: 'EXISTING', // app/admin/settings/page.js «جاري الحفظ...»
  unsaved: 'EXISTING', // app/admin/settings/page.js «• لم يُحفظ بعد»
  nothingToSave: 'APPROVED:C1-24',
  saved: 'APPROVED:C1-25', // modelled on the existing «تم الحفظ — …»
  savedVersion: 'APPROVED:C1-26', // modelled on the existing «تم الحفظ — …»
  savedNoChange: 'APPROVED:C1-27',
  refusedPrefix: 'APPROVED:C1-28',
  unknownRefusalCode: 'APPROVED:C1-29',
  callFailed: 'APPROVED:C1-30',
  retry: 'EXISTING', // components/admin/AiModelCard.js «إعادة المحاولة»
  shopSearch: 'EXISTING', // app/admin/users/page.js «بحث بالبريد أو الاسم...»
  usersLoadFailed: 'EXISTING', // app/admin/users/page.js «فشل تحميل المستخدمين»
  noShopSelected: 'APPROVED:C1-31',
  noShopMatches: 'EXISTING', // app/admin/users/page.js «لا يوجد مستخدمون مطابقون»
  partsTitle: 'APPROVED_EDITED:C1-32',
  partsAbsent: P('788'), // «الغائب «غير مفعَّل»»
  partUnreadable: 'APPROVED:C1-33',
  partPurposes: P('1044'), // «غرض الفحص»
  partBatteryBeforeAfter: P('1046'), // «أزواج البطارية»
  partColdRepeat: P('1048'), // «التكرار البارد والساخن» — the cold half
  partReturns: P('1047'), // «عاد الزبون بشكوى»
  partDoubleEval: P('1051'), // «التقييم المزدوج»
  partConsent: P('1053'), // «الموافقة»
  techTitle: P('790'), // «شاشة «الفنّيون»»
  techHint: P('790'), // the user's decision, quoted there
  techNameLabel: P('191'), // «الاسم المعروض»
  techNone: 'APPROVED:C1-34',
  techAdd: 'APPROVED:C1-35',
  techRenameSave: 'APPROVED:C1-36',
  techActivate: 'APPROVED:C1-37',
  techDeactivate: P('790'), // «إيقافه»
  techStateActive: P('191'), // «فعّال»
  techStateInactive: 'APPROVED:C1-38',
  techStateUnreadable: 'APPROVED:C1-39',
  techUnreadableEntry: 'APPROVED:C1-40',
  // W-P6-18
  correctionsTitle: P('854'), // «التصحيح: سجلّ بالإلحاق وحده» (the heading §٦-ب-٥)
  correctionAction: 'APPROVED:C2-1',
  correctionActionUnset: 'APPROVED:C2-2',
  actionUnlink: 'APPROVED:C2-3', // the plan writes the action names only: `unlink` (P6:857)
  actionRelink: 'APPROVED:C2-4', // `relink(toScanId)` (P6:857)
  actionExclude: 'APPROVED:C2-5', // `exclude(reason …)` (P6:858)
  actionUnexclude: 'APPROVED:C2-6', // `unexclude` (P6:858)
  targetShortId: P('867'), // «رمز التقرير» («فالاستبعاد يقوم على رمز التقرير و`scanId`»)
  targetScanId: 'APPROVED:C2-7',
  targetHint: 'APPROVED:C2-8',
  toScanIdLabel: 'APPROVED:C2-9',
  reasonLabel: 'APPROVED:C2-10',
  reasonUnset: 'APPROVED:C2-11',
  reasonTest: 'APPROVED:C2-12', // the plan writes `test` (P6:858) and «فحوص اختبار» (P6:866)
  reasonWrong: 'APPROVED:C2-13', // `wrong` (P6:858)
  reasonGoldenReference: 'APPROVED:C2-14', // `golden_reference` (P6:858)
  correctionSend: 'APPROVED:C2-15',
  problemNoTarget: 'APPROVED:C2-16',
  problemBothTargets: 'APPROVED:C2-17',
  problemNoToScanId: 'APPROVED:C2-18',
  problemNoReason: 'APPROVED:C2-19',
  correctionRecorded: 'APPROVED:C2-20',
  resultTitle: 'APPROVED:C2-21',
  resultBasis: 'APPROVED:C2-22',
  basisScanProtocol: 'APPROVED:C2-23',
  basisReportOnly: 'APPROVED:C2-24', // P6:867 «فحوص هذه القائمة أقدم من `scanProtocol`»
  resultExclusion: 'APPROVED:C2-25',
  exclusionNone: 'APPROVED_EDITED:C2-26',
  exclusionExcluded: 'APPROVED:C2-27',
  exclusionNotExcluded: 'APPROVED:C2-28',
  exclusionReasonLabel: 'APPROVED:C2-29',
  resultLinkState: 'APPROVED:C2-30',
  resultLinkedScanId: 'APPROVED_EDITED:C2-31',
  resultSeq: 'APPROVED:C2-32',
  seqNone: 'APPROVED:C2-33',
  valueNull: 'APPROVED:C2-34',
  valueUnknown: 'APPROVED:C2-35',
  // W-P6-20
  marketingTitle: P('1061'), // «خريطة الأسماء التجارية بالعربية» (the row P6-20 of §٩-أ)
  marketingAbsent: 'APPROVED:C3-1',
  marketingStoredUnreadable: 'APPROVED:C3-2',
  marketingEntriesCount: 'APPROVED:C3-3',
  marketingColModel: 'APPROVED:C3-4', // the plan writes `Build.MODEL` (P6:1535)
  marketingColAr: 'APPROVED:C3-5',
  marketingColTr: 'APPROVED:C3-6',
  marketingColEn: 'APPROVED:C3-7',
  marketingModelHint: 'APPROVED_EDITED:C3-8',
  marketingAddRow: 'APPROVED:C3-9',
  marketingNoEntries: 'APPROVED:C3-10',
  marketingRowIncomplete: 'APPROVED:C3-11',
  marketingModelSaved: 'APPROVED:C3-12',
  marketingModelDuplicate: 'APPROVED:C3-13',
  marketingSaved: 'APPROVED:C3-14', // modelled on the existing «تم الحفظ — …»
});

/** Settings field name → its label key (the pages read labels only through here). */
export const SETTINGS_FIELD_LABEL_KEY = Object.freeze({
  [SETTINGS_FIELD.REPEAT_RATE]: 'fieldRepeatRate',
  [SETTINGS_FIELD.DOUBLE_EVAL_RATE]: 'fieldDoubleEvalRate',
  [SETTINGS_FIELD.OPEN_BEFORE_VALIDITY_HOURS]: 'fieldOpenBeforeValidityHours',
  [SETTINGS_FIELD.COLLECTION_PHASE]: 'fieldCollectionPhase',
  [SETTINGS_FIELD.BLINDNESS_ALERT_BELOW_PCT]: 'fieldBlindnessAlertBelowPct',
  [SETTINGS_FIELD.RETURN_REASONS]: 'fieldReturnReasons',
  [SETTINGS_FIELD.MIN_APP_VERSION]: 'fieldMinAppVersion',
});

/** Part key → its label key. */
export const PART_LABEL_KEY = Object.freeze({
  [PROTOCOL_PART.PURPOSES]: 'partPurposes',
  [PROTOCOL_PART.BATTERY_BEFORE_AFTER]: 'partBatteryBeforeAfter',
  [PROTOCOL_PART.COLD_REPEAT]: 'partColdRepeat',
  [PROTOCOL_PART.RETURNS]: 'partReturns',
  [PROTOCOL_PART.DOUBLE_EVAL]: 'partDoubleEval',
  [PROTOCOL_PART.CONSENT]: 'partConsent',
});

/** Technician `activeState` → its label key. */
export const TECH_STATE_LABEL_KEY = Object.freeze({
  [TECH_ACTIVE_STATE.ACTIVE]: 'techStateActive',
  [TECH_ACTIVE_STATE.INACTIVE]: 'techStateInactive',
  [TECH_ACTIVE_STATE.ACTIVE_FLAG_UNREADABLE]: 'techStateUnreadable',
});

/** Correction `action` → its label key (W-P6-18). */
export const CORRECTION_ACTION_LABEL_KEY = Object.freeze({
  [CORRECTION_ACTION.UNLINK]: 'actionUnlink',
  [CORRECTION_ACTION.RELINK]: 'actionRelink',
  [CORRECTION_ACTION.EXCLUDE]: 'actionExclude',
  [CORRECTION_ACTION.UNEXCLUDE]: 'actionUnexclude',
});

/** Exclusion `reason` → its label key (W-P6-18). */
export const EXCLUDE_REASON_LABEL_KEY = Object.freeze({
  [EXCLUDE_REASON.TEST]: 'reasonTest',
  [EXCLUDE_REASON.WRONG]: 'reasonWrong',
  [EXCLUDE_REASON.GOLDEN_REFERENCE]: 'reasonGoldenReference',
});

/** The reply's `basis` → its label key (W-P6-18). */
export const CORRECTION_BASIS_LABEL_KEY = Object.freeze({
  [CORRECTION_BASIS.SCAN_PROTOCOL]: 'basisScanProtocol',
  [CORRECTION_BASIS.REPORT_ONLY]: 'basisReportOnly',
});

/** A form problem of the correction page → the text that names it (W-P6-18). */
export const CORRECTION_PROBLEM_TEXT_KEY = Object.freeze({
  [CORRECTION_FORM_PROBLEM.NO_ACTION]: 'correctionActionUnset',
  [CORRECTION_FORM_PROBLEM.NO_TARGET]: 'problemNoTarget',
  [CORRECTION_FORM_PROBLEM.BOTH_TARGETS]: 'problemBothTargets',
  [CORRECTION_FORM_PROBLEM.NO_TO_SCAN_ID]: 'problemNoToScanId',
  [CORRECTION_FORM_PROBLEM.NO_REASON]: 'problemNoReason',
});

/** A row problem of the marketing-names page → the text that names it (W-P6-20). */
export const MARKETING_PROBLEM_TEXT_KEY = Object.freeze({
  [MARKETING_ROW_PROBLEM.CANNOT_CLEAR]: 'cannotClear',
  [MARKETING_ROW_PROBLEM.ROW_INCOMPLETE]: 'marketingRowIncomplete',
  [MARKETING_ROW_PROBLEM.MODEL_ALREADY_SAVED]: 'marketingModelSaved',
  [MARKETING_ROW_PROBLEM.MODEL_DUPLICATE]: 'marketingModelDuplicate',
});
