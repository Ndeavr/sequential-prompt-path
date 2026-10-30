// Demande de partenariat B2B fournisseur (/partenariats-fournisseurs).
// Insertion via service role uniquement, validation stricte, honeypot,
// limite par IP hachée. Aucun courriel externe, aucune donnée personnelle loggée.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const Body = z.object({
  company: z.string().trim().min(2).max(160),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(255),
  org_type: z.enum(["manufacturer", "distributor", "supplier", "association", "other"]),
  network_size: z.enum(["1-10", "11-50", "51-200", "200+"]).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  privacy_consent: z.literal(true),
  consent_text: z.string().trim().min(10).max(500),
  locale: z.enum(["fr", "en"]).optional(),
  website: z.string().max(200).optional(), // honeypot
  started_at: z.number().int().optional(),
});

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: "invalid", fields: Object.keys(parsed.error.flatten().fieldErrors) }, 400);
  const b = parsed.data;
  // Honeypot rempli ou soumission trop rapide (< 2 s) : refus explicite, rien n'est enregistré.
  if ((b.website ?? "") !== "" || (b.started_at && Date.now() - b.started_at < 2000)) {
    return json({ error: "rejected" }, 422);
  }
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = await sha256(`spr:${ip}`);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count, error: cErr } = await admin.from("supplier_partnership_requests")
    .select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
  if (cErr) return json({ error: "unavailable" }, 503);
  if ((count ?? 0) >= 5) return json({ error: "rate_limited" }, 429);
  const isSynthetic = b.email.endsWith("@example.test");
  const { data, error } = await admin.from("supplier_partnership_requests").insert({
    company: b.company, first_name: b.first_name, last_name: b.last_name, email: b.email,
    org_type: b.org_type, network_size: b.network_size ?? null, message: b.message || null,
    privacy_consent: true, consent_text: b.consent_text, locale: b.locale ?? "fr",
    source: "partenariats-fournisseurs", ip_hash: ipHash, is_synthetic: isSynthetic,
  }).select("id").single();
  if (error || !data) {
    console.error("supplier_partnership insert failed", error?.code);
    return json({ error: "unavailable" }, 503);
  }
  return json({ ok: true, id: data.id });
});
