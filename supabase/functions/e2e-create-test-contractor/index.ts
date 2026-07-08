// e2e-create-test-contractor — TEST-ONLY, delete after run.
// Guard: email MUST match /^e2e\+[0-9a-z_-]+@unpro\.ca$/. No secret leaks that way.
// verify_jwt=false.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const EMAIL_RE = /^e2e\+[0-9a-z_-]+@unpro\.ca$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { email, password } = await req.json();
    if (!email || !password || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: "invalid_email_pattern" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
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
