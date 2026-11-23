// Candidature « Représenter UNPRO » (/carrieres/representants-construction).
// Insertion service role uniquement dans affiliate_applications (CRM existant), validation zod,
// honeypot + délai minimal, limite IP hachée, idempotence (clé client) et dédoublonnage par courriel.
// Aucun courriel/SMS envoyé, aucune donnée personnelle loggée.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "from"];
const DEDUPE_DAYS = 180;

const Body = z.object({
  idempotency_key: z.string().regex(/^[A-Za-z0-9-]{16,64}$/),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().trim().regex(/^[+()\d\s.-]{10,20}$/).optional().nullable(),
  region: z.string().trim().min(2).max(120),
  experience: z.enum(["construction", "sales", "both", "other"]),
  wants_team_lead: z.boolean(),
  terms_acknowledged: z.literal(true),
  follow_up_consent: z.literal(true),
  consent_text: z.string().trim().min(10).max(500),
  utm: z.record(z.string().max(120)).optional(),
  journey: z.object({ landing_path: z.string().max(200).optional(), referrer_host: z.string().max(120).optional(), cta: z.string().max(40).optional() }).optional(),
  locale: z.enum(["fr", "en"]).optional(),
  hp: z.string().max(200).optional(),
  started_at: z.number().int().optional(),
});

async function sha256(v: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid", fields: Object.keys(parsed.error.flatten().fieldErrors) }, 400);
  const b = parsed.data;
  if ((b.hp ?? "") !== "" || (b.started_at && Date.now() - b.started_at < 3000)) return json({ error: "rejected" }, 422);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const table = admin.from("affiliate_applications");

  // Rejeu (double clic / nouvel essai réseau) : renvoie la candidature déjà enregistrée.
  const { data: replay, error: rErr } = await admin.from("affiliate_applications").select("id").eq("idempotency_key", b.idempotency_key).maybeSingle();
  if (rErr) return json({ error: "unavailable" }, 503);
  if (replay) return json({ ok: true, id: replay.id, replay: true });

  // Dédoublonnage : même courriel déjà candidat récemment → aucune nouvelle ligne.
  const since = new Date(Date.now() - DEDUPE_DAYS * 86400_000).toISOString();
  const { data: dup, error: dErr } = await admin.from("affiliate_applications").select("id")
    .ilike("email", b.email).gte("created_at", since).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (dErr) return json({ error: "unavailable" }, 503);
  if (dup) return json({ ok: true, id: dup.id, duplicate: true });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = await sha256(`rep:${ip}`);
  const { count, error: cErr } = await admin.from("affiliate_applications").select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash).gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if (cErr) return json({ error: "unavailable" }, 503);
  if ((count ?? 0) >= 5) return json({ error: "rate_limited" }, 429);

  const utm: Record<string, string> = {};
  for (const k of UTM_KEYS) { const v = b.utm?.[k]; if (v && /^[\w.\-+ %]{1,120}$/.test(v)) utm[k] = v; }
  const journey: Record<string, string> = {};
  for (const [k, v] of Object.entries(b.journey ?? {})) if (typeof v === "string" && /^[\w./\-:]{1,200}$/.test(v)) journey[k] = v;

  const now = new Date().toISOString();
  const { data, error } = await table.insert({
    idempotency_key: b.idempotency_key,
    first_name: b.first_name, last_name: b.last_name || null, email: b.email, phone: b.phone || null,
    city: b.region, province: "QC", experience: b.experience,
    wants_team_lead: b.wants_team_lead, terms_acknowledged: true,
    consent_text: b.consent_text, consented_at: now,
    source: "carrieres_representants_construction", utm, journey, locale: b.locale ?? "fr",
    ip_hash: ipHash, is_synthetic: b.email.endsWith("@example.test"), status: "pending",
  }).select("id").single();
  if (error?.code === "23505") {
    const { data: again } = await admin.from("affiliate_applications").select("id").eq("idempotency_key", b.idempotency_key).maybeSingle();
    if (again) return json({ ok: true, id: again.id, replay: true });
  }
  if (error || !data) { console.error("representative insert failed", error?.code); return json({ error: "unavailable" }, 503); }
  return json({ ok: true, id: data.id });
});
