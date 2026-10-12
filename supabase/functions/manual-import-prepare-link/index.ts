/**
 * manual-import-prepare-link — admin seulement.
 * Prépare (sans transmettre) un lien protégé /unpro/activate/gi_… pour un
 * dossier `needs_review`. Ne crée aucun prospect, compte, lead ou message,
 * ne modifie pas la ligne d'import. Jeton montré une seule fois, haché en base.
 * Actions : prepare (idempotent : lien actif → pas de nouveau jeton),
 *           regenerate (révoque l'actif puis recrée), revoke.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { generateGuestToken, sha256Hex, GUEST_TTL_DAYS } from "../_shared/guestInvite.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ ok: false, error: "unauthenticated" }, 401);
    const { data: u } = await admin.auth.getUser(jwt);
    const user = u?.user;
    if (!user) return json({ ok: false, error: "unauthenticated" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (isAdmin !== true) return json({ ok: false, error: "not_authorized" }, 403);

    const body = await req.json().catch(() => ({}));
    const rowId = String(body?.row_id ?? "");
    const action = String(body?.action ?? "prepare");
    if (!UUID.test(rowId) || !["prepare", "regenerate", "revoke"].includes(action)) return json({ ok: false, error: "invalid_input" }, 400);

    const { data: row } = await admin.from("acquisition_manual_import_rows")
      .select("id, status, prospect_id, normalized").eq("id", rowId).maybeSingle();
    if (!row) return json({ ok: false, error: "not_found" }, 404);
    if (row.status !== "needs_review" || row.prospect_id) return json({ ok: false, error: "row_not_eligible" }, 409);

    const { data: active } = await admin.from("manual_import_claim_links")
      .select("id, expires_at").eq("import_row_id", rowId).is("revoked_at", null).maybeSingle();
    const now = new Date();

    const revoke = async (reason: string) => {
      if (!active) return;
      await admin.from("manual_import_claim_links").update({ revoked_at: now.toISOString(), revoked_reason: reason }).eq("id", active.id);
    };

    if (action === "revoke") {
      await revoke("admin_revoked");
      await admin.from("admin_action_logs").insert({ admin_user_id: user.id, action: "manual_import_link_revoked", target_type: "acquisition_manual_import_row", target_id: rowId }).then(() => {}, () => {});
      return json({ ok: true, revoked: !!active });
    }

    if (action === "prepare" && active && new Date(active.expires_at) > now) {
      return json({ ok: true, already_prepared: true, expires_at: active.expires_at });
    }
    await revoke(active && new Date(active.expires_at) <= now ? "expired_replaced" : "admin_regenerated");

    const token = generateGuestToken();
    const expires = new Date(now.getTime() + GUEST_TTL_DAYS * 864e5).toISOString();
    const { error } = await admin.from("manual_import_claim_links").insert({
      import_row_id: rowId, token_hash: await sha256Hex(token), created_by: user.id, expires_at: expires,
    });
    if (error) {
      // Double clic concurrent : l'index unique garantit un seul lien actif.
      if (error.code === "23505") return json({ ok: true, already_prepared: true });
      return json({ ok: false, error: "persist_failed" }, 500);
    }
    await admin.from("admin_action_logs").insert({ admin_user_id: user.id, action: "manual_import_link_prepared", target_type: "acquisition_manual_import_row", target_id: rowId }).then(() => {}, () => {});
    return json({ ok: true, url: `https://unpro.ca/unpro/activate/${token}`, expires_at: expires, shown_once: true, sent: false });
  } catch (_e) {
    return json({ ok: false, error: "internal_error" }, 500);
  }
});
