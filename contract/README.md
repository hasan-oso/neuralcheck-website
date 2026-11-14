# عيّنات عقد V7 وV6 — منقولة، لا مُولَّدة هنا

## ✅ تحديث تاسع (2026-10-27، `neuralcheck-backend@05015b4`) — رفع ختم `evaluationRulesVersion` (القاعدة 39)

**المصدر:** نُسخت الستّ بنسخ بايتي مباشرةً من مستودع الخادم، دون مجلّد وسيط:
`git -C neuralcheck-backend show 05015b4:functions/test/fixtures/golden/<الاسم>`
إلى `contract/<الاسم>`. **كيف كانت النسخ تُنسخ (فُحص قبل النسخ):** بصمات الستّ
الموجودة في `contract/` تساوي بصمات `git show c289a2d:functions/test/fixtures/
golden/<الاسم>` (6 من 6)، فهي بايتية بلا معالجة نهايات أسطر
(`git ls-files --eol`: `i/lf w/lf`)، واتُّبع ذلك. **تحقّق من blob الخادم نفسه لا
من النقل:** `sha256sum` لكل blob عند `05015b4` = البصمة المرسَلة في أمر المنسّق
(6 من 6)، و`sha256sum` للملفّ في `contract/` بعد النسخ = blob الخادم (6 من 6)،
و`cmp` بين الملفّ ونسخة مستخرَجة من `git show` متطابق (6 من 6).

**السبب:** قرار حسن 2026-10-23 «يُرفع evaluationRulesVersion» (القاعدة 39)
**منقول عن أمر المنسّق، غير متحقَّق هنا**. المقروء من الخادم (قراءة فقط): الالتزام
`19a2836` يرفع الثابت `EVALUATION_RULES_VERSION` إلى
`rules-2026-10-23-hardware-absent-coverage`
(`functions/src/analysis/evaluationRulesVersion.js:39`) بدل
`rules-2026-10-13-zero-cycles-unsupported`، والالتزام `05015b4` توثيقه
وتوليد العيّنات.

**sha256 قبل ← بعد** (من `sha256sum` على `contract/` قبل النسخ وبعده؛ `sha256sum -c
SHA256SUMS.txt` على الملفّ المحدَّث: 6 OK):

```
b05cc9aafee213731b104f6c9d254fc6f8d964c4b167b8de841493ed270dd706 ← 7868c2968a793701e2462188a1f4cbed5a110c17dc4a523e81d80e5f4cc4c1a6  v7-reports-document-sample.json
fdbea3e975ddeed611ab6491d66e934a60c67fb0787dd7a33b76557d033c1ec6 ← 2ff7c3c8abcfb09600e48fb97cc3c91e5179dd033fcf6edad828c68b02d15c06  v7-reports-document-sample-honor.json
e06162ed538ec93c58d454080bd7795a4bca1340121308aaa8b2282d26fbab6d ← 9291df36b1473af98c6ea977c8071d356331cda0c7f7d59f311ad5c6b6e8fd8f  v7-reports-document-sample-security-downgrade.json
b4f162fd0ca843e22d98c478f5ac1fb3339189a1f43533278b8972e2b42dc7be ← 1382a97ba93923014c66b5fa6c6a0a9cde5427e826acc62666e27ac7cfa6bca7  v7-reports-document-sample-cpu-c06-downgrade.json
c990ae19a9f52d78f41994f8cd7187baf5e1a24ee7d419d441c80221bcee4d1a ← f1c1502152e8c5771eceac9e4bd2af291bee7688e49724c7be7c7ef97faa80fa  v7-reports-document-sample-zero-measured.json
769100459edd49b6a15022ac4ac6ccb1f2c79f5e8110a8ec5bbe1d199e785c24 ← e9d505ef56f72e0b892cd192586e9d76c5f9dfe8c37d8f036e1787c6a34735cb  v7-reports-document-sample-zero-measured-battery-harness-error.json
```

**ما تغيّر فعلاً (بـ`diff` بين blob `c289a2d` وblob `05015b4` لكل ملفّ، ثم
مقارنة بصمات `contract/` قبل النسخ وبعده):** في كلّ ملفّ من الستّ **سطر واحد
هو السطر 10**: `"evaluationRulesVersion"` من
`rules-2026-10-13-zero-cycles-unsupported` إلى
`rules-2026-10-23-hardware-absent-coverage` — **مسارات مضافة 0، محذوفة 0، ورقات
تغيّرت قيمتها 1** (الحجم +1 بايت في كلٍّ: 30473 ← 30474 · 9200 ← 9201 ·
28403 ← 28404 · 28454 ← 28455 · 27116 ← 27117 · 24241 ← 24242). **لم يتغيّر
`shortId` الجذر** (نُسخ blob الخادم كما هو). **الملفّات التسعة الأخرى في
`contract/` (`v6-reports-document` و`v6-verifyReport-response` و`v7-client-payload`
وست عيّنات `verifyReport`) بصماتها قبل النسخ وبعده متطابقة** (9 من 9، فرق
`sha256sum` على المجلّد في الستّ وحدها).

**أثر ذلك على قارئ في هذا المستودع (مقيس):**
- `git grep evaluationRulesVersion` في `app/` و`components/` و`lib/` و`scripts/`:
  لا مطابقة — فلا قارئ للختم، ولا اختبار يثبّت الختم القديم أو الجديد حرفياً
  (`git grep -F` على النصّ القديم قبل هذا القسم: مطابقات في `contract/*.json` الستّ
  وفي هذا الملفّ وحدهما)، فلا استبدال اختبار لزم (القاعدة 23).
- **الأثر الظاهر الوحيد** ما وُصف في «تحديث ثامن»: عارض «البيانات الخام (JSON)»
  في `app/admin/reports/page.js:539` يطبع الحقل بقيمته الجديدة (قائمة منع لا
  قائمة سماح؛ لم يُعدَّل).
