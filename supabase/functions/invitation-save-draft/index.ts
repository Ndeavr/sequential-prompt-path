// Saves progressive draft edits from /invitation/:token/edit.
// Public: no auth (token is the credential).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// Whitelist patch fields → prospects columns
const FIELD_MAP: Record<string, string> = {
  business_name: "business_name",
  contact_first_name: "prenom",
  contact_last_name: "nom",
  phone: "telephone",
  email: "email",
  website: "url_google",
  category: "service",
  city: "main_city",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const token: string | undefined = body?.token;
    const patch: Record<string, unknown> = body?.patch ?? {};
    if (!token) return json({ error: "missing_token" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await supabase
      .from("prospects").select("id, funnel_status").eq("landing_token", token).maybeSingle();
    if (!existing) return json({ error: "not_found" }, 404);

    const dbPatch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      const col = FIELD_MAP[k];
      if (!col) continue;
      if (typeof v === "string" && v.length > 500) continue;
      dbPatch[col] = v;
    }
    // Upgrade status to profile_started if still upstream
    const upgradeStates = ["scraped","needs_validation","ready_to_contact","sms_queued","sms_sent","sms_delivered","sms_clicked","landing_viewed"];
    if (upgradeStates.includes(existing.funnel_status ?? "scraped")) {
      dbPatch.funnel_status = "profile_started";
    }

    if (Object.keys(dbPatch).length === 0) return json({ ok: true, noop: true });

    const { error: updErr } = await supabase.from("prospects").update(dbPatch).eq("id", existing.id);
    if (updErr) return json({ error: "update_failed", detail: updErr.message }, 500);

    return json({ ok: true });
  } catch (e: any) {
    console.error("[invitation-save-draft]", e?.message || e);
    return json({ error: "internal_error" }, 500);
  }
});
