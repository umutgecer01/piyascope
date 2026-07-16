# Piyascope

Piyascope; ekonomi haberlerini, güncel piyasa verilerini, ekonomik takvimi ve kaynaklı analizleri tek arayüzde birleştiren mobil öncelikli bir finans platformudur.

> Bu içerik yalnızca bilgilendirme amaçlıdır ve yatırım tavsiyesi değildir.

## Özellikler

- Türkçe ve İngilizce giriş deneyimi
- Açık/koyu tema ve cihazda saklanan tema tercihi
- Klavye ile kullanılabilen global varlık ve haber araması
- Güncel piyasa şeridi ve varlık detayları
- Filtrelenebilir canlı RSS/Atom haber akışı
- Gerçek kaynaklardan üretilen haber özeti ve etki analizi
- Hisse, endeks, döviz, emtia ve kripto sayfaları
- Kaynağı açıklanan zaman aralıklı fiyat grafikleri
- Güncel haftalık ekonomik takvim
- Kaynak gösteren Analist ekranı
- Sabah ve gün sonu özetleri
- `localStorage` tabanlı takip listesi ve fiyat alarmları
- Sitemap, robots, Open Graph, Twitter Card ve haber yapılandırılmış verisi
- Responsive, klavye erişimli ve azaltılmış hareket tercihini destekleyen arayüz

## Teknolojiler

- Next.js 16 App Router
- React 19
- TypeScript 5 strict mode
- Vinext ve Vite
- Cloudflare Worker/Sites çalışma zamanı
- Tailwind CSS 4 altyapısı ve projeye özel CSS tasarım sistemi
- uPlot
- Node test runner

## Kurulum

Gereksinimler: Node.js `>=22.13.0` ve npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

## Komutlar

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run validate:artifact
```

`npm run build`, Sites için gereken ESM Worker çıktısını oluşturur ve `dist/server/index.js` ile paketlenmiş hosting manifestini doğrular.

## Ortam değişkenleri

Gizli değerleri kaynak koda veya `NEXT_PUBLIC_*` değişkenlerine yazmayın.

| Değişken | Amaç |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical, sitemap ve paylaşım URL’si |
| `COINGECKO_API_KEY` | İsteğe bağlı CoinGecko sunucu anahtarı; zengin tarihsel kripto serisi için kullanılır |
| `MARKET_DATA_API_URL` | Gelecekte lisanslı piyasa sağlayıcısı adresi |
| `MARKET_DATA_API_KEY` | Gelecekteki piyasa sağlayıcısının sunucu anahtarı |
| `NEWS_API_URL` | İsteğe bağlı lisanslı haber sağlayıcısı adresi |
| `NEWS_API_KEY` | Haber sağlayıcısının sunucu anahtarı |
| `AI_API_KEY` | Gelecekteki üretken AI sağlayıcısının sunucu anahtarı |

## Güncel veri mimarisi

Arayüz bileşenleri dış sağlayıcılara doğrudan bağlanmaz. `marketService`, `newsService`, `calendarService` ve `aiService`, sunucu endpoint’lerinden normalize edilmiş ve tip güvenli veri alır.

| Alan | Kaynak | Güncellik ve not |
| --- | --- | --- |
| BIST 100 ve hisseler | TradingView piyasa tarayıcısı | Sağlayıcının lisans koşullarına göre yaklaşık 15 dakika gecikmeli olabilir |
| USD/TRY ve EUR/TRY | TradingView | Sağlayıcının güncel akışı |
| Ons altın | Gold API + TradingView dönem performansı | Fiyat Gold API’den, dönem değişimleri TradingView’den |
| Gram altın | Ons altın × USD/TRY ÷ 31,1034768 | İki güncel kaynaktan şeffaf biçimde hesaplanır |
| Bitcoin ve Ethereum | CoinGecko; erişilemezse TradingView/Coinbase piyasası | Fiyat, piyasa değeri, hacim ve arz her iki gerçek kaynaktan da sağlanır |
| Döviz grafikleri | Frankfurter / ECB referans kurları | İş günü referans serisi ve son piyasa değeri |
| BIST, altın ve yedek kripto grafikleri | TradingView dönem performansı | Gerçek performans kontrol noktaları; günlük mum serisi değildir |
| Haberler | Resmî RSS/Atom akışları ve kategori akışları | Başlık, açıklama, yayın zamanı ve kaynak bağlantısı korunur |
| Ekonomik takvim | Forex Factory haftalık takvim akışı | Beklenti, önceki ve açıklandığında gerçekleşen değer |
| Analiz | Güncel piyasa görünümü + canlı haber akışı | Kaynak sentezi; kaynak yoksa cevap üretilmez |

Sabit fiyat, sabit haber, sahte grafik noktası veya eski içerik yedeği gösterilmez. Bir sağlayıcı erişilemezse kullanıcıya hata/boş durum sunulur; diğer çalışan sağlayıcıların verileri gösterilmeye devam eder.

## Klasör yapısı

```text
app/
  api/                 Piyasa, haber, takvim ve analiz endpoint’leri
  components/          Sayfalar, kartlar ve tasarım sistemi bileşenleri
  lib/data/            Fiyatsız varlık kataloğu ve kaynak dizini
  lib/server/          Sunucu tarafı veri sağlayıcıları ve adapter’lar
  lib/services/        İstemci servisleri ve cihaz depolama katmanı
  haber/               Dinamik haber detay rotası
  varlik/              Dinamik varlık detay rotası
  ozet/                Sabah ve gün sonu özetleri
tests/                 Kritik rota ve API testleri
worker/                Cloudflare Worker giriş noktası
```

## Gerçek API geliştirme noktaları

- TradingView adapter’ı, lisanslı bir Borsa İstanbul veri sözleşmesi edinildiğinde `app/lib/server/marketData.ts` içinde değiştirilebilir.
- Haber akışı, lisanslı bir sağlayıcıyla `app/api/news/route.ts` içinde normalize edilebilir.
- `app/api/ai/analyze/route.ts` bugün kaynak temelli deterministik sentez üretir. Üretken model eklenecekse `AI_API_KEY` yalnızca sunucu tarafında kullanılmalıdır.
- Takip listesi ve alarm servislerinin arayüzü korunarak `localStorage` yerine D1, Supabase veya başka bir kullanıcı veri katmanı bağlanabilir.

## Güvenlik ve doğruluk

- API anahtarları yalnızca sunucu tarafında kullanılır.
- Dış bağlantılar `rel="noopener noreferrer"` ile açılır.
- Analiz endpoint’i istek uzunluğunu doğrular ve kesin fiyat hedefi üretmez.
- Uygulama al, sat veya tut emri üretmez.
- Her sayısal verinin kaynak, zaman ve gecikme durumu arayüzde gösterilir.
- Finansal karar öncesinde özgün kurum veya veri sağlayıcısı doğrulanmalıdır.

## Yayınlama

Proje `.openai/hosting.json` kimliğiyle Sites yaşam döngüsüne bağlıdır. Production build, Cloudflare uyumlu Worker çıktısı ve statik varlıkları `dist/` altında üretir.

### Netlify ile dağıtım

Frontend, Netlify'de barındırılabilir:

1. GitHub repo'nu oluşturun ve kodun push edin
2. [Netlify](https://netlify.com) hesabınızda GitHub'ı bağlayın
3. Yeni site oluşturun ve repo'yu seçin
4. Build komutu: `npm run build`
5. Yayınla klasörü: `dist/client`

Netlify otomatik olarak her push'ta deploy eder.
