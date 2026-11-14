# Netvo — Yol Haritası (Vizyon: internetten para kazanmak isteyenlerin başlangıç ekranı)

**Felsefe:** Netvo sadece bir hesap makinesi değil. Hesap makinesi *kapı*; asıl değer
"bu adama her gün lazım olmak." Üç katman: **Araç** (hook) → **Gündem** (retention)
→ **Rehber/akıl** (güven). Hedef konum: Türkiye'de internetten para kazanmak isteyenlerin
ilk açtığı ekran.

**Kapsam kararı:** KADEMELİ. Önce var olan kategorileri para-diliyle öne çıkar, boş vaat yok.
İçerik geldikçe yeni kategorileri tek tek aç.

---

## ✅ Tamamlanan
- **Haber motoru onarıldı** (Kas 2026): Anthropic API kredisi bitmişti → kredi eklendi,
  bot yeniden haber basıyor. Not: Claude Max aboneliği ≠ API kredisi (ayrı cüzdan).
- **Build donması çözüldü**: `seo/uret.mjs` eval sandbox'ına setInterval stub eklendi.
- **Ana sayfa konu şeridi** (Phase 1): sliderın altında canlı sayılı kategori çipleri
  (Tümü + 5 kategori), tıklayınca ilgili Gündem filtresine gider. Motor değişmedi.

## 🔜 Yapılacaklar (sırayla)

### 1. Şeridi yayına al + doğrula  ← ŞU AN BURADAYIZ
- `git add Commera_Site.html && git commit && git push`
- Netlify build sonrası netvo.co ana sayfada şerit görünüyor mu kontrol.

### 2. Öneri: API kredisi otomatik yükleme
- console.anthropic.com → "Otomatik bakiye yüklemeyi aç".
- Sebep: kredi sessizce bitince tüm içerik (ve geçmişte tüm site) donuyordu. Bu onu kökten bitirir.

### 3. Kategori etiketlerini "para dili"ne çekmeyi değerlendir
- Şu an: Pazaryeri & Ücretler / Regülasyon & Vergi / Global & Sınır Ötesi / Reklam & Büyüme / Lojistik & Kargo.
- Daha benefit-odaklı alternatifler denenebilir (karar Fırat'ın).

### 4. Kapsamı genişlet — yeni kategoriler (içerik geldikçe)
- Olası yeni konular: dropshipping, dijital ürün, içerik/creator, freelance, affiliate.
- **Önce kaynak, sonra kategori:** her yeni kategori için haber motoruna (`icerik/haber_uret.mjs`)
  ilgili RSS kaynakları + LLM kategori kılavuzuna yeni `category` değeri eklenmeli.
  Aksi halde kategori boş görünür. Kademeli ilkesi: boş kategori açma.

### 5. "Rehber/akıl" katmanı (uzun vade)
- Hangi pazaryeri / ülke / ürün / marj — kararı Netvo'da verdiren içerik.
- Hesap + Gündem + Rehber birleşince Netvo bir *otorite* konumuna oturur.

---
*Son güncelleme: build/motor onarımı + ana sayfa konu şeridi tamam. Sıradaki: şeridi push + doğrula.*
