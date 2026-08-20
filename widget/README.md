# NETVO — Gömülebilir Widget

Satıcı blogları, ajans siteleri ve e-ticaret araçlarının sayfalarına gömdüğü
kompakt kâr hesabı. **Dağıtım + backlink + B2B hunisi**, üçü bir arada (strateji §8).

## Yayıncı nasıl gömer (tek satır)
```html
<div id="netvo-widget"></div>
<script src="https://netvo.com/widget/embed.js" async></script>
```
`embed.js` bir iframe yükler (`netvo-widget.html`), yüksekliği otomatik ayarlar,
"Powered by Netvo" backlink'i taşır.

## Dosyalar
- `uret_widget_data.mjs` — siteden kompakt `data.json` üretir (tek-kaynak).
- `data.json` — top-20 pazaryeri + temsili oran (widget bunu okur).
- `netvo-widget.html` — self-contained hesap (data.json'u çeker; çevrimdışı fallback var).
- `embed.js` — yayıncının eklediği tek-satırlık gömme scripti.

## Güncelleme
Sitede oran değişince:
```
node widget/uret_widget_data.mjs   # data.json'u tazele
```
Deploy'da `widget/` klasörünü `/widget/` altına koy.

## Neden güçlü
- Her gömme = **backlink** (SEO otoritesi) + **marka görünürlüğü** + potansiyel **B2B lead**.
- Widget "temsili oran" gösterir; "tam hesapla" tıklaması kullanıcıyı ana uygulamaya
  (o pazaryerinin derin linkine) taşır → dönüşüm.
- Veri tek kaynaktan; kopya/eskime yok.

## Not
Widget teaser'dır (temsili oran, tek komisyon). Tam hesap (kategori, kargo, reklam,
iade, KDV matrahı) ana uygulamadadır — widget oraya yönlendirir.
