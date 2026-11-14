# Website Audit — Pre-Alpha Release

- **Date:** 2026-05-21
- **Auditor:** Website Agent
- **Branch:** `audit/pre-alpha-website-claims`
- **Source of truth provided by:** task brief (current app reality as of v1.0.8 v6beta line)
- **Scope:** Next.js 14 static-export site under `app/`, components, i18n, public assets, metadata. No external/staging environments inspected — claims are extracted from source.

## Summary

The website is a small Next.js static export with five public-facing pages (`/`, `/pricing`, `/verify`, `/scan`, `/privacy`, `/terms`) plus auth/dashboard/shop routes, fully translated in three locales (Arabic default, Turkish, English). The marketing surface is concentrated in a single i18n file ([lib/i18n.js](lib/i18n.js)) plus the Stats counter component, the phone mockup, and root metadata — so most factual fixes will land in one or two files.

The site is **broadly directionally correct** but has a small cluster of **concrete numeric/version claims that are out of date or wrong** against the current app reality. The most important: the **"18 time-series variables"** stat is wrong (reality: 11 universal channels), **"120+ tests"** overshoots (reality: 85 functional + 20 manual = ~105), the **"Version 1.0 — 35 MB"** download badge is stale (reality: 1.0.8, 36 MB APK on disk), and the **privacy & terms** pages are timestamped April 2026 (one month stale). Pricing tiers align with the spec on names/prices but **Shop Basic's feature list claims a "Shop page on the site"** which the app gates behind Shop Pro — an internal contradiction with the dashboard's `shopProOnly` copy.

The far larger story is **what the site does not say**. Significant capabilities — AI camouflage / OEM-governor bypass, the V6 raw-timeseries pipeline, DeepSeek V4-Flash + Gemini fallback, behavioral battery-health indicators (replacing SoH%), 8 stress phases with ~1600 samples per scan, 13 test categories, 3-language AI reports, arm64-v8a-only restriction — are completely absent from public copy. There are also two **risk-flagged forward-looking claims** ("Coming soon on Google Play", "iOS support is coming later") that aren't backed by anything in the spec and would be misleading at pre-alpha.

No broken images detected in source, but the **phone mockup is partially un-internationalized** (hardcoded English `"Samsung Galaxy S23"`, `"Excellent Condition"`, `"View Full Report"`, and stat labels visible to Arabic and Turkish users), and the **signup link on `/login` points to `href="#"` (dead link)**. The Arabic `priceLocal` line (`≈ 5,000 ل.س`) is set only for Arabic and quietly omitted for Turkish and English single-scan cards — minor but visible inconsistency.

## Site Map

| URL path | Page name | Languages | Has technical claims? |
|---|---|---|---|
| `/` | Home / Landing | ar / tr / en (live-switchable) | **Yes** — hero, features, stats, how-it-works, pricing, FAQ, download badge, trust bar, footer trust badges |
| `/pricing/` | Pricing | ar / tr / en | **Yes** — tier features, prices, free-trial badge |
| `/verify/` | Verify Report | ar / tr / en | Indirect — UI labels only; renders dynamic report data |
| `/scan/` | QR Camera Scan | ar / tr / en | No technical claims |
| `/privacy/` | Privacy Policy | ar / tr / en | **Yes** — data-collection scope, AI processing, transport encryption |
| `/terms/` | Terms of Use | ar / tr / en | **Yes** — service nature, liability scope |
| `/login/` | Login | ar / tr / en | Indirect (meta description references "team access") |
| `/dashboard/` | User Dashboard (auth) | ar / tr / en | No marketing claims |
| `/shop/[slug]/` | Public Shop Page (Pro) | ar / tr / en | Trust badge: "verified by NeuralCheck" |
| `/print/[shortId]/` | Server-rendered PDF view | ar / tr / en | Same content as /verify, server-rendered for Puppeteer |
| `/admin/*` | Admin panel (gated) | en only (no i18n) | Out of audit scope |
| `/not-found.js` | 404 | ar / tr / en | None |
| `/manifest.webmanifest` | PWA manifest | en only | **Yes** — duplicates root tagline |

