// e2e-create-test-contractor
// Guarded by E2E_ADMIN_SECRET. Creates a confirmed auth.users row so Playwright
// can sign in via password and exercise the checkout flow.
// verify_jwt=false (see config.toml).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { email, password, secret } = await req.json();
    if (!email || !password || !secret) {
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (secret !== Deno.env.get("E2E_ADMIN_SECRET")) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { e2e_test: true, role: "contractor" },
    });
    if (error) throw error;
    return new Response(JSON.stringify({ user_id: data.user?.id, email: data.user?.email }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
