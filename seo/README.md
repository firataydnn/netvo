# Programmatic SEO — ÇOK DİLLİ (TR/EN/DE/FR/ES/IT)

Stratejinin 1 numaralı büyüme hamlesi. SPA (hash routing) Google'a boş görünür.
Bu jeneratör, her pazaryerinin **gerçek verisiyle**, **her dilde** önceden-render edilmiş,
benzersiz, kaynaklı **statik** sayfalar üretir → o dildeki uzun-kuyruk aramaları yakalar
("Trendyol komisyon", "Amazon commission", "Trendyol Provision", "comisiones Etsy",
"commissioni Amazon"…). Backend yok, bedava, bileşik.

## Ne üretir
```
node seo/uret.mjs [taban_url]
```
- 6 dil × 136 pazaryeri = **816 sayfa** + 6 dil hub'ı
- **Yol yapısı:** TR kökte (`/pazaryeri/<k>.html`), diğer diller `/<lang>/pazaryeri/<k>.html`
- Her sayfa: `<html lang>`, çevrilmiş title/meta/H1/FAQ/künye, **hreflang** alternatifleri
  (6 dil + `x-default`), FAQ + Breadcrumb JSON-LD (`inLanguage`), komisyon tablosu, The Gap,
  kaynak+tarih, hesap makinesine derin link (`?lang=` ile)
- `sitemap.xml` — **i18n sitemap**: her URL, `xhtml:link` ile tüm dil alternatiflerini bildirir
  (Google çok dilli standardı). 822 URL.
- `robots.txt`

Varsayılan taban URL `https://commera.co`. Kendi alanınla:
```
node seo/uret.mjs https://ALANIN.com
```

## Çok dilli SEO nasıl çalışır
- **Her dil ayrı URL** → Google her dili ayrı indeksler, o dilin aramalarında çıkar.
- **hreflang** → Google "bu sayfanın Almancası şu, Fransızcası bu" bilir; doğru dili doğru
  kullanıcıya gösterir, duplicate-content cezası olmaz.
- **x-default** → dili eşleşmeyen kullanıcıya TR (kök) gösterilir.
- **Çeviri katmanı:** title/meta/H1/FAQ/künye/The Gap tam çevrilidir. Ülke adları koda göre
  6 dile çevrilir ("Amazon Almanya" → "Amazon Germany"/"Amazon Deutschland"). Kategori adları
  sözlükten çevrilir (yoksa TR'ye düşer — `CAT` sözlüğüne ekleyerek genişletilir).

## Dil eklemek
`uret.mjs` içinde: `LANGS`'a kod ekle + `T[kod]` çeviri bloğu + `COUNTRY`/`CAT`'e o dilin
sütununu ekle + `TAX[kod]`. Tek dosya, ~1 blok. (Örn. sıradaki adaylar: AR, PL, NL.)

## Tek kaynak ilkesi
Oranlar **Commera_Site.html**'den okunur (regex değil, güvenli DOM-stub). Sitede oran
değişince jeneratörü yeniden çalıştır → tüm diller güncellenir. Kopya veri yok.

## Uygulama (hesap makinesi) dili
SEO sayfasındaki CTA `/uygula/?lang=<xx>#/pazaryeri/<k>` gider. Uygulama bu paramı okur.
**Şu an uygulama arayüzü TR + EN çevirilidir**; DE/FR/ES/IT SEO ziyaretçisi CTA ile
İngilizce iniş yapar (Türkçe yerine). Uygulama arayüzünü de 6 dile çevirmek = ayrı, büyük
iş (yüzlerce string + dinamik hesap metni) ve sıradaki adım.

## Deploy (statik host)
1. `node seo/uret.mjs https://ALANIN.com`
2. `seo/site/` içeriğini kökün altına koy (TR kökte, `/en/ /de/ /fr/ /es/ /it/` alt klasörler,
   `sitemap.xml` + `robots.txt` kökte).
3. `Commera_Site.html`'i `/uygula/index.html` olarak koy.
4. Google Search Console'a `sitemap.xml`'i ekle — her dil otomatik keşfedilir.

## SEO notları
- Her sayfa gerçek veri taşır (ince doorway değil) — Google buna değer verir.
- Tahmin oranlı sayfalar açıkça "tahmin" uyarısı gösterir (dürüstlük + spam algısını önler).
- FAQ JSON-LD → zengin snippet şansı, her dilde.