**i18n note:** all three locales render from the same routes via the in-memory `LanguageContext`; there are no per-locale URLs. Default locale at SSR is `ar` (RTL); the client switches based on `?lang=`, `localStorage.nc_lang`, then `navigator.language`. SEO `alternates.languages` in [app/layout.js](app/layout.js) points all three locales at the same `/` URL — not technically wrong, but not a real hreflang setup.

## Page-by-page audit

### 1. Root metadata — `app/layout.js`

**Purpose:** SEO title/description, OG tags, alternates for every page (overridden per-route in `pricing/layout.js`, `verify/layout.js`, `login/layout.js`).
**Languages:** English literals (this is the static fallback served to crawlers and to first render).
**Claims found:**

| # | Claim | Category | Notes |
|---|---|---|---|
| 1 | "AI-powered phone diagnostics" (title) | **VAGUE** | Doesn't specify the model. Could be "DeepSeek V4-Flash + Gemini fallback". |
| 2 | "Check any smartphone before you buy. AI-powered diagnostic with 120+ tests in 8 minutes." (description) | **OUTDATED** | "120+ tests" overshoots reality (85 functional + 20 manual = ~105). "8 minutes" is accurate. |
| 3 | "Verifiable QR-coded reports." | **ACCURATE** | Matches `verify` + `print` routes + spec. |
| 4 | "Works on 1000+ devices." | **VAGUE** / risky | Spec only confirms validation on Xiaomi 14T, S24 Ultra, S21 Ultra. 1000+ is an aspirational number; unverifiable. |
| 5 | `keywords` includes Arabic + Turkish keyword variants | **ACCURATE** | Reflects multi-locale intent. |
| 6 | OG `locale: ar_SA`, alternates `en_US, tr_TR` | **ACCURATE** | Matches the LanguageProvider's `ar` default. |

### 2. `public/manifest.webmanifest`

**Purpose:** PWA install manifest.
**Languages:** English only.
**Claims found:**

| # | Claim | Category | Notes |
|---|---|---|---|
| 7 | "AI-powered smartphone diagnostic. Check any phone before you buy with 120+ tests in 8 minutes." | **OUTDATED** | Same "120+ tests" issue as #2 — duplicated here. |

### 3. Home page — `app/page.js` + `lib/i18n.js`

**Purpose:** Marketing landing; hero, features, stats, how-it-works, pricing summary, FAQ, download CTA.
**Languages:** ar / tr / en (full parity).
**Claims found:**

| # | Claim (en) | Category | Notes |
|---|---|---|---|
| 8 | Hero badge: "AI-Powered Diagnostics" | **VAGUE** | Doesn't name the model stack. |
| 9 | Hero title: "Check any phone before you buy" | **ACCURATE** | Direct value prop, no specifics to verify. |
| 10 | Hero subtitle: "AI-powered comprehensive scan — 120+ tests in 8 minutes" | **OUTDATED** | "120+ tests" overshoots reality. "8 minutes" accurate. |
| 11 | Hero CTA: "Download App (APK)" | **ACCURATE** | Matches Android-only delivery. |
| 12 | TrustBar / Footer trust badge: "Encrypted data" | **VAGUE** | True (HTTPS), but trivial and undifferentiated. |
| 13 | TrustBar / Footer trust badge: "AI-powered analysis" | **VAGUE** | Same as #8. |
| 14 | TrustBar / Footer trust badge: "Verifiable reports" | **ACCURATE** | Matches QR + `/verify` + `/print` design. |
| 15 | TrustBar / Footer trust badge: "Works on 1000+ devices" | **VAGUE** / risky | See #4 — unverifiable. |
| 16 | Feature f1 title: "8-min stress test" | **ACCURATE** | Matches ~480s scan budget. |
| 17 | Feature f1 desc: "Intensive testing reveals hidden issues not visible in normal use" | **VAGUE** | Could specify the 8-phase stress protocol or the OEM governor bypass. |
| 18 | Feature f2 title: "AI-powered analysis" | **VAGUE** | See #8. |
| 19 | Feature f2 desc: "Smart model analyzes data and delivers a clear report without technical jargon" | **VAGUE / partially WRONG** | Reality is **hybrid** technical + plain language, not "without technical jargon". |
| 20 | Feature f3 title: "Verified reports" | **ACCURATE** | |
| 21 | Feature f3 desc: "Every report has a QR code for verification — results cannot be tampered with" | **ACCURATE** | Matches signed-server-verify flow. |
| 22 | Feature f4 title: "Predict problems" | **UNVERIFIABLE** | Not contradicted by spec but not in the source-of-truth list. |
| 23 | Feature f4 desc: "Predicts issues likely to appear within 3-6 months based on device behavior" | **UNVERIFIABLE / risky** | Specific window (3-6 months) — needs a model card or validation backing to defend. |
| 24 | Stats: **120+** "Technical tests" | **OUTDATED** | Reality: 85 functional + 20 manual = ~105 (across 13 categories). |
| 25 | Stats: **8** "Minutes scan" | **ACCURATE** | Matches ~480s. |
| 26 | Stats: **18** "Time-series variables" | **WRONG** | Reality: 11 universal telemetry channels (V5/V6 fieldsVersion 63). |
| 27 | Stats: **1000+** "Supported models" | **VAGUE** / risky | See #4. |
| 28 | How-it-works s2: "Run the full diagnostic and wait just 8 minutes" | **ACCURATE** | Matches scan duration. |
| 29 | How-it-works s3: "Receive a clear report with a grade and final verdict" | **ACCURATE** | Matches `aiResponse` schema with `grade`/`verdict`. |
| 30 | Download badge: "Version 1.0 — Size 35 MB" | **OUTDATED** | Reality: APK on disk is `1.0.8` (v6beta line), 36 MB (`36,324,518` bytes). |
| 31 | Download badge: "Coming soon on Google Play" | **RISK / UNVERIFIABLE** | No confirmed Play Store plan at pre-alpha. Misleading if there's no timeline. |
| 32 | Footer tagline: "AI-powered smart scanning — full confidence in every report" | **VAGUE** | Generic; no specific claim to fact-check. |