- قرار المستخدم 2026-10-13 يبقى: الختم **لا يُعرض ولا يُقرأ** في الموقع.

**مُتحقَّق:** سويت الموقع كلّها (`node scripts/test/<ملف>.test.cjs` لكلّ ملفّ،
node 22): 38 من 38 بخروج 0 و4164 من 4164 تأكيداً **قبل النسخ وبعده، بالأعداد نفسها
ملفّاً ملفّاً**. وحارس `scripts/check-render-surface.mjs`: خروج 0. وأداة المزامنة
`neuralcheck-workspace/tools-golden-sync-check.js` عند `neuralcheck-backend@05015b4`:
**قبل** 6 ✗ للموقع (مجموعات `reports-document` الستّ، «1 فرق · مختلف:
evaluationRulesVersion» لكلٍّ) · **بعد** (`--worktree`): خروج 0 وبلا ✗.

**الأقسام الأقدم أدناه تصف عيّنات سابقة:** أرقام sha256 في «تحديث ثامن» تصف
المراجعة السابقة للملفّات الستّ ولم تعد تصف الملفّات الحالية (والقيمة
`rules-2026-10-13-zero-cycles-unsupported` فيه هي القيمة قبل هذا القسم).

---

## ✅ تحديث ثامن (2026-10-13، `neuralcheck-backend@c2e5e49`) — ختم `evaluationRulesVersion` في جذر مستند `reports`

**المصدر:** نُسخت الستّ بنسخ بايتي من مجلّد `reports-doc-samples-c2e5e49` في
مساحة العمل، ومعها ملفّ `SHA256SUMS.txt` الذي أعدّه المنسّق (نُسخ إلى
`contract/SHA256SUMS.txt` كما هو، و`cmp` يؤكّد التطابق). **منقول عن أمر المنسّق،
غير متحقَّق هنا** (لم أقرأ مستودع الخادم): أن الستّ مولَّدة من
`neuralcheck-backend@c2e5e49`، وأن التغيير في الخادم هو الالتزام `92ec041`.

**السبب (منقول عن أمر المنسّق، غير متحقَّق هنا):** الخادم صار يختم مستند
`reports` بحقل جذر واحد جديد `evaluationRulesVersion`، وقيمته في الستّ كلّها
`rules-2026-10-13-zero-cycles-unsupported`. **قرار المستخدم (2026-10-13، منقول،
غير متحقَّق هنا):** الختم «not displayed, not in verifyReport» — **فالموقع لا
يقرؤه ولا يعرضه، ولم يُضَف له قارئ ولا عرض.** لا ملفّ في `app/` ولا
`components/` ولا `lib/` تغيّر.

**sha256 (من `sha256sum -c SHA256SUMS.txt` على المجلّد المصدر قبل النسخ، ثم على
`contract/` بعد النسخ):**

```
b05cc9aafee213731b104f6c9d254fc6f8d964c4b167b8de841493ed270dd706  v7-reports-document-sample.json
fdbea3e975ddeed611ab6491d66e934a60c67fb0787dd7a33b76557d033c1ec6  v7-reports-document-sample-honor.json
e06162ed538ec93c58d454080bd7795a4bca1340121308aaa8b2282d26fbab6d  v7-reports-document-sample-security-downgrade.json
b4f162fd0ca843e22d98c478f5ac1fb3339189a1f43533278b8972e2b42dc7be  v7-reports-document-sample-cpu-c06-downgrade.json
c990ae19a9f52d78f41994f8cd7187baf5e1a24ee7d419d441c80221bcee4d1a  v7-reports-document-sample-zero-measured.json
769100459edd49b6a15022ac4ac6ccb1f2c79f5e8110a8ec5bbe1d199e785c24  v7-reports-document-sample-zero-measured-battery-harness-error.json
```

**ما تغيّر فعلاً (بسكربت `node` يقارن الورقات بين `git show HEAD:contract/<ملف>`
والملفّ الجديد؛ السكربت ومخرَجه في مجلّد الجلسة المؤقّت، ولم يُحفظا في
المستودع):** في كلّ ملفّ من الستّ: **مسارات مضافة 1** (`evaluationRulesVersion`
في الجذر؛ عدد مفاتيح الجذر 20 ← 21)، **مسارات محذوفة 0**، **ورقات تغيّرت
قيمتها 0** — فـ`shortId` الجذر **لم يتغيّر** هذه المرّة، ولا أيّ توقيت.

**أثر ذلك على قارئ في هذا المستودع (مقيس، لا مفترض):**
- لا ملفّ في `app/` ولا `components/` ولا `lib/` ولا `scripts/` يذكر
  `evaluationRulesVersion` (`git grep` على الشجرة خارج `contract/*.json`
  وخارج `.claude`، قبل هذا القسم: لا مطابقة) — فلا قارئ له.
- **الاستثناء الوحيد:** عارض «البيانات الخام (JSON)» في
  `app/admin/reports/page.js:539` يطبع المستند كلّه بعد حذف المفاتيح الخمسة
  (`lib/adminReportView.js`، قائمة منع لا قائمة سماح) — فالحقل **يظهر فيه** (مقيس
  بتصيير `ReportModal` الحقيقي للعيّنات الستّ: اسم الحقل وقيمته معاً في الستّ
  كلّها). لم يُعدَّل هذا: قائمة المنع مثبَّتة باختبار على خمسة مفاتيح بعينها
  (`adminRawKeysHidden.test.cjs`)، والاختبار يؤكّد أن العارض يساوي المستند تماماً
  حين لا يحمل المفاتيح الخمسة — فإضافة الحقل إلى القائمة تغيير في `lib/` لم
  يُؤمَر به، وقراره للمنسّق/المستخدم.

