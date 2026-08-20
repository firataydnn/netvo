# NETVO — İçerik Motoru (günlük haber)

Satıcının **parasını/kararını** etkileyen küresel e-ticaret gelişmelerini her gün
tarar, marka tonunda (kaynak + tarih + marj etkisi) yazar, siteye besler.

## Dosyalar
- `haber_uret.mjs` — tarayıcı/yazıcı script (bağımlılık yok).
- `haberler.json` — üretilen haber akışı (script yazar; site okur).
- `../.github/workflows/haber.yml` — günlük cron (06:00 UTC).

## Nasıl çalışır
1. RSS kaynaklarını çeker (`SOURCES` — genişletilebilir).
2. **Alaka filtresi:** komisyon/ücret/vergi/tarife + pazaryeri adı geçmeyeni eler.
3. Mevcut `haberler.json` ile **tekrarı ayıklar**.
4. En alakalı **≤2** haberi seçer.
5. Marka tonunda yazar: `ANTHROPIC_API_KEY` varsa Claude Haiku ile, yoksa şablon fallback.
6. `haberler.json`'a ekler (en fazla 60 kayıt).

## Dürüstlük kuralı
Günde **0–2 gerçek** haber. Alaka eşiğini geçmeyen gün → **hiçbir şey yayınlanmaz.**
Dolgu içerik markayı ve SEO'yu öldürür; kalite kadanstan önce gelir.

## Çalıştırma
```
node icerik/haber_uret.mjs --dry      # yerel test (dosyaya yazmaz, ekrana basar)
node icerik/haber_uret.mjs            # üretim (ANTHROPIC_API_KEY set)
```

## Siteye bağlanma
Deploy'da `haberler.json` → `/data/haberler.json` olarak kopyalanır (workflow yapar).
`Commera_Site.html` açılışta bu dosyayı çeker, taze haberleri Dergi'nin başına ekler.
Dosya yoksa mevcut haberler kalır (güvenli, additif). Gelen alanlar HTML'den
temizlenir (enjeksiyon savunması).

## Kurulum (production)
1. Repo'ya GitHub secret ekle: `ANTHROPIC_API_KEY`.
2. `haber.yml` zaten `.github/workflows/` altında — her gün çalışır, `workflow_dispatch` ile elle de tetiklenir.
3. İlk çalıştırmayı **elle** (Actions → Run workflow) tetikleyip çıktıyı gör.

## Genişletme
- Kaynak ekle: `SOURCES` dizisine RSS URL'i.
- Bölge/kategori eşlemesi: `guessCat` / `guessTag`.
- Anahtar kelime hassasiyeti: `KW` / `MONEY`.
