export const translations = {
  ar: {
    nav: {
      home: 'الرئيسية',
      technology: 'التقنية',
      verify: 'تحقق',
      pricing: 'الأسعار',
      login: 'دخول',
      dashboard: 'لوحة التحكم',
      myAccount: 'حسابي',
      signOut: 'تسجيل الخروج',
      adminPanel: 'لوحة الإدارة',
      myShop: 'متجري',
    },
    hero: {
      badge: 'مدعوم بالذكاء الاصطناعي',
      title: 'افحص أي هاتف قبل الشراء',
      subtitle: 'فحص شامل بالذكاء الاصطناعي — 100+ اختبار في 8 دقائق',
      cta: 'تنزيل التطبيق (APK)',
      ctaVerify: 'تحقق من تقرير',
    },
    trust: {
      encrypted: 'بيانات مشفّرة',
      ai: 'تحليل بالذكاء الاصطناعي',
      verifiable: 'تقارير قابلة للتحقق',
      models: 'مُختبَر على الأجهزة الرائدة والمتوسطة',
    },
    features: {
      title: 'لماذا NeuralCheck؟',
      f1: { title: 'فحص ضغط 8 دقائق', desc: 'اختبار مكثف يكشف المشاكل المخفية التي لا تظهر بالاستخدام العادي' },
      f2: { title: 'تحليل بالذكاء الاصطناعي', desc: 'الذكاء الاصطناعي يقدّم تقريراً واضحاً — يشمل شرحاً مبسّطاً للمستخدم العامّ وتفاصيل تقنيّة كاملة للمتخصّصين' },
      f3: { title: 'تقرير موثوق', desc: 'كل تقرير يحمل رمز QR للتحقق من صحته — لا يمكن التلاعب بالنتائج' },
      f4: { title: 'توقع المشاكل', desc: 'يكتشف أنماط المخاطر — علامات إنذار مبكرة قد تؤثّر على الموثوقيّة طويلة الأمد' },
      learnHow: 'تعرّف كيف يعمل ←',
    },
    stats: {
      title: 'أرقام تتحدث',
      tests: 'اختبار تقني',
      minutes: 'دقيقة فحص',
      variables: 'قنوات قياس عالميّة',
      categories: 'فئات اختبار',
      accuracy: 'دقة التحليل',
      models: 'طراز مدعوم',
    },
    howItWorks: {
      title: 'كيف يعمل؟',
      s1: { title: 'ثبّت التطبيق', desc: 'نزّل NeuralCheck من موقعنا مجاناً' },
      s2: { title: 'ابدأ الفحص', desc: 'شغّل الفحص الشامل وانتظر 8 دقائق فقط' },
      s3: { title: 'اقرأ التقرير', desc: 'احصل على تقرير واضح مع تقييم وحكم نهائي' },
    },
    verify: {
      title: 'تحقق من تقرير فحص',
      subtitle: 'أدخل رقم الفحص (Scan ID) المذكور في تقريرك للتحقق من صحته',
      placeholder: 'NC-XXXXXX',
      example: 'مثال:',
      button: 'تحقق',
      scanQR: 'مسح QR',
      loading: 'جاري التحقق...',
      notFound: 'لم يتم العثور على تقرير بهذا الرقم',
      notFoundHint: 'تأكد من رقم الفحص المذكور في تقريرك أو امسح رمز QR',
      verified: 'تقرير موثوق ✓',
      grade: 'التقييم',
      device: 'الجهاز',
      date: 'تاريخ الفحص',
      verdict: 'الحكم النهائي',
      score: 'النقاط',
      summary: 'الملخص',
      issues: 'المشاكل المكتشفة',
      noIssues: 'لا توجد مشاكل ✓',
      severityHigh: 'خطر',
      severityMedium: 'متوسط',
      severityLow: 'منخفض',
      topCategories: 'أعلى الفئات',
      lowestCategories: 'الأدنى أداءً',
      scanIdLabel: 'رقم الفحص',
      issueCount: 'مشكلة',
      printReport: 'طباعة التقرير',
      downloadPdf: 'تنزيل التقرير (PDF)',
      preparingPdf: 'جارٍ تحضير التقرير...',
      pdfError: 'تعذّر تحضير التقرير',
      pdfErrorHint: 'حاول مرّة أخرى أو استخدم خيار الطباعة',
      // V2 #50 — تصميم تقرير احترافي
      reportVerified: 'تقرير موثَّق',
      // W2 (أمر 2026-10-01، نصّ A2 الحرفي؛ اعتمده المستخدم 2026-10-01):
      // كانت شارة قصيرة ("محلَّل بالذكاء الاصطناعي")، استُبدلت بالجملة
      // الكاملة — تُعرض كسطر فوق دائرة الحرف في /verify، لا كشارة مستديرة
      // (app/verify/page.js). معتمد (عربي وتركي) في التطبيق والموقع معاً.
      analyzedByAI: 'الحرف محسوب من نتائج القياس، والتحليل والنصائح بالذكاء الاصطناعي.',
      scanDate: 'تاريخ الفحص',
      issuesFound: 'مشاكل اكتُشفت',
      // W4 (أمر 2026-10-01، نصّ معتمد 2026-10-01، صيغة واحدة في التطبيق
      // والموقع): أربع صيغ تتبع العدد (1، 2، 3-10، 11 فأكثر) — 0 لا يُعرض له
      // سطر أصلاً (IssuesList.js لا يصل إلى هذا الفرع عند عدٍّ صفري). الرقم
      // %d يُستبدَل بالأداة (issuesNeedAttentionLabel في IssuesList.js) —
      // غائب تماماً من صيغتَي 1 و2 بأمر صريح، وداخل الصيغة (لا قبلها كسطر
      // منفصل) في 3-10 و11+.
      issuesNeedAttentionOne: 'ملاحظة واحدة تحتاج انتباهاً',
      issuesNeedAttentionTwo: 'ملاحظتان تحتاجان انتباهاً',
      issuesNeedAttentionFew: '%d ملاحظات تحتاج انتباهاً',
      issuesNeedAttentionMany: '%d ملاحظة تحتاج انتباهاً',
      scanHighlights: 'أبرز نتائج الفحص',
      evidence: 'الدليل',
      predictedProblems: 'توقعات مستقبلية',
      buyerAdvice: 'نصيحة لكل نوع مستخدم',
      casual: 'مستخدم عادي',
      gamer: 'لاعب',
      photographer: 'مصوّر',
      forCasual: 'للمستخدم العادي',
      forGamer: 'للاعب',
      forPhotographer: 'للمصوّر',
      categoriesDetails: 'تفاصيل الفئات',
      expected: 'المتوقع',
      testsPassed: 'اختبار ناجح',
      technicalNotes: 'ملاحظات فنية',
      verifiedFooter: 'تم التحقق منه عبر',
      // Severity (الـ schema الجديد)
      // #7 (أمر 2026-10-01، معتمد): "متوسط" ⇐ "تنبيه" — توحيداً مع عدّاد
      // الفئة testsWarning (كان "تحذير") وعناوين الملاحظات القادمة من
      // الخادم (S2). كلمة واحدة للشدّة التحذيرية في كل مواضع الموقع.
      severityDanger: 'خطير',
      severityWarning: 'تنبيه',
      severityInfo: 'معلومة',
      // Tier
      tierFlagship: 'جهاز رائد',
      tierMidRange: 'متوسط الفئة',
      tierBudget: 'اقتصادي',
      // Categories — نسخة من قائمة واحدة مرجعها أمر المستخدم 2026-10-01؛
      // التطبيق والموقع وعناوين الخادم (S-9 إلى S-11) وتعليمات النموذج تأخذ
      // الأسماء من هذه القائمة نفسها، كلٌّ في مستودعه (لا يراها هذا المستودع
      // في الأخرى). المتغيّر عن الاسم السابق: catGpu وcatSensors وcatGps
      // وcatWireless. وlib/techEval.js's DISPUTED_CATEGORIES نسخة منفصلة
      // بتصميم سابق موثَّق هناك (أداة داخلية بلغة واحدة)، حُدِّثت قيمها
      // الثلاث المتغيّرة يدوياً في هذا الأمر أيضاً — راجع تقرير هذه المهمّة
      // لتفصيل القاعدة 24.
      catDisplay: 'الشاشة',
      catMemory: 'الذاكرة',
      catStorage: 'التخزين',
      catBattery: 'البطارية',
      catThermal: 'الحرارة',
      catCpu: 'المعالج',
      catGpu: 'معالج الرسومات',
      catSensors: 'المستشعرات',
      catCamera: 'الكاميرا',
      catGps: 'الموقع (GPS)',
      catCellular: 'الشبكة الخلوية',
      catWireless: 'الاتصال اللاسلكي',
      catSecurity: 'الأمان',
      catAudio: 'الصوت',
      catInput: 'اللمس والأزرار',
      // Unmeasured category + test-coverage wording. `{n}` / `{total}` are
      // substituted at render time so each language keeps its own word order.
      unmeasured: 'غير مقيسة',
      unmeasuredHint: 'لم تُجرَ أي اختبارات لهذه الفئة، فلا حكم عليها — لا سلباً ولا إيجاباً.',
      testsNotRun: '{n} من {total} اختبارات لم تُجرَ',
      testsNotRunAll: 'لم يُجرَ أي من {total} اختبارات هذه الفئة',
      testsFailed: 'فشل',
      // #7 (أمر 2026-10-01، معتمد): "تحذير" ⇐ "تنبيه" (يطابق severityWarning
      // أعلاه الآن).
      testsWarning: 'تنبيه',
      // V7 (findings-based pipeline)
      v6FieldMissing: 'غير متاح — تقرير V6',
      severityPositive: 'إيجابي',
      severityUnknown: 'غير معروف',
      v7StateMeasured: 'مقيسة',
      v7StatePartial: 'تغطية جزئية',
      v7StateUnmeasured: 'غير مقيسة',
      // decision 87 §5 (2026-09-25). النصّ نفسه القائم في تطبيق NeuralChek —
      // NeuralChek: app/src/main/res/values/strings.xml، المفتاح
      // report_v7_state_unknown (قاعدة 29: نسخة واحدة عبر المستودعين).
      v7StateUnknown: 'حالة قياس هذه الفئة غير معروفة',
      // decision 82 §1 (2026-09-24). النصّ العربي مصدره الوحيد هو تطبيق
      // NeuralChek — NeuralChek: app/src/main/res/values/strings.xml،
      // المفتاحان report_v7_state_attested_only وreport_v7_state_harness_error
      // (قاعدة 29: نسخة واحدة عبر المستودعين، وهذه نسخة الموقع تحمل مسار
      // مصدرها). طابقهما المنسّق بالأداة بعد التزامهما في التطبيق.
      // #14 (أمر 2026-10-01، معتمد — عربي وتركي وإنجليزي بنصّه): أُسقطت
      // الأقواس و"نقرة" أيضاً (أبعد من تبسيط الجولة الأولى).
      v7StateAttestedOnly: 'بشهادة الفنّي فقط، بلا قياس آلي.',
      v7StateHarnessError: 'لم تُقَس: تعذّر تشغيل اختبارات هذه الفئة في أداة الفحص. ليس حكماً على الجهاز.',
      // decision 84 §1 / 86 §3 (2026-09-25) — جدول أسباب categories.<name>.reason
      // بحسب زوج (الحالة، السبب). المصدر الوحيد لكل نصّ هو تطبيق NeuralChek —
      // NeuralChek: app/src/main/res/values/strings.xml، بالمفاتيح المذكورة
      // بجانب كل نصّ (قاعدة 29). التركي والإنجليزي اعتمدهما المستخدم لاحقاً
      // (القرار ٩١ البند ٣، منقولان حرفاً عن evidence/translations-approved-
      // 2026-09-25.md خارج هذا المستودع — راجع قسمَي tr/en أسفل هذا الملفّ).
      // report_v7_reason_no_health_bearing_declared:
      v7ReasonNoHealthBearingDeclared: 'لم تُقَس: لم يصل في هذا الفحص اختبار يُحتسب لحالة هذه الفئة.',
      // report_v7_reason_declared_none_executed:
      // #15 (أمر 2026-10-01، معتمد — عربي وتركي وإنجليزي بنصّه): تبسيط أبعد
      // من الجولة الأولى (كانت أسقطت كلمة "حالة" فقط) — الآن جملة عامّة بلا
      // تفصيل "لم يُعطِ نتيجة نجاح أو فشل".
      v7ReasonDeclaredButNoneExecuted: 'لم تُقَس هذه الفئة في هذا الفحص.',
      // report_v7_reason_battery_uncalibrated:
      // #16 (أمر 2026-10-01، معتمد — عربي بنصّه؛ أكّد المستخدم أن استبدال
      // الجملة كلّها هو المقصود، كما طبّقته الجولة الأولى).
      v7ReasonBatteryUncalibrated: 'تُقاس البطارية ولا يُعطى لها حرف في هذا الإصدار.',
      // report_v7_reason_battery_unmeasured:
      v7ReasonBatteryUnmeasured: 'لم تُقَس صحّة البطارية: لم يستوفِ أيّ من مؤشّراتها شروط القياس في هذا الفحص.',
      // report_v7_reason_harness_error_unmeasured:
      v7ReasonHarnessErrorUnmeasured: 'لم تُقَس: لم تصل بيانات هذه الفئة من أداة الفحص. ليس حكماً على الجهاز.',
      // W6 (أمر 2026-10-01 §٦، S-13): نصّ يُعرض للمشتري حين overall.harnessError
      // صحيح لكنّ harnessErrorMessage (نصّ الخادم المقروء) غائب — لا يُعرض
      // الرمز الخامّ harnessErrorReason بحال. معتمد الآن بنصّه، يطابق نصّ
      // الخادم S-13 حرفياً (استبدل مقترح الوكيل الأوّلي بالكامل).
      v7HarnessErrorMessageUnavailable: 'تعذّر تجهيز نتائج الاختبارات لهذا الفحص، وهذا ليس حكماً على الجهاز.',
      // decision 91 §3 (2026-09-25) — كان ثابتاً في lib/reportReaders/v7.js
      // (NARRATIVE_INCOMPLETE_NOTICE)، صار مفتاحاً هنا. العربي كما كان
      // حرفياً — يطابق report_v7_narrative_incomplete في NeuralChek: app/
      // src/main/res/values/strings.xml:237 (قاعدة 29، تحقّق المنسّق سابقاً
      // بالأداة، القرار 73). التركي نصّ التطبيق الملتزَم فعلاً (values-tr:193).
      v7NarrativeIncomplete: 'الشرح غير مكتمل. الحروف والتغطية محسوبة من القياس.',
      coverageLabel: 'التغطية',
      // W1 (قرار المستخدم 2026-10-07، البند ٢، معتمد بنصّه في اللغات الثلاث):
      // عنوان بطاقة البوّابة استُبدل بنصّه المعتمد الجديد. ومعه حُذف مفتاح
      // شارة الحرف (من اللغات الثلاث) — لا قارئ له بعد حذف الشارة من
      // V7Notices (البند ١؛ التدقيق في تقرير هذه المهمّة).
      governingGateLabel: 'سبب الحرف العامّ',
      letterSourceAdjustedLabel: 'معدَّل بحكم نموذج',
      adjustmentEvidenceLabel: 'مرجع الدليل',
    },
    scan: {
      title: 'مسح رمز QR',
      subtitle: 'وجّه الكاميرا نحو رمز QR الموجود في تقريرك',
      starting: 'جاري تشغيل الكاميرا...',
      cameraDenied: 'لم يُسمح بالوصول إلى الكاميرا',
      cameraError: 'تعذّر فتح الكاميرا',
      cameraHint: 'تأكد من إعطاء الإذن للموقع باستخدام الكاميرا',
      manualEntry: 'أدخل الرقم يدوياً',
      manualHint: 'إذا تعذّر مسح الرمز، أدخل رقم الفحص يدوياً',
      back: 'رجوع',
      detected: 'تم اكتشاف الرمز',
      redirecting: 'جاري التحويل...',
      invalidQR: 'الرمز غير صالح',
      notSupported: 'الكاميرا غير مدعومة في هذا المتصفح',
    },
    pricing: {
      title: 'اختر الباقة المناسبة',
      subtitle: 'ادفع فقط مقابل ما تحتاجه — ترقية أو إلغاء في أي وقت',
      freeTrial: 'جرّب التطبيق مجاناً — فحص واحد مجاني لكل جهاز',
      single: {
        name: 'فحص فردي',
        price: '$0.50',
        desc: 'فحص واحد لجهاز واحد',
        features: ['تحليل AI كامل', 'تقرير PDF قابل للتنزيل', 'رمز QR للتحقق', 'صالحة 30 يوماً'],
      },
      basic: {
        name: 'متجر أساسي',
        price: '$10/شهر',
        desc: '50 فحص شهرياً',
        features: ['50 فحص شهرياً', 'تقرير كامل + PDF + QR', 'سجل الفحوصات السحابي'],
      },
      pro: {
        name: 'متجر احترافي',
        price: '$20/شهر',
        desc: '150 فحص شهرياً',
        features: ['150 فحص شهرياً', 'كل ميزات الأساسية', 'إدارة الأجهزة (أسعار وحالة البيع)', 'شعار المتجر على التقارير'],
      },
      cta: 'حمّل التطبيق للاشتراك',
      best: 'الأفضل',
      popular: 'الأكثر شيوعاً',
    },
    faq: {
      title: 'أسئلة شائعة',
      items: [
        { q: 'هل يحتاج التطبيق إنترنت؟', a: 'نعم، لإرسال البيانات للتحليل بالذكاء الاصطناعي والحصول على التقرير.' },
        { q: 'كم يستغرق الفحص؟', a: '8 دقائق للفحص الآلي، بالإضافة إلى وقت قصير لإجراء الاختبارات اليدوية.' },
        { q: 'هل بيانات الجهاز آمنة؟', a: 'نعم. لا نجمع أي بيانات شخصية — فقط بيانات الأداء التقني لتوليد التقرير.' },
        { q: 'هل يعمل على كل الأجهزة؟', a: 'يعمل على Android 8 (Oreo) فأحدث، على أجهزة ARM 64-bit (الغالبيّة العظمى من الهواتف من 2018 وما بعدها). نظام iOS غير مدعوم حالياً.' },
        { q: 'كيف أتحقق من صحة التقرير؟', a: 'كل تقرير يحمل رمز QR يمكن مسحه للتحقق من صحة البيانات عبر موقعنا.' },
      ],
    },
    login: {
      title: 'تسجيل الدخول',
      subtitle: 'سجّل دخولك لإدارة فحوصاتك واشتراكك',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      signin: 'دخول',
      google: 'تسجيل بواسطة Google',
      noAccount: 'ليس لديك حساب؟',
      signup: 'إنشاء حساب جديد',
      or: 'أو',
    },
    dashboard: {
      plan: 'الباقة الحالية',
      remaining: 'الرصيد المتبقي',
      expires: 'تاريخ الانتهاء',
      history: 'آخر الفحوصات',
      upgrade: 'ترقية الاشتراك',
      logout: 'خروج',
      empty: 'لا توجد فحوصات بعد',
      emptyHint: 'الفحوصات التي تجريها بحسابك من التطبيق ستظهر هنا',
      scans: 'فحص',
      myDevices: 'أجهزتي المفحوصة',
      shopProOnly: 'إدارة المتجر متاحة فقط لباقة "محل احترافي"',
      upgradeToPro: 'ترقية إلى محل احترافي',
      publicShopLink: 'رابط متجرك العام',
      copyLink: 'نسخ',
      copied: 'تم النسخ ✓',
      visitShop: 'زيارة المتجر',
      price: 'السعر',
      pricePlaceholder: 'حدد السعر',
      currency: 'العملة',
      sellerNote: 'ملاحظة البائع',
      sellerNotePlaceholder: 'ملاحظات للمشتري — مثلاً: البطارية مستبدلة، مع الكرتونة الأصلية',
      listingStatus: 'حالة الجهاز',
      forSale: 'معروض للبيع',
      sold: 'تم البيع',
      hidden: 'مخفي',
      saveListing: 'حفظ',
      saving: 'جاري الحفظ...',
      saved: 'تم الحفظ ✓',
      saveError: 'فشل الحفظ',
      currencySYP: 'ل.س',
      currencyUSD: '$',
      currencyTRY: '₺',
    },
    mockup: {
      device: 'Samsung Galaxy S23',
      condition: 'حالة ممتازة',
      viewReport: 'عرض التقرير الكامل',
      stats: {
        battery: 'البطاريّة',
        cpu: 'المعالج',
        display: 'الشاشة',
        camera: 'الكاميرا',
      },
    },
    download: {
      title: 'جاهز للتجربة؟',
      subtitle: 'حمّل التطبيق الآن وابدأ أوّل فحص في دقائق',
      versionInfo: 'الإصدار 1.0.15 — حجم ~37 MB',
      comingPlayStore: 'متاح حالياً كتنزيل APK مباشر',
      android: 'تطبيق Android',
      button: 'تنزيل التطبيق (APK)',
    },
    footer: {
      rights: 'جميع الحقوق محفوظة',
      tagline: 'فحص ذكي بالذكاء الاصطناعي — ثقة كاملة في كل تقرير',
      product: 'المنتج',
      legal: 'قانوني',
      support: 'الدعم',
      privacy: 'سياسة الخصوصية',
      terms: 'شروط الاستخدام',
      contact: 'اتصل بنا',
      follow: 'تابعنا',
      downloadApk: 'تنزيل APK',
      faq: 'الأسئلة الشائعة',
      supportEmail: 'البريد الإلكتروني للدعم',
    },
    notFound: {
      title: 'الصفحة غير موجودة',
      desc: 'عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها.',
      home: 'العودة للرئيسية',
    },
    shop: {
      trustedBadge: 'محل موثوق — مفحوص بواسطة NeuralCheck',
      scannedDevices: 'الأجهزة المعروضة للبيع',
      noDevices: 'لا توجد أجهزة معروضة حالياً',
      noShop: 'المحل غير موجود',
      noShopHint: 'تأكد من رابط المحل أو اتصل بصاحب المتجر',
      contact: 'تواصل',
      viewReport: 'عرض التقرير',
      devicesCount: 'جهازاً معروضاً',
      loadError: 'تعذّر تحميل بيانات المحل',
      sellerNote: 'ملاحظة البائع',
      forSaleBadge: 'معروض للبيع',
      soldBadge: 'تم البيع',
    },
    technology: {
      metaTitle: 'التقنية',
      metaDescription:
        'كيف يُشغّل NeuralCheck اختبار إجهاد من 8 مراحل في 8 دقائق، يُرسل بيانات زمنيّة خام إلى مهندس ذكاء اصطناعي، ويُصدر تقريراً بلغتك. المنهجيّة التي تتجاوز قيود مُنظّمات حرارة الشركات المصنّعة.',
      hero: {
        badge: 'منهجيّة مكشوفة',
        title: 'كيف يعمل NeuralCheck فعلاً',
        subtitle:
          'لا صندوق أسود. هذه هي المنهجيّة وراء كلّ تقييم — من بروتوكول الإجهاد ذي الـ 8 مراحل إلى الذكاء الاصطناعي الذي يقرأ جهازك مثل مهندس.',
      },
      protocol: {
        title: 'كلّ فحص يُشغّل 8 مراحل من الإجهاد المُقاس',
        intro:
          'حوالي 480 ثانية فعليّة. حوالي 1,600 عيّنة تتبّع تُلتقط عبر 11 قناة قياس عالميّة (تردّد المعالج، استهلاك الطاقة، جهد البطاريّة، تيّارها، حرارتها، أداء التخزين، عرض نطاق الذاكرة، معدّل إطارات الرسوميّات، وغيرها). كلّ مرحلة لها هدف محدّد.',
        phases: [
          { num: '0', name: 'القياس المرجعي', duration: '~30 ث', desc: 'قياس الخمول. يُحدّد حالة الجهاز في الراحة قبل تطبيق أيّ حِمل.' },
          { num: '1', name: 'إجهاد التخزين', duration: '~60 ث', desc: 'كتابة 4 جيجابايت تسلسليّاً. يكشف خنق متحكّمات SSD/UFS تحت إدخال/إخراج مستمرّ.' },
          { num: '2', name: 'إجهاد الذاكرة', duration: '~75 ث', desc: 'تحريك ذاكرة عازلة كبيرة. يُظهر حدود عرض نطاق الـ RAM والقيود الحراريّة للـ DRAM.' },
          { num: '3', name: 'إجهاد المعالج', duration: '~80 ث', desc: 'استدلال TensorFlow Lite MobileNetV2 على 7 خيوط عاملة مع XNNPACK. يُشبع كلّ نواة.' },
          { num: '4', name: 'إجهاد الرسوميّات', duration: '~75 ث', desc: 'تظليل raymarching على إطار خارج الشاشة. يدفع الـ GPU إلى جداره تحت حِمل مستمرّ.' },
          { num: '5', name: 'إجهاد مشترك', duration: '~60 ث', desc: 'المعالج والرسوميّات بذروتهما معاً. يكشف مشاكل ميزانيّة الطاقة المشتركة والاقتران الحراري.' },
          { num: '6', name: 'دفعات سريعة', duration: '~45 ث', desc: 'نبضات NEON FMA قصيرة. تقرأ بصمة منظّم الجهد (VRM) والاستجابة اللحظيّة للجهاز.' },
          { num: '7', name: 'التبريد', duration: '~60 ث', desc: 'الاسترداد الحراري. يقيس مدى سرعة عودة الجهاز إلى الحالة المرجعيّة بعد إزالة الحِمل.' },
        ],
      },
      camouflage: {
        title: 'كموفلاج الذكاء الاصطناعي — لماذا اختبارنا لا يُحجَب',
        body: [
          'هواتف Android الحديثة تأتي بمنظّمات قويّة من الشركات المصنّعة — HyperOS من شاومي، MIUI، ColorOS من Oppo، One UI من سامسونج — تكتشف الاختبارات الاصطناعيّة (حلقات NEON، تجزئة SHA، باحثات أرقام أوّليّة) وتحدّ تردّد المعالج والرسوميّات بحجّة "حماية الجهاز". النتيجة: الاختبارات التقليديّة تقيس المنظّم لا الشريحة.',
          'NeuralCheck يستبدل الأحمال الاصطناعيّة بأحمال حقيقيّة يتعامل معها نظام التشغيل كتطبيقات شرعيّة: استدلال TensorFlow Lite MobileNetV2 لمرحلة المعالج، وتظليل OpenGL ES raymarching حقيقي لمرحلة الرسوميّات. المنظّم يرى تطبيق ذكاء اصطناعي يقوم بعمل مفيد، لا اختباراً اصطناعيّاً — فيتنحّى جانباً ويسمح للشريحة بالعمل عند حدّها الحقيقي تحت حِمل مستمرّ.',
          'هذا هو الفرق بين رقم تسويقي وقياس يمكن الدفاع عنه.',
        ],
        validatedTitle: 'تمّ التحقّق على أجهزة رائدة حقيقيّة',
        validatedNote: 'تأكّد تجاوز قيود المنظّم على:',
        validatedDevices: [
          'Samsung Galaxy S24 Ultra (رائد 2024)',
          'Xiaomi 14T (2024)',
          'Samsung Galaxy S21 Ultra (رائد 2021)',
          'Samsung Galaxy S10 5G (2019، للتحقّق عبر الأجيال)',
        ],
      },
      pipeline: {
        title: 'بيانات خام، تحليل ذكاء اصطناعي خبير',
        body: [
          'حوالي 1,600 عيّنة عبر 11 قناة تتبّع عالميّة تُلتقط خلال الفحص — حوالي 160 كيلوبايت من البيانات الزمنيّة الكثيفة.',
          // W3-ب (أمر 2026-10-01 §٦، معتمد الثلاث لغات بنصّها حرفياً — يستبدل
          // الجملتين السابقتين كاملتين): الأولى كانت تصف خطّ V6 والإنتاج على
          // V7؛ والثانية كرّرت W3-أ (أسفله) وكانت تحمل كلمة "معلنة" الخاطئة
          // (القواعد غير منشورة). جملة واحدة بدل الاثنتين. القيد: الالتزام
          // مشروط بإثبات المنسّق في neuralcheck-backend أن حمولة V7 لا تحمل
          // عيّنات خامّة (buildV7Payload) — يجري الآن هناك، خارج حدود هذا
          // المستودع، لا أثر له على التطبيق هنا.
          'في الخادم تُحسب من هذه البيانات الخام القياساتُ والنتائج، ثم يقرؤها الذكاء الاصطناعي.',
          // W3-أ (أمر 2026-10-01 §٦): عربي معتمد بلا تغيير منذ الجولة
          // السابقة. التركي استُبدل بنصّ معتمد جديد (صياغة أدقّ). الإنجليزي
          // معتمد كما اقترحه الوكيل، بلا تغيير. الثلاثة تدخل قفل الترجمات.
          'في كلّ فئة يُعطى لها حرف، يُحسب الحرف من نتائج القياس بقواعد ثابتة. والذكاء الاصطناعي يحلّل هذه النتائج، فيكتب الملخّص ونصائح المشتري ويشرح كلّ ملاحظة، كما يقرأ مهندس عتاد خبير نتائج أجهزة القياس. وله أن يقترح تعديل الحرف، ولا يُقبل التعديل إلا بدليل مُثبَت من نتائج الفحص نفسه، وإلا بقي الحرف المحسوب.',
        ],
        stack: [
          { label: 'محرّك التحليل', value: 'ذكاء اصطناعي متقدّم' },
          { label: 'الموثوقية', value: 'بنية مزدوجة + احتياطي تلقائي' },
          { label: 'الرموز لكلّ فحص', value: '~46K' },
          { label: 'نافذة السياق', value: '128K رمز' },
        ],
      },
      battery: {
        title: 'صحّة البطاريّة: 6 مؤشّرات حقيقيّة، لا نسبة مئويّة وهميّة',
        body: [
          'أغلب تطبيقات التشخيص تطبع نسبة واحدة لـ "حالة صحّة" البطاريّة. هذا الرقم خاطئ عادةً. شاهدنا أجهزة رائدة تُظهر 102%، وهو رقم مستحيل رياضيّاً.',
          'الـ SoH الدقيق يتطلّب أسابيع من تتبّع دورات الشحن والتفريغ — هكذا تعمل تطبيقات مثل AccuBattery. لا يمكن استخراجه بأمانة من فحص مدّته 8 دقائق.',
          'نحن نقيس ستّة مؤشّرات حقيقيّة، يمكن الدفاع عنها، وممكنة في الوقت المتاح:',
        ],
        indicators: [
          { name: 'عدد دورات الشحن', detail: 'يُقرأ مباشرةً من Android 14+ عندما تُظهره الشركة المصنّعة.' },
          { name: 'معدّل التفريغ تحت الحِمل', detail: 'الميلّي أمبير المسحوبة خلال أثقل مرحلة إجهاد. الأعلى من المتوقّع = خليّة متقادمة أو ارتفاع في المقاومة الداخليّة.' },
          { name: 'ارتفاع الحرارة خلال الفحص', detail: 'فرق درجة الحرارة من المرجع إلى الذروة. يعكس المقاومة الداخليّة للخليّة تحت حِمل حقيقي.' },
          { name: 'ثبات الجهد تحت الحِمل', detail: 'الانحراف المعياري للملّي فولت عبر مراحل الحِمل. اضطراب الجهد يدلّ على تدهور VRM أو البطاريّة.' },
          { name: 'انخفاض مستوى البطاريّة خلال الفحص', detail: 'نسبة الانخفاض خلال 8 دقائق الفحص. يتحقّق متقاطعاً من الطاقة المستهلكة.' },
          { name: 'نسبة التفريغ إلى السعة التصميميّة', detail: 'الميلّي أمبير في الساعة المستهلكة خلال الفحص مقابل السعة التصميميّة للخليّة. يتحقّق متقاطعاً من انخفاض المستوى.' },
        ],
        closing:
          'نخبرك بما يمكننا قياسه بدقّة. لا نخترع رقماً لا يمكننا الدفاع عنه.',
      },
      multilingual: {
        title: 'تقارير بلغتك',
        // W3-ج (أمر 2026-10-01 §٦، معتمد الثلاث لغات بنصّها حرفياً): الجملة
        // الأولى والثالثة كما اعتُمدتا في الجولة السابقة. الجملة الثانية
        // وحدها عُدِّلت — حُذفت "كلّ" من "كلّ رقم تقني يأتي" (صارت "الأرقام
        // التقنية تأتي"). التركي والإنجليزي معتمدان بنصّهما الآن، لا اقتراحاً.
        body: 'كلّ تقرير يجمع حروفاً محسوبة من القياس وتحليلاً يكتبه الذكاء الاصطناعي. المخرجات هجينة: الأرقام التقنية تأتي مع شرح مبسّط بلغة عاديّة. التقرير نفسه يخدم مهندساً يتحقّق من الأرقام ومشترياً يقرأ النصّ.',
      },
      cta: {
        title: 'جاهز للتجربة؟',
        button: 'حمّل التطبيق',
      },
    },

    privacy: {
      title: 'سياسة الخصوصية',
      updated: 'آخر تحديث: مايو 2026',
      sections: [
        {
          h: 'البيانات التي نجمعها',
          p: 'يجمع تطبيق NeuralCheck بيانات أداء الجهاز فقط (المعالج، البطارية، الذاكرة، الحرارة، أداء التخزين، الشبكة، أداء الشاشة). لا نجمع أي بيانات شخصية مثل الاسم أو رقم الهاتف أو جهات الاتصال أو الصور أو الرسائل.',
        },
        {
          h: 'كيف نستخدم البيانات',
          p: 'تُرسَل بيانات الأداء إلى مزوّدي الذكاء الاصطناعي لدينا للتحليل: DeepSeek V4-Flash (الرئيسي) و Google Gemini 2.5 Flash (الاحتياطي). كلا المزوّدَين يُعالجان البيانات فقط لإصدار تقريرك ولا يحتفظان بها للتدريب. لا تُستخدم البيانات لأيّ غرض آخر ولا تُباع لأيّ طرف ثالث. تفاصيل كاملة على صفحة /technology.',
        },
        {
          h: 'الأمان والتشفير',
          p: 'تُنقل جميع البيانات عبر اتصال HTTPS مشفّر، وتُخزَّن في قاعدة بيانات آمنة. تقاريرك خاصة افتراضياً ومرتبطة بحسابك. أنت وحدك من يقرّر متى تنشر جهازاً على صفحة متجرك العامّة.',
        },
        {
          h: 'حقوقك',
          p: 'يمكنك في أي وقت طلب حذف جميع بياناتك من خوادمنا بالتواصل معنا عبر البريد الإلكتروني.',
        },
        {
          h: 'تواصل معنا',
          p: 'لأي استفسار حول الخصوصية: contact@example.com',
        },
      ],
    },
    terms: {
      title: 'شروط الاستخدام',
      updated: 'آخر تحديث: مايو 2026',
      sections: [
        {
          h: 'طبيعة الخدمة',
          p: 'يقدّم NeuralCheck تقييماً تقنياً استرشادياً مبنياً على بيانات الأداء وتحليل الذكاء الاصطناعي. التقرير أداة مساعدة في اتخاذ القرار وليس ضماناً قانونياً أو فنياً على حالة الجهاز.',
        },
        {
          h: 'حدود المسؤولية',
          p: 'NeuralCheck غير مسؤول عن قرارات البيع أو الشراء التي يتخذها المستخدم بناءً على التقرير. الفحص يكشف الحالة الحالية للجهاز فقط، وقد تظهر مشاكل لاحقة لا يمكن توقعها.',
        },
        {
          h: 'الاستخدام المسموح',
          p: 'يحق لك استخدام التطبيق لفحص أجهزتك أو أجهزة عملائك. يُمنع منعاً باتاً استخدام التطبيق لأي غرض غير قانوني أو لانتحال هوية الآخرين.',
        },
        {
          h: 'الاشتراكات والدفع',
          p: 'تتم جميع عمليات الاشتراك من داخل التطبيق. يمكن إلغاء الاشتراك أو ترقيته في أي وقت. الفحوصات المستهلكة غير قابلة للاسترداد.',
        },
        {
          h: 'تعديل الشروط',
          p: 'نحتفظ بحقّ تعديل هذه الشروط في أي وقت. سيتم إعلامك بالتغييرات الجوهرية عبر التطبيق أو البريد الإلكتروني.',
        },
      ],
    },
  },

  tr: {
    nav: {
      home: 'Ana Sayfa',
      technology: 'Teknoloji',
      verify: 'Doğrula',
      pricing: 'Fiyatlar',
      login: 'Giriş',
      dashboard: 'Panel',
      myAccount: 'Hesabım',
      signOut: 'Çıkış Yap',
      adminPanel: 'Yönetim Paneli',
      myShop: 'Mağazam',
    },
    hero: {
      badge: 'Yapay Zekâ Destekli',
      title: 'Satın almadan önce her telefonu kontrol edin',
      subtitle: 'Yapay zekâ ile kapsamlı tarama — 8 dakikada 100+ test',
      cta: 'Uygulamayı İndir (APK)',
      ctaVerify: 'Raporu Doğrula',
    },
    trust: {
      encrypted: 'Şifrelenmiş veri',
      ai: 'Yapay zekâ analizi',
      verifiable: 'Doğrulanabilir raporlar',
      models: 'Amiral gemisi ve orta segment Android\'lerde doğrulanmış',
    },
    features: {
      title: 'Neden NeuralCheck?',
      f1: { title: '8 dakika stres testi', desc: 'Normal kullanımda görünmeyen gizli sorunları ortaya çıkaran yoğun test' },
      f2: { title: 'Yapay zekâ analizi', desc: 'Yapay zekâ net bir rapor sunar — hem sade açıklamalar hem de meraklılar için tam teknik detaylar' },
      f3: { title: 'Güvenilir rapor', desc: 'Her raporda doğrulama için QR kodu — sonuçlar değiştirilemez' },
      f4: { title: 'Sorun tahmini', desc: 'Risk desenlerini belirler — uzun vadeli güvenilirliği etkileyebilecek erken uyarı işaretleri' },
      learnHow: 'Nasıl çalıştığını öğren →',
    },
    stats: {
      title: 'Rakamlarla',
      tests: 'Teknik test',
      minutes: 'Dakika tarama',
      variables: 'Evrensel ölçüm kanalı',
      categories: 'Test kategorisi',
      accuracy: 'Analiz doğruluğu',
      models: 'Desteklenen model',
    },
    howItWorks: {
      title: 'Nasıl çalışır?',
      s1: { title: 'Uygulamayı yükleyin', desc: "NeuralCheck'i sitemizden ücretsiz indirin" },
      s2: { title: 'Taramayı başlatın', desc: 'Kapsamlı taramayı başlatın ve yalnızca 8 dakika bekleyin' },
      s3: { title: 'Raporu okuyun', desc: 'Değerlendirme ve nihai sonuç içeren net bir rapor alın' },
    },
    verify: {
      title: 'Tarama raporunu doğrulayın',
      subtitle: 'Raporunuzdaki tarama numarasını (Scan ID) girerek doğrulayın',
      placeholder: 'NC-XXXXXX',
      example: 'Örnek:',
      button: 'Doğrula',
      scanQR: 'QR Tara',
      loading: 'Doğrulanıyor...',
      notFound: 'Bu numarayla rapor bulunamadı',
      notFoundHint: 'Raporunuzdaki tarama numarasını kontrol edin veya QR kodu tarayın',
      verified: 'Doğrulanmış rapor ✓',
      grade: 'Değerlendirme',
      device: 'Cihaz',
      date: 'Tarama tarihi',
      verdict: 'Nihai Karar',
      score: 'Puan',
      summary: 'Özet',
      issues: 'Tespit edilen sorunlar',
      noIssues: 'Sorun tespit edilmedi ✓',
      severityHigh: 'Yüksek',
      severityMedium: 'Orta',
      severityLow: 'Düşük',
      topCategories: 'En iyi kategoriler',
      lowestCategories: 'En düşük kategoriler',
      scanIdLabel: 'Tarama Kimliği',
      issueCount: 'sorun',
      printReport: 'Raporu Yazdır',
      downloadPdf: 'Raporu İndir (PDF)',
      preparingPdf: 'Rapor hazırlanıyor...',
      pdfError: 'Rapor hazırlanamadı',
      pdfErrorHint: 'Tekrar deneyin veya yazdırma seçeneğini kullanın',
      // V2 #50 — yeni profesyonel rapor tasarımı
      reportVerified: 'Doğrulanmış Rapor',
      // W2 — approved by the user 2026-10-01 (the Turkish given here is the
      // one approved "in the app and the site together").
      analyzedByAI: 'Harf notu ölçüm sonuçlarından hesaplanır; analiz ve öneriler yapay zekâ tarafından hazırlanır.',
      scanDate: 'Tarama Tarihi',
      issuesFound: 'Sorun bulundu',
      // W4 — approved by the user 2026-10-01. Turkish nouns don't inflect
      // after a numeral (e.g. "3 elma", not "3 elmalar"), so all four
      // buckets share one invariant "%d ..." template (the count always
      // shows, unlike Arabic's 1/2 buckets).
      issuesNeedAttentionOne: '%d dikkat gerektiren bulgu',
      issuesNeedAttentionTwo: '%d dikkat gerektiren bulgu',
      issuesNeedAttentionFew: '%d dikkat gerektiren bulgu',
      issuesNeedAttentionMany: '%d dikkat gerektiren bulgu',
      scanHighlights: 'Tarama bulguları',
      evidence: 'Kanıt',
      predictedProblems: 'Öngörülen Sorunlar',
      buyerAdvice: 'Alıcı Tavsiyesi',
      casual: 'Standart kullanıcı',
      gamer: 'Oyuncu',
      photographer: 'Fotoğrafçı',
      forCasual: 'Standart kullanıcı için',
      forGamer: 'Oyuncu için',
      forPhotographer: 'Fotoğrafçı için',
      categoriesDetails: 'Kategori Detayları',
      expected: 'Beklenen',
      testsPassed: 'test başarılı',
      technicalNotes: 'Teknik Notlar',
      verifiedFooter: 'şuradan doğrulandı',
      severityDanger: 'Kritik',
      severityWarning: 'Uyarı',
      severityInfo: 'Bilgi',
      tierFlagship: 'Amiral gemisi',
      tierMidRange: 'Orta segment',
      tierBudget: 'Uygun fiyatlı',
      // Categories (2026-10-01, decided in full per §٣ of the 2026-10-01
      // addendum) — copy of one list, source: the user's 2026-10-01 order.
      // Baseline is the APP'S OWN existing names (relayed, unverified:
      // NeuralChek CategoryTranslations.kt@1bdc3be — this repo's agent
      // cannot read that repo directly), adopted here for battery/cpu/
      // thermal/memory/storage/cellular/wireless/sensors/display/security/
      // audio. gpu/gps/input/camera were adjusted from the app's baseline to
      // match the approved Arabic meaning — all four now DECIDED (not
      // proposals): "gpu «Grafik İşlemci»، وgps «Konum (GPS)»، وinput
      // «Dokunma ve Tuşlar»: معتمدة، ومعها camera «Kamera»."
      catDisplay: 'Ekran',
      catMemory: 'Bellek',
      catStorage: 'Depolama',
      catBattery: 'Pil',
      catThermal: 'Isı',
      catCpu: 'İşlemci',
      // Decided — app baseline "Grafik İşlemci" already matched the approved
      // Arabic "معالج الرسومات" (both literally "graphics processor"); no
      // further adjustment was needed.
      catGpu: 'Grafik İşlemci',
      catSensors: 'Sensörler',
      // Decided 2026-10-01 — was the app's "Kamera ve Biyometrik"; the
      // approved Arabic "الكاميرا" names the camera alone (CM-08/CM-10
      // fingerprint/face no longer carry health per the user). Already the
      // site's existing value.
      catCamera: 'Kamera',
      // Decided — adjusted from the app's baseline "Konum Sistemi" to keep
      // "GPS" visible, mirroring the approved Arabic's explicit "(GPS)".
      catGps: 'Konum (GPS)',
      catCellular: 'Hücresel Ağ',
      catWireless: 'Kablosuz Bağlantı',
      catSecurity: 'Güvenlik',
      catAudio: 'Ses',
      // Decided — adjusted from the app's generic baseline "Giriş" to match
      // the approved Arabic's specific "اللمس والأزرار" (touch and buttons).
      // Equals the site's own pre-existing value (title-cased for
      // consistency with the rest of this list).
      catInput: 'Dokunma ve Tuşlar',
      unmeasured: 'Ölçülmedi',
      unmeasuredHint: 'Bu kategori için hiçbir test çalıştırılmadı — ne olumlu ne olumsuz bir sonuç var.',
      testsNotRun: '{total} testten {n} tanesi çalıştırılmadı',
      testsNotRunAll: 'Bu kategorinin {total} testinden hiçbiri çalıştırılmadı',
      testsFailed: 'başarısız',
      // #7 (2026-10-01, approved) — capitalized to match severityWarning
      // ("Uyarı"); was lowercase 'uyarı'.
      testsWarning: 'Uyarı',
      // V7 (bulgu tabanlı pipeline)
      v6FieldMissing: 'Mevcut değil — V6 raporu',
      severityPositive: 'Olumlu',
      severityUnknown: 'Bilinmiyor',
      v7StateMeasured: 'Ölçüldü',
      v7StatePartial: 'Kısmi kapsam',
      v7StateUnmeasured: 'Ölçülmedi',
      // decision 87 §5 (2026-09-25), approved by the user (decision 91 §1,
      // evidence/translations-approved-2026-09-25.md, "wepsite" section —
      // outside this repo, transcribed verbatim in the task order). No
      // trailing period, matching the Arabic.
      v7StateUnknown: 'Bu kategorinin ölçüm durumu bilinmiyor',
      // decision 82 §1 (2026-09-24) — Arabic source: NeuralChek app/src/main/
      // res/values/strings.xml, report_v7_state_attested_only /
      // report_v7_state_harness_error (rule 29).
      // #14 (2026-10-01) — approved by the user verbatim, "approved in the
      // app and the site together."
      v7StateAttestedOnly: 'Yalnızca teknisyen beyanıyla, otomatik ölçüm olmadan.',
      v7StateHarnessError: 'Ölçülmedi: Bu kategorinin testleri tarama aracında çalıştırılamadı. Cihaz hakkında bir yargı değildir.',
      // decision 91 §1 (2026-09-25), approved by the user — evidence/
      // translations-approved-2026-09-25.md, "wepsite" section (outside
      // this repo, transcribed verbatim). Arabic source: lib/i18n.js's `ar`
      // section above, same keys, NeuralChek strings.xml (rule 29).
      v7ReasonNoHealthBearingDeclared: 'Ölçülmedi: Bu taramada bu kategorinin durumu için sayılan hiçbir test yok.',
      // #15/#16 (2026-10-01) — approved by the user verbatim; these two also
      // supersede the decision-91 "approved" wording locked in
      // scripts/test/i18nApprovedTranslations.test.cjs, updated in the same
      // commit as this file (see that file's comment).
      v7ReasonDeclaredButNoneExecuted: 'Bu kategori bu taramada ölçülmedi.',
      v7ReasonBatteryUncalibrated: 'Pil ölçülür, ancak bu sürümde harf notu verilmez.',
      v7ReasonBatteryUnmeasured: 'Pil sağlığı ölçülmedi: göstergelerinden hiçbiri bu taramada ölçüm koşullarını karşılamadı.',
      v7ReasonHarnessErrorUnmeasured: 'Ölçülmedi: Bu kategorinin verileri tarama aracından gelmedi. Cihaz hakkında bir yargı değildir.',
      // W6 (2026-10-01 §٦) — user-approved verbatim, matches the backend's
      // S-13 text exactly. Replaces the agent's round-1 proposal entirely.
      v7HarnessErrorMessageUnavailable: 'Bu taramanın test sonuçları hazırlanamadı; bu, cihaz hakkında bir değerlendirme değildir.',
      // decision 91 §3 (2026-09-25) — NeuralChek's own committed string
      // (values-tr:193, relayed), not a fresh translation.
      v7NarrativeIncomplete: 'Açıklama eksik. Harf notları ve kapsam ölçümden hesaplanmıştır.',
      coverageLabel: 'Kapsam',
      // W1 (2026-10-07, user's decision البند ٢) — approved verbatim; was
      // 'Sınırlama nedeni'. The badge key beside it (ceiling, decision 91's
      // 'Üst sınır') was deleted in all three languages — no reader left.
      governingGateLabel: 'Genel harf notunun nedeni',
      letterSourceAdjustedLabel: 'Model tarafından ayarlandı',
      adjustmentEvidenceLabel: 'Kanıt referansı',
    },
    scan: {
      title: 'QR Kodu Tara',
      subtitle: 'Kamerayı raporunuzdaki QR koduna doğrultun',
      starting: 'Kamera başlatılıyor...',
      cameraDenied: 'Kameraya erişim izni verilmedi',
      cameraError: 'Kamera açılamadı',
      cameraHint: 'Siteye kamera izni verdiğinizden emin olun',
      manualEntry: 'Numarayı elle girin',
      manualHint: 'Kod taranamıyorsa, tarama numarasını elle girin',
      back: 'Geri',
      detected: 'Kod algılandı',
      redirecting: 'Yönlendiriliyor...',
      invalidQR: 'Geçersiz kod',
      notSupported: 'Kamera bu tarayıcıda desteklenmiyor',
    },
    pricing: {
      title: 'Size uygun paketi seçin',
      subtitle: 'Sadece ihtiyacınız olan kadar ödeyin — istediğiniz zaman yükseltin veya iptal edin',
      freeTrial: 'Uygulamayı ücretsiz deneyin — her cihaz için bir ücretsiz tarama',
      single: {
        name: 'Tek Tarama',
        price: '$0.50',
        desc: 'Bir cihaz için tek tarama',
        features: ['Tam AI analizi', 'İndirilebilir PDF rapor', 'Doğrulama QR kodu', '30 gün geçerli'],
      },
      basic: {
        name: 'Mağaza Temel',
        price: '$10/ay',
        desc: 'Aylık 50 tarama',
        features: ['Aylık 50 tarama', 'Tam rapor + PDF + QR', 'Bulut tarama geçmişi'],
      },
      pro: {
        name: 'Mağaza Pro',
        price: '$20/ay',
        desc: 'Aylık 150 tarama',
        features: ['Aylık 150 tarama', 'Temel paketin tüm özellikleri', 'Cihaz yönetimi (fiyat ve satış durumu)', 'Raporlarda mağaza logosu'],
      },
      cta: 'Abone olmak için uygulamayı indirin',
      best: 'En İyi',
      popular: 'En Popüler',
    },
    faq: {
      title: 'Sıkça Sorulan Sorular',
      items: [
        { q: 'Uygulama internet gerektirir mi?', a: 'Evet, verileri yapay zekâ analizine göndermek ve raporu almak için.' },
        { q: 'Tarama ne kadar sürer?', a: '8 dakikalık otomatik tarama artı manuel testler için kısa ek süre.' },
        { q: 'Cihaz verileri güvende mi?', a: 'Evet. Kişisel veri toplamıyoruz — yalnızca rapor oluşturmak için teknik performans verileri.' },
        { q: 'Tüm cihazlarda çalışır mı?', a: 'Android 8 (Oreo) ve sonrası, 64-bit ARM cihazlarda çalışır (2018 sonrası telefonların büyük çoğunluğu). iOS şu anda desteklenmemektedir.' },
        { q: 'Raporun geçerliliğini nasıl doğrularım?', a: 'Her rapor, sitemizden taranabilen bir QR koduyla gelir.' },
      ],
    },
    login: {
      title: 'Giriş Yap',
      subtitle: 'Taramalarınızı ve aboneliğinizi yönetmek için giriş yapın',
      email: 'E-posta',
      password: 'Şifre',
      signin: 'Giriş',
      google: 'Google ile devam et',
      noAccount: 'Hesabınız yok mu?',
      signup: 'Kayıt ol',
      or: 'veya',
    },
    dashboard: {
      plan: 'Mevcut Paket',
      remaining: 'Kalan Kredi',
      expires: 'Son Tarih',
      history: 'Son Taramalar',
      upgrade: 'Paketi Yükselt',
      logout: 'Çıkış',
      empty: 'Henüz tarama yok',
      emptyHint: 'Hesabınızla uygulamadan yaptığınız taramalar burada görünecek',
      scans: 'tarama',
      myDevices: 'Taranan cihazlarım',
      shopProOnly: 'Mağaza yönetimi yalnızca "Dükkan Pro" paketinde mevcuttur',
      upgradeToPro: 'Pro\'ya yükselt',
      publicShopLink: 'Genel mağaza bağlantınız',
      copyLink: 'Kopyala',
      copied: 'Kopyalandı ✓',
      visitShop: 'Mağazayı ziyaret et',
      price: 'Fiyat',
      pricePlaceholder: 'Fiyat belirleyin',
      currency: 'Para birimi',
      sellerNote: 'Satıcı notu',
      sellerNotePlaceholder: 'Alıcı için notlar — örn: Pil değiştirildi, orijinal kutusu var',
      listingStatus: 'Cihaz durumu',
      forSale: 'Satışta',
      sold: 'Satıldı',
      hidden: 'Gizli',
      saveListing: 'Kaydet',
      saving: 'Kaydediliyor...',
      saved: 'Kaydedildi ✓',
      saveError: 'Kaydedilemedi',
      currencySYP: 'SYP',
      currencyUSD: '$',
      currencyTRY: '₺',
    },
    mockup: {
      device: 'Samsung Galaxy S23',
      condition: 'Mükemmel Durum',
      viewReport: 'Raporu Görüntüle',
      stats: {
        battery: 'Pil',
        cpu: 'İşlemci',
        display: 'Ekran',
        camera: 'Kamera',
      },
    },
    download: {
      title: 'Denemeye hazır mısın?',
      subtitle: 'Uygulamayı şimdi indir ve ilk taramaya dakikalar içinde başla',
      versionInfo: 'Sürüm 1.0.15 — Boyut ~37 MB',
      comingPlayStore: 'Şu anda doğrudan APK indirme olarak mevcut',
      android: 'Android Uygulaması',
      button: 'Uygulamayı İndir (APK)',
    },
    footer: {
      rights: 'Tüm hakları saklıdır',
      tagline: 'Yapay Zekâ ile Akıllı Tarama — Her Raporda Tam Güven',
      product: 'Ürün',
      legal: 'Yasal',
      support: 'Destek',
      privacy: 'Gizlilik Politikası',
      terms: 'Kullanım Şartları',
      contact: 'İletişim',
      follow: 'Bizi takip edin',
      downloadApk: 'APK İndir',
      faq: 'SSS',
      supportEmail: 'Destek e-postası',
    },
    notFound: {
      title: 'Sayfa bulunamadı',
      desc: 'Üzgünüz, aradığınız sayfayı bulamadık.',
      home: 'Ana sayfaya dön',
    },
    shop: {
      trustedBadge: 'Güvenilir mağaza — NeuralCheck tarafından doğrulanmış',
      scannedDevices: 'Satıştaki cihazlar',
      noDevices: 'Şu anda satılık cihaz yok',
      noShop: 'Mağaza bulunamadı',
      noShopHint: 'Mağaza bağlantısını kontrol edin veya mağaza sahibiyle iletişime geçin',
      contact: 'İletişim',
      viewReport: 'Raporu görüntüle',
      devicesCount: 'cihaz satışta',
      loadError: 'Mağaza verileri yüklenemedi',
      sellerNote: 'Satıcı notu',
      forSaleBadge: 'Satışta',
      soldBadge: 'Satıldı',
    },
    technology: {
      metaTitle: 'Teknoloji',
      metaDescription:
        'NeuralCheck nasıl 8 dakikada 8 fazlı stres testi çalıştırır, ham zaman serisini bir yapay zekâ mühendisine gönderir ve kendi dilinizde rapor üretir. OEM termal yöneticilerini aşan metodoloji.',
      hero: {
        badge: 'Açık metodoloji',
        title: 'NeuralCheck gerçekte nasıl çalışır',
        subtitle:
          'Kara kutu yok. Her notun arkasındaki yöntem — 8 fazlı stres protokolünden cihazınızı bir mühendis gibi okuyan yapay zekâya kadar.',
      },
      protocol: {
        title: 'Her tarama 8 fazlı ölçümlü stres testi çalıştırır',
        intro:
          'Yaklaşık 480 saniye. 11 evrensel ölçüm kanalında (işlemci frekansı, paket gücü, batarya voltajı, akımı, sıcaklığı, depolama hızı, bellek bant genişliği, GPU FPS ve diğerleri) yaklaşık 1.600 telemetri örneği alınır. Her fazın bir amacı var.',
        phases: [
          { num: '0', name: 'Baz çizgi', duration: '~30s', desc: 'Boşta ölçüm. Yük uygulanmadan önceki dinlenme durumunu belirler.' },
          { num: '1', name: 'Depolama stresi', duration: '~60s', desc: '4 GB sıralı yazma. Sürekli I/O altında SSD/UFS denetleyici kısıtlamalarını ortaya çıkarır.' },
          { num: '2', name: 'Bellek stresi', duration: '~75s', desc: 'Büyük tampon karıştırma. RAM bant genişliği tavanını ve DRAM termal sınırlarını gösterir.' },
          { num: '3', name: 'İşlemci stresi', duration: '~80s', desc: 'XNNPACK ile 7 işçi iş parçacığında TensorFlow Lite MobileNetV2 çıkarımı. Her çekirdeği doyurur.' },
          { num: '4', name: 'GPU stresi', duration: '~75s', desc: 'Ekran dışı çerçeve tamponunda raymarching fragment gölgelendirici. GPU\'yu sürekli yük duvarına iter.' },
          { num: '5', name: 'Birleşik stres', duration: '~60s', desc: 'İşlemci ve GPU eşzamanlı zirvede. Paylaşılan güç bütçesi ve termal kaynaşma sorunlarını ortaya çıkarır.' },
          { num: '6', name: 'Patlama', duration: '~45s', desc: 'Kısa NEON FMA darbeleri. Cihazın VRM (voltaj düzenleyici) imzasını ve anlık yanıtını okur.' },
          { num: '7', name: 'Soğuma', duration: '~60s', desc: 'Termal toparlanma. Yük kaldırıldıktan sonra cihazın baz çizgiye ne kadar hızlı döndüğünü ölçer.' },
        ],
      },
      camouflage: {
        title: 'Yapay zekâ kamuflajı — stres testimiz neden engellenmiyor',
        body: [
          'Modern Android telefonlar agresif OEM yöneticileriyle gelir — Xiaomi\'de HyperOS, MIUI, Oppo\'da ColorOS, Samsung\'da One UI — bunlar sentetik testleri (Geekbench tarzı NEON döngüleri, SHA özetleme, asal sayı arama) tespit edip "cihazı korumak için" işlemci ve GPU frekansını kısar. Sonuç: sentetik stres testleri silikonu değil, yöneticiyi ölçer.',
          'NeuralCheck sentetik yükü işletim sisteminin meşru kabul ettiği gerçek yüklerle değiştirir: işlemci fazında TensorFlow Lite MobileNetV2 çıkarımı, GPU fazında ise gerçek bir OpenGL ES raymarching gölgelendirici. Yönetici, bir benchmark değil yararlı iş yapan bir yapay zekâ uygulaması görür — bu yüzden müdahale etmez ve silikon gerçek sürekli yük sınırında çalışır.',
          'Pazarlama rakamı ile savunulabilir ölçüm arasındaki fark budur.',
        ],
        validatedTitle: 'Gerçek amiral gemilerinde doğrulandı',
        validatedNote: 'Yönetici kısıtlamasının aşıldığı doğrulanan cihazlar:',
        validatedDevices: [
          'Samsung Galaxy S24 Ultra (2024 amiral gemisi)',
          'Xiaomi 14T (2024)',
          'Samsung Galaxy S21 Ultra (2021 amiral gemisi)',
          'Samsung Galaxy S10 5G (2019, nesiller arası doğrulama)',
        ],
      },
      pipeline: {
        title: 'Ham ölçümler, uzman yapay zekâ analizi',
        body: [
          '11 evrensel telemetri kanalında yaklaşık 1.600 örnek tarama sırasında alınır — yaklaşık 160 KB yoğun zaman serisi verisi.',
          // W3-ب (أمر 2026-10-01 §٦) — user-approved verbatim, replaces the
          // round-1 proposal entirely. See the Arabic comment above for the
          // rationale (two sentences → one; V6/"published" errors fixed).
          'Sunucuda bu ham verilerden ölçümler ve bulgular hesaplanır; ardından yapay zekâ bunları okur.',
          // W3-أ (أمر 2026-10-01 §٦) — user-approved verbatim (refined
          // wording from the round-1 proposal).
          'Harf notu verilen her kategoride, harf notu ölçüm sonuçlarından sabit kurallarla hesaplanır. Yapay zekâ bu sonuçları analiz eder; özeti ve alıcıya yönelik önerileri yazar, her bulguyu açıklar — tıpkı uzman bir donanım mühendisinin ölçüm cihazlarının sonuçlarını okuması gibi. Harf notunda değişiklik önerebilir, ancak bu değişiklik yalnızca taramanın kendi sonuçlarından kanıtlanmış bir delille kabul edilir; aksi halde hesaplanan harf notu geçerli kalır.',
        ],
        stack: [
          { label: 'Analiz motoru', value: 'Gelişmiş yapay zekâ' },
          { label: 'Güvenilirlik', value: 'Çift mimari + otomatik yedek' },
          { label: 'Tarama başına token', value: '~46K' },
          { label: 'Bağlam penceresi', value: '128K token' },
        ],
      },
      battery: {
        title: 'Pil sağlığı: sahte yüzde değil, 6 gerçek gösterge',
        body: [
          'Çoğu tanı uygulaması tek bir batarya "Sağlık Durumu" yüzdesi basar. Bu sayı genellikle yanlıştır. Amiral gemilerinin 102% gösterdiğini gördük — matematiksel olarak imkânsız.',
          'Doğru SoH, haftalarca şarj/deşarj döngüsü takibi gerektirir — AccuBattery gibi uygulamalar böyle çalışır. 8 dakikalık bir taramadan dürüstçe çıkarılamaz.',
          'Sahip olduğumuz sürede gerçek, savunulabilir ve ölçülebilir altı gösterge ölçüyoruz:',
        ],
        indicators: [
          { name: 'Döngü sayısı', detail: 'OEM açtığında Android 14+ üzerinden doğrudan okunur.' },
          { name: 'Yük altında deşarj hızı', detail: 'En ağır stres fazı sırasında çekilen mA. Beklenenden yüksek = yaşlanmış hücre veya iç direnç artışı.' },
          { name: 'Tarama sırasında sıcaklık artışı', detail: 'Baz çizgiden zirveye °C farkı. Gerçek yük altında hücre iç direncini yansıtır.' },
          { name: 'Yük altında voltaj stabilitesi', detail: 'Yük fazları boyunca mV standart sapması. Gürültülü voltaj hattı VRM veya batarya bozulmasına işaret eder.' },
          { name: 'Tarama sırasında batarya seviyesi düşüşü', detail: '8 dakikalık tarama penceresindeki yüzde düşüşü. Tüketilen enerjiyi çapraz kontrol eder.' },
          { name: 'Deşarj/tasarım kapasitesi oranı', detail: 'Tarama sırasında tüketilen mAh, hücrenin tasarım kapasitesine karşı. Seviye düşüşünü çapraz doğrular.' },
        ],
        closing:
          'Hassasiyetle ölçebildiğimizi söyleriz. Savunamayacağımız bir sayı uydurmayız.',
      },
      multilingual: {
        title: 'Kendi dilinizde raporlar',
        // W3-ج (أمر 2026-10-01 §٦) — user-approved verbatim (dropped "her"
        // from the second sentence, matching the Arabic's dropped "كلّ").
        body: 'Her rapor, ölçümden hesaplanan harf notlarını ve yapay zekânın yazdığı analizi bir araya getirir. Çıktı hibrittir: teknik sayılar sade dille açıklanır. Aynı rapor hem sayıları doğrulayan bir mühendise hem de metni okuyan bir alıcıya hizmet eder.',
      },
      cta: {
        title: 'Denemeye hazır mısın?',
        button: 'Uygulamayı indir',
      },
    },

    privacy: {
      title: 'Gizlilik Politikası',
      updated: 'Son güncelleme: Mayıs 2026',
      sections: [
        {
          h: 'Topladığımız Veriler',
          p: 'NeuralCheck yalnızca cihaz performans verilerini toplar (işlemci, batarya, bellek, sıcaklık, depolama, ağ ve ekran performansı). Ad, telefon numarası, kişiler, fotoğraflar veya mesajlar gibi hiçbir kişisel veriyi toplamayız.',
        },
        {
          h: 'Verileri Nasıl Kullanırız',
          p: 'Performans verileri analiz için yapay zekâ sağlayıcılarımıza gönderilir: DeepSeek V4-Flash (birincil) ve Google Gemini 2.5 Flash (yedek). Her iki sağlayıcı da verileri yalnızca raporunuzu oluşturmak için işler ve eğitim için saklamaz. Veriler başka hiçbir amaçla kullanılmaz ve hiçbir üçüncü tarafa satılmaz. Tüm detaylar /technology sayfasında.',
        },
        {
          h: 'Güvenlik ve Şifreleme',
          p: 'Tüm veriler şifreli HTTPS bağlantısı üzerinden iletilir ve güvenli bir veritabanında saklanır. Raporlarınız varsayılan olarak özeldir ve hesabınıza bağlıdır. Bir cihazı kendi genel mağaza sayfanızda yayınlayıp yayınlamayacağınızı yalnızca siz kontrol edersiniz.',
        },
        {
          h: 'Haklarınız',
          p: 'İstediğiniz zaman sunucularımızdaki tüm verilerinizin silinmesini e-posta ile talep edebilirsiniz.',
        },
        {
          h: 'Bize Ulaşın',
          p: 'Gizlilikle ilgili sorular için: contact@example.com',
        },
      ],
    },
    terms: {
      title: 'Kullanım Şartları',
      updated: 'Son güncelleme: Mayıs 2026',
      sections: [
        {
          h: 'Hizmetin Niteliği',
          p: 'NeuralCheck, performans verileri ve yapay zekâ analizine dayalı yönlendirici bir teknik değerlendirme sunar. Rapor, karar vermede yardımcı bir araçtır; cihazın durumu için yasal veya teknik bir garanti değildir.',
        },
        {
          h: 'Sorumluluk Sınırları',
          p: 'NeuralCheck, kullanıcının rapora dayanarak verdiği satın alma veya satma kararlarından sorumlu değildir. Tarama yalnızca cihazın mevcut durumunu ortaya koyar; sonradan ortaya çıkması beklenemeyecek sorunlar olabilir.',
        },
        {
          h: 'İzin Verilen Kullanım',
          p: 'Uygulamayı kendi cihazlarınızı veya müşterilerinizin cihazlarını taramak için kullanabilirsiniz. Yasadışı amaçlarla veya başkalarının kimliğine bürünmek için kullanmak kesinlikle yasaktır.',
        },
        {
          h: 'Abonelikler ve Ödeme',
          p: 'Tüm abonelik işlemleri uygulama içinden yapılır. Aboneliği istediğiniz zaman iptal edebilir veya yükseltebilirsiniz. Kullanılan taramalar iade edilemez.',
        },
        {
          h: 'Şartların Değiştirilmesi',
          p: 'Bu şartları istediğimiz zaman değiştirme hakkını saklı tutarız. Önemli değişiklikler hakkında uygulama içi bildirim veya e-posta yoluyla bilgilendirileceksiniz.',
        },
      ],
    },
  },

  en: {
    nav: {
      home: 'Home',
      technology: 'Technology',
      verify: 'Verify',
      pricing: 'Pricing',
      login: 'Login',
      dashboard: 'Dashboard',
      myAccount: 'My Account',
      signOut: 'Sign Out',
      adminPanel: 'Admin Panel',
      myShop: 'My Shop',
    },
    hero: {
      badge: 'AI-Powered Diagnostics',
      title: 'Check any phone before you buy',
      subtitle: 'AI-powered comprehensive scan — 100+ tests in 8 minutes',
      cta: 'Download App (APK)',
      ctaVerify: 'Verify a Report',
    },
    trust: {
      encrypted: 'Encrypted data',
      ai: 'AI-powered analysis',
      verifiable: 'Verifiable reports',
      models: 'Validated on flagship and mid-range Androids',
    },
    features: {
      title: 'Why NeuralCheck?',
      f1: { title: '8-min stress test', desc: 'Intensive testing reveals hidden issues not visible in normal use' },
      f2: { title: 'AI-powered analysis', desc: 'AI delivers a clear report — with both plain-language explanations and full technical details for the curious' },
      f3: { title: 'Verified reports', desc: 'Every report has a QR code for verification — results cannot be tampered with' },
      f4: { title: 'Predict problems', desc: 'Identifies risk patterns — early warning signs that may affect long-term reliability' },
      learnHow: 'See how it works →',
    },
    stats: {
      title: 'By the numbers',
      tests: 'Technical tests',
      minutes: 'Minutes scan',
      variables: 'Universal telemetry channels',
      categories: 'Test categories',
      accuracy: 'Analysis accuracy',
      models: 'Supported models',
    },
    howItWorks: {
      title: 'How it works',
      s1: { title: 'Install the app', desc: 'Download NeuralCheck from our website for free' },
      s2: { title: 'Start a scan', desc: 'Run the full diagnostic and wait just 8 minutes' },
      s3: { title: 'Read the report', desc: 'Receive a clear report with a grade and final verdict' },
    },
    verify: {
      title: 'Verify a scan report',
      subtitle: 'Enter the Scan ID from your report to verify its authenticity',
      placeholder: 'NC-XXXXXX',
      example: 'Example:',
      button: 'Verify',
      scanQR: 'Scan QR',
      loading: 'Verifying...',
      notFound: 'No report found with this ID',
      notFoundHint: 'Double-check the Scan ID from your report, or scan the QR code',
      verified: 'Verified report ✓',
      grade: 'Grade',
      device: 'Device',
      date: 'Scan date',
      verdict: 'Final Verdict',
      score: 'Score',
      summary: 'Summary',
      issues: 'Detected issues',
      noIssues: 'No issues detected ✓',
      severityHigh: 'High',
      severityMedium: 'Medium',
      severityLow: 'Low',
      topCategories: 'Top categories',
      lowestCategories: 'Lowest categories',
      scanIdLabel: 'Scan ID',
      issueCount: 'issues',
      printReport: 'Print Report',
      downloadPdf: 'Download Report (PDF)',
      preparingPdf: 'Preparing report...',
      pdfError: 'Could not prepare report',
      pdfErrorHint: 'Try again, or use the print option instead',
      // V2 #50 — professional report redesign
      reportVerified: 'Verified Report',
      // W2 — this repo's own translation of the approved Arabic (user,
      // 2026-10-01: "والإنجليزي في الموقع يُترجم من العربي المعتمد بالمعنى
      // نفسه"), not independently approved text.
      analyzedByAI: 'The grade is computed from the measurement results; the analysis and advice are done by AI.',
      scanDate: 'Scan Date',
      issuesFound: 'issues found',
      // W4 — approved by the user 2026-10-01, verbatim ("1 issue needs
      // attention" / "%d issues need attention"); %d renders as "1" for the
      // one-bucket, so all four share the same templating mechanism.
      issuesNeedAttentionOne: '%d issue needs attention',
      issuesNeedAttentionTwo: '%d issues need attention',
      issuesNeedAttentionFew: '%d issues need attention',
      issuesNeedAttentionMany: '%d issues need attention',
      scanHighlights: 'Scan highlights',
      evidence: 'Evidence',
      predictedProblems: 'Predicted Problems',
      buyerAdvice: 'Buyer Advice',
      casual: 'Casual user',
      gamer: 'Gamer',
      photographer: 'Photographer',
      forCasual: 'For casual users',
      forGamer: 'For gamers',
      forPhotographer: 'For photographers',
      categoriesDetails: 'Category Details',
      expected: 'Expected',
      testsPassed: 'tests passed',
      technicalNotes: 'Technical Notes',
      verifiedFooter: 'verified via',
      severityDanger: 'Critical',
      severityWarning: 'Warning',
      severityInfo: 'Info',
      tierFlagship: 'Flagship',
      tierMidRange: 'Mid-range',
      tierBudget: 'Budget',
      // Categories (2026-10-01) — this repo's own translation of the
      // approved Arabic list (user, 2026-10-01: "الإنجليزي ... يُترجم من
      // العربي المعتمد"). gpu/gps/input specifically confirmed by the user
      // 2026-10-01 §٣: "والإنجليزي: GPU، وLocation (GPS)، وTouch & buttons،
      // كما اقترحه الوكيل" — those three (plus camera, unchanged) are
      // user-approved; the rest remain the agent's own translation.
      // Unchanged where the existing EN already matched; three elaborated
      // (cellular/gps/wireless) to carry the Arabic's fuller phrasing
      // explicitly.
      catDisplay: 'Display',
      catMemory: 'Memory',
      catStorage: 'Storage',
      catBattery: 'Battery',
      catThermal: 'Thermal',
      catCpu: 'CPU',
      catGpu: 'GPU',
      catSensors: 'Sensors',
      catCamera: 'Camera',
      // "الموقع (GPS)" — kept "(GPS)" visible rather than bare "GPS", to
      // match the Arabic's explicit "Location" framing.
      catGps: 'Location (GPS)',
      // "الشبكة الخلوية" — the Arabic explicitly says "network".
      catCellular: 'Cellular Network',
      // "الاتصال اللاسلكي" — the Arabic explicitly says "connection".
      catWireless: 'Wireless Connection',
      catSecurity: 'Security',
      catAudio: 'Audio',
      catInput: 'Touch & buttons',
      unmeasured: 'Not measured',
      unmeasuredHint: 'No tests ran for this category, so there is no verdict on it — neither good nor bad.',
      testsNotRun: '{n} of {total} tests were not run',
      testsNotRunAll: 'None of this category\'s {total} tests were run',
      testsFailed: 'failed',
      // #7 (2026-10-01, approved) — capitalized to match severityWarning
      // ("Warning"); was lowercase 'warning'.
      testsWarning: 'Warning',
      // V7 (findings-based pipeline)
      v6FieldMissing: 'Not available — V6 report',
      severityPositive: 'Positive',
      severityUnknown: 'Unknown',
      v7StateMeasured: 'Measured',
      v7StatePartial: 'Partial coverage',
      v7StateUnmeasured: 'Not measured',
      // decision 87 §5 (2026-09-25), approved by the user (decision 91 §1,
      // evidence/translations-approved-2026-09-25.md, "wepsite" section —
      // outside this repo, transcribed verbatim in the task order). No
      // trailing period, matching the Arabic.
      v7StateUnknown: "This category's measurement state is unknown",
      // decision 82 §1 (2026-09-24) — Arabic source: NeuralChek app/src/main/
      // res/values/strings.xml, report_v7_state_attested_only /
      // report_v7_state_harness_error (rule 29).
      // #14 (2026-10-01) — approved by the user verbatim.
      v7StateAttestedOnly: 'Technician attestation only, with no automatic measurement.',
      v7StateHarnessError: "Not measured: this category's tests could not be run by the scanning tool. Not a verdict on the device.",
      // decision 91 §1 (2026-09-25), approved by the user — evidence/
      // translations-approved-2026-09-25.md, "wepsite" section (outside
      // this repo, transcribed verbatim). Arabic source: lib/i18n.js's `ar`
      // section above, same keys, NeuralChek strings.xml (rule 29).
      v7ReasonNoHealthBearingDeclared: "Not measured: this scan contains no test that counts toward this category's status.",
      // #15/#16 (2026-10-01) — approved by the user verbatim; these two also
      // supersede the decision-91 "approved" wording locked in
      // scripts/test/i18nApprovedTranslations.test.cjs, updated in the same
      // commit as this file (see that file's comment).
      v7ReasonDeclaredButNoneExecuted: 'This category was not measured in this scan.',
      v7ReasonBatteryUncalibrated: 'The battery is measured, but is not given a grade in this version.',
      v7ReasonBatteryUnmeasured: 'Battery health not measured: none of its indicators met the measurement conditions in this scan.',
      v7ReasonHarnessErrorUnmeasured: "Not measured: this category's data did not arrive from the scanning tool. Not a verdict on the device.",
      // W6 (2026-10-01 §٦) — user-approved verbatim, matches the backend's
      // S-13 text exactly. Replaces the agent's round-1 proposal entirely.
      v7HarnessErrorMessageUnavailable: 'The test results for this scan could not be prepared; this is not a verdict on the device.',
      // decision 91 §3 (2026-09-25).
      v7NarrativeIncomplete: 'The explanation is incomplete. The grades and coverage are computed from the measurements.',
      coverageLabel: 'Coverage',
      // W1 (2026-10-07, user's decision البند ٢) — approved verbatim; was
      // 'Ceiling reason'. The badge key beside it (decision 91's 'Ceiling')
      // was deleted in all three languages — no reader left.
      governingGateLabel: 'Reason for the overall grade',
      letterSourceAdjustedLabel: 'Model-adjusted',
      adjustmentEvidenceLabel: 'Evidence reference',
    },
    scan: {
      title: 'Scan QR code',
      subtitle: 'Point the camera at the QR code on your report',
      starting: 'Starting camera...',
      cameraDenied: 'Camera access denied',
      cameraError: 'Could not open camera',
      cameraHint: 'Make sure to grant camera permission to this site',
      manualEntry: 'Enter ID manually',
      manualHint: "If the code can't be scanned, enter the Scan ID manually",
      back: 'Back',
      detected: 'Code detected',
      redirecting: 'Redirecting...',
      invalidQR: 'Invalid code',
      notSupported: 'Camera not supported in this browser',
    },
    pricing: {
      title: 'Choose your plan',
      subtitle: 'Pay only for what you need — upgrade or cancel anytime',
      freeTrial: 'Try the app free — one free scan per device',
      single: {
        name: 'Single Scan',
        price: '$0.50',
        desc: 'One scan for one device',
        features: ['Full AI analysis', 'Downloadable PDF report', 'Verification QR code', 'Valid for 30 days'],
      },
      basic: {
        name: 'Shop Basic',
        price: '$10/mo',
        desc: '50 scans per month',
        features: ['50 scans per month', 'Full report + PDF + QR', 'Cloud scan history'],
      },
      pro: {
        name: 'Shop Pro',
        price: '$20/mo',
        desc: '150 scans per month',
        features: ['150 scans per month', 'All basic features', 'Device management (pricing & sale status)', 'Shop logo on reports'],
      },
      cta: 'Download app to subscribe',
      best: 'Best',
      popular: 'Most Popular',
    },
    faq: {
      title: 'Frequently Asked Questions',
      items: [
        { q: 'Does the app require internet?', a: 'Yes, to send data for AI-powered analysis and retrieve the report.' },
        { q: 'How long does the scan take?', a: '8 minutes of automated scanning, plus a brief time for manual tests.' },
        { q: 'Is device data safe?', a: 'Yes. We never collect personal data — only technical performance data needed to generate the report.' },
        { q: 'Does it work on all devices?', a: 'Works on Android 8 (Oreo) and newer, on 64-bit ARM devices (the vast majority of phones from 2018 onward). iOS is not currently supported.' },
        { q: 'How can I verify a report?', a: 'Every report carries a QR code that can be scanned to verify authenticity on our website.' },
      ],
    },
    login: {
      title: 'Login',
      subtitle: 'Sign in to manage your scans and subscription',
      email: 'Email',
      password: 'Password',
      signin: 'Sign in',
      google: 'Continue with Google',
      noAccount: "Don't have an account?",
      signup: 'Sign up',
      or: 'or',
    },
    dashboard: {
      plan: 'Current Plan',
      remaining: 'Scans Remaining',
      expires: 'Expires',
      history: 'Recent Scans',
      upgrade: 'Upgrade Plan',
      logout: 'Logout',
      empty: 'No scans yet',
      emptyHint: 'Scans you run with this account from the app will appear here',
      scans: 'scans',
      myDevices: 'My scanned devices',
      shopProOnly: 'Shop management is only available on the "Shop Pro" plan',
      upgradeToPro: 'Upgrade to Pro',
      publicShopLink: 'Your public shop link',
      copyLink: 'Copy',
      copied: 'Copied ✓',
      visitShop: 'Visit shop',
      price: 'Price',
      pricePlaceholder: 'Set price',
      currency: 'Currency',
      sellerNote: 'Seller note',
      sellerNotePlaceholder: 'Notes for the buyer — e.g.: Battery replaced, original box included',
      listingStatus: 'Device status',
      forSale: 'For sale',
      sold: 'Sold',
      hidden: 'Hidden',
      saveListing: 'Save',
      saving: 'Saving...',
      saved: 'Saved ✓',
      saveError: 'Save failed',
      currencySYP: 'SYP',
      currencyUSD: '$',
      currencyTRY: '₺',
    },
    mockup: {
      device: 'Samsung Galaxy S23',
      condition: 'Excellent Condition',
      viewReport: 'View Full Report',
      stats: {
        battery: 'Battery',
        cpu: 'CPU',
        display: 'Display',
        camera: 'Camera',
      },
    },
    download: {
      title: 'Ready to try it?',
      subtitle: 'Download the app now and start your first scan in minutes',
      versionInfo: 'Version 1.0.15 — ~37 MB',
      comingPlayStore: 'Currently available as direct APK download',
      android: 'Android app',
      button: 'Download App (APK)',
    },
    footer: {
      rights: 'All rights reserved',
      tagline: 'AI-powered smart scanning — full confidence in every report',
      product: 'Product',
      legal: 'Legal',
      support: 'Support',
      privacy: 'Privacy Policy',
      terms: 'Terms of Use',
      contact: 'Contact',
      follow: 'Follow us',
      downloadApk: 'Download APK',
      faq: 'FAQ',
      supportEmail: 'Support email',
    },
    notFound: {
      title: 'Page not found',
      desc: "Sorry, we couldn't find the page you're looking for.",
      home: 'Back to home',
    },
    shop: {
      trustedBadge: 'Trusted shop — verified by NeuralCheck',
      scannedDevices: 'Devices for sale',
      noDevices: 'No devices listed for sale yet',
      noShop: 'Shop not found',
      noShopHint: 'Check the shop link or contact the shop owner',
      contact: 'Contact',
      viewReport: 'View report',
      devicesCount: 'devices for sale',
      loadError: 'Could not load shop data',
      sellerNote: 'Seller note',
      forSaleBadge: 'For sale',
      soldBadge: 'Sold',
    },
    technology: {
      metaTitle: 'Technology',
      metaDescription:
        'How NeuralCheck runs an 8-phase stress test in 8 minutes, sends raw timeseries to an AI engineer, and reports in your language. The methodology that defeats OEM thermal governors.',
      hero: {
        badge: 'Methodology, in the open',
        title: 'How NeuralCheck actually works',
        subtitle:
          "No black box. The methodology behind every grade — from the 8-phase stress protocol to the AI that reads your device like a senior engineer.",
      },
      protocol: {
        title: 'Every scan runs 8 phases of measured stress',
        intro:
          '~480 seconds wall-clock. ~1,600 telemetry samples captured across 11 universal channels (CPU frequency, package power, battery voltage, current, temperature, storage throughput, memory bandwidth, GPU framerate, and more). Every phase has a purpose.',
        phases: [
          { num: '0', name: 'Baseline', duration: '~30s', desc: "Idle measurement. Establishes the device's resting state before any load is applied." },
          { num: '1', name: 'Storage stress', duration: '~60s', desc: '4 GB sequential write. Reveals SSD/UFS controllers throttling under sustained I/O.' },
          { num: '2', name: 'Memory stress', duration: '~75s', desc: 'Large-buffer shuffling. Surfaces RAM bandwidth ceilings and DRAM thermal limits.' },
          { num: '3', name: 'CPU stress', duration: '~80s', desc: 'TensorFlow Lite MobileNetV2 inference on 7 worker threads with XNNPACK delegate. Saturates every core.' },
          { num: '4', name: 'GPU stress', duration: '~75s', desc: 'Raymarching fragment shader on an offscreen framebuffer. Pushes the GPU to its sustained-load wall.' },
          { num: '5', name: 'Combined stress', duration: '~60s', desc: 'CPU + GPU at peak together. Exposes shared power-budget and thermal-coupling issues.' },
          { num: '6', name: 'Burst', duration: '~45s', desc: "Short NEON FMA pulses. Reads the device's VRM (voltage regulator) signature and instantaneous response." },
          { num: '7', name: 'Cooldown', duration: '~60s', desc: 'Thermal recovery. Measures how quickly the device returns to baseline once load is removed.' },
        ],
      },
      camouflage: {
        title: "AI camouflage — why our stress test isn't blocked",
        body: [
          'Modern Android phones ship with aggressive OEM governors — HyperOS on Xiaomi, MIUI, ColorOS on Oppo, One UI on Samsung — that detect synthetic benchmarks (Geekbench-style NEON loops, SHA hashing, prime-finders) and cap CPU and GPU frequency to "protect the device." The result: synthetic stress tests measure the governor, not the silicon.',
          'NeuralCheck replaces the synthetic workload with real workloads the OS treats as legitimate: TensorFlow Lite MobileNetV2 inference for the CPU phase, and a real OpenGL ES raymarching shader for the GPU phase. The governor sees an AI application doing useful work, not a benchmark — so it stays out of the way and lets the silicon run at its true sustained-load limit.',
          'That is the difference between a marketing number and a defensible measurement.',
        ],
        validatedTitle: 'Validated on real flagships',
        validatedNote: 'Governor capping confirmed defeated on:',
        validatedDevices: [
          'Samsung Galaxy S24 Ultra (2024 flagship)',
          'Xiaomi 14T (2024)',
          'Samsung Galaxy S21 Ultra (2021 flagship)',
          'Samsung Galaxy S10 5G (2019, cross-generational validation)',
        ],
      },
      pipeline: {
        title: 'Raw measurements, expert AI analysis',
        body: [
          '~1,600 samples across 11 universal telemetry channels are captured during the scan — roughly 160 KB of dense timeseries data.',
          // W3-ب (أمر 2026-10-01 §٦) — user-approved verbatim, all three
          // languages given directly in the order (not an agent proposal).
          'On the server, measurements and findings are computed from this raw data, and the AI then reads them.',
          // W3-أ — user-approved verbatim ("كما اقترحه الوكيل"): unchanged
          // from the round-1/round-2 proposal.
          "In every category that receives a grade, the grade is computed from the measurement results using fixed rules. The AI analyzes these results to write the summary and buyer advice and to explain each finding — the way an expert hardware engineer reads the results from measurement instruments. It may propose a grade adjustment, but the adjustment is accepted only with proven evidence from the scan's own results; otherwise the computed grade stands.",
        ],
        stack: [
          { label: 'Analysis engine', value: 'Advanced AI' },
          { label: 'Reliability', value: 'Dual architecture + auto-failover' },
          { label: 'Tokens per scan', value: '~46K' },
          { label: 'Context window', value: '128K tokens' },
        ],
      },
      battery: {
        title: 'Battery health: 6 real indicators, not a fake percentage',
        body: [
          'Most diagnostic apps print a single battery "State of Health" percentage. The number is usually wrong. We have seen flagships report 102%, which is mathematically impossible.',
          'Accurate SoH requires weeks of charge/discharge cycle tracking — that is how AccuBattery and similar tools work. It cannot be honestly extracted from an 8-minute scan.',
          'We measure six indicators that are real, defensible, and measurable in the time we have:',
        ],
        indicators: [
          { name: 'Cycle count', detail: 'Read directly from Android 14+ when exposed by the OEM.' },
          { name: 'Discharge rate under load', detail: 'mA drawn during the heaviest stress phase. Higher than expected = aged cell or internal-resistance creep.' },
          { name: 'Temperature rise during scan', detail: '°C delta from baseline to peak. Reflects cell internal resistance under real load.' },
          { name: 'Voltage stability under load', detail: 'mV stddev across the load phases. A noisy voltage rail signals VRM or battery degradation.' },
          { name: 'Battery level drop during scan', detail: 'Percentage drop over the 8-minute scan window. Cross-checks consumed energy.' },
          { name: 'Discharge vs design ratio', detail: "mAh consumed during the scan vs the cell's design capacity. Cross-validates the level drop." },
        ],
        closing:
          "We tell you what we can measure precisely. We don't invent a number we can't defend.",
      },
      multilingual: {
        title: 'Reports in your language',
        // W3-ج (أمر 2026-10-01 §٦) — user-approved verbatim (dropped "every"
        // from the second sentence, matching the Arabic's dropped "كلّ").
        body: 'Every report brings together grades computed from the measurements and an analysis written by the AI. Output is hybrid: technical numbers come with a plain-language explanation. The same report serves an engineer verifying the numbers and a buyer reading the prose.',
      },
      cta: {
        title: 'Ready to try it?',
        button: 'Download the app',
      },
    },

    privacy: {
      title: 'Privacy Policy',
      updated: 'Last updated: May 2026',
      sections: [
        {
          h: 'Data We Collect',
          p: 'NeuralCheck only collects device performance data (CPU, battery, memory, temperature, storage, network, and display performance). We never collect personal data such as your name, phone number, contacts, photos, or messages.',
        },
        {
          h: 'How We Use Data',
          p: 'Performance data is sent for analysis to our AI providers: DeepSeek V4-Flash (primary) and Google Gemini 2.5 Flash (fallback). Both providers process the data only to generate your report and do not retain it for training. Data is never used for any other purpose and is never sold to any third party. Full details on the /technology page.',
        },
        {
          h: 'Security & Encryption',
          p: 'All data is transmitted over an encrypted HTTPS connection and stored in a secure database. Your reports are private by default and tied to your account. You explicitly control if and when to publish a device on your public shop page.',
        },
        {
          h: 'Your Rights',
          p: 'You can request deletion of all your data from our servers at any time by contacting us via email.',
        },
        {
          h: 'Contact Us',
          p: 'For any privacy questions: contact@example.com',
        },
      ],
    },
    terms: {
      title: 'Terms of Use',
      updated: 'Last updated: May 2026',
      sections: [
        {
          h: 'Nature of the Service',
          p: 'NeuralCheck provides an indicative technical assessment based on performance data and AI analysis. The report is a decision-support tool, not a legal or technical guarantee about the condition of the device.',
        },
        {
          h: 'Limitation of Liability',
          p: "NeuralCheck is not responsible for buying or selling decisions made by the user based on the report. The scan only reveals the device's current state — issues may appear later that cannot be predicted.",
        },
        {
          h: 'Permitted Use',
          p: "You may use the app to scan your own devices or your customers' devices. Using the app for any unlawful purpose, or to impersonate others, is strictly prohibited.",
        },
        {
          h: 'Subscriptions & Payment',
          p: 'All subscription transactions are handled inside the app. You can cancel or upgrade your subscription at any time. Consumed scans are non-refundable.',
        },
        {
          h: 'Changes to These Terms',
          p: 'We reserve the right to modify these terms at any time. You will be notified of material changes via the app or email.',
        },
      ],
    },
  },
};