**مُتحقَّق بعد الاستبدال:** اختبارات المستودع كلّها
(`node scripts/test/<ملف>.test.cjs` لكلّ ملفّ): 28 من 28 بخروج 0، و1301 من 1301
تأكيداً — **قبل الاستبدال وبعده، بالأعداد نفسها ملفّاً ملفّاً** (`diff` بين
مخرَجَي التشغيلين: متطابق). وحارس `scripts/check-render-surface.mjs` (المرتبط
بـ`prebuild`): خروج 0.

**الأقسام الأقدم أدناه تصف عيّنات سابقة:** أرقام sha256 في «تحديث سابع» تصف
المراجعة السابقة للملفّات الستّ، ولم تعد تصف الملفّات الحالية.

## ✅ تحديث سابع (2026-10-09، `neuralcheck-backend@6fa408d`) — نقل البيانات الخامّة خارج مستند `reports`

**المصدر:** `neuralcheck-backend@6fa408d`، نُسخت الستّ بنسخ بايتي من مجلّد
`reports-document-golden-6fa408d` في مساحة العمل، وهو مُستخرَج بـ
`git show 6fa408d:functions/test/fixtures/golden/<الاسم>` (منقول عن أمر
المنسّق؛ **لم أقرأ مستودع الخادم**، فاستخراج المجلّد من `6fa408d` غير
متحقَّق مباشرة من هنا).

**السبب (منقول عن أمر المنسّق، غير متحقَّق هنا):** مستند `reports` لم يعد
يحمل خمسة مفاتيح: `rawFingerprint` و`sessionId` و`deviceFingerprintSha`
و`timeSeriesStoragePath` و`aiAudit`. **`userId` بقي.** والتقارير القديمة في
الإنتاج تحمل المفاتيح الخمسة حتى يُرحَّل الإنتاج (سكربت لاحق يشغّله
المستخدم) — فالقارئ يجب ألّا يفترض غيابها.

**استُبدلت ستّ عيّنات `reports`-document (الشكل B) فقط:**
`v7-reports-document-sample.json` · `-honor` · `-security-downgrade` ·
`-cpu-c06-downgrade` · `-zero-measured` · `-zero-measured-battery-harness-error`.
**لم تُستبدل** عيّنات `verifyReport` (الشكل C) ولا `v7-client-payload-sample.json`
ولا عيّنتا V6 — خارج هذا الأمر.

**sha256 (تحقّق ثلاث مرّات: المجلّد المصدر، ثم الملفّ في شجرة العمل بعد النسخ،
ثم `git show HEAD:` بعد الالتزام):**

```
9a8666d81d57401f4c661eeab1e7bc2bcf0b2f4819ccda7ca3a599719a6b919a  v7-reports-document-sample.json
30abe980dba6cba5c85d2ae83dc5326cb035eaf8cc3752e17ae4a877c7351b12  v7-reports-document-sample-honor.json
80c0b01eda9891e7b93e42a0c17c5903bac8e0245740a238de5c1e678540b9cf  v7-reports-document-sample-security-downgrade.json
356301933601b34914513a93415ced8061faf7e4a59d41380404753a59665579  v7-reports-document-sample-cpu-c06-downgrade.json
cdc7c45aada991c2c33dd37ddfa4275054fc92cdf2bc5efd9447d81e778e0625  v7-reports-document-sample-zero-measured.json
945b64191ae42fbacab53a3c65178851dfe4d31e3126f5616fbdfdae5a3b2213  v7-reports-document-sample-zero-measured-battery-harness-error.json
```

**ما تغيّر فعلاً (بسكربت `node` يقارن الورقات بين `git show HEAD:contract/<ملف>`
والملفّ الجديد، مُشغَّلاً على هذا المستودع؛ السكربت في مجلّد الجلسة المؤقّت
ولم يُحفظ في المستودع):**
- **في الستّ كلّها** سقطت المفاتيح الخمسة من الجذر، و`userId` باقٍ؛ **مسارات
  مضافة: 0** في كلّ منها. وعدد المسارات الفريدة (مع نوع القيمة، وفهارس
  المصفوفات مطويّة) التي سقطت: `v7-reports-document-sample` 202 · `-honor` 182 ·
  `-security-downgrade` 213 · `-cpu-c06-downgrade` 212 · `-zero-measured` 198 ·
  `-zero-measured-battery-harness-error` 198.
- **خارج المفاتيح الخمسة، ورقات تغيّرت قيمتها:** `shortId` الجذر في الستّ
  كلّها (يُعاد توليده عشوائياً مع كل توليد — لا قراءة له)؛ و`aiDurationMs`
  في `cpu-c06-downgrade` (11 ← 9) و`security-downgrade` (10 ← 8)؛
  و`v5Metrics.bodyBuildMs` في `security-downgrade` (2 ← 1) — ضجيج توقيت لا
  دلالة له. **لا بنية ولا نصّ تغيّر في `aiResponse`.**
- **لا كود ولا اختبار في هذا المستودع يقرأ المفاتيح الخمسة** (`git grep` على
  الشجرة خارج `contract/*.json`، قبل هذا القسم: لا مطابقة إلا في «تحديث ثالث»
  من هذا الملفّ — وصف تاريخي لعيّنات أقدم — وفي الملفّ الثنائي
  `public/download/NeuralCheck.apk`) — ولا اختبار يُثبَّت على `shortId` قديم.
  لذا لم يتغيّر أيّ اختبار.

**الأقسام الأقدم أدناه تصف عيّنات سابقة:** ما فيها من ذكر `rawFingerprint`
أو `deviceFingerprintSha` أو `timeSeriesStoragePath` (مثلاً تحديث ثالث) يصف
حالة تلك الجولة، ولم يعد يصف الملفّات الستّ الحالية.