### 4. Phone mockup — `components/PhoneMockup.js`

**Purpose:** Decorative hero illustration.
**Languages:** Hardcoded **English only** — not internationalized.
**Claims found:**

| # | Claim | Category | Notes |
|---|---|---|---|
| 33 | "Samsung Galaxy S23" (mocked device label) | **VAGUE / visual issue** | Hardcoded device; non-localized. Shown to Arabic & Turkish viewers. Could rotate or use a generic. |
| 34 | "Excellent Condition" | **Visual issue (i18n gap)** | Not translated. |
| 35 | "View Full Report" button label | **Visual issue (i18n gap)** | Not translated. |
| 36 | Stat tile values: "Battery 96%", "CPU 100%", "Display A+", "Camera OK" | **Visual issue (i18n gap)** | Labels (`Battery`, `CPU`, `Display`, `Camera`) hardcoded English. |

### 5. FAQ — `lib/i18n.js` (`faq.items`) rendered by `components/FAQ.js`

**Languages:** ar / tr / en.
**Claims found:**

| # | Claim (en) | Category | Notes |
|---|---|---|---|
| 37 | Q "Does the app require internet?" A "Yes, to send data for AI-powered analysis and retrieve the report." | **ACCURATE** | Matches V6 raw-timeseries → AI pipeline. |
| 38 | Q "How long does the scan take?" A "8 minutes of automated scanning, plus a brief time for manual tests." | **ACCURATE** | Matches ~480s + 20 manual tests. |
| 39 | Q "Is device data safe?" A "Yes. We never collect personal data — only technical performance data needed to generate the report." | **ACCURATE — but incomplete** | True. Could disclose payload size (~46K tokens) and 3rd-party AI processors (DeepSeek + Gemini) for full transparency. |
| 40 | Q "Does it work on all devices?" A "It works on Android 8 and above. iOS support is coming later." | **PARTIALLY WRONG / RISK** | Min Android 8 (API 26) is correct, BUT **arm64-v8a only** is not mentioned — armv7 Android 8+ devices will not install. "iOS coming later" is **not confirmed** in source-of-truth — risk of misleading. |
| 41 | Q "How can I verify a report?" A "Every report carries a QR code that can be scanned to verify authenticity on our website." | **ACCURATE** | Matches `/verify` + `/scan` flow. |

### 6. Pricing — `app/pricing/page.js` + `app/page.js#pricing` + `lib/i18n.js`

**Languages:** ar / tr / en.
**Pricing tiers vs spec (`free` / `single` / `shop_basic` / `shop_pro`):**

