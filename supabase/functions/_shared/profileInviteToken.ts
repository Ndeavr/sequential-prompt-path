// UNPRO — Jetons de lien questionnaire entrepreneur (sans compte).
// Le jeton clair n'est JAMAIS stocké : seule son empreinte SHA-256 est persistée.

export const inviteCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...inviteCors, "Content-Type": "application/json" },
  });
}

/** 32 octets aléatoires, encodés base64url (sans padding). */
export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface InviteRow {
  id: string;
  contractor_id: string;
  status: string;
  expires_at: string | null;
  opened_count: number;
  submitted_at: string | null;
}

/** Valide un jeton clair. Retourne l'invitation active ou une erreur explicite. */
export async function resolveInvite(
  admin: { from: (t: string) => any },
  token: unknown,
): Promise<{ invite: InviteRow } | { error: string; status: number }> {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) {
    return { error: "Lien invalide.", status: 404 };
  }
  const tokenHash = await hashToken(token);
  const { data, error } = await admin
    .from("contractor_profile_invites")
    .select("id, contractor_id, status, expires_at, opened_count, submitted_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return { error: "Lien invalide.", status: 404 };
  if (data.status !== "active") return { error: "Ce lien a été désactivé par UNPRO.", status: 410 };
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { error: "Ce lien est expiré.", status: 410 };
  }
  return { invite: data as InviteRow };
}
