// UNPRO — Private access (slug + 4-digit PIN)
// Actions: check | setup | unlock
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SLUG_PARTNERS: Record<string, { email: string; first_name: string; last_name: string }> = {
  cyndia: { email: "cyndia@unpro.ca", first_name: "Cyndia", last_name: "" },
};

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const action = String(body.action || "");
    const slug = String(body.slug || "").toLowerCase().trim();
    if (!slug || !SLUG_PARTNERS[slug]) {
      return new Response(JSON.stringify({ error: "unknown_slug" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Rate limit: 5 failed attempts / 15 min
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count: failCount } = await admin
      .from("private_access_attempts")
      .select("*", { count: "exact", head: true })
      .eq("slug", slug).eq("ip", ip).eq("success", false).gte("created_at", since);
    if ((failCount ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: row } = await admin.from("private_access_slugs").select("*").eq("slug", slug).maybeSingle();

    if (action === "check") {
      return new Response(JSON.stringify({ initialized: !!row?.code_hash }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "setup") {
      const code = String(body.code || "");
      if (!/^\d{4}$/.test(code)) return new Response(JSON.stringify({ error: "bad_code" }), { status: 400, headers: corsHeaders });
      if (row?.code_hash) return new Response(JSON.stringify({ error: "already_initialized" }), { status: 409, headers: corsHeaders });

      const meta = SLUG_PARTNERS[slug];
      // ensure auth user
      let userId: string | null = null;
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === meta.email.toLowerCase());
      if (existing) userId = existing.id;
      else {
        const { data: created, error: ce } = await admin.auth.admin.createUser({
          email: meta.email,
          email_confirm: true,
          user_metadata: { first_name: meta.first_name, last_name: meta.last_name, source: "private_slug" },
        });
        if (ce) throw ce;
        userId = created.user!.id;
      }

      // ensure partner row
      const { data: p } = await admin.from("partners").select("id").eq("user_id", userId!).maybeSingle();
      if (!p) {
        await admin.from("partners").insert({
          user_id: userId,
          email: meta.email,
          first_name: meta.first_name,
          last_name: meta.last_name,
          partner_type: "recruiter",
          partner_status: "approved",
          partner_application_status: "approved",
          approved_at: new Date().toISOString(),
        });
      }

      const code_hash = await sha256(code + ":" + slug);
      await admin.from("private_access_slugs").upsert({
        slug, code_hash, partner_user_id: userId, partner_email: meta.email,
      });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "unlock") {
      const code = String(body.code || "");
      if (!/^\d{4}$/.test(code) || !row?.code_hash) {
        await admin.from("private_access_attempts").insert({ slug, ip, success: false });
        return new Response(JSON.stringify({ error: "invalid" }), { status: 401, headers: corsHeaders });
      }
      const ok = (await sha256(code + ":" + slug)) === row.code_hash;
      await admin.from("private_access_attempts").insert({ slug, ip, success: ok });
      if (!ok) return new Response(JSON.stringify({ error: "invalid" }), { status: 401, headers: corsHeaders });

      // Use the caller's origin so the magic link returns to the same app/domain
      // (unpro.ca, lovable.app preview, or sandbox). Fallback only if missing.
      const callerOrigin = (body.origin && /^https?:\/\//.test(String(body.origin)))
        ? String(body.origin).replace(/\/$/, "")
        : (req.headers.get("origin") || req.headers.get("referer") || "https://unpro.ca");
      const redirectTo = `${callerOrigin}/auth/callback?next=${encodeURIComponent("/partenaire/dashboard")}`;
      const { data: link, error: le } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: row.partner_email,
        options: { redirectTo },
      });
      if (le) throw le;

      await admin.from("private_access_slugs").update({
        last_unlock_at: new Date().toISOString(),
        unlock_count: (row.unlock_count ?? 0) + 1,
      }).eq("slug", slug);

      return new Response(JSON.stringify({ magic_link: link.properties?.action_link }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "bad_action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