**مُتحقَّق بعد الاستبدال:** اختبارات المستودع كلّها (27 ملفّاً بصيغة
`node scripts/test/<ملف>.test.cjs`) — قبل الاستبدال وبعده: 27 من 27 بخروج 0،
و1179 من 1179 تأكيداً في الحالتين، بالأعداد نفسها ملفّاً ملفّاً.

---

## ✅ تحديث سادس (2026-09-25، `contract-handoff-057cf43`) — القرار ٩٨

**`SHA256SUMS` تحقّق مرّتين** (قبل النسخ على الملفّات الأربعة في مجلّد
التسليم، وبعد `git add` على الكائن المُهيَّأ فعلياً بـ`git show ":path" |
sha256sum`) — كلاهما طابق حرفاً بحرف.

**استُبدل زوج `security-downgrade` (B وC).** السبب: قاعدة الخادم الحقيقية
(الالتزام `49c0e40`، منقول) **تكتب `LLM_ADJUSTED` فقط إذا تغيّر الحرف
فعلاً.** حرف `security` الحتمي كان `D` أصلاً (موثَّق في الجولة السابقة)،
فالعيّنة الحقيقية المُعاد توليدها الآن تُظهر `security` بـ`letterSource:
"DETERMINISTIC"` (الحرف لا يزال `D`)، و`adjustmentReason`/
`adjustmentEvidence` كلاهما `null`، وسجلّ التدقيق يحمل `noEffectReason:
"ACCEPTED_NO_EFFECT"`. **تحقّقتُ بـ`diff`:** 6 فروق في B (`letterSource`،
`adjustmentReason`، `adjustmentEvidence`، إضافة `noEffectReason`،
`durationMs`، `aiDurationMs` — الأخيران ضجيج توقيت لا دلالة) و3 في C
(`letterSource`، `adjustmentReason`، `adjustmentEvidence`) — مطابقان
تماماً للعدد المنقول («ستّة» و«ثلاثة»)، باستثناء `shortId` الجذر كالعادة.
**هذه العيّنة صارت الحالة السلبية** (تُثبت أن العلامة لا تظهر)، لا الإيجابية
كما كانت.

**جديدان — زوج `cpu-c06-downgrade` (B وC):** الحالة الإيجابية الحقيقية
الآن. مدخل S10 مع الاختبار `C-06` (تقييد الأداء الحراري) مقلوباً من `pass`
إلى `fail`، وردّ نموذج مصنوع يقبله الكود الحقيقي. `cpu`: الحرف الحتمي `B`،
المعدَّل `C`، `letterSource: "LLM_ADJUSTED"`، `adjustmentReason` نصّ حقيقي
يسمّي `C-06`، و`adjustmentEvidence` **مصفوفة**
(`["categoryStates.testResults[13].outcome"]`) — لا نصّاً، نفس الشكل الذي
لا يقرؤه `readCategories` اليوم (راجع الالتزام المنفصل لاختبار القارئ).

**مُتحقَّق بعد الاستبدال:** بحثتُ عن كل اختبار يُثبِّت `LLM_ADJUSTED` على
`security` تحديداً (قاعدتا 23/34) — واحد فقط، `scripts/test/
letterSourceAdjusted.test.cjs` (الملفّ المخصَّص لهذا الغرض بالكامل) —
أُعيدت كتابته بالكامل في الالتزام المنفصل التالي، لا أُضيف اختبار بجانبه.
`scripts/test/batteryCard.test.cjs`'s استعمال `LLM_ADJUSTED` **اصطناعي**
(`withCategoryOverride` على عيّنة B الأساسية، فئة مختلفة) وغير متأثّر —
تحقّقتُ ولم أُغيّره.

---

## ✅ تحديث خامس (2026-09-25، `contract-handoff-90fb816`) — القرار ٩٥ البند ١

**`SHA256SUMS` تحقّق مرّتين:** على الملفّات العشرة في مجلّد التسليم قبل النسخ
(`sha256sum -c`، كلّها OK)، وعلى **الكائن المُهيَّأ للالتزام فعلياً** بعد
`git add` (`git show ":<path>" | sha256sum`) — كلاهما طابق البصمات المرفقة
حرفاً بحرف، فلا مفاجأة من تطبيع نهايات الأسطر (`core.autocrlf` في هذا
المستودع يُحوِّل LF إلى CRLF في شجرة العمل فقط، لا في الكائن الملتزَم).

**استُبدلت ثلاثة:** `v7-client-payload-sample.json`، `v7-reports-document-
sample.json`، `v7-verifyReport-response-sample.json`. **ما تغيّر فعلاً
(بأداة `diff` على هذا المستودع):** عنوان كل قضيّة `DISC` من نمط «غير مقيس:
`<testId>` (`<REASON_CODE>`)» إلى «غير مقيس: `<testId>`» — سقط رمز السبب بين
القوسين (`categoryStates.js:664`، الالتزام `90fb816`، القرار ٨٩؛ منقول، لم
أتحقّق من كود الخادم مباشرة). **23 عنواناً** تغيّر في كلّ ملفّ من الثلاثة
(46 سطراً في `diff` قياسي: قديم+جديد لكل عنوان)، **بالإضافة إلى `shortId`
الجذر** المستثنى دائماً من هذا العدّ.

**تنبيه على منهجية العدّ المنقولة:** وصلني «فرق واحد، مختلف 1» لكل ملفّ —
وهذا صحيح بأداة المطابقة عند المنسّق، التي **تعدّ المصفوفة المتغيّرة بأكملها
وحدة عدّ واحدة** («المسار الورقي والمصفوفة ورقة واحدة» بنصّ الأمر)، لا كل
عنصر فيها منفصلاً؛ الاختلاف عن الجولات السابقة (حيث كشف `diff` فرقاً لم
يُذكر) هو اصطلاح عدّ مُعلَن سلفاً هنا، لا سهواً — فلا تصحيح على المنقول هذه
المرّة.

