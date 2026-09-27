// inviteAudit — Journal canonique du parcours « lien d'invitation entrepreneur ».
//
// Chaque étape d'un lien (ouverture, validation, expiration, révocation,
// création de compte, rattachement, erreur) est écrite dans
// public.contractor_invite_events. Le jeton n'est JAMAIS journalisé en clair :
// seule son empreinte SHA-256 et un préfixe court sont conservés.
//
// Règle absolue : une écriture de journal ne doit jamais casser le parcours.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type InviteEvent =
  | "link_opened"
  | "token_validated"
  | "token_expired"
  | "token_revoked"
  | "token_invalid"
  | "token_ambiguous"
  | "account_linked"
  | "contractor_created"
  | "contractor_adopted"
  | "already_claimed_by_other"
  | "claim_error";

export async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function logInviteEvent(
  admin: SupabaseClient,
  event_type: InviteEvent,
  args: {
    token?: string | null;
    token_hash?: string | null;
    prospect_id?: string | null;
    contractor_id?: string | null;
    user_id?: string | null;
    outcome?: "ok" | "blocked" | "error";
    reason?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    const hash = args.token_hash ?? (args.token ? await sha256(args.token) : null);
    await admin.from("contractor_invite_events").insert({
      event_type,
      token_hash: hash,
      token_prefix: hash ? hash.slice(0, 12) : null,
      prospect_id: args.prospect_id ?? null,
      contractor_id: args.contractor_id ?? null,
      user_id: args.user_id ?? null,
      outcome: args.outcome ?? "ok",
      reason: args.reason ?? null,
      metadata: args.metadata ?? {},
    });
  } catch (e) {
    console.error("[inviteAudit] write_failed", event_type, String(e));
  }
}
