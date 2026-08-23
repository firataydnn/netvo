# Netvo Haber Sistemi — Telif Güvenliği + Günlük Bülten

## 1) Telif (copyright) neden güvenli?

Netvo bir **haber aggregator + özgün editör** modeli kullanır. Telif riskini
sıfıra yakın tutan kurallar:

1. **Kaynak metni asla kopyalamayız.** LLM her haberi *kendi sözleriyle*
   sıfırdan yazar (3-4 cümle). Kaynağın cümleleri/paragrafları alınmaz.
2. **Başlık yeniden yazılır.** Kaynağın başlığı birebir kullanılmaz.
3. **Sadece olgular aktarılır.** Kim, ne, nerede, ne zaman, rakamlar — olgular
   telife tabi değildir; telif *ifade biçimini* korur, biz kendi ifademizi
   üretiriz.
4. **Kaynak görseli KULLANILMAZ.** Her habere sitenin kendi ürettiği,
   telifsiz **marka kapak görseli** (SVG, kategori renginden deterministik)
   eklenir. Dışarıdan foto/görsel çekilmez → görsel telifi de yok.
5. **Her haberde kaynak bağlantısı + atıf** verilir (haber sonunda ve kartta).

Bu model, RSS'le beslenen haber/blog sitelerinin standart, hukuken güvenli
çalışma biçimidir (kendi blurb'ünü yazan bir haber özeti servisi gibi).

Kaynaklar: yayıncılık için RSS besleme sunan e-ticaret ticari basını —
RetailDive, TechCrunch (e-commerce), Digital Commerce 360, Modern Retail,
Tamebay/ChannelX. (Kurallar `haber_uret.mjs` içindeki editör prompt'una
"TELİF KURALLARI" olarak gömülüdür.)

> İleride gerçek fotoğraf istenirse: **lisans-güvenli** kaynaklar kullanılır
> (Unsplash/Pexels API — ticari kullanım serbest, atıf ile). Kazınmış/telifli
> foto asla kullanılmaz.

## 2) Günlük e-posta bülteni

Her gün motor haberleri ürettikten sonra `icerik/mail_gonder.mjs` çalışır ve
**günün en yeni 5 haberini** tek bir şık HTML e-postayla gönderir.

### Gönderim için gereken GitHub secret'ları
`Settings → Secrets and variables → Actions → New repository secret`

| Secret | Zorunlu | Açıklama |
|---|---|---|
| `RESEND_API_KEY` | ✅ | resend.com ücretsiz hesap → API key. Yoksa gönderim olmaz (site zararsız çalışmaya devam eder). |
| `MAIL_TO` | ✅ | Alıcı(lar), virgülle: `firataydnn@gmail.com` |
| `MAIL_FROM` | ⭐ önerilir | Doğrulanmış gönderen: `Netvo <haber@netvo.co>`. Yoksa Resend'in test göndereni kullanılır ve **yalnız hesap sahibine** ulaşır. |
| `SUPABASE_URL` | ⚪ opsiyonel | Abone listesini (email_leads) çekmek için |
| `SUPABASE_SERVICE_KEY` | ⚪ opsiyonel | Aynı amaç (service_role anahtarı) |

**Sadece Fırat'a gitmesi için:** `RESEND_API_KEY` + `MAIL_TO=firataydnn@gmail.com`
yeterli. Test göndereni (`onboarding@resend.dev`) hesap sahibine sorunsuz ulaşır.

**Tüm abonelere gitmesi için:** Resend'de `netvo.co` alan adını doğrula,
`MAIL_FROM`'u kendi adresine ayarla ve `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`
ekle.

### Elle test
```
RESEND_API_KEY=... MAIL_TO=firataydnn@gmail.com node icerik/mail_gonder.mjs
# veya kuru tur (göndermez, HTML önizleme yazar):
node icerik/mail_gonder.mjs --dry
```

## 3) Abonelik (site formu → Supabase)

Sitedeki e-posta formu artık adresi hem cihaza hem **Supabase `email_leads`**
tablosuna yazar. Gizlilik için tabloya "sadece ekleme" politikası koy
(Supabase → SQL Editor):

```sql
alter table email_leads enable row level security;
drop policy if exists "anon insert leads" on email_leads;
create policy "anon insert leads" on email_leads
  for insert to anon with check (true);
-- SELECT politikası yok → kimse listeyi okuyamaz; bülten scripti service_role ile okur.
```
