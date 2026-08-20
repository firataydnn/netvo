// Supabase Edge Function — Pro aboneliği için Stripe Checkout oturumu açar.
// Deploy: supabase functions deploy create-checkout
// Env: STRIPE_SECRET_KEY, STRIPE_PRICE_ID (Pro aylık fiyat), SITE_URL
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const SITE = Deno.env.get("SITE_URL") ?? "https://netvo.co";

Deno.serve(async (req) => {
  try {
    // Kullanıcıyı doğrula (Authorization: Bearer <supabase access token>)
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response("unauthorized", { status: 401 });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: Deno.env.get("STRIPE_PRICE_ID")!, quantity: 1 }],
      client_reference_id: user.id,          // webhook bunu kullanıcıya bağlar
      customer_email: user.email ?? undefined,
      success_url: `${SITE}/uygula/?pro=ok`,
      cancel_url: `${SITE}/uygula/?pro=iptal`,
    });
    return Response.json({ url: session.url });
  } catch (e) {
    return new Response(`error: ${e.message}`, { status: 500 });
  }
});
