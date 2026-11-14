# neuralcheck-website

[English](README.md) · **العربية** · [Türkçe](README.tr.md)

> **حالة المشروع: مؤرشف.** أُوقف تطوير NeuralCheck في نوفمبر 2026 (ضيق الوقت، وتبيّن أنّ جمع البيانات الميدانية المخطَّط له شبه مستحيل). الكود منشور كما هو بترخيص [MIT](LICENSE) بلا ضمان ولا دعم. هذا المستودع **لا يحتوي أسراراً**: إعداد Firebase للويب يُقرأ من متغيّرات البيئة، وبريدا المشرفين والتواصل قيم وهمية.

موقع **NeuralCheck** ولوحة المشرف، نظام فحص الهواتف المستعملة: Next.js 14 (App Router) وTailwind CSS و**تصدير ساكن** (`output: 'export'`) يُقدَّم من Firebase Hosting، ويتحدّث مع مشروع Firebase الذي يشغّل [neuralcheck-backend](https://github.com/hasan-oso/neuralcheck-backend). وتطبيق أندرويد هو [neuralcheck-mobile](https://github.com/hasan-oso/neuralcheck-mobile).

## الصفحات

- **العامة:** الرئيسية والأسعار والتقنية و`verify` (التحقّق من تقرير برمزه القصير) وصفحات التقارير (`print/[shortId]`) وصفحات المحلّات (`shop/[slug]`) والخصوصية والشروط وتسجيل الدخول ولوحة المستخدم والفحص و`tech`.
- **المشرف** (`/admin/*`): المستخدمون والمدفوعات ورموز الخصم والتقارير والإعدادات ولوحات البروتوكول (المحلّات والتصحيحات والأسماء التسويقية).
- ثلاث لغات (العربية الافتراضية والتركية والإنجليزية) في `lib/i18n.js` مع تخطيط من اليمين إلى اليسار للعربية.

## المتطلبات

Node.js 22 (يحتاج Next.js 14 إلى 18.17 على الأقل) ومشروع Firebase خاص بك نُشرت عليه الواجهة الخلفية.

## الإعداد

```bash
npm ci
cp .env.example .env.local     # املأ قيم تطبيق الويب في مشروع Firebase الخاص بك
npm run dev
```

بلا `.env.local` يعمل البناء لكن بقيم Firebase وهمية (`YOUR_FIREBASE_API_KEY` وغيرها) ولا يصل إلى أي واجهة خلفية.

- **قائمة المشرفين:** استبدل `admin1@example.com` و`admin2@example.com` و`admin3@example.com` في `lib/admin.js` ببريدك (وفي `firestore.rules` و`functions/src/utils/admin.js` بالواجهة الخلفية؛ فالخادم هو من يفرضها فعلاً).
- **بريد التواصل:** `contact@example.com` في `components/Footer.js` و`lib/i18n.js`.
- **تنزيل أندرويد:** الملفّ `public/download/NeuralCheck.apk` غير مضمَّن (مُتجاهَل في git). ابنِ الـAPK من `neuralcheck-mobile` وضعه هناك، أو غيّر رابط التنزيل.

## البناء والاختبار والنشر

```bash
npm run build                      # يشغّل حارس سطح العرض ثم يكتب الموقع الساكن في out/
for f in scripts/test/*.test.cjs; do node "$f" || echo "FAILED: $f"; done
firebase deploy --only hosting     # ينشر ما في out/
```

ابنِ قبل النشر مباشرةً: المجلّد `out/` مُتجاهَل في git وقد يحوي شجرة قديمة. والأمران `npm run deploy:guard:pre` و`deploy:guard:post` سكربتا أمان اختياريان. **البناء غير حتمي** (يتغيّر معرّف البناء وبصمات الأجزاء في كل مرّة)؛ اقرأ `docs/BUILD_NOTES.md` قبل مقارنة بنائين.

## الترخيص

[MIT](LICENSE).
