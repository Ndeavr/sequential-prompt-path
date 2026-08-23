// UNPRO — Administration des liens questionnaire entrepreneur (admin uniquement).
// Actions : list | create | rotate | revoke
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { inviteCors, jsonResponse, generateToken, hashToken } from "../_shared/profileInviteToken.ts";

const PUBLIC_BASE = "https://unpro.ca";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: inviteCors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await authClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return jsonResponse({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "list";
    const contractorId = typeof body?.contractor_id === "string" ? body.contractor_id : null;
    if (!contractorId) return jsonResponse({ error: "contractor_id requis" }, 400);

    const { data: contractor } = await admin
      .from("contractors")
      .select("id, business_name")
      .eq("id", contractorId)
      .maybeSingle();
    if (!contractor) return jsonResponse({ error: "Fiche entrepreneur introuvable" }, 404);

    if (action === "list") {
      const { data } = await admin
        .from("contractor_profile_invites")
        .select("id, status, expires_at, opened_count, last_opened_at, submitted_at, created_at")
        .eq("contractor_id", contractorId)
        .order("created_at", { ascending: false });
      return jsonResponse({ ok: true, invites: data ?? [] });
    }

    if (action === "revoke") {
      const inviteId = typeof body?.invite_id === "string" ? body.invite_id : null;
      const q = admin
        .from("contractor_profile_invites")
        .update({ status: "revoked", updated_at: new Date().toISOString() })
        .eq("contractor_id", contractorId);
      if (inviteId) q.eq("id", inviteId);
      const { error } = await q;
      if (error) return jsonResponse({ error: error.message }, 400);
      await admin.from("admin_action_logs").insert({
        actor_user_id: userId,
        contractor_id: contractorId,
        action_type: "contractor_profile_invite_revoked",
        notes: "Lien questionnaire révoqué",
      });
      return jsonResponse({ ok: true, revoked: true });
    }

    if (action === "create" || action === "rotate") {
      if (action === "rotate") {
        await admin
          .from("contractor_profile_invites")
          .update({ status: "revoked", updated_at: new Date().toISOString() })
          .eq("contractor_id", contractorId)
          .eq("status", "active");
      } else {
        // Réutilise un lien actif existant plutôt que d'en multiplier.
        const { data: existing } = await admin
          .from("contractor_profile_invites")
          .select("id")
          .eq("contractor_id", contractorId)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (existing) {
          return jsonResponse({
            ok: true,
            reused: true,
            message:
              "Un lien actif existe déjà. Utilisez « Régénérer » pour en produire un nouveau (l'ancien sera désactivé).",
          });
        }
      }

      const token = generateToken();
      const token_hash = await hashToken(token);
      const { data: created, error } = await admin
        .from("contractor_profile_invites")
        .insert({ contractor_id: contractorId, token_hash, created_by: userId })
        .select("id")
        .single();
      if (error) return jsonResponse({ error: error.message }, 400);

      await admin.from("admin_action_logs").insert({
        actor_user_id: userId,
        contractor_id: contractorId,
        action_type: "contractor_profile_invite_created",
        notes: `Lien questionnaire généré pour ${contractor.business_name}`,
      });

      return jsonResponse({
        ok: true,
        invite_id: created.id,
        url: `${PUBLIC_BASE}/profil-entrepreneur/${token}`,
        token_shown_once: true,
      });
    }

    return jsonResponse({ error: "Action inconnue" }, 400);
  } catch (e) {
    return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