| # | Claim | Category | Notes |
|---|---|---|---|
| 42 | Free trial badge: "Try the app free — one free scan per device" | **ACCURATE** | Matches `free: 1 free trial, device-fingerprinted, no PDF/QR`. (Note: site doesn't mention "no PDF/QR" on the free tier.) |
| 43 | Single Scan: $0.50 | **ACCURATE** | Matches spec. |
| 44 | Single Scan features: "Full AI analysis / Downloadable PDF report / Verification QR code / Valid for 7 days" | **ACCURATE** | Matches `single: one-time scan with PDF + QR`. "Valid for 7 days" is more specific than spec — confirm with backend. |
| 45 | Single Scan `priceLocal: ≈ 5,000 ل.س` | **i18n inconsistency** | Only present in `ar` translations; `tr` and `en` omit a local-currency hint entirely. Either remove from `ar` or add SYP/TRY equivalents to all locales. |
| 46 | Shop Basic: $10/mo, "50 scans per month" | **ACCURATE** | Name and price match spec. |
| 47 | Shop Basic feature: "Shop page on the site" | **WRONG / internal contradiction** | Spec says public shop page is **Shop Pro only** (`shop_pro = shop_basic + public shop page`). [Navbar.js](components/Navbar.js#L24) gates `showMyShop` behind `PRO_PLANS`, and [dashboard](app/dashboard/page.js) tells Basic users `shopProOnly: 'Shop management is only available on the "Shop Pro" plan'`. Promising a shop page to Basic users contradicts the app behavior. |
| 48 | Shop Basic feature: "Scan another device via code" | **UNVERIFIABLE** | Not in source-of-truth list — confirm feature exists. |
| 49 | Shop Pro: $20/mo, "Unlimited scans" | **ACCURATE** | Matches spec. |
| 50 | Shop Pro features: "Device management... / Shop logo on reports / Monthly statistics / Priority support" | **PARTIALLY UNVERIFIABLE** | Device management + shop pages are implemented. "Monthly statistics" and "Priority support" aren't confirmed in source-of-truth — verify or soften. |

### 7. Verify page — `app/verify/page.js`

**Purpose:** Look up a scan report by Scan ID.
**Languages:** ar / tr / en.
**Marketing claims:** None — page is a tool. The example Scan ID `NC-A7K9M2` is hardcoded and queries the live `verifyReport` cloud function; if that record was wiped, the "example" CTA would 404.

| # | Claim | Category | Notes |
|---|---|---|---|
| 51 | "Analyzed by AI" badge on verified report | **VAGUE** | Could surface "DeepSeek V4-Flash". |
| 52 | "verified via neuralcheck.net" footer | **ACCURATE** | |
| 53 | Hardcoded example: `NC-A7K9M2` | **RISK / unverifiable** | Confirm this record exists in production Firestore; otherwise the "click to try example" UX breaks. |

### 8. Privacy — `app/privacy/page.js` (content in `lib/i18n.js#privacy`)

**Languages:** ar / tr / en.

| # | Claim | Category | Notes |
|---|---|---|---|
| 54 | "Last updated: April 2026" | **OUTDATED** | Today is 2026-05-21. Refresh date + revision when actual policy is re-reviewed. |
| 55 | "NeuralCheck only collects device performance data (CPU, battery, memory, temperature, storage, network, and display performance)." | **ACCURATE but incomplete** | True. Could itemize the 11 universal telemetry channels + 13 categories + 85 functional tests for full disclosure. |
| 56 | "We never collect personal data such as your name, phone number, contacts, photos, or messages." | **ACCURATE** | App permissions: location (optional GPS test), camera (manual test only). |
| 57 | "Performance data is sent to our AI model to analyze it and produce a technical report." | **VAGUE / RISK** | Doesn't disclose 3rd-party processors (DeepSeek + Gemini are not Anthropic/in-house). Under GDPR / consumer-protection law in target markets, naming the data processor is generally expected. |
| 58 | "Data is never used for any other purpose and is never sold to any third party." | **ACCURATE per spec** | Confirm with the actual data-sharing agreements with DeepSeek / Google. |
| 59 | "All data is transmitted over an encrypted HTTPS connection and stored in a secure database." | **ACCURATE** | Matches Firebase Firestore + HTTPS Cloud Functions. |
| 60 | "Your reports are tied to your account only — no one else can access them." | **PARTIALLY WRONG** | True for `/dashboard`. But the public **`/shop/[slug]`** page exposes reports the seller has set to `for_sale` or `sold`. Privacy copy should acknowledge that opt-in public exposure exists. |

### 9. Terms — `app/terms/page.js` (content in `lib/i18n.js#terms`)

**Languages:** ar / tr / en.

| # | Claim | Category | Notes |
|---|---|---|---|
| 61 | "Last updated: April 2026" | **OUTDATED** | Same as #54. |
| 62 | "NeuralCheck provides an indicative technical assessment ... not a legal or technical guarantee" | **ACCURATE** | Good liability disclaimer. |
| 63 | "All subscription transactions are handled inside the app." | **ACCURATE per spec** | Pricing CTA also routes to APK download, consistent with this. |

### 10. Login — `app/login/page.js` + `app/login/layout.js`

**Languages:** ar / tr / en.

| # | Claim | Category | Notes |
|---|---|---|---|
| 64 | Meta description: "Sign in to your NeuralCheck shop account to manage scans, reports, and **team access**." | **WRONG / risk** | "Team access" is not in source-of-truth and not implemented (single-owner shops only). Remove or replace. |
| 65 | `signup` link: `<Link href="#">` — **dead link** | **Visual / UX issue** | Clicking "Sign up" does nothing. Either route to a real registration page or hide until ready. |

### 11. Shop — `app/shop/[slug]/ShopClient.js`

**Languages:** ar / tr / en. Static-export trick (`generateStaticParams` returns `[{slug:'_'}]` + Firebase rewrites).

| # | Claim | Category | Notes |
|---|---|---|---|
| 66 | "Trusted shop — verified by NeuralCheck" | **ACCURATE-ish** | Page only renders if a `users` doc with matching `shopSlug` exists, so it's verified-by-existence. But "verified" implies vetting — confirm whether shops go through any admin verification. |
| 67 | Devices grid renders Firestore-backed reports with `listingStatus in ['for_sale','sold']` | **ACCURATE** | |

### 12. Dashboard / Admin

No public marketing claims. Out of audit scope.

## Gaps — capabilities not communicated

These are features confirmed in the source-of-truth that the website does not surface at all:

1. **OEM-governor bypass / "AI camouflage" methodology** — TFLite + raymarching shader defeating HyperOS/MIUI/ColorOS/One UI thermal capping. This is a competitive differentiator against synthetic benchmarks and isn't mentioned.
2. **8-phase stress protocol** (Baseline → Storage → Memory → CPU → GPU → Combined → Burst → Cooldown). Site says "8 minutes" but never explains what runs during them.
3. **~1600 telemetry samples per scan** captured into 11 universal channels — high-fidelity data collection isn't surfaced.
4. **V6 pipeline: raw timeseries → AI** with no precompute. AI does all stats and grading — important because it differentiates from rule-based competitors.
5. **DeepSeek V4-Flash primary + Gemini 2.5 Flash fallback**, 128K context, ~46K tokens per scan. Site only says "AI-powered". Naming the models would lend credibility.
6. **3-language AI reports** (Arabic / Turkish / English). The site is in 3 languages, but doesn't advertise that the reports themselves are produced in 3 languages — that's a buyer-facing feature.
7. **Behavioral battery indicators** replacing SoH%: cycleCount, dischargeRateUnderLoadMa, batteryTempRiseC, voltageStabilityMv, levelDropPct, dischargeVsDesignRatioMah. This is a recent and important methodological change.
8. **13 test categories** (battery, camera, cellular, cpu, display, gps, gpu, memory, security, sensors, storage, thermal, wireless). Categories show on report pages but aren't in marketing copy.
9. **85 functional tests + 20 manual tests = 105 total** — site says "120+" which is wrong-direction.
10. **Min Android 8 (API 26) but arm64-v8a only** — armv7 devices on Android 8 will not install. Risk of customer complaints.
11. **Real-flagship validation** (Xiaomi 14T, Samsung S24 Ultra, S21 Ultra) — naming validated devices builds trust.
12. **Hybrid technical + plain-language report style** — homepage says "without technical jargon" which is misleading for an engineer-grade report.

## Risk areas

Severity scale: 🔴 high (mislead or contradict reality) / 🟡 medium (unverifiable claim) / 🟢 low (cosmetic).

| # | Severity | Item |
|---|---|---|
| R1 | 🔴 | "Stats: 18 time-series variables" — **wrong**, reality is 11 channels. (Claim #26) |
| R2 | 🔴 | "Stats: 120+ technical tests" + hero subtitle + manifest + root description — **overshoots**, reality is ~105. (Claims #2, #7, #10, #24) |
| R3 | 🔴 | Shop Basic features list "Shop page on the site" — **contradicts** dashboard's Pro-only gating. (Claim #47) |
| R4 | 🔴 | Login meta references "team access" — feature doesn't exist. (Claim #64) |
| R5 | 🔴 | Privacy page: "Your reports are tied to your account only — no one else can access them" — false when seller opts in to public shop listing. (Claim #60) |
| R6 | 🔴 | FAQ #4 / Claim #40 — Android 8+ but **arm64-v8a only**; ~10% of Android 8 install base is armv7. Risk of "I downloaded but it won't install" support volume. |
| R7 | 🟡 | "iOS support is coming later" — not in spec; no committed timeline. (Claim #40) |
| R8 | 🟡 | "Coming soon on Google Play" — not in spec at pre-alpha. (Claim #31) |
| R9 | 🟡 | "1000+ devices" repeated 4×: meta, trust bar, footer, stats. Only 3 flagship devices confirmed validated. (Claims #4, #15, #27) |
| R10 | 🟡 | Privacy: third-party AI processors (DeepSeek + Gemini) not named. Risk under EU GDPR Art. 13 / DPA disclosures. (Claim #57) |
| R11 | 🟡 | "Predicts issues within 3-6 months" — specific window, no validation backing in spec. (Claim #23) |
| R12 | 🟡 | "Without technical jargon" — contradicts the hybrid technical/plain-language report style. (Claim #19) |
| R13 | 🟢 | Version label "Version 1.0 — 35 MB" stale; actual APK is 1.0.8 / 36 MB. (Claim #30) |
| R14 | 🟢 | Privacy/Terms "Last updated: April 2026" — should be refreshed when claims #54/#61 change. |
| R15 | 🟢 | Example Scan ID `NC-A7K9M2` hardcoded — verify it still resolves in production Firestore. (Claim #53) |
| R16 | 🟢 | "Monthly statistics" + "Priority support" + "Scan another device via code" — unverified Shop tier claims. (Claims #48, #50) |
| R17 | 🟢 | "Valid for 7 days" on single-scan tier — confirm with backend; not in source-of-truth list. (Claim #44) |

## Visual / UX issues

| # | Severity | Item |
|---|---|---|
| V1 | 🔴 | `/login` "Sign up" link points to `href="#"` ([app/login/page.js:173](app/login/page.js#L173)) — dead link. |
| V2 | 🟡 | Phone mockup ([components/PhoneMockup.js](components/PhoneMockup.js)) shows hardcoded English: device name, "Excellent Condition", "View Full Report", and stat tile labels. Arabic & Turkish viewers see English in the marquee hero. |
| V3 | 🟡 | `priceLocal: '≈ 5,000 ل.س'` only set for `ar`; missing for `tr` and `en`. Either drop it or add per-locale equivalents. |
| V4 | 🟢 | SEO `alternates.languages` in [app/layout.js:40](app/layout.js#L40) maps en/ar/tr all to `/` — not a real hreflang setup; search engines may dedupe. |
| V5 | 🟢 | Manifest description ([public/manifest.webmanifest:4](public/manifest.webmanifest)) is English-only by spec (PWA single-locale limitation), but the live site is Arabic-default. Acceptable but worth noting. |
| V6 | 🟢 | Firebase project ID typo `neuralchek-9b6d7` (one `c`) is referenced everywhere. Not user-visible — flagged only because it's a perpetual gotcha when debugging vs. the public domain `neuralcheck.net`. |

No broken images, console errors, layout breaks, or bidi rendering issues detected from source review. (A full visual pass with a running dev server would catch any RTL/LTR edge cases.)

## Recommendations

Priority order, biggest-leverage fixes first.

### P0 — fix factual errors (single-PR safe)
1. **Stats `variables` value** — change `18` → `11` in [components/Stats.js:75](components/Stats.js#L75) and update i18n label to "Universal telemetry channels" (or equivalent ar/tr) — addresses R1, claim #26.
2. **"120+ tests" count** — change in [components/Stats.js:73](components/Stats.js#L73), [app/layout.js:11](app/layout.js#L11), [public/manifest.webmanifest:4](public/manifest.webmanifest), and the three locale `hero.subtitle` strings in [lib/i18n.js](lib/i18n.js). Pick a defensible number — either "85 automated + 20 manual" or "100+". Addresses R2, claims #2/#7/#10/#24.
3. **Shop Basic feature list** — remove "Shop page on the site" / "صفحة متجر على الموقع" / "Sitede mağaza sayfası" from [lib/i18n.js](lib/i18n.js) `pricing.basic.features` in all three locales. Or move "shop page" to Shop Pro. Addresses R3, claim #47.
4. **Login meta description** — drop "team access" in [app/login/layout.js:4](app/login/layout.js#L4). Addresses R4.
5. **Privacy claim #60** — soften to "Your reports are private by default; you control when to publish them on a public shop page." Addresses R5.
6. **Dead signup link** — either build the signup page or remove the "Sign up" line in [app/login/page.js:173](app/login/page.js#L173). Addresses V1.

### P1 — handle the methodology gap (rewrite, not just edit)
7. **Add a "How it works" technical deep-dive section** OR **a dedicated `/technology` page** covering the V6 raw-timeseries pipeline, the 8-phase stress protocol, the 6 behavioral battery indicators (replacing SoH%), and (carefully worded) the OEM-governor-bypass methodology. Gaps #1–8.
8. **Name the AI stack** in privacy + at least one marketing surface: "Powered by DeepSeek V4-Flash with Gemini 2.5 Flash fallback. Reports in Arabic, Turkish, and English." Addresses R10 + gap #5/#6.
9. **Update battery copy** anywhere it implies a single % score. Reality: 6 behavioral indicators, no SoH%. (None of the audited copy explicitly claims SoH% — but pre-emptive: don't add one.)

### P2 — defensible numeric/version claims
10. **Replace "1000+ devices"** with one of:
    - "Validated on Galaxy S24 Ultra, Xiaomi 14T, Galaxy S21 Ultra" (concrete);
    - "All Android 8+ phones with arm64-v8a" (technical);
    - Drop the count entirely and rephrase the trust badge.
    Update at meta, trust bar, footer, and stats. Addresses R9.
11. **Update version + size** to `1.0.8 — 36 MB` in [lib/i18n.js](lib/i18n.js) `download.versionInfo` (all three locales). Or better: auto-pull from the APK file or `package.json`. Addresses R13.
12. **Refresh Privacy / Terms `updated` dates** when claims #54/#61 are next revised. Don't bump the date without a real change. Addresses R14.
13. **Disclose arm64-v8a-only** in FAQ #4 + the download badge to pre-empt armv7-user complaints. Addresses R6.

### P3 — cleanup
14. Localize the phone mockup (V2).
15. Add `priceLocal` for tr/en or remove it from ar (V3).
16. Remove "Coming soon on Google Play" + "iOS support is coming later" until either is committed (R7, R8).
17. Verify the example Scan ID `NC-A7K9M2` resolves in production; otherwise change it or hide the example until a fixed canary record exists (R15).
18. Drop or back up unverified Shop tier perks: "Monthly statistics", "Priority support", "Scan another device via code", "Valid for 7 days" (R16, R17).
19. Tighten "without technical jargon" → "plain-language summary with full technical detail available" (R12, claim #19).
20. Reframe "Predicts issues within 3-6 months" — either back it with a validation note ("based on internal validation set of N devices") or drop the time window (R11, claim #23).

### Estimated scope of fixes
- **P0 (factual errors):** ~1–2 hour edit pass; all in `lib/i18n.js`, `components/Stats.js`, two layout files, and `app/login/page.js`.
- **P1 (methodology):** new content section/page + copy review; ~half-day to a day depending on illustration ambition.
- **P2 (numeric defensibility):** ~1 hour edit pass.
- **P3 (cleanup):** ~1 hour, can be batched with P0.

---

**End of audit.** Awaiting review before any edits to website content.
