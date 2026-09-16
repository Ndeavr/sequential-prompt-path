// Canonical Stripe environment resolution (live by default, test on demand).
// Live behaviour is unchanged: without an explicit test request, every call
// keeps using STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET.
//
// Test mode exists ONLY to verify checkout + webhook end-to-end with Stripe
// test cards. It never charges a real card and never publishes anything live.

export type StripeEnv = "live" | "test";

export function resolveStripeEnv(explicit?: unknown): StripeEnv {
  if (explicit === true || explicit === "test" || explicit === "true") return "test";
  return "live";
}

/** Returns the secret key for the env, or null when it is not configured. */
export function stripeKeyFor(env: StripeEnv): string | null {
  const key = env === "test"
    ? Deno.env.get("STRIPE_TEST_SECRET_KEY")
    : Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return null;
  // Fail closed on a mismatched key instead of silently charging live cards.
  if (env === "test" && !key.startsWith("sk_test_")) return null;
  return key;
}

export function stripeWebhookSecretFor(env: StripeEnv): string | null {
  return (env === "test"
    ? Deno.env.get("STRIPE_TEST_WEBHOOK_SECRET")
    : Deno.env.get("STRIPE_WEBHOOK_SECRET")) ?? null;
}
