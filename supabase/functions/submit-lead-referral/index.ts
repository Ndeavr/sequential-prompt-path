// Recycler un lead : un entrepreneur connecté transmet à UNPRO une demande hors cible.
// Entreprise émettrice dérivée du compte (contractors.user_id), jamais du client.
// Insertion service role seulement; statut/crédit toujours « reçue / à évaluer ».
// Aucun courriel/SMS, aucun partage automatique, aucune donnée personnelle loggée.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

export const ATTESTATION_VERSION = "lead-referral-v1-2026-11";
export const ATTESTATION_TEXT =
  "J’atteste que ce client m’a autorisé à transmettre à UNPRO ses coordonnées et les détails nécessaires pour l’orienter vers un professionnel adapté.";

const s = (min: number, max: number) => z.string().trim().min(min).max(max);
const opt = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);

const Body = z.object({
  idempotency_key: z.string().regex(/^[A-Za-z0-9-]{16,64}$/),
  client_name: s(2, 120),
  client_phone: opt(30).refine((v) => !v || /^\+?[\d\s().-]{10,20}$/.test(v), "phone"),
  client_email: opt(255).refine((v) => !v || z.string().email().safeParse(v).success, "email"),
  city_or_postal: s(2, 120),
  address: opt(200),
  service_requested: s(2, 160),
  project_description: s(10, 2000),
  timeline: opt(120),
  transfer_reason: z.enum(["out_of_territory", "out_of_specialty", "no_availability", "other"]),
  transfer_reason_other: opt(300),
  attestation: z.literal(true),
  declared_agreement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  declared_agreement_mode: z.enum(["verbal", "phone", "written", "email", "other"]).optional().nullable(),
  locale: z.enum(["fr", "en"]).optional(),
}).refine((b) => b.client_phone || b.client_email, { path: ["contact"], message: "contact" })
  .refine((b) => b.transfer_reason !== "other" || !!b.transfer_reason_other, { path: ["transfer_reason_other"], message: "other" });

async function sha256(v: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "authentication_required" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: auth, error: aErr } = await admin.auth.getUser(token);
  if (aErr || !auth?.user) return json({ error: "authentication_required" }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid", fields: Object.keys(parsed.error.flatten().fieldErrors) }, 400);
  const b = parsed.data;

  const { data: contractor, error: cErr } = await admin.from("contractors").select("id")
    .eq("user_id", auth.user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (cErr) return json({ error: "unavailable" }, 503);
  if (!contractor) return json({ error: "no_contractor_profile" }, 403);

  const fields = "id, reference, status, created_at";
  const { data: replay, error: rErr } = await admin.from("contractor_lead_referrals").select(`${fields}, contractor_id`)
    .eq("idempotency_key", b.idempotency_key).maybeSingle();
  if (rErr) return json({ error: "unavailable" }, 503);
  if (replay) {
    if (replay.contractor_id !== contractor.id) return json({ error: "invalid" }, 400);
    return json({ ok: true, reference: replay.reference, replay: true });
  }

  const contact = (b.client_phone ? b.client_phone.replace(/\D/g, "").slice(-10) : "") || (b.client_email ?? "").toLowerCase();
  const dedupe = await sha256(`${contact}|${b.service_requested.toLowerCase().replace(/\s+/g, " ")}`);
  // Anti-doublon limité à SA propre entreprise : jamais de révélation des dossiers d'autrui.
  const { data: dup, error: dErr } = await admin.from("contractor_lead_referrals").select("reference")
    .eq("contractor_id", contractor.id).eq("dedupe_hash", dedupe).maybeSingle();
  if (dErr) return json({ error: "unavailable" }, 503);
  if (dup) return json({ ok: true, reference: dup.reference, duplicate: true });

  const row = {
    contractor_id: contractor.id, submitted_by: auth.user.id, idempotency_key: b.idempotency_key, dedupe_hash: dedupe,
    client_name: b.client_name, client_phone: b.client_phone, client_email: b.client_email?.toLowerCase() ?? null,
    city_or_postal: b.city_or_postal, address: b.address, service_requested: b.service_requested,
    project_description: b.project_description, timeline: b.timeline, transfer_reason: b.transfer_reason,
    transfer_reason_other: b.transfer_reason === "other" ? b.transfer_reason_other : null,
    attestation_text: ATTESTATION_TEXT, attestation_version: ATTESTATION_VERSION,
    declared_agreement_date: b.declared_agreement_date ?? null, declared_agreement_mode: b.declared_agreement_mode ?? null,
    locale: b.locale ?? "fr", is_synthetic: (b.client_email ?? "").endsWith("@example.test"),
  };
  const { data, error } = await admin.from("contractor_lead_referrals").insert(row).select("reference").single();
  if (error?.code === "23505") {
    const { data: again } = await admin.from("contractor_lead_referrals").select("reference")
      .eq("contractor_id", contractor.id).or(`idempotency_key.eq.${b.idempotency_key},dedupe_hash.eq.${dedupe}`).limit(1).maybeSingle();
    if (again) return json({ ok: true, reference: again.reference, replay: true });
  }
  if (error || !data) { console.error("lead_referral insert failed", error?.code); return json({ error: "unavailable" }, 503); }
  return json({ ok: true, reference: data.reference });
});
