# factory/arsiv/ — Kaynak Arşivi

Her doğrulanmış oranın geldiği belgenin **o günkü kopyası** burada durur.
Amaç: kaynak URL yarın değişse/ölse bile kanıt elimizde kalsın.

## Adlandırma
```
<pazaryeri_key>-<YYYY-MM-DD>.<pdf|png|html>
```
Örnek: `trendyol-2026-07-24.pdf`, `hepsiburada-2026-07-24.png`

## Kural
- Bir oran "doğrulanmış" (verified) sayılabilmesi için kaynağının arşiv kopyası **burada olmalı**.
- Satıcı paneli arkasındaki (login-gerekli) kaynaklar için ekran görüntüsü yeterli.
- Dosya adı + tarih, `kaynak_envanteri.json` içindeki kayda bağlanır.

## Nasıl güncellenir
1. Kaynağın PDF/screenshot'ını bu klasöre koy (yukarıdaki adla).
2. `node factory/kaynak_envanteri.mjs` çalıştır → defter güncellenir, eksikler listelenir.
