# neuralcheck-website

[English](README.md) · [العربية](README.ar.md) · **Türkçe**

> **Proje durumu: arşivlendi.** NeuralCheck'in geliştirilmesi Kasım 2026'da durduruldu (zaman yetersizliği ve planlanan saha veri toplamanın pratikte neredeyse imkânsız olması nedeniyle). Kod olduğu gibi, garanti ve destek olmaksızın [MIT lisansı](LICENSE) ile yayımlanmıştır. Bu depoda **gizli bilgi yoktur**: Firebase web yapılandırması ortam değişkenlerinden okunur; yönetici ve iletişim e-posta adresleri yer tutucudur.

**NeuralCheck**'in (ikinci el akıllı telefonlar için bir tanılama sistemi) web sitesi ve yönetim paneli: Next.js 14 (App Router), Tailwind CSS ve Firebase Hosting'den sunulan **statik dışa aktarım** (`output: 'export'`); [neuralcheck-backend](https://github.com/hasan-oso/neuralcheck-backend) projesini çalıştıran Firebase projesiyle konuşur. Android uygulaması [neuralcheck-mobile](https://github.com/hasan-oso/neuralcheck-mobile) deposundadır.

## Sayfalar

- **Herkese açık:** ana sayfa, fiyatlandırma, teknoloji, `verify` (kısa koduyla rapor doğrulama), rapor sayfaları (`print/[shortId]`), dükkân sayfaları (`shop/[slug]`), gizlilik, şartlar, giriş, panel, tarama, `tech`.
- **Yönetici** (`/admin/*`): kullanıcılar, ödemeler, promosyon kodları, raporlar, ayarlar ve protokol panelleri (dükkânlar, düzeltmeler, pazarlama adları).
- `lib/i18n.js` içinde üç dil (varsayılan Arapça, Türkçe, İngilizce) ve Arapça için sağdan sola yerleşim.

## Gereksinimler

Node.js 22 (Next.js 14 en az 18.17 gerektirir) ve arka ucun dağıtıldığı kendi Firebase projeniz.

## Kurulum

```bash
npm ci
cp .env.example .env.local     # KENDİ Firebase projenizin web uygulaması değerlerini girin
npm run dev
```

`.env.local` olmadan derleme yine çalışır, ancak yer tutucu Firebase değerleriyle (`YOUR_FIREBASE_API_KEY`, ...) ve hiçbir arka uca erişemez.

- **Yönetici listesi:** `lib/admin.js` içindeki `admin1@example.com`, `admin2@example.com`, `admin3@example.com` adreslerini kendi adreslerinizle değiştirin (ayrıca arka ucun `firestore.rules` ve `functions/src/utils/admin.js` dosyalarında; asıl uygulayan sunucudur).
- **İletişim e-postası:** `components/Footer.js` ve `lib/i18n.js` içindeki `contact@example.com`.
- **Android indirmesi:** `public/download/NeuralCheck.apk` dahil değildir (git tarafından yok sayılır). APK'yı `neuralcheck-mobile` deposundan derleyip oraya koyun veya indirme bağlantısını değiştirin.

## Derleme, test, dağıtım

```bash
npm run build                      # render-surface korumasını çalıştırır, sonra statik siteyi out/ içine yazar
for f in scripts/test/*.test.cjs; do node "$f" || echo "FAILED: $f"; done
firebase deploy --only hosting     # out/ içindekini yayımlar
```

Dağıtımdan hemen önce derleyin: `out/` git tarafından yok sayılır ve eski bir ağaç içerebilir. `npm run deploy:guard:pre` ve `deploy:guard:post` isteğe bağlı güvenlik betikleridir. **Derlemeler deterministik değildir** (derleme kimliği ve parça özetleri her seferinde değişir); iki derlemeyi karşılaştırmadan önce `docs/BUILD_NOTES.md` dosyasını okuyun.

## Lisans

[MIT](LICENSE).

*Not: Türkçe metin bir anadili konuşuru tarafından gözden geçirilmemiştir; düzeltmeler memnuniyetle karşılanır.*
