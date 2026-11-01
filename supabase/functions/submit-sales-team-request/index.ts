// Demande d'offre équipe de vente (/directeur-des-ventes).
// Insertion service role uniquement, idempotente (clé client), honeypot, limite IP hachée.
// Aucun courriel/SMS externe, aucune donnée personnelle loggée.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const s = (min: number, max: number) => z.string().trim().min(min).max(max);
const opt = (max: number) => z.string().trim().max(max).optional().nullable();
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"];

const Body = z.object({
  idempotency_key: z.string().regex(/^[A-Za-z0-9-]{16,64}$/),
  company: s(2, 160), website: opt(200),
  role: z.enum(["seller", "sales_director", "owner"]),
  sellers_count: z.number().int().min(1).max(500),
  specialties: s(2, 500), priority_mandates: opt(1000), refused_mandates: opt(1000),
  territories: s(2, 500), travel_radius_km: z.number().int().min(1).max(1000).optional().nullable(),
  objectives: z.array(z.enum(["more_sales", "profitability", "bigger_ticket", "less_travel", "fill_calendars"])).max(5),
  annual_revenue_goal_cad: z.number().min(0).max(100_000_000).optional().nullable(),
  weekly_capacity: z.number().int().min(1).max(2000).optional().nullable(),
  average_ticket_cad: z.number().min(1).max(10_000_000).optional().nullable(),
  close_rate_pct: z.number().gt(0).max(100).optional().nullable(),
  first_name: s(1, 80), last_name: s(1, 80),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: opt(30),
  follow_up_consent: z.literal(true),
  consent_text: s(10, 500),
  marketing_opt_in: z.boolean().optional(),
  utm: z.record(z.string().max(120)).optional(),
  locale: z.enum(["fr", "en"]).optional(),
  hp: z.string().max(200).optional(), // honeypot
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
  // Rejeu (double clic / retry réseau) : renvoie la demande déjà persistée, aucun doublon.
  const { data: existing, error: eErr } = await admin.from("sales_team_requests").select("id").eq("idempotency_key", b.idempotency_key).maybeSingle();
  if (eErr) return json({ error: "unavailable" }, 503);
  if (existing) return json({ ok: true, id: existing.id, replay: true });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = await sha256(`str:${ip}`);
  const { count, error: cErr } = await admin.from("sales_team_requests").select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash).gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if (cErr) return json({ error: "unavailable" }, 503);
  if ((count ?? 0) >= 5) return json({ error: "rate_limited" }, 429);

  const utm: Record<string, string> = {};
  for (const k of UTM_KEYS) { const v = b.utm?.[k]; if (v && /^[\w.\-+ %]{1,120}$/.test(v)) utm[k] = v; }

  const { data, error } = await admin.from("sales_team_requests").insert({
    idempotency_key: b.idempotency_key, company: b.company, website: b.website || null, role: b.role,
    sellers_count: b.sellers_count, specialties: b.specialties, priority_mandates: b.priority_mandates || null,
    refused_mandates: b.refused_mandates || null, territories: b.territories, travel_radius_km: b.travel_radius_km ?? null,
    objectives: b.objectives, annual_revenue_goal_cad: b.annual_revenue_goal_cad ?? null,
    weekly_capacity: b.weekly_capacity ?? null, average_ticket_cad: b.average_ticket_cad ?? null, close_rate_pct: b.close_rate_pct ?? null,
    first_name: b.first_name, last_name: b.last_name, email: b.email, phone: b.phone || null,
    consent_text: b.consent_text, marketing_opt_in: b.marketing_opt_in === true, utm, locale: b.locale ?? "fr",
    ip_hash: ipHash, is_synthetic: b.email.endsWith("@example.test"),
  }).select("id").single();
  if (error?.code === "23505") {
    const { data: again } = await admin.from("sales_team_requests").select("id").eq("idempotency_key", b.idempotency_key).maybeSingle();
    if (again) return json({ ok: true, id: again.id, replay: true });
  }
  if (error || !data) { console.error("sales_team insert failed", error?.code); return json({ error: "unavailable" }, 503); }
  return json({ ok: true, id: data.id });
});
