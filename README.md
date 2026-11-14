# neuralcheck-website

**English** · [العربية](README.ar.md) · [Türkçe](README.tr.md)

> **Project status: archived.** Development of NeuralCheck was stopped in November 2026 (not enough time, and the planned field data collection turned out to be impractical). The code is released as-is under the [MIT license](LICENSE), without warranty or support. This repository holds **no secrets**: the Firebase web configuration is read from environment variables and the admin and contact e-mail addresses are placeholders.

Website and admin panel of **NeuralCheck**, a diagnostics system for used smartphones: Next.js 14 (App Router), Tailwind CSS, a **static export** (`output: 'export'`) served from Firebase Hosting, talking to the Firebase project that runs [neuralcheck-backend](https://github.com/hasan-oso/neuralcheck-backend). The Android app is [neuralcheck-mobile](https://github.com/hasan-oso/neuralcheck-mobile).

## Pages

- **Public:** home, pricing, technology, `verify` (check a report by its short code), report pages (`print/[shortId]`), shop pages (`shop/[slug]`), privacy, terms, login, dashboard, scan, `tech`.
- **Admin** (`/admin/*`): users, payments, promo codes, reports, settings, and the protocol panels (shops, corrections, marketing names).
- Three languages (Arabic default, Turkish, English) in `lib/i18n.js`, with right-to-left layout for Arabic.

## Requirements

Node.js 22 (Next.js 14 needs at least 18.17) and your own Firebase project with the backend deployed.

## Setup

```bash
npm ci
cp .env.example .env.local     # fill in the web-app values of YOUR Firebase project
npm run dev
```

Without `.env.local` the build still runs, but with placeholder Firebase values (`YOUR_FIREBASE_API_KEY`, ...) and cannot reach any backend.

- **Admin allowlist:** replace `admin1@example.com`, `admin2@example.com`, `admin3@example.com` in `lib/admin.js` with your own addresses (and in the backend's `firestore.rules` and `functions/src/utils/admin.js`; the server is what actually enforces it).
- **Contact e-mail:** `contact@example.com` in `components/Footer.js` and `lib/i18n.js`.
- **Android download:** `public/download/NeuralCheck.apk` is not included (git-ignored). Build the APK from `neuralcheck-mobile` and put it there, or change the download link.

## Build, test, deploy

```bash
npm run build                      # runs the render-surface guard, then writes the static site to out/
for f in scripts/test/*.test.cjs; do node "$f" || echo "FAILED: $f"; done
firebase deploy --only hosting     # publishes whatever is in out/
```

Build right before deploying: `out/` is git-ignored and can hold a stale tree. `npm run deploy:guard:pre` and `deploy:guard:post` are optional safety scripts. **Builds are not deterministic** (build ids and chunk hashes change on every run); read `docs/BUILD_NOTES.md` before comparing two builds.

## License

[MIT](LICENSE).