**جديدان — أوّل عيّنة حرف معدَّل بحكم نموذج (`letterSource: "LLM_ADJUSTED"`)
حقيقية في هذا المستودع:** `v7-reports-document-sample-security-
downgrade.json` (B) و`v7-verifyReport-response-sample-security-
downgrade.json` (C) — مدخل S10 الحقيقي، وردّ نموذج مصنوع موسوم يقبله الكود
الحقيقي ويكتبه (منقول، غير مُتحقَّق من كود الخادم مباشرة). فئة `security`:
`state: "PARTIAL"`، `letter: "D"`، `letterSource: "LLM_ADJUSTED"`،
`adjustmentReason` نصّ حقيقي عن فشل اختبار الجذر `SEC-04`،
`adjustmentEvidence` **مصفوفة** (`["categoryStates.testResults[61].outcome"]`)
لا نصّاً — لاحظ هذا الشكل عند اختبار القرّاء (`readCategories` في
`lib/reportReaders/v7.js` يقبل نصّاً فقط لهذا الحقل اليوم، ويُسقط أي شكل
آخر بتحذير — لم أُغيّر ذلك في التزام المزامنة هذا، القرار صراحةً «لا تُصلح
شيئاً في القارئ لأجله»؛ راجع التزام اختبار القارئ المنفصل).

⚠️ **الحرف الحتمي لفئة `security` كان `D` أصلاً قبل التعديل** — فالتعديل
«طُبِّق» تقنياً بلا تغيّر فعلي في الحرف الظاهر (`buildV7Payload.js:680-697`،
منقول). هذا معروض على المستخدم بنصّ الأمر، وليس عطباً يُصلَح في هذا
المستودع.

**مُتحقَّق بعد الاستبدال:** بحثتُ عن أي اختبار في `scripts/test/` يُثبِّت
نصّ عنوان `DISC` القديم (بالقوس والرمز) — لا يوجد (`grep` على النمط القديم،
صفر نتيجة؛ الاستثناء الوحيد القريب، `honorNoLetter.test.cjs:138`، يفحص
`issues[0].id === 'DISC-HARNESS_ERROR'` فقط، نصّ Honor اليدوي غير المتأثّر
بهذا التغيير، لا عنوانه). فلا استبدال اختبار لزم (القاعدتان 23/34) —
السويت الكامل قبل وبعد الاستبدال: 15 ملفّاً، 399/399، بلا تغيير.

---

## ✅ تحديث رابع (2026-09-25، `contract-handoff-cc4097c`) — القرار ٨٦ البند ٢

**استُبدل ملفّان فقط:** `v7-reports-document-sample.json` و`v7-reports-
document-sample-honor.json` — `SHA256SUMS` تحقّق (`sha256sum -c`) على كل
التسعة ملفّات في مجلّد التسليم قبل الاستبدال، وعلى الملفّين بعده. **الباقي
(A، C، Honor C، عيّنتا V6) تحقّقتُ أنه لم يتغيّر بالبصمة** — نفس القيم
الست المُثبَّتة في هذا المستودع سلفاً موجودة حرفياً في مجلّد التسليم.

**ما تغيّر فعلاً (بأداة `diff` على هذا المستودع، لا نقلاً فقط):** حقلان
جديدان في جذر كلٍّ من العيّنتين — `serverSamplesStoragePath` (نصّ) و
`serverSamplesSaved` (منطقي، `true`) — نسخة الخادم من العيّنات الخام
(القرار ٨٦ البند ٢، موثَّقة بالتفصيل في `V7_DISPLAY_SHAPE_CONTRACT.md §١٣`
في مجلّد التسليم؛ منقول عن ذلك الملفّ، لم يُتحقَّق من الكود المصدر
مباشرة). **تصحيح على المنقول:** وصلني «ولا فرق غيرهما» — والفعلي بـ`diff`
حقل ثالث تغيّر في كلا الملفّين: `shortId` الجذر (قيمة عشوائية جديدة على كل
توليد عيّنة، سلوك موثَّق سلفاً أعلاه في هذا الملفّ — «لا دلالة، لا يُستشهَد
به» — لا استبدالاً إضافياً متعمَّداً، لكنه لم يُذكر في عدّ الفروق).

**أثر القرّاء في wepsite (قاعدة 25):** لا قارئ بنائي (`readOverall`،
`readCategories`، `classifyPipeline`، `resolveV7Container`، إلخ) يتأثّر —
كلّها تقرأ بأسماء حقول محدّدة، وحقلان جديدان غير مرتبطَين في الجذر لا
يُغيّران أي قراءة قائمة. **موضع واحد يتأثّر ظاهرياً لا وظيفياً:**
`app/admin/reports/page.js:533` يعرض `JSON.stringify(report, null, 2)` —
تفريغ خام كامل لمستند الفحص في لوحة الإدارة — فسيظهر الحقلان الجديدان فيه
لأوّل مرّة. هذا متوافق مع تصميم اللوحة القائم (تعرض الخام كاملاً للمُشغِّل
عمداً — نفس مبرِّر غياب لوحة الإدارة عن قائمة `scripts/check-render-
surface.mjs`) لا عطباً؛ لا تعديل لزم.

---

## ✅ تحديث ثالث (2026-09-24، `contract-handoff-2cab4d6`) — القرار ٨٢

**استُبدلت الأربع** (`v7-reports-document-sample(-honor).json`،
`v7-verifyReport-response-sample(-honor).json`) — `SHA256SUMS` تحقّق عند
الاستلام لكل ملفّ منقول من مجلّد التسليم. **وجديدان:** `v6-reports-document-
sample.json` و`v6-verifyReport-response-sample.json` — أوّل عيّنتين على
مستند V6 حقيقي (`pipeline: "v6_raw_timeseries"`) في هذا المستودع. `A`
(`v7-client-payload-sample.json`) لم يتغيّر.

