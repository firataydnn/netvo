// Supabase Edge Function — Stripe webhook. Abonelik durumunu profiles.tier'a yazar.
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Stripe Dashboard → Webhooks → endpoint: .../functions/v1/stripe-webhook
// Dinlenecek olaylar: checkout.session.completed, customer.subscription.updated/deleted
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function setTier(userId: string, status: string, periodEnd?: number) {
  const active = status === "active" || status === "trialing";
  await admin.from("profiles").update({ tier: active ? "pro" : "free" }).eq("id", userId);
  await admin.from("subscriptions").upsert({
    user_id: userId, provider: "stripe", status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();
  let evt: Stripe.Event;
  try {
    evt = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (e) {
    return new Response(`signature error: ${e.message}`, { status: 400 });
  }

  try {
    if (evt.type === "checkout.session.completed") {
      const s = evt.data.object as Stripe.Checkout.Session;
      const sub = await stripe.subscriptions.retrieve(s.subscription as string);
      if (s.client_reference_id) await setTier(s.client_reference_id, sub.status, sub.current_period_end);
    } else if (evt.type === "customer.subscription.updated" || evt.type === "customer.subscription.deleted") {
      const sub = evt.data.object as Stripe.Subscription;
      // customer → user eşlemesi için client_reference_id'yi metadata'da da tutmak iyi olur.
      const userId = (sub.metadata?.user_id as string) || "";
      if (userId) await setTier(userId, evt.type.endsWith("deleted") ? "canceled" : sub.status, sub.current_period_end);
    }
    return new Response("ok");
  } catch (e) {
    return new Response(`handler error: ${e.message}`, { status: 500 });
  }
});
