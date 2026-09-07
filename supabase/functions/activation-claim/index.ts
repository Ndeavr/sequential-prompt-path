// activation-claim — Rattachement idempotent d'une invitation à un compte réel.
//
// Entrée : { token } + en-tête Authorization (session de l'utilisateur).
// Sortie : { ok, contractor_id, already_claimed, business_name }
//
// Règles :
//  - le jeton n'est jamais journalisé en clair (empreinte SHA-256 seulement) ;
//  - un prospect ne peut être réclamé qu'une seule fois (contrainte unique) ;
//  - un utilisateur qui rouvre son propre lien retrouve son profil, sans doublon ;
//  - l'activation est enregistrée immédiatement, l'enrichissement vient après.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function slugify(name: string): string {
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 60);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const logEvent = async (
    event_type: string,
    extra: Record<string, unknown> = {},
    ids: { prospect_id?: string | null; contractor_id?: string | null; user_id?: string | null; token_hash?: string | null } = {},
  ) => {
    try {
      await admin.from("contractor_funnel_events").insert({
        event_type,
        step: "activation_claim",
        event_source: "edge",
        source: "edge",
        channel: "web",
        current_path: "/unpro/activate",
        prospect_id: ids.prospect_id ?? null,
        contractor_id: ids.contractor_id ?? null,
        user_id: ids.user_id ?? null,
        // Jamais le jeton en clair.
        token: ids.token_hash ? ids.token_hash.slice(0, 16) : null,
        dedupe_key: `${event_type}:${ids.prospect_id ?? ids.user_id ?? "anon"}`,
        metadata: { ...extra, tz: "America/Toronto" },
      });
    } catch (_e) { /* la mesure ne casse jamais l'activation */ }
  };

  let tokenHash: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    const token = String((body as { token?: string })?.token ?? "").trim();
    if (!token || token.length > 128) return json({ ok: false, reason: "invalid_token" }, 400);
    tokenHash = await sha256(token);

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ ok: false, reason: "not_authenticated" }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (userErr || !user) {
      await logEvent("activation_error", { step_failed: "auth", code: "not_authenticated" }, { token_hash: tokenHash });
      return json({ ok: false, reason: "not_authenticated" }, 401);
    }

    // ------------------------------------------------------------ jeton → prospect
    let { data: tk } = await admin
      .from("verified_prospect_tokens")
      .select("token, prospect_id, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (!tk && token.length >= 10) {
      const { data: candidates } = await admin
        .from("verified_prospect_tokens")
        .select("token, prospect_id, expires_at")
        .like("token", `${token}%`)
        .limit(2);
      if (candidates && candidates.length === 1) tk = candidates[0];
    }
    if (!tk) {
      await logEvent("activation_error", { step_failed: "token", code: "token_not_found" }, { user_id: user.id, token_hash: tokenHash });
      return json({ ok: false, reason: "token_not_found" }, 404);
    }
    if (tk.expires_at && new Date(tk.expires_at).getTime() <= Date.now()) {
      await logEvent("activation_error", { step_failed: "token", code: "token_expired" }, { user_id: user.id, token_hash: tokenHash });
      return json({ ok: false, reason: "token_expired" }, 410);
    }

    const { data: prospect } = await admin
      .from("verified_contractor_prospects")
      .select("id, business_name, legal_name, category, city, region, phone_e164, email, website_url, rbq_number, google_business_url, service_areas")
      .eq("id", tk.prospect_id)
      .maybeSingle();
    if (!prospect) {
      await logEvent("activation_error", { step_failed: "prospect", code: "prospect_not_found" }, { user_id: user.id, token_hash: tokenHash });
      return json({ ok: false, reason: "prospect_not_found" }, 404);
    }

    // ------------------------------------------------- activation déjà existante
    const { data: existingClaim } = await admin
      .from("contractor_prospect_claims")
      .select("id, user_id, contractor_id")
      .eq("prospect_id", prospect.id)
      .maybeSingle();

    if (existingClaim && existingClaim.user_id !== user.id) {
      await logEvent("activation_error", { step_failed: "claim", code: "already_claimed_by_other" }, {
        prospect_id: prospect.id, user_id: user.id, token_hash: tokenHash,
      });
      return json({ ok: false, reason: "already_claimed" }, 409);
    }

    // --------------------------------------------------------- rôle entrepreneur
    try {
      await admin.from("user_roles").upsert(
        { user_id: user.id, role: "contractor" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    } catch (_e) { /* rôle déjà présent */ }

    // ------------------------------------------------------- profil entrepreneur
    let contractorId = existingClaim?.contractor_id ?? null;
    let created = false;

    if (!contractorId) {
      const { data: mine } = await admin
        .from("contractors")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      contractorId = mine?.id ?? null;
    }

    if (!contractorId) {
      const businessName = (prospect.business_name ?? prospect.legal_name ?? "").trim();
      if (!businessName) {
        await logEvent("activation_error", { step_failed: "contractor", code: "missing_business_name" }, {
          prospect_id: prospect.id, user_id: user.id, token_hash: tokenHash,
        });
        return json({ ok: false, reason: "missing_business_name" }, 422);
      }
      const slugBase = slugify(businessName) || `pro-${user.id.slice(0, 8)}`;
      const { data: inserted, error: insErr } = await admin
        .from("contractors")
        .insert({
          user_id: user.id,
          business_name: businessName,
          legal_name: prospect.legal_name ?? null,
          specialty: prospect.category ?? null,
          city: prospect.city ?? null,
          province: "QC",
          phone: prospect.phone_e164 ?? null,
          email: prospect.email ?? user.email ?? null,
          website: prospect.website_url ?? null,
          rbq_number: prospect.rbq_number ?? null,
          google_business_url: prospect.google_business_url ?? null,
          service_areas: prospect.service_areas ?? null,
          slug: `${slugBase}-${user.id.slice(0, 6)}`,
          onboarding_status: "in_progress",
          activation_status: "activated",
        })
        .select("id")
        .maybeSingle();
      if (insErr || !inserted) {
        await logEvent("activation_error", { step_failed: "contractor", code: "contractor_insert_failed", details: insErr?.message ?? null }, {
          prospect_id: prospect.id, user_id: user.id, token_hash: tokenHash,
        });
        return json({ ok: false, reason: "contractor_insert_failed" }, 500);
      }
      contractorId = inserted.id;
      created = true;
    } else {
      await admin.from("contractors").update({ activation_status: "activated" }).eq("id", contractorId);
    }

    // ------------------------------------------------------------- registre claim
    const { error: claimErr } = await admin
      .from("contractor_prospect_claims")
      .upsert(
        {
          prospect_id: prospect.id,
          contractor_id: contractorId,
          user_id: user.id,
          token_hash: tokenHash,
          channel: "web",
          status: "activated",
        },
        { onConflict: "prospect_id" },
      );
    if (claimErr) {
      await logEvent("activation_error", { step_failed: "claim", code: "claim_write_failed", details: claimErr.message }, {
        prospect_id: prospect.id, contractor_id: contractorId, user_id: user.id, token_hash: tokenHash,
      });
      return json({ ok: false, reason: "claim_write_failed" }, 500);
    }

    try {
      await admin
        .from("verified_contractor_prospects")
        .update({ outreach_status: "activated", last_action_at: new Date().toISOString() })
        .eq("id", prospect.id);
    } catch (_e) { /* non bloquant */ }

    const ids = { prospect_id: prospect.id, contractor_id: contractorId, user_id: user.id, token_hash: tokenHash };
    if (created) await logEvent("contractor_profile_created", { source: "activation_link" }, ids);
    await logEvent("profile_claimed", { already: Boolean(existingClaim) }, ids);
    await logEvent("profile_activated", { already: Boolean(existingClaim) }, ids);

    return json({
      ok: true,
      contractor_id: contractorId,
      already_claimed: Boolean(existingClaim),
      business_name: prospect.business_name ?? prospect.legal_name ?? null,
    });
  } catch (e) {
    console.error("[activation-claim] fatal", String(e));
    return json({ ok: false, reason: "internal_error" }, 500);
  }
});