**ما تغيّر فعلاً في الأربع (بأداة `diff` على هذا المستودع، لا نقلاً عن
المنسّق فقط):** كل التغييرات معرّفات من الشكل نفسه (UUID/SHA-256 سداسي
عشري/رمز قصير)، لا بنية ولا محتوى:
- `B` و`Honor B`: **6 حقول** لكلٍّ منهما — `deviceFingerprintSha`،
  `timeSeriesStoragePath`، `rawFingerprint.timeSeries.header.
  deviceFingerprint`، `header.scanId`، `footer.samplesSha256`، **و`shortId`
  في جذر المستند**.
- `C` و`Honor C`: **حقلان** لكلٍّ منهما — `scanId` و`shortId`.

**تصحيح على ما نُقل:** وصلني «5 فروق» لـB/Honor B و«فرق واحد» لـC/Honor C —
والعدّ الفعلي بـ`diff` **6** و**2** على التوالي؛ الفارق في الحالتين
`shortId`، غير مذكور في القائمة المنقولة. الأرجح أنه أثر تلقائي لإعادة توليد
`scanId` عشوائي جديد (`shortId` غالباً مُشتقّ منه بالكود لا مُستبدَلاً
يدوياً بشكل مستقلّ) لا استبدالاً إضافياً متعمَّداً — لكنه لم يُذكر صراحةً،
فيُسجَّل هنا (القاعدة 40 تسري على الأعداد المنقولة أيضاً).

**⛔ N-06 (اسم المشغّل "Turkcell") لم يُستبدَل** — قرار مستخدم معلَّق، منقول
عن `golden-README.md` المرفق بالتسليم (لم أقرأ غيره من ملفّات neuralcheck-
backend). **لا اختبار في هذا المستودع يُثبَّت على هذه القيمة.**

**مصدر عيّنتَي V6 (منقول عن `golden-README.md` المرفق، غير متحقَّق مباشرة —
خارج حدود هذا المستودع):** مبنيّتان من مخرَج `export-v6-report-readonly.js`
على فحص حقيقي؛ **الملفّ الخام نفسه لا يدخل هذا المستودع مطلقاً** (قرار
صريح بإبقائه في مجلّد القيادة). راجعه المنسّق حقلاً حقلاً قبل التسليم
(وثيقة مراجعة خارج هذا المستودع أيضاً). `v6-verifyReport-response-
sample.json` مبنيّة من `v6-reports-document-sample.json` عبر فرع
`buildV6Response` الحقيقي في `verifyReport.js` (نفس تقنية استخراج فروع V7
أعلاه)، لا شكلاً مُخترَعاً. نفس شرط N-06 يسري عليهما.

**مُتحقَّق بعد الاستبدال:** سويت الاختبارات الكاملة قبل وبعد الاستبدال —
بلا تغيير في النتيجة (انظر تقرير المهمّة تحت «قياس قبل/بعد» للعدد بالأداة).

---

## ✅ تحديث ثانٍ (2026-09-24، `contract-handoff-77b710a`) — راجع القسم الجديد أسفل هذا الملفّ

الثلاثة `A`/`B`/`C` أعلاه أُعيد نسخها من `neuralcheck-backend@77b710af09e0dd
552f6fab53eb54550a2f132744` (كان `27bacd3` — راجع الفقرة الممسوحة أدناه)،
`sha256` تحقّق عند الاستلام من `SHA256SUMS` الموجود في مجلّد التسليم. **جديد
في هذه الجولة أيضاً:** `v7-reports-document-sample-honor.json` و
`v7-verifyReport-response-sample-honor.json` — عيّنة حقيقية رابعة/خامسة،
تقرير واحد بلا حرف إطلاقاً (`overall.letter=null`) و`harnessError=true`
(`scanId e4b65a2f`، لا `b45c8cf6`/`34dff2b8` كالثلاثة أعلاه). راجع القسم
الجديد «عيّنة Honor» أسفل هذا الملفّ للتفصيل الكامل.

**ما تغيّر فعلاً بين `27bacd3` و`77b710a` على الثلاثة `A`/`B`/`C` (بأداة
`git diff` على هذا المستودع، لا نقلاً):**
- **سبعة `letterCeilingReason.text`** (كل الفئات السبع غير الفارغة، في كلٍّ
  من `A`/`B`/`C`) — الجملة الفرعية "وحرف مسقوف: لم يُعتمد بعدُ أيّ من
  اختبارات هذه الفئة قياساً للحالة" استُبدلت بـ"وحرف مسقوف: لم يُقَس في هذه
  الفئة أيّ اختبار معتمد قياساً للحالة." (نقطة نهاية جديدة أيضاً). المصدر:
  `functions/src/analysis/buildDisplayShapeV7.js:234` (منقول، غير
  متحقَّق من هذا المستودع).
