# NETVO — Backend / Pro (Faz 2 scaffold)

Gelir kilidini açan katman: **hesap + Pro aboneliği + e-posta ücret uyarısı.**
Statik site (ücretsiz katman) sonuna kadar backend'siz gider; bu, onun üstüne biner.

> Scaffold: kod ve şema hazır; **çalıştırmak için kendi hesapların/anahtarların gerekir**
> (Supabase, Stripe/iyzico, Resend). Aşağıdaki adımlar bir öğleden sonralık iştir.

## Parçalar
| Dosya | Ne |
|---|---|
| `schema.sql` | Postgres şeması: profiles, watches, subscriptions, email_leads, rate_changes + RLS |
| `functions/create-checkout.ts` | Stripe Checkout oturumu açar (Pro'ya geç) — Supabase Edge Function |
| `functions/stripe-webhook.ts` | Abonelik olaylarını `profiles.tier`'a yazar |
| `functions/alert-check.mjs` | Günlük: oran değişince takip eden Pro kullanıcıya e-posta (retention) |

## Kurulum
1. **Supabase** projesi aç → SQL Editor'da `schema.sql`'i çalıştır. Auth'u (e-posta/OAuth) etkinleştir.
2. **Stripe** (veya iyzico) → Pro aylık ürün/fiyat oluştur → `STRIPE_PRICE_ID`. Webhook endpoint'i
   ekle (`.../functions/v1/stripe-webhook`), olaylar: `checkout.session.completed`,
   `customer.subscription.updated/deleted`.
3. **Resend** → domain doğrula → `RESEND_API_KEY`.
4. Edge Function'ları deploy et:
   ```
   supabase functions deploy create-checkout
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
5. `alert-check.mjs`'i günlük cron'a bağla (GitHub Actions — haber.yml'yi örnek al).

## Ortam değişkenleri (secret)
```
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID
RESEND_API_KEY, SITE_URL=https://netvo.com
```
> Secret'lar **repoda tutulmaz** — Supabase/GitHub secret yöneticisinde. (KVKK/güvenlik.)

## Uygulamayı bağlama (Commera_Site.html)
- Supabase JS client'ı ekle; giriş/kayıt UI'ı aç.
- Takip (watches) artık localStorage yerine (giriş yaptıysa) Supabase'e yazılsın; free tier
  3 takiple sınırlı, aşınca "Pro'ya geç" (create-checkout'a POST).
- E-posta yakalama → `email_leads` tablosuna (NETVO_EMAIL_ENDPOINT'i buna ayarla).
- `?pro=ok` dönüşünde teşekkür + tier'ı yenile.

## KVKK/GDPR
Backend gelince: aydınlatma metni + açık rıza + saklama süresi + silme hakkı. IP/log
kişisel veridir — güvenli sakla, erişim kaydı tut. (bkz. NETVO_Hukuki_Metinler.md)

## Neden bu sıra
Ücretsiz katman trafiği + güveni kurar (backend yok). Pro, retention + ilk nakit.
B2B API (Faz 3) bunun üstüne gelir — asıl para. Önce bu ayakları sağlamlaştır.