- **`analyzedAt` جديد في جذر `B` فقط** (`1790208000000`، رقم بالميلّي
  ثانية) — **غائب من `A` ومن `C`** عمداً: القرار ٧٥ البند ٤ لا يُدخله ضمن
  `display`/`aiResponse` ولا ضمن قائمة `verifyReport` البيضاء (راجع
  `V7_DISPLAY_SHAPE_CONTRACT.md §١٢` في مجلّد التسليم — "لا يصل
  `verifyReport`... لا يصل `display`/`aiResponse` المخزون أو المُعاد
  للعميل").
- **`shortId` تغيّر عشوائياً** على الثلاثة (كل توليد عيّنة يُنتج معرّفاً
  جديداً) — لا دلالة، لا يُستشهَد به.

القاعدة 23: لا اختبار في هذا المستودع كان يُثبت الجملة القديمة حرفياً
(`scripts/test/letterCeilingReason.test.cjs` يقارن بـ`realGpuCeiling.text`
المحمَّل من الملفّ نفسه، لا بنصّ ثابت) — فلا استبدال اختبار لزم هنا، فقط
مزامنة العيّنات. مُتحقَّق: 109/109 تأكيداً (سويت الاختبارات كاملاً) قبل
وبعد النسخ، بلا تغيير.

---

## ✅ الحالة المعلَّقة أُغلقت (2026-09-24) — راجع تحديث أسفل هذا القسم

~~هذه العيّنة قديمة الآن... ملفّان ناقصان تماماً من contract/...~~ — **وصل**
الثلاثة (A مُحدَّثة، B وC جديدتان) في تسليم من المنسّق (`contract-handoff-27bacd3`،
منقول من `git show 27bacd3:functions/test/fixtures/golden/<file>`، تحقّق `sha256`
عند الاستلام). أُبقيت هذه الفقرة القديمة مشطوبة لا محذوفة (القاعدة 8) — كانت صحيحة
حين كُتبت.

**حقيقة القراءة عبر الأشكال الثلاثة — لا تزال قائمة ومُصلَحة (`f7399ff`):** هذه
المجموعة الآن ثلاثة ملفّات حقيقية، لا ملفّ واحد:

| الملفّ | الشكل | من يقرؤه فعلياً |
|---|---|---|
| `v7-client-payload-sample.json` (A) | ردّ `analyzeDevice` الخام — لا صفحة تستقبله مباشرة | مرجع/أساس اختبار فقط |
| `v7-reports-document-sample.json` (B) | مستند `reports/{scanId}` — شكل العرض الكامل تحت `aiResponse.*` | `admin/reports`، `admin`، `dashboard`، `shop`، `/tech` (`resolveAppGrade`) — قراءة مباشرة من Firestore |
| `v7-verifyReport-response-sample.json` (C) | ردّ Cloud Function `verifyReport` — `pipeline` داخل `aiResponse.pipeline` فقط، و`letter`/`coverage`/`coveragePct`/كل حقول `overall` الأخرى مسطَّحة مباشرة على `aiResponse` بلا كائن `overall` متداخل إطلاقاً | `/verify`، `/print` (القارئ نفسه — لم يُعدَّل عرض `/print`) |

`lib/reportReaders/v7.js`/`lib/pipelineTags.js`'s `resolveV7Container()` يقرآن عبر
هذا التمييز الآن (لا جذر التقرير مباشرة) — راجع تعليقات ذينك الملفّين. مُتحقَّق
مباشرة بتشغيل القرّاء الحقيقيين على الملفّات الثلاثة الحقيقية معاً (لا مُشتقّة):
`readOverall`/`readCategories`/`resolveAppGrade` تُعطي نفس القيم بالضبط
(`letter=C`، 15 فئة، `grade=C`) على الثلاثة.

---

## مصدر الملفّات الثلاثة

منسوخة بـ`git show 27bacd3:functions/test/fixtures/golden/<file>` من
`neuralcheck-backend` (القاعدة 29) — **مولَّدة من السلسلة الحقيقية في الخادم، لا هنا**:

- **`v7-client-payload-sample.json`** — ردّ `analyzeDevice` (الشكل A)، عبر
  `functions/scripts/generate-v7-client-payload-sample.js`:
  `computeFindings → computeCategoryStates → applyV7Adjustments → buildDisplayShapeV7
  → buildV7ResponseForStorage → V7_OPERATIONAL_FIELDS`. **بصفر نداء نموذج.**
  الفرق عن نسخة `154f3f2` السابقة (منقول من المنسّق): نصّ
  `categories.<name>.letterCeilingReason.text` تغيّر (إضافة مقطع "وحرف مسقوف:
  لم يُعتمد بعدُ أيّ من اختبارات هذه الفئة قياساً للحالة") على الفئات السبع
  غير الفارغة؛ **الحروف نفسها لم تتغيّر** (48 مقابل 48، بأداة الخادم).
- **`v7-reports-document-sample.json`** — مستند `reports/{scanId}` (الشكل B)، عبر
  `buildReportDocument` — نفس الدالّة التي يكتب بها `analyzeDevice` المستند فعلاً
  (استُخرجت في `01c5aac` بلا تغيير في المستند نفسه — 1554 مساراً، 0 فرق، بأداة
  الخادم). **`createdAt`** علامة `{"__marker": "FIRESTORE_SERVER_TIMESTAMP"}` لا
  قيمة حقيقية، و**`userId`** علامة `{"__marker": "NOT_FROM_FIRESTORE_OR_AUTH_USERID"}`
  — كلاهما نصّ اصطلاحي، لا يُقرأ كسلسلة عادية.
- **`v7-verifyReport-response-sample.json`** — ردّ `verifyReport` (الشكل C)، عبر
  `buildV7Response` — **مطابق للعقد §٨-أ بالأداة: 24 مساراً مقابل 24، فرق 0.**

~~**⚠️ ستتغيّر مرّة أخرى** (منقول من تسليم المنسّق، لم يقع بعد): الجولة الثانية
للخادم تعيد صوغ نصّ البوّابة (القرار ٧٩) وتضيف حقل `analyzedAt` جديداً (القرار ٧٥).
**الشكل (المسارات/التداخل) ثابت — النصّ وحقل واحد جديد سيتغيّران.** المطابقة
النهائية بين المستودعات الثلاثة (القاعدة 39) تأتي بعد تلك الجولة، لا قبلها.~~
**وقعت (2026-09-24، `77b710a`)** — راجع القسم أعلى هذا الملفّ لتفصيل ما تغيّر
فعلاً، مُتحقَّق بـ`git diff` لا نقلاً.

**لا تُعدَّل هذه الملفّات هنا.** نسخ من دليل يعيش في المستودع الآخر؛ تعديلها هنا
يُنتج عقوداً متعدّدة. وإن لزم تحديثها، تُعاد توليدها هناك وتُنسخ ثانيةً.

## حدود العيّنات — تُقرأ قبل الاعتماد عليها

| الحقل | القيمة | النوع |
|---|---|---|
| `deviceMarketingName` (A/C) | `"Unknown"` | **نقص عيّنة** — `fingerprint` بلا `device.model` |
| `narrativeIncomplete` · `narrativeIncompleteFields` (كل الأشكال الثلاثة) | `false` · `[]` | **⚠️ حدّ العيّنة** — `resolveV7Report` لم يُستدعَ، والمصدر الحيّ يحمل `guard.ok=false`. **لا تُعتمَد مرجعاً لسلوكهما تحت رفض الحارس** |
| `battery.confidence` · `battery.letter` · `thermal.letter` · `zeroMeasuredMessage` · `abstentionReasons` · `harnessErrorReason` · `{cpu,thermal,security}.adjustmentReason` | `null` | **حقيقي** — كلٌّ بسببه المُسمّى في `NEURALCHECK-FINDINGS.md` |
| `categories.<name>.letterCeilingReason` (gpu/display/memory/gps/sensors/cellular/wireless) | كائن `{name, ceilingLetter, text}` غير `null` — 7 فئات؛ `null` على الباقي | **حقيقي** — النصّ يتضمّن الآن مقطع "حرف مسقوف: لم يُعتمد بعدُ..." (تغيّر عند `27bacd3`، راجع أعلاه) |
| `v7-reports-document-sample.json`'s `createdAt`/`userId` | علامتان اصطلاحيتان (انظر أعلاه) | **ليستا قيمتين حقيقيتين** — لا تُقارَنان كسلسلة نصّية عادية في أي اختبار |

## تصحيح — سطر محذوف لا مُستبدَل (القاعدة 23)

~~`narrative.buyerAdvice.{casual,gamer,photographer}` | `null` ×3 | **نقص عيّنة** — المصدر
التقاط أقدم من القرار ٢٤ (كان نصّاً واحداً)~~ **لم يعد صحيحاً في هذه النسخة**: العيّنة
الجديدة تحمل نصوصاً حقيقية غير `null` للثلاثة (`casual`/`gamer`/`photographer`) —
راجع `narrative.buyerAdvice` في الملفّ مباشرة. الصفّ القديم كان يصف نسخة `43dee66` فقط ولم
يعد يصف هذا الملفّ؛ أُزيل من الجدول أعلاه بدل تركه بجانب وصف يناقضه.

## عيّنة Honor (`e4b65a2f`) — الحالة الوحيدة المتاحة اليوم بلا حرف إطلاقاً

`v7-reports-document-sample-honor.json` (B) و`v7-verifyReport-response-sample-
honor.json` (C) — تقرير حقيقي واحد (`scanId e4b65a2f-3a0c-4f11-939d-
17eab7d0912f`)، منسوخ ومتحقَّق `sha256` بنفس آلية الثلاثة أعلاه
(`contract-handoff-77b710a`). لا `A` مكافئ له في هذا التسليم.

**القيم الحقيقية (من الملفّين مباشرة، لا نقلاً):**
- `overall.letter = null`، `overall.letterSource = "HARNESS_ERROR"`،
  `overall.coverage = null`، `overall.coveragePct = null`.
- `overall.harnessError = true`، `overall.harnessErrorReason =
  "FUNCTIONAL_RESULTS_UNAVAILABLE"` — أوّل عيّنة حقيقية في هذا المستودع
  بقيمة غير `null` لهذا الحقل (كان دائماً `null` في `A`/`B`/`C` أعلاه).
- **14 من 15 فئة تحمل `state: "HARNESS_ERROR"`** (لا `battery`، حالتها
  `PARTIAL`) — أوّل ظهور حقيقي لهذه القيمة في هذا المستودع؛ كانت موثَّقة في
  العقد (`V7_DISPLAY_SHAPE_CONTRACT.md §٣`) ولم تُلاحَظ من قبل (راجع تعليق
  رأس `lib/reportReaders/v7.js` قبل هذه الجولة: "documented elsewhere but
  not observed in any file this repo has"). كل الـ14 تحمل أيضاً
  `reason: "HARNESS_ERROR"` (رمز خام، لا نصّاً بشرياً).
- `issues` تحمل عنصراً واحداً: `{id: "DISC-HARNESS_ERROR", severity: "INFO",
  title: "تعذّر تجهيز نتائج الاختبارات الوظيفية لهذا الفحص
  (functionalResults=null)", description: null, evidence: null}` — نصّ
  بشري حقيقي، مختلف عن `harnessErrorReason` الخام أعلاه.
- `narrativeIncomplete = true`، و`narrative.{summary,details,verdict,
  buyerAdvice.*}` كلّها `null`.
- `B` فقط: `analyzedAt = 1790208000000` في الجذر (نفس حقل الفقرة أعلاه).

**استُهلكت في `scripts/test/honorNoLetter.test.cjs`** (26/26 تأكيداً) —
راجع تقرير المهمّة تحت «ما فعلت» للتفصيل الكامل لما أُصلح (`GradeBadge`/
`HeroCard` تعرضان "—" لا "؟" لغياب الحرف، و`gradeUnavailableNote` يُوصَل
الآن بـ`harnessErrorReason` الحقيقي على `/verify`/`/print`) وما بقي فجوة
موثَّقة بلا نصّ مُخترَع (تصنيف فئة `state="HARNESS_ERROR"` نفسها يبقى ضمن
دلو `unknown` — يحتاج تسمية عربية جديدة لا في العيّنة ولا في نصوص الموقع
الحالية؛ القاعدة 13).
